import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface CreateShapeRequest {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  color?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  pageNumber: number;
  zIndex?: number;
  pdfId: string;
}

// GET - Load shapes for a specific PDF page
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pdfId = searchParams.get('pdfId');
    const pageNumber = searchParams.get('pageNumber');

    if (!pdfId) {
      return NextResponse.json(
        { error: 'Missing pdfId parameter' },
        { status: 400 }
      );
    }

    const whereClause: {
      pdfId: string;
      userId: string;
      pageNumber?: number;
    } = {
      pdfId,
      userId: session.user.id,
    };

    if (pageNumber) {
      whereClause.pageNumber = parseInt(pageNumber);
    }

    const shapes = await prisma.shape.findMany({
      where: whereClause,
      orderBy: [
        { pageNumber: 'asc' },
        { zIndex: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(shapes);
  } catch (error) {
    console.error('Error loading shapes:', error);
    return NextResponse.json(
      { error: 'Failed to load shapes' },
      { status: 500 }
    );
  }
}

// POST - Create a new shape
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateShapeRequest = await request.json();
    const {
      type,
      x,
      y,
      width,
      height,
      rotation = 0,
      color = '#000000',
      strokeWidth = 2,
      fillColor,
      opacity = 1,
      pageNumber,
      zIndex = 0,
      pdfId,
    } = body;

    // Validate required fields
    if (!type || x === undefined || y === undefined || width === undefined || 
        height === undefined || !pageNumber || !pdfId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate shape type
    const validShapeTypes = ['rectangle', 'circle', 'arrow', 'line'];
    if (!validShapeTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid shape type' },
        { status: 400 }
      );
    }

    // Verify PDF ownership
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: 'PDF not found or access denied' },
        { status: 403 }
      );
    }

    const shape = await prisma.shape.create({
      data: {
        type,
        x,
        y,
        width,
        height,
        rotation,
        color,
        strokeWidth,
        fillColor,
        opacity,
        pageNumber,
        zIndex,
        pdfId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(shape, { status: 201 });
  } catch (error) {
    console.error('Error creating shape:', error);
    return NextResponse.json(
      { error: 'Failed to create shape' },
      { status: 500 }
    );
  }
}