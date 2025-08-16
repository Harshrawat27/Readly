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

    if (!pdfId) {
      return NextResponse.json(
        { error: 'PDF ID is required' },
        { status: 400 }
      );
    }

    // Limit how many messages are returned for speed.
    // Fetch the last 200 messages (descending) and then reverse to ascending.
    const MESSAGE_FETCH_LIMIT = 200;

    const chat = await prisma.chat.findFirst({
      where: {
        userId: session.user.id,
        pdfId: pdfId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc', // get newest first so we can `take` last N quickly
          },
          take: MESSAGE_FETCH_LIMIT,
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
            imageUrl: true,
            imageType: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: 'No chat found for this PDF' },
        { status: 404 }
      );
    }

    // messages currently newest -> oldest; reverse to oldest -> newest
    const messagesAsc = [...chat.messages].reverse();

    return NextResponse.json({
      chat: {
        id: chat.id,
        messages: messagesAsc,
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
