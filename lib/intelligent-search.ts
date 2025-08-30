import prisma from '@/lib/prisma';
import { generateQueryEmbedding } from '@/lib/embeddings';

export interface SearchResult {
  id: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  similarity?: number;
  searchStrategy: string; // For debugging which strategy found the result
}

export enum QueryType {
  COMPREHENSIVE = 'comprehensive', // Needs 30-40 chunks
  SUMMARY = 'summary',
  TIMELINE = 'timeline',
  PAGE_SPECIFIC = 'page_specific',
  GENERAL = 'general',
  KEYWORD = 'keyword'
}

export enum QueryComplexity {
  SIMPLE = 'simple',        // 5-8 chunks
  MODERATE = 'moderate',    // 12-15 chunks  
  COMPREHENSIVE = 'comprehensive', // 25-40 chunks
  EXHAUSTIVE = 'exhaustive' // 50+ chunks
}

/**
 * Detect what type of query the user is making and its complexity
 */
export function detectQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase().trim();
  
  // Comprehensive queries - need lots of context
  const comprehensiveIndicators = [
    'entire', 'complete', 'full', 'comprehensive', 'detailed analysis',
    'everything about', 'all about', 'tell me about', 'explain everything',
    'complete guide', 'full story', 'entire history', 'complete overview',
    'detailed summary', 'comprehensive summary', 'full analysis',
    'complete analysis', 'entire document', 'whole document'
  ];
  
  if (comprehensiveIndicators.some(indicator => lowerQuery.includes(indicator))) {
    return QueryType.COMPREHENSIVE;
  }
  
  // Timeline/chronological queries
  const timelineIndicators = [
    'timeline', 'chronological', 'year-wise', 'history of', 'evolution',
    'progression', 'development over time', 'how it started', 'journey',
    'from beginning to end', 'through the years', 'over time',
    'step by step', 'chronology', 'sequence of events'
  ];
  
  if (timelineIndicators.some(indicator => lowerQuery.includes(indicator)) ||
      lowerQuery.match(/\d{4}.*\d{4}/) || // Contains year ranges like "1990-2000"
      lowerQuery.match(/from \d{4}/) || lowerQuery.match(/since \d{4}/)) {
    return QueryType.TIMELINE;
  }
  
  // Summary requests (but not comprehensive)
  if (lowerQuery.includes('summary') || lowerQuery.includes('summarize') || 
      lowerQuery.includes('overview') || lowerQuery.includes('main points') ||
      lowerQuery.includes('key points') || lowerQuery.includes('gist') ||
      lowerQuery.match(/what.*about/i) && lowerQuery.length < 50) {
    return QueryType.SUMMARY;
  }
  
  // Page-specific requests
  if (lowerQuery.match(/page\s*\d+/i) || lowerQuery.match(/pages\s*\d+/i) || 
      lowerQuery.includes('explain page') || lowerQuery.includes('from page')) {
    return QueryType.PAGE_SPECIFIC;
  }
  
  // Keyword-heavy queries (short, specific terms)
  if (lowerQuery.length < 30 && lowerQuery.split(' ').length <= 5) {
    return QueryType.KEYWORD;
  }
  
  return QueryType.GENERAL;
}

/**
 * Determine how many chunks are needed based on query complexity
 */
