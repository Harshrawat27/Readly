-- AlterTable
ALTER TABLE "message" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "monthlyPdfsResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthlyPdfsUploaded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMessagesCreated" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "shape" (
    "id" TEXT NOT NULL,
    "pdfId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotation" DOUBLE PRECISION DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "strokeWidth" DOUBLE PRECISION DEFAULT 2,
    "fillColor" TEXT,
    "opacity" DOUBLE PRECISION DEFAULT 1,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_feedback" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "dislikeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shape_pdfId_pageNumber_idx" ON "shape"("pdfId", "pageNumber");

-- CreateIndex
CREATE INDEX "message_feedback_messageId_idx" ON "message_feedback"("messageId");

-- CreateIndex
CREATE INDEX "message_feedback_userId_idx" ON "message_feedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "message_feedback_messageId_userId_key" ON "message_feedback"("messageId", "userId");

-- CreateIndex
CREATE INDEX "chat_userId_pdfId_idx" ON "chat"("userId", "pdfId");

-- CreateIndex
CREATE INDEX "chat_userId_updatedAt_idx" ON "chat"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "chat_pdfId_updatedAt_idx" ON "chat"("pdfId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "pdf_userId_lastAccessedAt_idx" ON "pdf"("userId", "lastAccessedAt" DESC);

-- AddForeignKey
ALTER TABLE "shape" ADD CONSTRAINT "shape_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shape" ADD CONSTRAINT "shape_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
