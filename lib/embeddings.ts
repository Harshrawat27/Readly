import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingChunk {
  content: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  pdfId: string;
}

export interface EmbeddingResult {
  embedding: number[];
  chunk: EmbeddingChunk;
}

/**
 * Generate embeddings for text chunks using OpenAI's text-embedding-3-small model
 */
export async function generateEmbeddings(chunks: EmbeddingChunk[]): Promise<EmbeddingResult[]> {
  if (chunks.length === 0) {
    return [];
  }

  try {
    const startTime = Date.now();
    console.log(`🤖 [${new Date().toISOString()}] Generating embeddings for ${chunks.length} chunks using OpenAI text-embedding-3-small`);
    
    // Extract text content from chunks
    const texts = chunks.map(chunk => chunk.content);
    
    // Make API call to OpenAI
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    if (!response.data || response.data.length !== chunks.length) {
      throw new Error(`Expected ${chunks.length} embeddings, got ${response.data?.length || 0}`);
    }

    // Combine embeddings with their corresponding chunks
    const results: EmbeddingResult[] = response.data.map((embeddingData, index) => ({
      embedding: embeddingData.embedding,
      chunk: chunks[index],
    }));

    const duration = Date.now() - startTime;
    console.log(`✅ Successfully generated ${results.length} embeddings in ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    return results;

  } catch (error) {
    console.error('❌ Failed to generate embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for chunks in parallel batches to optimize processing time
 * while respecting API rate limits and Vercel function timeout constraints
 */
export async function generateEmbeddingsInBatches(
  chunks: EmbeddingChunk[],
  batchSize: number = 100, // OpenAI allows up to 2048 inputs per request for text-embedding-3-small
  maxConcurrent: number = 3 // Number of parallel batch requests
): Promise<EmbeddingResult[]> {
  if (chunks.length === 0) {
    return [];
  }

  const overallStart = Date.now();
  console.log(`🔄 [${new Date().toISOString()}] Processing ${chunks.length} chunks in batches of ${batchSize} with max ${maxConcurrent} concurrent requests`);
  
  const results: EmbeddingResult[] = [];
  const batches: EmbeddingChunk[][] = [];
  
  // Split chunks into batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    batches.push(chunks.slice(i, i + batchSize));
  }

  console.log(`📊 Created ${batches.length} batches for processing`);

  // Process batches in parallel with concurrency limit
  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const batchGroup = batches.slice(i, i + maxConcurrent);
    
    console.log(`🚀 Processing batch group ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(batches.length / maxConcurrent)} (${batchGroup.length} batches)`);
    
    const batchPromises = batchGroup.map(async (batch, batchIndex) => {
      const actualBatchIndex = i + batchIndex;
      console.log(`   📦 Processing batch ${actualBatchIndex + 1}/${batches.length} (${batch.length} chunks)`);
      
      try {
        const batchResults = await generateEmbeddings(batch);
        console.log(`   ✅ Completed batch ${actualBatchIndex + 1}/${batches.length}`);
        return batchResults;
      } catch (error) {
        console.error(`   ❌ Failed batch ${actualBatchIndex + 1}/${batches.length}:`, error);
        throw error;
      }
    });

    // Wait for all batches in this group to complete
    const batchGroupResults = await Promise.all(batchPromises);
    
    // Flatten and add to results
    for (const batchResults of batchGroupResults) {
      results.push(...batchResults);
    }
    
    console.log(`✅ Completed batch group, total embeddings so far: ${results.length}/${chunks.length}`);
    
    // Add a small delay between batch groups to avoid rate limiting
    if (i + maxConcurrent < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const overallDuration = Date.now() - overallStart;
  console.log(`🎉 Successfully generated all ${results.length} embeddings in ${overallDuration}ms (${(overallDuration/1000).toFixed(1)}s)`);
  console.log(`📊 Average: ${(overallDuration/results.length).toFixed(1)}ms per embedding`);
  return results;
}

/**
 * Generate embedding for a single query text (used for similarity search)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    console.log(`🔍 Generating embedding for query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding returned from OpenAI');
    }

    console.log(`✅ Generated query embedding with ${response.data[0].embedding.length} dimensions`);
    return response.data[0].embedding;

  } catch (error) {
    console.error('❌ Failed to generate query embedding:', error);
    throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}