export function getRequiredChunkCount(queryType: QueryType, query: string): number {
  const queryLength = query.length;
  const wordCount = query.split(' ').length;
  
  switch (queryType) {
    case QueryType.COMPREHENSIVE:
      return Math.min(40, Math.max(30, wordCount * 2)); // 30-40 chunks
      
    case QueryType.TIMELINE:
      return Math.min(35, Math.max(25, queryLength > 100 ? 35 : 25)); // 25-35 chunks
      
    case QueryType.SUMMARY:
      // Regular summary vs detailed summary
      if (query.toLowerCase().includes('detailed') || 
          query.toLowerCase().includes('comprehensive') ||
          queryLength > 80) {
        return 20; // Detailed summary
      }
      return 15; // Regular summary
      
    case QueryType.PAGE_SPECIFIC:
      const pageNumbers = extractPageNumbers(query);
      return Math.min(15, Math.max(8, pageNumbers.length * 3)); // 3 chunks per page
      
    case QueryType.KEYWORD:
      return 8; // Simple keyword search
      
    case QueryType.GENERAL:
      // Base on query complexity
      if (queryLength > 100 || wordCount > 15) {
        return 15; // Complex general query
      }
      return 10; // Simple general query
      
    default:
      return 10;
  }
}

/**
 * Extract page numbers from queries like "page 22 to 24" or "pages 5-8"
 */
export function extractPageNumbers(query: string): number[] {
  const patterns = [
    /page\s*(\d+)\s*to\s*(\d+)/i,
    /pages\s*(\d+)\s*to\s*(\d+)/i,
    /page\s*(\d+)-(\d+)/i,
    /pages\s*(\d+)-(\d+)/i,
    /page\s*(\d+)/i,
    /pages\s*(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const start = parseInt(match[1]);
      const end = match[2] ? parseInt(match[2]) : start;
      return Array.from({length: end - start + 1}, (_, i) => start + i);
    }
  }
  
  return [];
}

/**
 * Preprocess query to make it more searchable
 */
export function preprocessQuery(query: string, queryType: QueryType): string {
  let processed = query.trim();
  
  switch (queryType) {
    case QueryType.PAGE_SPECIFIC:
      // Transform page references to content-focused queries
      processed = processed
        .replace(/explain\s+page\s*\d+(\s*(to|-)?\s*\d+)?/gi, 'explain the content about')
        .replace(/what.*page\s*\d+(\s*(to|-)?\s*\d+)?/gi, 'what is discussed about')
        .replace(/page\s*\d+(\s*(to|-)?\s*\d+)?\s*says?/gi, 'the content discusses')
        .replace(/from\s+page\s*\d+/gi, 'information about');
      break;
      
    case QueryType.SUMMARY:
      // Enhance summary queries to be more comprehensive
      if (!processed.includes('entire') && !processed.includes('whole') && !processed.includes('complete')) {
        processed = `comprehensive overview and ${processed}`;
      }
      break;
      
    case QueryType.KEYWORD:
      // Expand keyword queries to be more semantic
      processed = `information and details about ${processed}`;
      break;
  }
  
  return processed;
}

/**
 * Advanced search that combines multiple strategies
 */
export async function intelligentSearch(
  pdfId: string,
  originalQuery: string
): Promise<SearchResult[]> {
  const queryType = detectQueryType(originalQuery);
  const optimalChunkCount = getRequiredChunkCount(queryType, originalQuery);
  const pageNumbers = extractPageNumbers(originalQuery);
  
  console.log(`🧠 Query: "${originalQuery}"`);
  console.log(`🧠 Query type: ${queryType}, Optimal chunks: ${optimalChunkCount}, Pages: [${pageNumbers.join(', ')}]`);
  
  // Use different strategies based on query type
  switch (queryType) {
    case QueryType.COMPREHENSIVE:
      return await comprehensiveSearch(pdfId, originalQuery, optimalChunkCount);
      
    case QueryType.TIMELINE:
      return await timelineSearch(pdfId, originalQuery, optimalChunkCount);
      
    case QueryType.SUMMARY:
      return await summarySearch(pdfId, originalQuery, optimalChunkCount);
      
    case QueryType.PAGE_SPECIFIC:
      return await pageSpecificSearch(pdfId, originalQuery, pageNumbers, optimalChunkCount);
      
    case QueryType.KEYWORD:
      return await hybridSearch(pdfId, originalQuery, optimalChunkCount);
      
    default:
      return await semanticSearch(pdfId, originalQuery, optimalChunkCount);
  }
}

