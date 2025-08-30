/*
  Warnings:

  - You are about to alter the column `embedding` on the `pdf_chunk` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Unsupported("vector(1536)")`.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- First, drop existing rows where embedding is text (since we'll regenerate embeddings anyway)
DELETE FROM "pdf_chunk" WHERE "embedding" IS NOT NULL;

-- AlterTable - change the embedding column to vector type
ALTER TABLE "pdf_chunk" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);