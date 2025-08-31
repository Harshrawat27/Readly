import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateEmbeddingsInBatches, EmbeddingChunk } from '@/lib/embeddings';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// Optimized chunk sizes for Vercel timeout constraints
const CHUNK_SIZE = 1000; // Larger chunks to reduce total count for Vercel timeout
const MIN_CHUNK_SIZE = 400; // Larger minimum to reduce chunk count  
const MAX_CHUNK_SIZE = 1500; // Larger maximum to reduce chunk count
const CHUNK_OVERLAP = 200; // Characters to overlap between chunks

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Comprehensive time logging for performance analysis
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
    
    console.log(`🚀 SERVER-SIDE URL TEXT EXTRACTION STARTED`);
    console.log(`   🎯 Using server-side processing route (NOT client-side)`);
    console.log(`   ⏱️  Start Time: ${new Date(startTime).toISOString()}`);
    
    const authStart = Date.now();
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    timeLog.auth = Date.now() - authStart;

    if (!session?.user?.id) {
      console.log(`❌ Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jsonStart = Date.now();
    const { pdfId, pages } = await request.json();
    const userId = session.user.id;
    timeLog.jsonParse = Date.now() - jsonStart;

    console.log(`📄 PDF ID: ${pdfId}`);
    console.log(`📄 Pages received: ${pages?.length || 0}`);
    console.log(`👤 User: ${userId}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);

    // Verify PDF exists and belongs to user
    console.log(`🔍 Verifying PDF ownership...`);
    const pdfLookupStart = Date.now();
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
    });
    timeLog.pdfLookup = Date.now() - pdfLookupStart;

    if (!pdf) {
      console.log(`❌ PDF ${pdfId} not found or doesn't belong to user ${userId}`);
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Check if text already extracted
    if (pdf.textExtracted) {
      console.log(`✅ Text already extracted for PDF ${pdfId}`);
      const dbCheckStart = Date.now();
      const chunksCount = await prisma.pDFChunk.count({ where: { pdfId } });
      timeLog.dbCheck = Date.now() - dbCheckStart;
      return NextResponse.json({ 
        message: 'Text already extracted',
        chunksCount,
        method: 'server-side (cached)'
      });
    }

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json(
        { error: 'Page content is required' },
        { status: 400 }
      );
    }

    console.log(`📝 Total characters: ${pages.reduce((sum: number, page: { pageNumber: number; content: string }) => sum + (page.content?.length || 0), 0)}`);

    // Delegate to the existing extract endpoint logic
    console.log(`🔄 Delegating to server-side extraction logic...`);
    const result = await processPages(pages, pdfId, timeLog);
    
    // Final timing calculations
    timeLog.total = Date.now() - startTime;
    
    console.log(`✅ SERVER-SIDE TEXT EXTRACTION COMPLETED`);
    console.log(`   🎯 Method: server-side processing`);
    console.log(`   📊 Total pages processed: ${pages.length}`);
    console.log(`   🔢 Total chunks created: ${result.chunksCreated}`);
    console.log(`\n⏱️  COMPREHENSIVE TIMING BREAKDOWN (SERVER-SIDE):`);
    console.log(`   🔐 Auth: ${timeLog.auth}ms`);
    console.log(`   📥 JSON Parse: ${timeLog.jsonParse}ms`);  
    console.log(`   🔍 PDF Lookup: ${timeLog.pdfLookup}ms`);
    console.log(`   📊 DB Check: ${timeLog.dbCheck}ms`);
    console.log(`   ✂️  Chunking: ${timeLog.chunking}ms`);
    console.log(`   🤖 Embedding: ${timeLog.embedding}ms`);
    console.log(`   💾 DB Save: ${timeLog.dbSave}ms`);
    console.log(`   🎯 TOTAL: ${timeLog.total}ms (${(timeLog.total / 1000).toFixed(2)}s)`);
    console.log(`   📈 Performance: ${result.chunksCreated} chunks in ${(timeLog.total / 1000).toFixed(2)}s = ${(result.chunksCreated / (timeLog.total / 1000)).toFixed(1)} chunks/sec`);
    
    return NextResponse.json({
      message: 'Server-side text extraction completed',
      method: 'server-side',
      pagesProcessed: pages.length,
      chunksCreated: result.chunksCreated,
      performance: {
        totalTimeMs: timeLog.total,
        totalTimeSec: Number((timeLog.total / 1000).toFixed(2)),
        chunksPerSecond: Number((result.chunksCreated / (timeLog.total / 1000)).toFixed(1)),
        breakdown: {
          auth: timeLog.auth,
          jsonParse: timeLog.jsonParse,
          pdfLookup: timeLog.pdfLookup,
          dbCheck: timeLog.dbCheck,
          chunking: timeLog.chunking,
          embedding: timeLog.embedding,
          dbSave: timeLog.dbSave
        }
      }
    });

  } catch (error) {
    console.error('❌ Server-side text extraction error:', error);
    if (error instanceof Error) {
      console.error('   📍 Error name:', error.name);
      console.error('   📍 Error message:', error.message);
      console.error('   📍 Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Failed to extract text from PDF URL' },
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

  // Enhanced semantic chunking with paragraph boundaries for better context
  const mathExpressions: string[] = [];
  let protectedContent = content;
  
  // Protect various mathematical expression formats
  protectedContent = protectedContent.replace(/\$\$[^$]+\$\$/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
  protectedContent = protectedContent.replace(/\$[^$]+\$/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(match);
    return `__MATH_${index}__`;
  });
  
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

  // Improved semantic chunking: Try paragraphs first, then sentences 
  const paragraphs = protectedContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const textSegments = paragraphs.length > 1 ? paragraphs : 
                      (protectedContent.match(/[^\.!?]+[\.!?]+/g) || [protectedContent]);
  
  let currentChunk = '';
  let chunkStartIndex = 0;

  for (const segment of textSegments) {
    const trimmedSegment = segment.trim();
    
    // Check if adding this segment would exceed our target size
    const potentialLength = currentChunk.length + trimmedSegment.length;
    
    if (potentialLength > CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
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

      const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP);
      currentChunk = currentChunk.substring(overlapStart) + ' ' + trimmedSegment;
      chunkStartIndex += overlapStart;
    } else if (potentialLength > MAX_CHUNK_SIZE && trimmedSegment.length > 0) {
      // If single segment is too large, split it by sentences
      const sentences = trimmedSegment.match(/[^\.!?]+[\.!?]+/g) || [trimmedSegment];
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (currentChunk.length + trimmedSentence.length > CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
          // Save current chunk
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
          
          const overlapStart = Math.max(0, currentChunk.length - CHUNK_OVERLAP);
          currentChunk = currentChunk.substring(overlapStart) + ' ' + trimmedSentence;
          chunkStartIndex += overlapStart;
        } else {
          if (currentChunk.length === 0) {
            currentChunk = trimmedSentence;
            chunkStartIndex = content.indexOf(trimmedSentence);
          } else {
            currentChunk += ' ' + trimmedSentence;
          }
        }
      }
    } else {
      if (currentChunk.length === 0) {
        currentChunk = trimmedSegment;
        chunkStartIndex = content.indexOf(trimmedSegment);
      } else {
        currentChunk += '\n' + trimmedSegment;
      }
    }
  }

  if (currentChunk.trim().length > 0) {
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

async function processPages(
  pages: Array<{pageNumber: number; content: string}>, 
  pdfId: string,
  timeLog: {
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
  console.log(`🔄 Processing ${pages.length} pages server-side...`);
  
  // Start chunking timer
  const chunkingStart = Date.now();
  
  let chunkIndex = 0;
  const allChunks: Array<{
    content: string;
    pageNumber: number;
    startIndex: number;
    endIndex: number;
    chunkIndex: number;
    pdfId: string;
  }> = [];

  for (const page of pages) {
    const { pageNumber, content } = page;
    
    if (!content || typeof content !== 'string') {
      continue;
    }

    const cleanContent = content
      .replace(/\0/g, '') // Remove null bytes (0x00) that cause PostgreSQL errors
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters except \t, \n, \r
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\$\s+/g, '$')
      .replace(/\s+\$/g, '$')
      .replace(/\\\s+/g, '\\')
      .trim();

    if (cleanContent.length === 0) {
      continue;
    }

    const pageChunks = createTextChunks(
      cleanContent,
      pageNumber,
      chunkIndex,
      pdfId
    );

    allChunks.push(...pageChunks);
    chunkIndex += pageChunks.length;
  }

  // Complete chunking timing
  timeLog.chunking = Date.now() - chunkingStart;
  console.log(`   ✂️  Chunking completed: ${timeLog.chunking}ms for ${allChunks.length} chunks`);

  // Generate embeddings for all chunks
  console.log(`🤖 Generating embeddings for ${allChunks.length} chunks (server-side)...`);
  const embeddingStart = Date.now();
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
    
    // Optimized batch parameters for Vercel timeout constraints
    embeddingResults = await generateEmbeddingsInBatches(embeddingChunks, 100, 3);
    timeLog.embedding = Date.now() - embeddingStart;
    console.log(`✅ Generated ${embeddingResults.length} embeddings in ${timeLog.embedding}ms`);
  } catch (embeddingError) {
    console.error(`❌ Failed to generate embeddings:`, embeddingError);
    throw new Error(`Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`);
  }

  console.log(`💾 Saving ${embeddingResults.length} chunks with embeddings to database (server-side)...`);
  
  // CRITICAL OPTIMIZATION: Bulk INSERT instead of individual inserts
  const dbSaveStart = Date.now();
  const dbBatchSize = 50; // Smaller batches for Vercel timeout
  let savedChunks = 0;
  
  try {
    for (let i = 0; i < embeddingResults.length; i += dbBatchSize) {
      const batchEnd = Math.min(i + dbBatchSize, embeddingResults.length);
      const batch = embeddingResults.slice(i, batchEnd);
      
      console.log(`   💾 Saving batch ${Math.floor(i / dbBatchSize) + 1}/${Math.ceil(embeddingResults.length / dbBatchSize)} (${batch.length} chunks)`);
      
      // BULK INSERT - Single SQL query for the entire batch (MAJOR PERFORMANCE IMPROVEMENT)
      const values = batch.map((result) => {
        const chunk = result.chunk;
        const embeddingVector = `[${result.embedding.join(',')}]`;
        
        return `(
          '${generateId()}', 
          '${chunk.content.replace(/'/g, "''")}',
          ${chunk.pageNumber},
          ${chunk.startIndex},
          ${chunk.endIndex},
          ${chunk.chunkIndex},
          '${chunk.pdfId}',
          '${embeddingVector}'::vector,
          NOW()
        )`;
      });
      
      const bulkInsertSQL = `
        INSERT INTO "pdf_chunk" (
          "id", "content", "pageNumber", "startIndex", "endIndex", 
          "chunkIndex", "pdfId", "embedding", "createdAt"
        ) VALUES ${values.join(', ')}
      `;
      
      await prisma.$executeRawUnsafe(bulkInsertSQL);
      savedChunks += batch.length;
      
      console.log(`   ✅ Bulk saved ${savedChunks}/${embeddingResults.length} chunks`);
    }
    
    timeLog.dbSave = Date.now() - dbSaveStart;
    console.log(`   💾 Database save completed: ${timeLog.dbSave}ms for ${savedChunks} chunks`);
  } catch (dbError) {
    console.error(`❌ Database error saving chunks:`, dbError);
    throw dbError;
  }

  // Mark PDF as text extracted
  console.log(`🏁 Marking PDF as text extracted (server-side)`);
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

  return {
    chunksCreated: allChunks.length,
    pagesProcessed: pages.length,
  };
}