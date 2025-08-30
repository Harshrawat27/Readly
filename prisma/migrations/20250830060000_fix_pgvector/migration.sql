-- Ensure pgvector extension is properly installed
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension exists
-- This will throw an error if the extension is not available in your PostgreSQL instance