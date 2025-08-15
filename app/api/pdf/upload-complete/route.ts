import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { incrementPdfUpload } from '@/lib/subscription-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { s3Key, fileName, fileSize } = await request.json();

    if (!s3Key || !fileName || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: s3Key, fileName, fileSize' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    console.log(`💾 Completing upload for user: ${userId}`);
    console.log(`🔑 S3 Key: ${s3Key}`);
    console.log(`📁 File: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    // Save PDF info to database
    const pdf = await prisma.pDF.create({
      data: {
        title: fileName.replace('.pdf', ''),
        fileName: fileName,
        fileUrl: s3Key,
        fileSize: fileSize,
        pageCount: 1, // Will be updated when text is extracted
        userId: userId,
      },
    });

    console.log(`✅ PDF saved to database with ID: ${pdf.id}`);

    // Increment user's PDF upload count
    await incrementPdfUpload(userId);

    console.log(`🎉 Upload completed successfully`);

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      uploadedAt: pdf.uploadedAt,
    });

  } catch (error) {
    console.error('❌ Error completing upload:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}