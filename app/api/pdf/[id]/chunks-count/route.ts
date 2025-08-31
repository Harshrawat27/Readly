import { NextRequest, NextResponse } from 'next/server';
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

    const resolvedParams = await params;
    const pdfId = resolvedParams.id;
    const userId = session.user.id;

    // Verify PDF belongs to user
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: userId,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    // Count all chunks for this PDF (if chunks exist, processing is done or in progress)
    const chunkCount = await prisma.pDFChunk.count({
      where: {
        pdfId: pdfId,
      },
    });

    return NextResponse.json({ 
      count: chunkCount,
      pdfId: pdfId,
      textExtracted: pdf.textExtracted 
    });

  } catch (error) {
    console.error('Chunks count API error:', error);
    return NextResponse.json(
      { error: 'Failed to get chunk count' },
      { status: 500 }
    );
  }
}