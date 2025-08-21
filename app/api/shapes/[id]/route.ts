import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const body = await request.json();
    const { 
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
      where: { id: params.id },
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    await prisma.shape.delete({
      where: { id: params.id },
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