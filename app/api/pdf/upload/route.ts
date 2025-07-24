import { NextRequest, NextResponse } from 'next/server';
import { uploadPdfToS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

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

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const userId = session.user.id;

    // Upload to S3
    const s3Key = await uploadPdfToS3(fileBuffer, fileName, userId);

    // Save PDF info to database
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: file.size,
        userId: userId,
      },
    });

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