/**
 * Comprehensive search - maximum context from entire document
 */
async function comprehensiveSearch(pdfId: string, query: string, limit: number): Promise<SearchResult[]> {
  console.log(`🌍 Using comprehensive search strategy (${limit} chunks)`);
  
  try {
    // Get the best chunks from across the entire document
    const processedQuery = preprocessQuery(query, QueryType.COMPREHENSIVE);
    const queryEmbedding = await generateQueryEmbedding(processedQuery);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    // Strategy: Get top semantic matches from across the document + ensure diversity
    const chunks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      pageNumber: number;
      chunkIndex: number;
      similarity: number;
    }>>(`
      WITH diverse_chunks AS (
        SELECT 
          "id",
          "content",
          "pageNumber",
          "chunkIndex",
          1 - ("embedding" <=> $1::vector) AS similarity,
          ROW_NUMBER() OVER (
            PARTITION BY CASE 
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.2 THEN 'start'
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.4 THEN 'early'
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.6 THEN 'middle'  
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.8 THEN 'late'
              ELSE 'end'
            END 
            ORDER BY 1 - ("embedding" <=> $1::vector) DESC
          ) as section_rank
        FROM "pdf_chunk" 
        WHERE "pdfId" = $2 AND "embedding" IS NOT NULL
      )
      SELECT "id", "content", "pageNumber", "chunkIndex", similarity
      FROM diverse_chunks 
      WHERE section_rank <= ${Math.ceil(limit / 5)} -- Distribute across 5 sections
      ORDER BY similarity DESC
      LIMIT $3
    `, queryVector, pdfId, limit);
    
    return chunks.map(chunk => ({
      ...chunk,
      searchStrategy: 'comprehensive'
    }));
    
  } catch (error) {
    console.error('❌ Comprehensive search failed:', error);
    return await semanticSearch(pdfId, query, limit);
  }
}

/**
 * Timeline search - finds chronological content across the document
 */
async function timelineSearch(pdfId: string, query: string, limit: number): Promise<SearchResult[]> {
  console.log(`📅 Using timeline search strategy (${limit} chunks)`);
  
  try {
    // Strategy: Find chunks with dates/years + semantic relevance
    const processedQuery = preprocessQuery(query, QueryType.TIMELINE);
    const queryEmbedding = await generateQueryEmbedding(processedQuery);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    // First, get chunks that likely contain dates/years
    const dateChunks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      pageNumber: number;
      chunkIndex: number;
      similarity: number;
    }>>(`
      SELECT 
        "id",
        "content", 
        "pageNumber",
        "chunkIndex",
        1 - ("embedding" <=> $1::vector) AS similarity
      FROM "pdf_chunk" 
      WHERE "pdfId" = $2 
        AND "embedding" IS NOT NULL
        AND ("content" ~ '\\d{4}' OR "content" ~ '\\d{1,2}/\\d{1,2}/\\d{4}' OR "content" ~* '(january|february|march|april|may|june|july|august|september|october|november|december)')
      ORDER BY "embedding" <=> $1::vector ASC
      LIMIT ${Math.floor(limit * 0.7)}
    `, queryVector, pdfId);
    
    // Then get additional semantic matches to fill remaining slots
    const remainingSlots = limit - dateChunks.length;
    let semanticChunks: Array<{
      id: string;
      content: string;
      pageNumber: number;
      chunkIndex: number;
      similarity: number;
    }> = [];
    
    if (remainingSlots > 0) {
      semanticChunks = await prisma.$queryRawUnsafe<Array<{
        id: string;
        content: string;
        pageNumber: number;
        chunkIndex: number;
        similarity: number;
      }>>(`
        SELECT 
          "id",
          "content",
          "pageNumber", 
          "chunkIndex",
          1 - ("embedding" <=> $1::vector) AS similarity
        FROM "pdf_chunk" 
        WHERE "pdfId" = $2 
          AND "embedding" IS NOT NULL
          AND "id" NOT IN (${dateChunks.map(c => `'${c.id}'`).join(',') || "''"})
        ORDER BY "embedding" <=> $1::vector ASC
        LIMIT $3
      `, queryVector, pdfId, remainingSlots);
    }
    
    const results = [
      ...dateChunks.map(chunk => ({ ...chunk, searchStrategy: 'timeline_date' })),
      ...semanticChunks.map(chunk => ({ ...chunk, searchStrategy: 'timeline_context' }))
    ];
    
    // Sort by page number for chronological order
    return results.sort((a, b) => a.pageNumber - b.pageNumber);
    
  } catch (error) {
    console.error('❌ Timeline search failed:', error);
    return await semanticSearch(pdfId, query, limit);
  }
}

