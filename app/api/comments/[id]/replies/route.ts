import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(
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
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Verify comment exists and user has access to the PDF
    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
      },
      include: {
        pdf: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user has access to the PDF (owns the PDF or owns the comment)
    if (
      comment.pdf.userId !== session.user.id &&
      comment.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const reply = await prisma.commentReply.create({
      data: {
        content: content.trim(),
        commentId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(reply);
  } catch (error) {
    console.error('Error creating comment reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
