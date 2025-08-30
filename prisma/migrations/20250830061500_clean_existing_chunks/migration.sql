-- Clear existing chunks that have incorrect vector format
-- This allows new uploads to be stored with proper vector data types
DELETE FROM "pdf_chunk" WHERE "embedding" IS NOT NULL;

-- Also mark PDFs as not extracted so they can be re-processed
UPDATE "pdf" SET "textExtracted" = false WHERE "textExtracted" = true;