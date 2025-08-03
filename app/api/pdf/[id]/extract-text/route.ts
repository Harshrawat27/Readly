import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { extractTextFromPDFUrl } from '@/lib/pdf-text-extractor';
import { getPdfFromS3 } from '@/lib/s3';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
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

    // Get PDF info
    const { id } = await params;
    
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        isTextExtracted: true,
      },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    if (pdf.isTextExtracted) {
      return NextResponse.json({
        success: true,
        message: 'Text already extracted for this PDF',
        alreadyExtracted: true,
      });
    }

    // Get signed URL for the PDF
    const signedUrl = await getPdfFromS3(pdf.fileUrl);
    
    // Extract text from PDF
    const textExtractionResult = await extractTextFromPDFUrl(signedUrl);

    // Update database with extracted text
    await prisma.pDF.update({
      where: { id: pdf.id },
      data: {
        extractedText: textExtractionResult.success ? textExtractionResult.text : null,
        isTextExtracted: textExtractionResult.success,
        pageCount: textExtractionResult.pageCount || undefined,
      },
    });

    if (!textExtractionResult.success) {
      return NextResponse.json({
        success: false,
        error: textExtractionResult.error,
        message: 'Failed to extract text from PDF',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Text extracted successfully',
      pageCount: textExtractionResult.pageCount,
      textLength: textExtractionResult.text.length,
      chunksCount: textExtractionResult.chunks.length,
    });

  } catch (error) {
    console.error('Text extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}