/**
 * Summary search - gets diverse chunks from across the document
 */
async function summarySearch(pdfId: string, query: string, limit: number): Promise<SearchResult[]> {
  console.log(`📋 Using summary search strategy`);
  
  try {
    // Get chunks spread across the document with some semantic relevance
    const processedQuery = preprocessQuery(query, QueryType.SUMMARY);
    const queryEmbedding = await generateQueryEmbedding(processedQuery);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    // Strategy: Get top chunks from different sections of the document
    const chunks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      pageNumber: number;
      chunkIndex: number;
      similarity: number;
    }>>(`
      WITH ranked_chunks AS (
        SELECT 
          "id",
          "content",
          "pageNumber",
          "chunkIndex",
          1 - ("embedding" <=> $1::vector) AS similarity,
          ROW_NUMBER() OVER (
            PARTITION BY CASE 
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.33 THEN 'beginning'
              WHEN "pageNumber" <= (SELECT MAX("pageNumber") FROM "pdf_chunk" WHERE "pdfId" = $2) * 0.66 THEN 'middle'
              ELSE 'end'
            END 
            ORDER BY 1 - ("embedding" <=> $1::vector) DESC
          ) as section_rank
        FROM "pdf_chunk" 
        WHERE "pdfId" = $2 AND "embedding" IS NOT NULL
      )
      SELECT "id", "content", "pageNumber", "chunkIndex", similarity
      FROM ranked_chunks 
      WHERE section_rank <= 3
      ORDER BY similarity DESC
      LIMIT $3
    `, queryVector, pdfId, limit);
    
    return chunks.map(chunk => ({
      ...chunk,
      searchStrategy: 'summary_distributed'
    }));
    
  } catch (error) {
    console.error('❌ Summary search failed:', error);
    return await fallbackSearch(pdfId, limit, 'summary_fallback');
  }
}

/**
 * Page-specific search - prioritizes specific pages but also gets context
 */
