import prisma from '@/lib/prisma';
import { generateQueryEmbedding } from '@/lib/embeddings';

export interface RelevantChunk {
  id: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  similarity?: number;
}

/**
 * Find relevant PDF chunks using vector similarity search
 */
export async function findRelevantChunks(
  pdfId: string,
  query: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<RelevantChunk[]> {
  try {
    // If no query provided, return first few chunks as fallback
    if (!query.trim()) {
      // console.log('🔍 No query provided, returning first chunks as fallback');
      const chunks = await prisma.pDFChunk.findMany({
        where: { pdfId },
        orderBy: { chunkIndex: 'asc' },
        take: limit,
        select: {
          id: true,
          content: true,
          pageNumber: true,
          chunkIndex: true,
        },
      });
      return chunks;
    }

    // Generate embedding for the query
    // console.log(
    //   `🔍 Finding relevant chunks for query: "${query.substring(0, 100)}${
    //     query.length > 100 ? '...' : ''
    //   }"`
    // );
    const queryEmbedding = await generateQueryEmbedding(query);

    // Debug: Check if there are any chunks with embeddings first
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `
      SELECT COUNT(*) as count 
      FROM "pdf_chunk" 
      WHERE "pdfId" = $1 AND "embedding" IS NOT NULL
    `,
      pdfId
    );
    const totalChunksWithEmbeddings = Number(result[0].count);
    // console.log(
    //   `📊 Total chunks with embeddings for PDF ${pdfId}: ${totalChunksWithEmbeddings}`
    // );

    if (totalChunksWithEmbeddings === 0) {
      // console.log(
      //   '⚠️ No chunks have embeddings! Falling back to regular chunks'
      // );
      const fallbackChunks = await prisma.pDFChunk.findMany({
        where: { pdfId },
        orderBy: { chunkIndex: 'asc' },
        take: limit,
        select: {
          id: true,
          content: true,
          pageNumber: true,
          chunkIndex: true,
        },
      });
      return fallbackChunks;
    }

    // Use pgvector's cosine similarity search
    // Note: <=> is cosine distance, <-> is L2 distance, <#> is inner product
    const queryVector = `[${queryEmbedding.join(',')}]`;

    const chunks = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        pageNumber: number;
        chunkIndex: number;
        similarity: number;
      }>
    >(
      `
      WITH query_vector AS (SELECT $1::vector as vec)
      SELECT 
        "id",
        "content",
        "pageNumber",
        "chunkIndex",
        1 - ("embedding" <=> (SELECT vec FROM query_vector)) AS similarity
      FROM "pdf_chunk" 
      WHERE "pdfId" = $2 
        AND "embedding" IS NOT NULL
        AND 1 - ("embedding" <=> (SELECT vec FROM query_vector)) >= $3
      ORDER BY "embedding" <=> (SELECT vec FROM query_vector) ASC
      LIMIT $4
    `,
      queryVector,
      pdfId,
      similarityThreshold,
      limit
    );

    // console.log(
    //   `✅ Found ${chunks.length} relevant chunks with similarity >= ${similarityThreshold}`
    // );

    // Debug: Log similarity scores for troubleshooting
    if (chunks.length > 0) {
      // console.log(
      //   '📊 Top similarity scores:',
      //   chunks
      //     .slice(0, 3)
      //     .map((c) => `${c.similarity?.toFixed(3)}`)
      //     .join(', ')
      // );
    } else {
      // Try to get ANY chunks regardless of threshold to see what scores we're getting
      // console.log('🔍 Checking what similarity scores exist (no threshold)...');
      try {
        const allScores = await prisma.$queryRawUnsafe<
          Array<{
            similarity: number;
            pageNumber: number;
          }>
        >(
          `
          WITH query_vector AS (SELECT $1::vector as vec)
          SELECT 
            "pageNumber",
            1 - ("embedding" <=> (SELECT vec FROM query_vector)) AS similarity
          FROM "pdf_chunk" 
          WHERE "pdfId" = $2 
            AND "embedding" IS NOT NULL
          ORDER BY "embedding" <=> (SELECT vec FROM query_vector) ASC
          LIMIT 5
        `,
          queryVector,
          pdfId
        );

        // console.log(
        //   '📊 All similarity scores (top 5):',
        //   allScores
        //     .map((s) => `Page ${s.pageNumber}: ${s.similarity?.toFixed(3)}`)
        //     .join(', ')
        // );
      } catch (debugError) {
        // console.error('❌ Debug query failed:', debugError);
      }
    }

    // If no chunks meet the similarity threshold, fall back to first chunks
    if (chunks.length === 0) {
      // console.log(
      //   '⚠️ No chunks met similarity threshold, falling back to first chunks'
      // );
      const fallbackChunks = await prisma.pDFChunk.findMany({
        where: { pdfId },
        orderBy: { chunkIndex: 'asc' },
        take: limit,
        select: {
          id: true,
          content: true,
          pageNumber: true,
          chunkIndex: true,
        },
      });
      return fallbackChunks;
    }

    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      similarity: chunk.similarity,
    }));
  } catch (error) {
    // console.error('❌ Vector search error:', error);

    // Fallback to simple text chunks if vector search fails
    // console.log('🔄 Falling back to non-vector chunk retrieval');
    const fallbackChunks = await prisma.pDFChunk.findMany({
      where: { pdfId },
      orderBy: { chunkIndex: 'asc' },
      take: limit,
      select: {
        id: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
      },
    });

    return fallbackChunks;
  }
}

/**
 * Search across multiple PDFs (for future use)
 */
export async function searchAcrossPDFs(
  userId: string,
  query: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<Array<RelevantChunk & { pdfId: string; pdfTitle: string }>> {
  try {
    if (!query.trim()) {
      return [];
    }

    // console.log(
    //   `🔍 Searching across user's PDFs for: "${query.substring(0, 100)}${
    //     query.length > 100 ? '...' : ''
    //   }"`
    // );
    const queryEmbedding = await generateQueryEmbedding(query);

    const queryVector = `[${queryEmbedding.join(',')}]`;

    const results = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        pageNumber: number;
        chunkIndex: number;
        pdfId: string;
        pdfTitle: string;
        similarity: number;
      }>
    >(
      `
      WITH query_vector AS (SELECT $1::vector as vec)
      SELECT 
        pc."id",
        pc."content",
        pc."pageNumber",
        pc."chunkIndex",
        pc."pdfId",
        p."title" as "pdfTitle",
        1 - (pc."embedding" <=> (SELECT vec FROM query_vector)) AS similarity
      FROM "pdf_chunk" pc
      JOIN "pdf" p ON pc."pdfId" = p."id"
      WHERE p."userId" = $2
        AND pc."embedding" IS NOT NULL
        AND 1 - (pc."embedding" <=> (SELECT vec FROM query_vector)) >= $3
      ORDER BY pc."embedding" <=> (SELECT vec FROM query_vector) ASC
      LIMIT $4
    `,
      queryVector,
      userId,
      similarityThreshold,
      limit
    );

    // console.log(`✅ Found ${results.length} relevant chunks across all PDFs`);
    return results;
  } catch (error) {
    // console.error('❌ Cross-PDF search error:', error);
    return [];
  }
}
