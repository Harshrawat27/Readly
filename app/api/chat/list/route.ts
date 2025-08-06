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

    const whereClause: { userId: string; pdfId?: string } = {
      userId: session.user.id,
    };

    if (pdfId) {
      whereClause.pdfId = pdfId;
    }

    const chats = await prisma.chat.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        pdf: {
          select: {
            id: true,
            title: true,
            fileName: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Chat list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}
