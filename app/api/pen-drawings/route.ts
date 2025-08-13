import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  id: string;
  points: Point[];
  width: number;
  color: string;
  timestamp: number;
}

// GET - Load pen drawings for a specific PDF page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');
    const pageNumber = searchParams.get('pageNumber');

    if (!pdfId || !pageNumber) {
      return NextResponse.json(
        { error: 'Missing pdfId or pageNumber' },
        { status: 400 }
      );
    }

    // Find existing pen drawing for this PDF page
    const drawing = await prisma.penDrawing.findFirst({
      where: {
        pdfId: pdfId,
        pageNumber: parseInt(pageNumber),
      },
    });

    if (!drawing) {
      return NextResponse.json({ strokes: [] });
    }

    return NextResponse.json({
      id: drawing.id,
      pdfId: drawing.pdfId,
      pageNumber: drawing.pageNumber,
      strokes: drawing.strokes,
      createdAt: drawing.createdAt,
      updatedAt: drawing.updatedAt,
    });
  } catch (error) {
    console.error('Error loading pen drawings:', error);
    return NextResponse.json(
      { error: 'Failed to load pen drawings' },
      { status: 500 }
    );
  }
}

// POST - Save pen drawings for a specific PDF page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pdfId, pageNumber, strokes } = body;

    if (!pdfId || pageNumber === undefined || !Array.isArray(strokes)) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfId, pageNumber, strokes' },
        { status: 400 }
      );
    }

    // Validate strokes structure
    const validStrokes = strokes.every(
      (stroke: Stroke) =>
        stroke &&
        typeof stroke.id === 'string' &&
        Array.isArray(stroke.points) &&
        typeof stroke.width === 'number' &&
        typeof stroke.color === 'string' &&
        typeof stroke.timestamp === 'number'
    );

    if (!validStrokes) {
      return NextResponse.json(
        { error: 'Invalid strokes format' },
        { status: 400 }
      );
    }

    // Use upsert to either create new or update existing drawing
    const drawing = await prisma.penDrawing.upsert({
      where: {
        pdfId_pageNumber: {
          pdfId: pdfId,
          pageNumber: parseInt(pageNumber),
        },
      },
      update: {
        strokes: strokes,
        updatedAt: new Date(),
      },
      create: {
        pdfId: pdfId,
        pageNumber: parseInt(pageNumber),
        strokes: strokes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: drawing.id,
      pdfId: drawing.pdfId,
      pageNumber: drawing.pageNumber,
      strokes: drawing.strokes,
      success: true,
    });
  } catch (error) {
    console.error('Error saving pen drawings:', error);
    return NextResponse.json(
      { error: 'Failed to save pen drawings' },
      { status: 500 }
    );
  }
}

// DELETE - Delete pen drawings for a specific PDF page
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');
    const pageNumber = searchParams.get('pageNumber');

    if (!pdfId || !pageNumber) {
      return NextResponse.json(
        { error: 'Missing pdfId or pageNumber' },
        { status: 400 }
      );
    }

    await prisma.penDrawing.deleteMany({
      where: {
        pdfId: pdfId,
        pageNumber: parseInt(pageNumber),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pen drawings:', error);
    return NextResponse.json(
      { error: 'Failed to delete pen drawings' },
      { status: 500 }
    );
  }
}
