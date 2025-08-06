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

    // Single optimized query to get the most recent chat with all messages
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
            createdAt: 'asc', // Important: ASC for proper message order
          },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
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

    // Return optimized response
    return NextResponse.json({
      chat: {
        id: chat.id,
        messages: chat.messages,
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
