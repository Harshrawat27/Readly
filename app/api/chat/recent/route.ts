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
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    // Get the chat first
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

    // Get recent messages with limit
    const messages = await prisma.message.findMany({
      where: {
        chatId: chat.id,
      },
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

    // Check if there are more messages
    const totalCount = await prisma.message.count({
      where: {
        chatId: chat.id,
      },
    });

    // Reverse to get chronological order
    messages.reverse();

    // Get the oldest message ID from this batch for pagination
    const oldestMessageId = messages.length > 0 ? messages[0].id : null;

    return NextResponse.json({
      chat: {
        id: chat.id,
        messages: messages,
        hasMore: totalCount > limit,
        totalCount: totalCount,
        oldestMessageId: oldestMessageId,
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
