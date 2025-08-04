import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pdfId, text, color, rects, x, y, width, height, pageNumber } = body;

    if (!pdfId || !text || !color || pageNumber === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const highlight = await prisma.highlight.create({
      data: {
        pdfId,
        userId: session.user.id,
        text,
        color,
        rects: rects || null, // Store rects as JSON if provided
        x: x || null, // Backward compatibility
        y: y || null, // Backward compatibility
        width: width || null, // Backward compatibility
        height: height || null, // Backward compatibility
        pageNumber,
      },
    });

    return NextResponse.json(highlight);
  } catch (error) {
    console.error('Error creating highlight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    const highlights = await prisma.highlight.findMany({
      where: {
        pdfId,
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(highlights);
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
