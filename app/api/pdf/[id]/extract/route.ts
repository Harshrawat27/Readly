import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Log environment info at startup
console.log(`📊 Extract endpoint loaded - Environment: ${process.env.NODE_ENV}`);
console.log(`   🗄️  Database URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`   🔐 Auth configured: ${!!process.env.BETTER_AUTH_SECRET}`);

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Characters to overlap between chunks

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let pages: Array<{pageNumber: number; content: string}> | undefined;
  let batchInfo: { batchIndex: number; totalBatches: number; isLastBatch: boolean } | undefined;
  
  try {
    console.log(`🚀 Starting PDF extraction process...`);
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      console.log(`❌ Unauthorized access attempt`);
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
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`   🔍 Headers count: ${Object.keys(await headers()).length}`);

    // Test database connectivity first
    console.log(`🔍 Testing database connection...`);
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`   ✅ Database connection successful`);
    } catch (dbConnError) {
      console.error(`❌ Database connection failed:`, dbConnError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Verify PDF exists and belongs to user
    console.log(`🔍 Looking up PDF ${pdfId} for user ${userId}...`);
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
    });

    if (!pdf) {
      console.log(`❌ PDF ${pdfId} not found or doesn't belong to user ${userId}`);
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }
    
    console.log(`✅ PDF found: ${pdf.title || 'Untitled'}`);

    console.log(`📝 Parsing request body...`);
    let parsedData;
    try {
      parsedData = JSON.parse(requestBody);
    } catch (parseError) {
      console.error(`❌ JSON parse error:`, parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    ({ pages, batchInfo } = parsedData);

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Page content is required' },
        { status: 400 }
      );
    }

    console.log(`   📄 Pages in request: ${pages.length}`);
    console.log(`   🔢 Batch info: ${batchInfo ? `${batchInfo.batchIndex + 1}/${batchInfo.totalBatches}` : 'No batching'}`);
    console.log(`   📝 Total characters: ${pages.reduce((sum: number, page: { pageNumber: number; content: string }) => sum + (page.content?.length || 0), 0)}`);

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

    console.log(`🔄 Processing pages...`);
    
    // Add timeout to catch hanging operations
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 45 seconds')), 45000);
    });
    
    const processPromise = processPages(pages, pdfId, batchInfo);
    
    const result = await Promise.race([processPromise, timeoutPromise]);
    console.log(`✅ Successfully processed batch for PDF ${pdfId}`);
    return result;

  } catch (error) {
    console.error('❌ Text extraction error:', error);
    if (error instanceof Error) {
      console.error('   📍 Error name:', error.name);
      console.error('   📍 Error message:', error.message);
      console.error('   📍 Error stack:', error.stack);
    }
    
    // Log additional context
    console.error('   📍 Error context:', {
      hasPages: typeof pages !== 'undefined',
      pagesLength: pages?.length,
      hasBatchInfo: typeof batchInfo !== 'undefined',
      batchInfo: batchInfo,
      environment: process.env.NODE_ENV
    });
    
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
  console.log(`🔄 processPages called with ${pages.length} pages for PDF ${pdfId}`);
  console.log(`   🔢 Batch info:`, batchInfo);
  
  // For batched requests, we need to get the current chunk index from existing chunks
  let chunkIndex = 0;
  if (batchInfo && batchInfo.batchIndex > 0) {
    console.log(`🔍 Getting last chunk index for batched request...`);
    try {
      // Get the highest chunk index from existing chunks
      const lastChunk = await prisma.pDFChunk.findFirst({
        where: { pdfId },
        orderBy: { chunkIndex: 'desc' },
        select: { chunkIndex: true }
      });
      chunkIndex = lastChunk ? lastChunk.chunkIndex + 1 : 0;
      console.log(`   ✅ Starting chunk index: ${chunkIndex}`);
    } catch (dbError) {
      console.error(`❌ Database error getting last chunk index:`, dbError);
      throw dbError;
    }
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

  console.log(`💾 Saving ${allChunks.length} chunks to database...`);
  
  // Save all chunks to database in batches
  const dbBatchSize = 100;
  let savedChunks = 0;
  
  try {
    for (let i = 0; i < allChunks.length; i += dbBatchSize) {
      const batch = allChunks.slice(i, i + dbBatchSize);
      console.log(`   💾 Saving batch ${Math.floor(i / dbBatchSize) + 1}/${Math.ceil(allChunks.length / dbBatchSize)} (${batch.length} chunks)`);
      
      await prisma.pDFChunk.createMany({
        data: batch,
      });
      savedChunks += batch.length;
      console.log(`   ✅ Saved ${savedChunks}/${allChunks.length} chunks`);
    }
  } catch (dbError) {
    console.error(`❌ Database error saving chunks:`, dbError);
    console.error(`   📍 Error details:`, {
      name: dbError instanceof Error ? dbError.name : 'Unknown',
      message: dbError instanceof Error ? dbError.message : 'Unknown error',
      code: (dbError as {code?: string})?.code || 'No code',
      savedChunks,
      totalChunks: allChunks.length
    });
    throw dbError;
  }

  // Mark PDF as text extracted only if this is the last batch or non-batched request
  if (!batchInfo || batchInfo.isLastBatch) {
    console.log(`🏁 Marking PDF as text extracted (last batch or non-batched)`);
    try {
      await prisma.pDF.update({
        where: { id: pdfId },
        data: { textExtracted: true },
      });
      console.log(`   ✅ PDF marked as text extracted`);
    } catch (dbError) {
      console.error(`❌ Database error marking PDF as extracted:`, dbError);
      throw dbError;
    }
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