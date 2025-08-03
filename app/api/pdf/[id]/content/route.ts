import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { createTextChunks, getRelevantChunks } from '@/lib/pdf-text-extractor';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const maxChunks = parseInt(searchParams.get('maxChunks') || '5');
    const chunkSize = parseInt(searchParams.get('chunkSize') || '4000');
    const getFullText = searchParams.get('full') === 'true';

    // Get PDF with text content
    const { id } = await params;

    const pdf = await prisma.pDF.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        extractedText: true,
        isTextExtracted: true,
        pageCount: true,
      },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found' },
        { status: 404 }
      );
    }

    if (!pdf.isTextExtracted || !pdf.extractedText) {
      return NextResponse.json({
        id: pdf.id,
        title: pdf.title,
        hasText: false,
        error: 'Text not extracted from this PDF. This might be a scanned/image-based PDF.',
        fullText: '',
        chunks: [],
        relevantChunks: [],
      });
    }

    // If full text is requested, return it
    if (getFullText) {
      return NextResponse.json({
        id: pdf.id,
        title: pdf.title,
        hasText: true,
        fullText: pdf.extractedText,
        textLength: pdf.extractedText.length,
        pageCount: pdf.pageCount,
      });
    }

    // Create chunks from the full text
    const chunks = createTextChunks(pdf.extractedText, {
      maxChunkSize: chunkSize,
      overlapSize: 200,
      preservePageBreaks: true,
    });

    // If there's a query, get relevant chunks
    let relevantChunks: string[] = [];
    if (query) {
      relevantChunks = getRelevantChunks(chunks, query, maxChunks);
    }

    return NextResponse.json({
      id: pdf.id,
      title: pdf.title,
      hasText: true,
      query,
      textLength: pdf.extractedText.length,
      pageCount: pdf.pageCount,
      totalChunks: chunks.length,
      chunks: query ? [] : chunks.slice(0, maxChunks), // Return first chunks if no query
      relevantChunks,
    });

  } catch (error) {
    console.error('PDF content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF content' },
      { status: 500 }
    );
  }
}

