import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const before = searchParams.get('before'); // Message ID to load before
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Build the where clause for pagination
    const whereClause: any = {
      chatId: chatId,
    };

    // If 'before' is provided, get messages before this ID
    if (before) {
      const beforeMessage = await prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });

      if (beforeMessage) {
        whereClause.createdAt = {
          lt: beforeMessage.createdAt,
        };
      }
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // Check if there are more messages before these
    let hasMore = false;
    if (messages.length > 0) {
      const olderMessageCount = await prisma.message.count({
        where: {
          chatId: chatId,
          createdAt: {
            lt: messages[messages.length - 1].createdAt,
          },
        },
      });
      hasMore = olderMessageCount > 0;
    }

    // Reverse to get chronological order
    messages.reverse();

    // Get the oldest message ID from this batch
    const oldestMessageId = messages.length > 0 ? messages[0].id : null;

    return NextResponse.json({
      messages: messages,
      hasMore: hasMore,
      oldestMessageId: oldestMessageId,
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
