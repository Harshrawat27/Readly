import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { messageId, feedbackType, dislikeReason } = await request.json();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;


    // Validate required fields
    if (!messageId || !feedbackType) {
      return NextResponse.json(
        { error: 'messageId and feedbackType are required' },
        { status: 400 }
      );
    }

    if (!['like', 'dislike'].includes(feedbackType)) {
      return NextResponse.json(
        { error: 'feedbackType must be either "like" or "dislike"' },
        { status: 400 }
      );
    }

    // Verify the message exists and belongs to the user
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        userId: userId, // Ensure user can only give feedback on their own messages
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found or you do not have permission to provide feedback on this message' },
        { status: 404 }
      );
    }

    // Check if feedback already exists for this message and user
    const existingFeedback = await prisma.messageFeedback.findUnique({
      where: {
        message_user_feedback: {
          messageId,
          userId,
        },
      },
    });

    if (existingFeedback) {
      // Update existing feedback
      const updatedFeedback = await prisma.messageFeedback.update({
        where: {
          id: existingFeedback.id,
        },
        data: {
          feedbackType,
          dislikeReason: feedbackType === 'dislike' ? dislikeReason : null,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        feedback: updatedFeedback,
      });
    } else {
      // Create new feedback
      const newFeedback = await prisma.messageFeedback.create({
        data: {
          messageId,
          userId,
          feedbackType,
          dislikeReason: feedbackType === 'dislike' ? dislikeReason : null,
        },
      });

      return NextResponse.json({
        success: true,
        feedback: newFeedback,
      });
    }

  } catch (error: unknown) {
    console.error('Message feedback error:', error);

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId is required' },
        { status: 400 }
      );
    }

    // Delete feedback for this message and user
    await prisma.messageFeedback.delete({
      where: {
        message_user_feedback: {
          messageId,
          userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback removed successfully',
    });

  } catch (error: unknown) {
    console.error('Delete message feedback error:', error);

    // If the feedback doesn't exist, that's okay
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({
        success: true,
        message: 'Feedback already removed or does not exist',
      });
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const messageIds = searchParams.get('messageIds');

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Support batch requests with messageIds parameter (comma-separated)
    if (messageIds) {
      const ids = messageIds.split(',').filter(id => id.trim().length > 0);
      
      if (ids.length === 0) {
        return NextResponse.json(
          { error: 'messageIds parameter cannot be empty' },
          { status: 400 }
        );
      }

      // Get feedback for multiple messages
      const feedbacks = await prisma.messageFeedback.findMany({
        where: {
          messageId: {
            in: ids
          },
          userId,
        },
      });

      // Create a map for easy lookup
      const feedbackMap = feedbacks.reduce((acc, feedback) => {
        acc[feedback.messageId] = feedback;
        return acc;
      }, {} as Record<string, typeof feedbacks[0]>);

      // Return results for all requested message IDs
      const results = ids.reduce((acc, id) => {
        acc[id] = {
          success: true,
          feedback: feedbackMap[id] || null,
        };
        return acc;
      }, {} as Record<string, { success: boolean; feedback: typeof feedbacks[0] | null }>);

      return NextResponse.json({
        success: true,
        batch: true,
        results,
      });
    }

    // Single message request (legacy support)
    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId or messageIds is required' },
        { status: 400 }
      );
    }

    // Get feedback for this message and user
    const feedback = await prisma.messageFeedback.findUnique({
      where: {
        message_user_feedback: {
          messageId,
          userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      feedback: feedback || null,
    });

  } catch (error: unknown) {
    console.error('Get message feedback error:', error);

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}