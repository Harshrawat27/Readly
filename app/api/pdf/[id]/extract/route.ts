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

    // Check if text extraction is already done
    if (pdf.textExtracted) {
      return NextResponse.json({ 
        message: 'Text already extracted',
        chunksCount: await prisma.pDFChunk.count({ where: { pdfId } })
      });
    }

    const { pages } = await request.json();

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Page content is required' },
        { status: 400 }
      );
    }

    return await processPages(pages, pdfId);

  } catch (error) {
    console.error('Text extraction error:', error);
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
async function processPages(pages: Array<{pageNumber: number; content: string}>, pdfId: string) {
  let chunkIndex = 0;
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
  const batchSize = 100;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    await prisma.pDFChunk.createMany({
      data: batch,
    });
  }

  // Mark PDF as text extracted
  await prisma.pDF.update({
    where: { id: pdfId },
    data: { textExtracted: true },
  });

  return NextResponse.json({
    message: 'Text extraction completed',
    chunksCreated: allChunks.length,
    pagesProcessed: pages.length,
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