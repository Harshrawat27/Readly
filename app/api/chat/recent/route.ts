// app/api/chat/recent/route.ts
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
    const pdfId = searchParams.get('pdfId');
    const cursor = searchParams.get('cursor'); // For pagination
    const limit = parseInt(searchParams.get('limit') || '50'); // Default 50 messages

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    // Find the chat first
    const chat = await prisma.chat.findFirst({
      where: {
        userId: session.user.id,
        pdfId: pdfId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: 'No chat found for this PDF' },
        { status: 404 }
      );
    }

    // Build where clause for cursor-based pagination
    const whereClause: {
      chatId: string;
      createdAt?: {
        lt: Date;
      };
    } = {
      chatId: chat.id,
    };

    // If cursor is provided, fetch messages older than cursor
    if (cursor) {
      whereClause.createdAt = {
        lt: new Date(cursor),
      };
    }

    // Fetch messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc', // Newest first
      },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // Reverse to show oldest first (chronological order)
    const messagesAsc = [...messages].reverse();

    // Determine if there are more messages (for pagination)
    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({
      chat: {
        id: chat.id,
        messages: messagesAsc,
      },
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error) {
    console.error('Chat recent error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent chat' },
      { status: 500 }
    );
  }
}
