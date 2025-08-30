-- Post-migration script to ensure vector schema is correct
-- Run this after any prisma migrate command

-- Check if embedding column exists and is the right type
DO $$
BEGIN
    -- Check if the column exists and is not vector type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pdf_chunk' 
        AND column_name = 'embedding' 
        AND data_type != 'USER-DEFINED'
    ) THEN
        -- Convert to vector type
        RAISE NOTICE 'Converting embedding column to vector type';
        ALTER TABLE "pdf_chunk" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector;
    END IF;
    
    -- Ensure vector index exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'pdf_chunk' 
        AND indexname = 'pdf_chunk_embedding_cosine_idx'
    ) THEN
        RAISE NOTICE 'Creating vector index';
        CREATE INDEX pdf_chunk_embedding_cosine_idx 
        ON "pdf_chunk" 
        USING ivfflat ("embedding" vector_cosine_ops) 
        WITH (lists = 100);
    END IF;
END $$;