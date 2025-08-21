import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfId = searchParams.get('pdfId');
    const pageNumber = searchParams.get('pageNumber');

    if (!pdfId) {
      return NextResponse.json({ error: 'PDF ID is required' }, { status: 400 });
    }

    const whereCondition: { pdfId: string; pageNumber?: number } = { pdfId };
    
    if (pageNumber) {
      whereCondition.pageNumber = parseInt(pageNumber);
    }

    const shapes = await prisma.shape.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(shapes);
  } catch (error) {
    console.error('Error fetching shapes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shapes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      pdfId, 
      pageNumber, 
      userId,
      type, 
      x, 
      y, 
      width, 
      height, 
      rotation = 0, 
      color = '#000000', 
      strokeWidth = 2, 
      fillColor, 
      opacity = 1 
    } = body;

    // Validate required fields
    if (!pdfId || !pageNumber || !userId || !type || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: pdfId, pageNumber, userId, type, x, y' },
        { status: 400 }
      );
    }

    // Validate shape type
    const validTypes = ['rectangle', 'ellipse', 'line', 'arrow'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid shape type. Must be: rectangle, ellipse, line, or arrow' },
        { status: 400 }
      );
    }

    const shape = await prisma.shape.create({
      data: {
        pdfId,
        pageNumber: parseInt(pageNumber),
        userId,
        type,
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(width || 100),
        height: parseFloat(height || 100),
        rotation: parseFloat(rotation),
        color,
        strokeWidth: parseFloat(strokeWidth),
        fillColor,
        opacity: parseFloat(opacity),
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      x, 
      y, 
      width, 
      height, 
      rotation, 
      color, 
      strokeWidth, 
      fillColor, 
      opacity,
      selected
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Shape ID is required' },
        { status: 400 }
      );
    }

    // Build update data dynamically
    const updateData: Record<string, unknown> = {};
    if (x !== undefined) updateData.x = parseFloat(x);
    if (y !== undefined) updateData.y = parseFloat(y);
    if (width !== undefined) updateData.width = parseFloat(width);
    if (height !== undefined) updateData.height = parseFloat(height);
    if (rotation !== undefined) updateData.rotation = parseFloat(rotation);
    if (color !== undefined) updateData.color = color;
    if (strokeWidth !== undefined) updateData.strokeWidth = parseFloat(strokeWidth);
    if (fillColor !== undefined) updateData.fillColor = fillColor;
    if (opacity !== undefined) updateData.opacity = parseFloat(opacity);
    if (selected !== undefined) updateData.selected = selected;

    const shape = await prisma.shape.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(shape);
  } catch (error) {
    console.error('Error updating shape:', error);
    return NextResponse.json(
      { error: 'Failed to update shape' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Shape ID is required' },
        { status: 400 }
      );
    }

    await prisma.shape.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shape:', error);
    return NextResponse.json(
      { error: 'Failed to delete shape' },
      { status: 500 }
    );
  }
}