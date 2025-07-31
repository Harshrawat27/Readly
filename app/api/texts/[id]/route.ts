import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

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
    const updates = await request.json();

    // Find the text and verify ownership
    const textElement = await prisma.textElement.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!textElement) {
      return NextResponse.json({ error: 'Text not found' }, { status: 404 });
    }

    // Prepare update data with type conversion
    const updateData: any = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.x !== undefined) updateData.x = parseFloat(updates.x);
    if (updates.y !== undefined) updateData.y = parseFloat(updates.y);
    if (updates.width !== undefined) updateData.width = parseInt(updates.width);
    if (updates.fontSize !== undefined) updateData.fontSize = parseInt(updates.fontSize);
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.textAlign !== undefined) updateData.textAlign = updates.textAlign;

    const updatedText = await prisma.textElement.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedText);
  } catch (error) {
    console.error('Error updating text:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

    // Find the text and verify ownership
    const textElement = await prisma.textElement.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!textElement) {
      return NextResponse.json({ error: 'Text not found' }, { status: 404 });
    }

    await prisma.textElement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting text:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}