-- CreateTable
CREATE TABLE "pen_drawing" (
    "id" TEXT NOT NULL,
    "pdfId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "strokes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pen_drawing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pen_drawing_pdfId_pageNumber_key" ON "pen_drawing"("pdfId", "pageNumber");

-- AddForeignKey
ALTER TABLE "pen_drawing" ADD CONSTRAINT "pen_drawing_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES "pdf"("id") ON DELETE CASCADE ON UPDATE CASCADE;
