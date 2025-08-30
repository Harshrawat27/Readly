-- First, check if there are any rows with embedding data and drop them if they exist
-- because we need to change the column type
DELETE FROM "pdf_chunk" WHERE "embedding" IS NOT NULL;

-- Now alter the column type from TEXT to VECTOR
-- This should work since we cleared the data
ALTER TABLE "pdf_chunk" 
ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;

-- Add vector index for cosine similarity search
CREATE INDEX IF NOT EXISTS pdf_chunk_embedding_cosine_idx 
ON "pdf_chunk" 
USING ivfflat ("embedding" vector_cosine_ops) 
WITH (lists = 100);

-- Mark PDFs as not extracted so they can be re-processed with correct embeddings
UPDATE "pdf" SET "textExtracted" = false WHERE "textExtracted" = true;