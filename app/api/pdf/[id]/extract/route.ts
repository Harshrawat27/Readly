import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateEmbeddingsInBatches, EmbeddingChunk } from '@/lib/embeddings';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Log environment info at startup
console.log(`📊 Extract endpoint loaded - Environment: ${process.env.NODE_ENV}`);
console.log(`   🗄️  Database URL exists: ${!!process.env.DATABASE_URL}`);
console.log(`   🔐 Auth configured: ${!!process.env.BETTER_AUTH_SECRET}`);

const CHUNK_SIZE = 1000; // Larger chunks to reduce total count for Vercel timeout
const MIN_CHUNK_SIZE = 400; // Larger minimum to reduce chunk count
const MAX_CHUNK_SIZE = 1500; // Larger maximum to reduce chunk count

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let pages: Array<{pageNumber: number; content: string}> | undefined;
  let batchInfo: { batchIndex: number; totalBatches: number; isLastBatch: boolean } | undefined;
  
  // Performance tracking
  const startTime = Date.now();
  const timeLog = {
    start: startTime,
    auth: 0,
    dbCheck: 0,
    jsonParse: 0,
    pdfLookup: 0,
    chunking: 0,
    embedding: 0,
    dbSave: 0,
    total: 0
  };
  
  try {
    console.log(`🚀 [${new Date().toISOString()}] Starting PDF extraction process...`);
    console.log(`⏰ START_TIME: ${startTime}ms`);
    
    const authStart = Date.now();
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      console.log(`❌ Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    timeLog.auth = Date.now() - authStart;
    console.log(`🔐 AUTH_TIME: ${timeLog.auth}ms`);

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
    const dbCheckStart = Date.now();
    console.log(`🔍 Testing database connection...`);
    try {
      await prisma.$queryRaw`SELECT 1`;
      timeLog.dbCheck = Date.now() - dbCheckStart;
      console.log(`   ✅ Database connection successful - DB_CHECK_TIME: ${timeLog.dbCheck}ms`);
    } catch (dbConnError) {
      console.error(`❌ Database connection failed:`, dbConnError);
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Verify PDF exists and belongs to user
    const pdfLookupStart = Date.now();
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
    
    timeLog.pdfLookup = Date.now() - pdfLookupStart;
    console.log(`✅ PDF found: ${pdf.title || 'Untitled'} - PDF_LOOKUP_TIME: ${timeLog.pdfLookup}ms`);

    const jsonParseStart = Date.now();
    console.log(`📝 Parsing request body...`);
    let parsedData;
    try {
      parsedData = JSON.parse(requestBody);
      timeLog.jsonParse = Date.now() - jsonParseStart;
      console.log(`📄 JSON_PARSE_TIME: ${timeLog.jsonParse}ms`);
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
    
    // Add timeout to catch hanging operations - reduced for Vercel
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 50 seconds')), 50000);
    });
    
    const processPromise = processPages(pages, pdfId, batchInfo, timeLog);
    
    const result = await Promise.race([processPromise, timeoutPromise]);
    
    // Final timing summary
    timeLog.total = Date.now() - startTime;
    console.log(`\n🎯 PERFORMANCE SUMMARY for PDF ${pdfId}:`);
    console.log(`   🔐 Auth: ${timeLog.auth}ms`);
    console.log(`   🗄️  DB Check: ${timeLog.dbCheck}ms`);
    console.log(`   📄 JSON Parse: ${timeLog.jsonParse}ms`);
    console.log(`   🔍 PDF Lookup: ${timeLog.pdfLookup}ms`);
    console.log(`   ✂️  Chunking: ${timeLog.chunking}ms`);
    console.log(`   🤖 Embedding: ${timeLog.embedding}ms`);
    console.log(`   💾 DB Save: ${timeLog.dbSave}ms`);
    console.log(`   ⏱️  TOTAL: ${timeLog.total}ms (${(timeLog.total/1000).toFixed(1)}s)`);
    console.log(`   📊 Breakdown: Auth(${((timeLog.auth/timeLog.total)*100).toFixed(1)}%) | Chunking(${((timeLog.chunking/timeLog.total)*100).toFixed(1)}%) | Embedding(${((timeLog.embedding/timeLog.total)*100).toFixed(1)}%) | DB(${((timeLog.dbSave/timeLog.total)*100).toFixed(1)}%)`);
    
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

  // Protect mathematical expressions by temporarily replacing them
  const mathExpressions: string[] = [];
  let protectedContent = content;
  
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
  
  // Protect LaTeX expressions
  protectedContent = protectedContent.replace(/\[[^\]]*\\[a-zA-Z]+[^\]]*\]/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
  protectedContent = protectedContent.replace(/\([^)]*\\[a-zA-Z]+[^)]*\)/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });

  // Semantic chunking strategy: prioritize paragraph boundaries
  const paragraphs = protectedContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentCharIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // If this paragraph alone exceeds max size, split it by sentences
    if (trimmedParagraph.length > MAX_CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.length >= MIN_CHUNK_SIZE) {
        let restoredChunk = currentChunk.trim();
        mathExpressions.forEach((mathExpr, index) => {
          restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
        });

        chunks.push({
          content: restoredChunk,
          pageNumber: pageNumber,
          startIndex: currentCharIndex - currentChunk.length,
          endIndex: currentCharIndex,
          chunkIndex: chunkIndex++,
          pdfId: pdfId,
        });
        
        currentChunk = '';
      }
      
      // Split large paragraph by sentences
      const sentences = trimmedParagraph.match(/[^\.!?]+[\.!?]+/g) || [trimmedParagraph];
      let sentenceChunk = '';
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        
        if (sentenceChunk.length + trimmedSentence.length > CHUNK_SIZE && sentenceChunk.length >= MIN_CHUNK_SIZE) {
          let restoredChunk = sentenceChunk.trim();
          mathExpressions.forEach((mathExpr, index) => {
            restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
          });

          chunks.push({
            content: restoredChunk,
            pageNumber: pageNumber,
            startIndex: currentCharIndex - sentenceChunk.length,
            endIndex: currentCharIndex,
            chunkIndex: chunkIndex++,
            pdfId: pdfId,
          });
          
          // Start new chunk with overlap
          const overlapWords = sentenceChunk.split(' ').slice(-20).join(' '); // Last 20 words for context
          sentenceChunk = overlapWords + ' ' + trimmedSentence;
        } else {
          sentenceChunk += (sentenceChunk.length > 0 ? ' ' : '') + trimmedSentence;
        }
        currentCharIndex += trimmedSentence.length + 1;
      }
      
      // Add remaining sentence chunk to current chunk
      if (sentenceChunk.trim().length > 0) {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + sentenceChunk.trim();
      }
      
    } else {
      // Normal paragraph processing
      if (currentChunk.length + trimmedParagraph.length > CHUNK_SIZE && currentChunk.length >= MIN_CHUNK_SIZE) {
        // Save current chunk
        let restoredChunk = currentChunk.trim();
        mathExpressions.forEach((mathExpr, index) => {
          restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
        });

        chunks.push({
          content: restoredChunk,
          pageNumber: pageNumber,
          startIndex: currentCharIndex - currentChunk.length,
          endIndex: currentCharIndex,
          chunkIndex: chunkIndex++,
          pdfId: pdfId,
        });
        
        // Start new chunk with some overlap (last sentences of previous chunk)
        const sentences = currentChunk.split(/[\.!?]+/).filter(s => s.trim().length > 0);
        const overlapSentences = sentences.slice(-2).join('. ') + '. '; // Last 2 sentences
        currentChunk = overlapSentences + trimmedParagraph;
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
      }
      
      currentCharIndex += trimmedParagraph.length + 2; // +2 for paragraph separator
    }
  }

  // Save the final chunk if it meets minimum size
  if (currentChunk.trim().length >= MIN_CHUNK_SIZE) {
    let restoredChunk = currentChunk.trim();
    mathExpressions.forEach((mathExpr, index) => {
      restoredChunk = restoredChunk.replace(`__MATH_${index}__`, mathExpr);
    });

    chunks.push({
      content: restoredChunk,
      pageNumber: pageNumber,
      startIndex: currentCharIndex - currentChunk.length,
      endIndex: currentCharIndex,
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
  batchInfo?: { batchIndex: number; totalBatches: number; isLastBatch: boolean },
  timeLog?: {
    start: number;
    auth: number;
    dbCheck: number;
    jsonParse: number;
    pdfLookup: number;
    chunking: number;
    embedding: number;
    dbSave: number;
    total: number;
  }
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

  const allChunks: Array<{
    content: string;
    pageNumber: number;
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
    pdfId: string;
  }> = [];

  const chunkingStart = Date.now();
  console.log(`✂️  Starting chunking process...`);

  for (const page of pages) {
    const { pageNumber, content } = page;
    
    if (!content || typeof content !== 'string') {
      continue;
    }

    // Clean the content while preserving mathematical formatting
    const cleanContent = content
      .replace(/\0/g, '') // Remove null bytes (0x00) that cause PostgreSQL errors
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters except \t, \n, \r
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

  if (timeLog) {
    timeLog.chunking = Date.now() - chunkingStart;
    console.log(`✂️  CHUNKING_TIME: ${timeLog.chunking}ms - Created ${allChunks.length} chunks`);
  }

  console.log(`💾 Saving ${allChunks.length} chunks to database...`);
  
  // Generate embeddings for all chunks
  const embeddingStart = Date.now();
  console.log(`🤖 Generating embeddings for ${allChunks.length} chunks...`);
  let embeddingResults;
  try {
    const embeddingChunks: EmbeddingChunk[] = allChunks.map(chunk => ({
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      chunkIndex: chunk.chunkIndex,
      pdfId: chunk.pdfId
    }));
    
    embeddingResults = await generateEmbeddingsInBatches(embeddingChunks, 50, 2); // Reduced for Vercel 60s timeout
    
    if (timeLog) {
      timeLog.embedding = Date.now() - embeddingStart;
      console.log(`🤖 EMBEDDING_TIME: ${timeLog.embedding}ms - Generated ${embeddingResults.length} embeddings`);
    }
  } catch (embeddingError) {
    console.error(`❌ Failed to generate embeddings:`, embeddingError);
    throw new Error(`Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`);
  }

  // Save chunks with embeddings using conservative bulk INSERT for Vercel timeout
  const dbSaveStart = Date.now();
  const dbBatchSize = 80; // Reduced for Vercel 60s timeout limit
  let savedChunks = 0;
  
  console.log(`💾 Saving ${embeddingResults.length} chunks with embeddings to database using bulk inserts...`);
  
  try {
    for (let i = 0; i < embeddingResults.length; i += dbBatchSize) {
      const batchEnd = Math.min(i + dbBatchSize, embeddingResults.length);
      const batch = embeddingResults.slice(i, batchEnd);
      
      console.log(`   💾 Saving batch ${Math.floor(i / dbBatchSize) + 1}/${Math.ceil(embeddingResults.length / dbBatchSize)} (${batch.length} chunks with embeddings)`);
      
      // Construct bulk INSERT statement with VALUES clause
      const values: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;
      
      for (const result of batch) {
        const chunk = result.chunk;
        const embeddingVector = `[${result.embedding.join(',')}]`;
        
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}::vector, NOW())`);
        
        params.push(
          generateId(),
          chunk.content,
          chunk.pageNumber,
          chunk.startIndex,
          chunk.endIndex,
          chunk.chunkIndex,
          chunk.pdfId,
          embeddingVector
        );
        
        paramIndex += 8;
      }
      
      const bulkInsertSQL = `
        INSERT INTO "pdf_chunk" (
          "id", "content", "pageNumber", "startIndex", "endIndex", 
          "chunkIndex", "pdfId", "embedding", "createdAt"
        ) VALUES ${values.join(', ')}
      `;
      
      // Execute bulk insert
      await prisma.$executeRawUnsafe(bulkInsertSQL, ...params);
      
      savedChunks += batch.length;
      console.log(`   ✅ Saved ${savedChunks}/${embeddingResults.length} chunks - Batch time: ${Date.now() - Date.now()}ms`);
    }
    
    if (timeLog) {
      timeLog.dbSave = Date.now() - dbSaveStart;
      console.log(`💾 DB_SAVE_TIME: ${timeLog.dbSave}ms - Saved ${savedChunks} chunks`);
    }
  } catch (dbError) {
    console.error(`❌ Database error saving chunks:`, dbError);
    console.error(`   📍 Error details:`, {
      name: dbError instanceof Error ? dbError.name : 'Unknown',
      message: dbError instanceof Error ? dbError.message : 'Unknown error',
      code: (dbError as {code?: string})?.code || 'No code',
      savedChunks,
      totalChunks: embeddingResults.length
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