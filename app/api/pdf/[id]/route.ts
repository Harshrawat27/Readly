// app/api/pdf/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPdfFromS3 } from '@/lib/s3';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Note: Using Node.js runtime for Prisma compatibility

// Cache configuration
const CACHE_DURATION = 3600; // 1 hour in seconds

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

    // Check if we have a cached response
    // const cacheKey = `pdf_${id}_${session.user.id}`;

    const pdf = await prisma.pDF.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileUrl: true,
        uploadedAt: true,
        lastAccessedAt: true,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Update last accessed time in background (don't wait)
    prisma.pDF
      .update({
        where: { id: pdf.id },
        data: { lastAccessedAt: new Date() },
      })
      .catch(console.error);

    // Get signed URL from S3 with optimizations
    const signedUrl = await getPdfFromS3(pdf.fileUrl);

    const response = NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      fileName: pdf.fileName,
      url: signedUrl,
      uploadedAt: pdf.uploadedAt,
      lastAccessedAt: pdf.lastAccessedAt,
    });

    // Set aggressive caching headers
    response.headers.set(
      'Cache-Control',
      `private, max-age=${CACHE_DURATION}, stale-while-revalidate=3600`
    );
    response.headers.set('ETag', `"${pdf.id}-${pdf.lastAccessedAt.getTime()}"`);

    // Check if client has valid cache
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch === `"${pdf.id}-${pdf.lastAccessedAt.getTime()}"`) {
      return new NextResponse(null, { status: 304 });
    }

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
