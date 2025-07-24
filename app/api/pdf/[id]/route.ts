import { NextRequest, NextResponse } from 'next/server';
import { getPdfFromS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const pdf = await prisma.pDF.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    // Update last accessed time
    await prisma.pDF.update({
      where: { id: pdf.id },
      data: { lastAccessedAt: new Date() },
    });

    // Get signed URL from S3
    const signedUrl = await getPdfFromS3(pdf.fileUrl);

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      url: signedUrl,
    });

  } catch (error) {
    console.error('PDF fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}