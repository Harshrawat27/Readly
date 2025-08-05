import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { canUserPerformAction, incrementPdfUpload } from '@/lib/subscription-utils';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const userId = session.user.id;

    // Get PDF page count
    let pageCount = 0;
    try {
      const pdfDoc = await getDocument({ data: fileBuffer }).promise;
      pageCount = pdfDoc.numPages;
    } catch (error) {
      console.error('Error reading PDF:', error);
      return NextResponse.json(
        { error: 'Invalid PDF file' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const canUpload = await canUserPerformAction(userId, 'upload_pdf', {
      fileSize: file.size,
      pageCount: pageCount
    });

    if (!canUpload.allowed) {
      return NextResponse.json(
        { 
          error: canUpload.reason,
          requiresUpgrade: canUpload.requiresUpgrade || false
        },
        { status: 403 }
      );
    }

    // Upload to S3
    const s3Key = await uploadPdfToS3(fileBuffer, fileName, userId);

    // Save PDF info to database
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: file.size,
        pageCount: pageCount,
        userId: userId,
      },
    });

    // Increment user's PDF upload count
    await incrementPdfUpload(userId);

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      uploadedAt: pdf.uploadedAt,
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}