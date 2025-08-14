import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

interface UpdateShapeRequest {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  zIndex?: number;
}

// PUT - Update a shape
export async function PUT(
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
    const body: UpdateShapeRequest = await request.json();

    // Verify shape ownership
    const existingShape = await prisma.shape.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingShape) {
      return NextResponse.json(
        { error: 'Shape not found or access denied' },
        { status: 404 }
      );
    }

    const updatedShape = await prisma.shape.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedShape);
  } catch (error) {
    console.error('Error updating shape:', error);
    return NextResponse.json(
      { error: 'Failed to update shape' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a shape
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

    // Verify shape ownership
    const existingShape = await prisma.shape.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingShape) {
      return NextResponse.json(
        { error: 'Shape not found or access denied' },
        { status: 404 }
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