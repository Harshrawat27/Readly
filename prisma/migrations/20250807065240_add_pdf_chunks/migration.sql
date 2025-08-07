-- AlterTable
ALTER TABLE "pdf" ADD COLUMN     "textExtracted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "monthlyQuestionsResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "monthlyQuestionsUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "totalPdfsUploaded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pdf_chunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfId" TEXT NOT NULL,

    CONSTRAINT "pdf_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_element" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "fontSize" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "textAlign" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pdfId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "text_element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highlight" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "rects" JSONB,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "pageNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL,
    "maxPdfs" INTEGER NOT NULL,
    "maxFileSize" INTEGER NOT NULL,
    "maxQuestionsPerMonth" INTEGER NOT NULL,
    "maxPagesPerPdf" INTEGER NOT NULL,
    "features" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pdf_chunk_pdfId_pageNumber_idx" ON "pdf_chunk"("pdfId", "pageNumber");

-- CreateIndex
CREATE INDEX "pdf_chunk_pdfId_chunkIndex_idx" ON "pdf_chunk"("pdfId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_subscriptionId_key" ON "subscription"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_name_key" ON "subscription_plan"("name");

-- AddForeignKey
ALTER TABLE "pdf_chunk" ADD CONSTRAINT "pdf_chunk_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "text_element" ADD CONSTRAINT "text_element_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "text_element" ADD CONSTRAINT "text_element_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight" ADD CONSTRAINT "highlight_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight" ADD CONSTRAINT "highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
