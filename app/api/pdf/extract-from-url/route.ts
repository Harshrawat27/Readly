import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { generateEmbeddingsInBatches, EmbeddingChunk } from '@/lib/embeddings';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Characters to overlap between chunks

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 SERVER-SIDE URL TEXT EXTRACTION STARTED`);
    console.log(`   🎯 Using server-side processing route (NOT client-side)`);
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      console.log(`❌ Unauthorized access attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdfId, pages } = await request.json();
    const userId = session.user.id;

    console.log(`📄 PDF ID: ${pdfId}`);
    console.log(`📄 Pages received: ${pages?.length || 0}`);
    console.log(`👤 User: ${userId}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);

    // Verify PDF exists and belongs to user
    console.log(`🔍 Verifying PDF ownership...`);
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

    // Check if text already extracted
    if (pdf.textExtracted) {
      console.log(`✅ Text already extracted for PDF ${pdfId}`);
      const chunksCount = await prisma.pDFChunk.count({ where: { pdfId } });
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
    const result = await processPages(pages, pdfId);
    
    console.log(`✅ SERVER-SIDE TEXT EXTRACTION COMPLETED`);
    console.log(`   🎯 Method: server-side processing`);
    console.log(`   📊 Total pages processed: ${pages.length}`);
    console.log(`   🔢 Total chunks created: ${result.chunksCreated}`);
    
    return NextResponse.json({
      message: 'Server-side text extraction completed',
      method: 'server-side',
      pagesProcessed: pages.length,
      chunksCreated: result.chunksCreated,
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

  // Split content into sentences for better chunk boundaries while preserving math
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

  const sentences = protectedContent.match(/[^\.!?]+[\.!?]+/g) || [protectedContent];
  
  let currentChunk = '';
  let chunkStartIndex = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length > CHUNK_SIZE && currentChunk.length > 0) {
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
  pdfId: string
) {
  console.log(`🔄 Processing ${pages.length} pages server-side...`);
  
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

  // Generate embeddings for all chunks
  console.log(`🤖 Generating embeddings for ${allChunks.length} chunks (server-side)...`);
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
    
    embeddingResults = await generateEmbeddingsInBatches(embeddingChunks, 50, 2);
    console.log(`✅ Generated ${embeddingResults.length} embeddings`);
  } catch (embeddingError) {
    console.error(`❌ Failed to generate embeddings:`, embeddingError);
    throw new Error(`Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`);
  }

  console.log(`💾 Saving ${embeddingResults.length} chunks with embeddings to database (server-side)...`);
  
  // Save chunks with embeddings using raw SQL
  const dbBatchSize = 50;
  let savedChunks = 0;
  
  try {
    for (let i = 0; i < embeddingResults.length; i += dbBatchSize) {
      const batchEnd = Math.min(i + dbBatchSize, embeddingResults.length);
      const batch = embeddingResults.slice(i, batchEnd);
      
      console.log(`   💾 Saving batch ${Math.floor(i / dbBatchSize) + 1}/${Math.ceil(embeddingResults.length / dbBatchSize)} (${batch.length} chunks)`);
      
      // Use raw SQL to insert chunks with vector embeddings
      for (const result of batch) {
        const chunk = result.chunk;
        const embeddingVector = `[${result.embedding.join(',')}]`;
        
        // Use $executeRawUnsafe to properly handle vector casting
        await prisma.$executeRawUnsafe(`
          INSERT INTO "pdf_chunk" (
            "id", "content", "pageNumber", "startIndex", "endIndex", 
            "chunkIndex", "pdfId", "embedding", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::vector, NOW()
          )
        `, 
          generateId(),
          chunk.content,
          chunk.pageNumber,
          chunk.startIndex,
          chunk.endIndex,
          chunk.chunkIndex,
          chunk.pdfId,
          embeddingVector
        );
        
        savedChunks++;
      }
      
      console.log(`   ✅ Saved ${savedChunks}/${embeddingResults.length} chunks`);
    }
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