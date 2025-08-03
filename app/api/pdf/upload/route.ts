import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { extractTextFromPDF } from '@/lib/pdf-text-extractor';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const userId = session.user.id;

    // Extract text from PDF in parallel with S3 upload
    const [s3Key, textExtractionResult] = await Promise.all([
      uploadPdfToS3(fileBuffer, fileName, userId),
      extractTextFromPDF(fileBuffer)
    ]);

    // Save PDF info to database with extracted text
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: file.size,
        pageCount: textExtractionResult.pageCount,
        extractedText: textExtractionResult.success ? textExtractionResult.text : null,
        isTextExtracted: textExtractionResult.success,
        userId: userId,
      },
    });

    // Log extraction status for debugging
    if (!textExtractionResult.success) {
      console.warn(`Text extraction failed for PDF ${pdf.id}:`, textExtractionResult.error);
    } else {
      console.log(`Successfully extracted ${textExtractionResult.text.length} characters from PDF ${pdf.id}`);
    }

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      uploadedAt: pdf.uploadedAt,
      pageCount: pdf.pageCount,
      isTextExtracted: pdf.isTextExtracted,
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}