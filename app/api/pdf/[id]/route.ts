import { NextRequest, NextResponse } from 'next/server';
import { getPdfFromS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pdf = await prisma.pDF.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Update last accessed time
    await prisma.pDF.update({
      where: { id: pdf.id },
      data: { lastAccessedAt: new Date() },
    });

    // Get signed URL from S3 with longer expiry for better caching
    const signedUrl = await getPdfFromS3(pdf.fileUrl);

    const response = NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      url: signedUrl,
    });

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    response.headers.set('ETag', `"${pdf.id}-${pdf.lastAccessedAt.getTime()}"`);
    
    return response;
  } catch (error) {
    console.error('PDF fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pdf = await prisma.pDF.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Delete the PDF record from database
    await prisma.pDF.delete({
      where: { id: pdf.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PDF delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete PDF' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const pdf = await prisma.pDF.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Update the PDF title
    const updatedPdf = await prisma.pDF.update({
      where: { id: pdf.id },
      data: { title: title.trim() },
    });

    return NextResponse.json({
      id: updatedPdf.id,
      title: updatedPdf.title,
      fileName: updatedPdf.fileName,
    });
  } catch (error) {
    console.error('PDF update error:', error);
    return NextResponse.json(
      { error: 'Failed to update PDF' },
      { status: 500 }
    );
  }
}
