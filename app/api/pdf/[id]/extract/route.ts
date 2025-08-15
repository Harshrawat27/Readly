import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Characters to overlap between chunks

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const pdfId = resolvedParams.id;
    const userId = session.user.id;

    // Log incoming request size
    const requestBody = await request.text();
    const requestSizeKB = (requestBody.length / 1024).toFixed(2);
    const requestSizeMB = (requestBody.length / (1024 * 1024)).toFixed(2);
    
    console.log(`📨 API received request for PDF ${pdfId}`);
    console.log(`   📊 Request size: ${requestSizeKB} KB (${requestSizeMB} MB)`);
    console.log(`   👤 User: ${userId}`);

    // Verify PDF exists and belongs to user
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const { pages, batchInfo } = JSON.parse(requestBody);

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Page content is required' },
        { status: 400 }
      );
    }

    console.log(`   📄 Pages in request: ${pages.length}`);
    console.log(`   🔢 Batch info: ${batchInfo ? `${batchInfo.batchIndex + 1}/${batchInfo.totalBatches}` : 'No batching'}`);
    console.log(`   📝 Total characters: ${pages.reduce((sum: number, page: any) => sum + (page.content?.length || 0), 0)}`);

    // Check if text extraction is already done (only for first batch or non-batched requests)
    if (!batchInfo || batchInfo.batchIndex === 0) {
      if (pdf.textExtracted) {
        console.log(`✅ Text already extracted for PDF ${pdfId}`);
        return NextResponse.json({ 
          message: 'Text already extracted',
          chunksCount: await prisma.pDFChunk.count({ where: { pdfId } })
        });
      }
    }

    const result = await processPages(pages, pdfId, batchInfo);
    console.log(`✅ Successfully processed batch for PDF ${pdfId}`);
    return result;

  } catch (error) {
    console.error('❌ Text extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}

function createTextChunks(
  content: string,
  pageNumber: number,
  startChunkIndex: number,
  pdfId: string
): Array<{
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  pdfId: string;
}> {
  const chunks = [];
  let chunkIndex = startChunkIndex;

  // Split content into sentences for better chunk boundaries while preserving math
  // First, protect mathematical expressions by temporarily replacing them
  const mathExpressions: string[] = [];
  let protectedContent = content;
  
  // Protect various mathematical expression formats
  
  // Protect display math ($$...$$)
  protectedContent = protectedContent.replace(/\$\$[^$]+\$\$/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
  // Protect inline math ($...$)
  protectedContent = protectedContent.replace(/\$[^$]+\$/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
  // Protect expressions in square brackets that contain LaTeX commands
  protectedContent = protectedContent.replace(/\[[^\]]*\\[a-zA-Z]+[^\]]*\]/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
  // Protect expressions in parentheses that contain LaTeX commands
  protectedContent = protectedContent.replace(/\([^)]*\\[a-zA-Z]+[^)]*\)/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });

  const sentences = protectedContent.match(/[^\.!?]+[\.!?]+/g) || [protectedContent];
  
  let currentChunk = '';
  let chunkStartIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // If adding this sentence would exceed chunk size and we have content
    if (currentChunk.length + trimmedSentence.length > CHUNK_SIZE && currentChunk.length > 0) {
      // Restore mathematical expressions before saving
    let restoredChunk = currentChunk.trim();
    mathExpressions.forEach((mathExpr, index) => {
      restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
    });

    chunks.push({
      content: restoredChunk,
      pageNumber: pageNumber,
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + currentChunk.length,
      chunkIndex: chunkIndex++,
      pdfId: pdfId,
    });

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP);
      currentChunk = currentChunk.substring(overlapStart) + ' ' + trimmedSentence;
      chunkStartIndex += overlapStart;
    } else {
      // Add sentence to current chunk
      if (currentChunk.length === 0) {
        currentChunk = trimmedSentence;
        chunkStartIndex = content.indexOf(trimmedSentence);
      } else {
        currentChunk += ' ' + trimmedSentence;
      }
    }
  }

  // Save the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    // Restore mathematical expressions before saving
    let restoredChunk = currentChunk.trim();
    mathExpressions.forEach((mathExpr, index) => {
      restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
    });

    chunks.push({
      content: restoredChunk,
      pageNumber: pageNumber,
      startIndex: chunkStartIndex,
      endIndex: chunkStartIndex + currentChunk.length,
      chunkIndex: chunkIndex,
      pdfId: pdfId,
    });
  }

  return chunks;
}

// Process pages and save chunks to database
async function processPages(
  pages: Array<{pageNumber: number; content: string}>, 
  pdfId: string, 
  batchInfo?: { batchIndex: number; totalBatches: number; isLastBatch: boolean }
) {
  // For batched requests, we need to get the current chunk index from existing chunks
  let chunkIndex = 0;
  if (batchInfo && batchInfo.batchIndex > 0) {
    // Get the highest chunk index from existing chunks
    const lastChunk = await prisma.pDFChunk.findFirst({
      where: { pdfId },
      orderBy: { chunkIndex: 'desc' },
      select: { chunkIndex: true }
    });
    chunkIndex = lastChunk ? lastChunk.chunkIndex + 1 : 0;
  }

  const allChunks = [];

  for (const page of pages) {
    const { pageNumber, content } = page;
    
    if (!content || typeof content !== 'string') {
      continue;
    }

    // Clean the content while preserving mathematical formatting
    const cleanContent = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      // Preserve common mathematical notation patterns
      .replace(/\$\s+/g, '$')  // Remove spaces after opening $
      .replace(/\s+\$/g, '$')  // Remove spaces before closing $
      .replace(/\\\s+/g, '\\') // Remove spaces after backslashes
      .trim();

    if (cleanContent.length === 0) {
      continue;
    }

    // Create chunks for this page
    const pageChunks = createTextChunks(
      cleanContent,
      pageNumber,
      chunkIndex,
      pdfId
    );

    allChunks.push(...pageChunks);
    chunkIndex += pageChunks.length;
  }

  // Save all chunks to database in batches
  const dbBatchSize = 100;
  for (let i = 0; i < allChunks.length; i += dbBatchSize) {
    const batch = allChunks.slice(i, i + dbBatchSize);
    await prisma.pDFChunk.createMany({
      data: batch,
    });
  }

  // Mark PDF as text extracted only if this is the last batch or non-batched request
  if (!batchInfo || batchInfo.isLastBatch) {
    await prisma.pDF.update({
      where: { id: pdfId },
      data: { textExtracted: true },
    });
  }

  const responseMessage = batchInfo 
    ? `Batch ${batchInfo.batchIndex + 1}/${batchInfo.totalBatches} processed`
    : 'Text extraction completed';

  return NextResponse.json({
    message: responseMessage,
    chunksCreated: allChunks.length,
    pagesProcessed: pages.length,
    batchInfo: batchInfo,
  });
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const pdfId = resolvedParams.id;
    const userId = session.user.id;

    // Verify PDF exists and belongs to user
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    return NextResponse.json({
      textExtracted: pdf.textExtracted,
      chunksCount: pdf.chunks.length,
      chunks: pdf.chunks,
    });

  } catch (error) {
    console.error('Get chunks error:', error);
    return NextResponse.json(
      { error: 'Failed to get PDF chunks' },
      { status: 500 }
    );
  }
}