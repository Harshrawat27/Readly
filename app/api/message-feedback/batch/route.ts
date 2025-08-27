import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageIdsParam = searchParams.get('messageIds');

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    if (!messageIdsParam) {
      return NextResponse.json(
        { error: 'messageIds parameter is required' },
        { status: 400 }
      );
    }

    // Parse comma-separated messageIds
    const messageIds = messageIdsParam.split(',').map(id => id.trim()).filter(id => id.length > 0);

    if (messageIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one messageId is required' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (messageIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 messageIds allowed per batch request' },
        { status: 400 }
      );
    }

    // Get feedback for all messages in one query
    const feedbackList = await prisma.messageFeedback.findMany({
      where: {
        messageId: {
          in: messageIds,
        },
        userId: userId,
      },
    });

    // Create a map for easy lookup
    const feedbackMap: Record<string, { feedbackType: string; dislikeReason?: string | null }> = {};
    feedbackList.forEach(feedback => {
      feedbackMap[feedback.messageId] = {
        feedbackType: feedback.feedbackType,
        dislikeReason: feedback.dislikeReason
      };
    });

    return NextResponse.json({
      success: true,
      feedback: feedbackMap,
    });

  } catch (error: unknown) {
    console.error('Batch message feedback error:', error);

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}