async function pageSpecificSearch(
  pdfId: string, 
  query: string, 
  pageNumbers: number[], 
  limit: number
): Promise<SearchResult[]> {
  console.log(`📄 Using page-specific search for pages: [${pageNumbers.join(', ')}]`);
  
  try {
    if (pageNumbers.length === 0) {
      return await semanticSearch(pdfId, query, limit);
    }
    
    // First, get chunks from specified pages
    const pageChunks = await prisma.pDFChunk.findMany({
      where: {
        pdfId,
        pageNumber: { in: pageNumbers }
      },
      orderBy: [
        { pageNumber: 'asc' },
        { chunkIndex: 'asc' }
      ],
      take: Math.max(limit - 2, 4), // Reserve space for context chunks
      select: {
        id: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
      },
    });
    
    console.log(`📄 Found ${pageChunks.length} chunks for pages [${pageNumbers.join(', ')}]`);
    if (pageChunks.length > 0) {
      const actualPages = [...new Set(pageChunks.map(c => c.pageNumber))];
      const missingPages = pageNumbers.filter(p => !actualPages.includes(p));
      console.log(`📄 Page coverage: [${actualPages.join(', ')}]`);
      if (missingPages.length > 0) {
        console.log(`⚠️ Missing pages in database: [${missingPages.join(', ')}] - may be empty or not processed`);
      }
    }
    
    // Only get semantic context if we have fewer page chunks than requested
    let contextChunks: SearchResult[] = [];
    if (pageChunks.length < limit) {
      const remainingSlots = limit - pageChunks.length;
      console.log(`📄 Getting ${remainingSlots} context chunks to supplement page content`);
      const processedQuery = preprocessQuery(query, QueryType.PAGE_SPECIFIC);
      contextChunks = await semanticSearch(pdfId, processedQuery, remainingSlots);
    } else {
      console.log(`📄 Sufficient page content found, skipping semantic context search`);
    }
    
    const results = [
      ...pageChunks.map(chunk => ({ ...chunk, searchStrategy: 'page_direct' })),
      ...contextChunks.map(chunk => ({ ...chunk, searchStrategy: 'page_context' }))
    ];
    
    // Remove duplicates and limit
    const uniqueResults = results.filter((chunk, index, self) => 
      self.findIndex(c => c.id === chunk.id) === index
    );
    
    return uniqueResults.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Page-specific search failed:', error);
    return await fallbackSearch(pdfId, limit, 'page_fallback');
  }
}

/**
 * Hybrid search - combines semantic and keyword matching
 */
async function hybridSearch(pdfId: string, query: string, limit: number): Promise<SearchResult[]> {
  console.log(`🔀 Using hybrid search strategy`);
  
  try {
    // Semantic search
    const semanticResults = await semanticSearch(pdfId, query, Math.ceil(limit * 0.7));
    
    // Keyword search (simple text matching for remaining slots)
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 3);
    const keywordResults = await prisma.pDFChunk.findMany({
      where: {
        pdfId,
        content: {
          contains: keywords[0], // At least one keyword match
          mode: 'insensitive'
        }
      },
      take: Math.ceil(limit * 0.3),
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        content: true,
        pageNumber: true,
        chunkIndex: true,
      },
    });
    
    const results = [
      ...semanticResults,
      ...keywordResults.map(chunk => ({ ...chunk, searchStrategy: 'keyword_match' }))
    ];
    
    // Remove duplicates and limit
    const uniqueResults = results.filter((chunk, index, self) => 
      self.findIndex(c => c.id === chunk.id) === index
    );
    
    return uniqueResults.slice(0, limit);
    
  } catch (error) {
    console.error('❌ Hybrid search failed:', error);
    return await semanticSearch(pdfId, query, limit);
  }
}

/**
 * Standard semantic search
 */
async function semanticSearch(pdfId: string, query: string, limit: number): Promise<SearchResult[]> {
  console.log(`🔍 Using semantic search strategy`);
  
  try {
    const processedQuery = preprocessQuery(query, QueryType.GENERAL);
    const queryEmbedding = await generateQueryEmbedding(processedQuery);
    const queryVector = `[${queryEmbedding.join(',')}]`;
    
    const chunks = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      pageNumber: number;
      chunkIndex: number;
      similarity: number;
    }>>(`
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
        AND 1 - ("embedding" <=> (SELECT vec FROM query_vector)) >= 0.1
      ORDER BY "embedding" <=> (SELECT vec FROM query_vector) ASC
      LIMIT $3
    `, queryVector, pdfId, limit);
    
    return chunks.map(chunk => ({
      ...chunk,
      searchStrategy: 'semantic'
    }));
    
  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return await fallbackSearch(pdfId, limit, 'semantic_fallback');
  }
}

/**
 * Fallback search when everything else fails
 */
async function fallbackSearch(pdfId: string, limit: number, strategy: string): Promise<SearchResult[]> {
  console.log(`🔄 Using fallback search`);
  
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
  
  return chunks.map(chunk => ({ ...chunk, searchStrategy: strategy }));
}