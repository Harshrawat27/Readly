-- Add vector index for cosine similarity search
-- This will significantly improve vector search performance
CREATE INDEX IF NOT EXISTS pdf_chunk_embedding_idx 
ON "pdf_chunk" 
USING ivfflat ("embedding" vector_cosine_ops) 
WITH (lists = 100);

-- Alternative index for L2 distance (if needed)
-- CREATE INDEX IF NOT EXISTS pdf_chunk_embedding_l2_idx 
-- ON "pdf_chunk" 
-- USING ivfflat ("embedding" vector_l2_ops) 
-- WITH (lists = 100);