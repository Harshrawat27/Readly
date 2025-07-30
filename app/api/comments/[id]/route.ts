import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const commentId = id;
    const updates = await request.json();

    // Find the comment and verify ownership
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId: session.user.id,
      },
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Allowed fields to update
    const allowedUpdates = ['x', 'y', 'content', 'resolved'];
    const updateData: any = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'x' || key === 'y') {
          updateData[key] = parseFloat(updates[key]);
        } else if (key === 'resolved') {
          updateData[key] = Boolean(updates[key]);
        } else {
          updateData[key] = updates[key];
        }
      }
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const commentId = id;

    // Find the comment and verify ownership
    const existingComment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        userId: session.user.id,
      },
    });

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
