// app/api/chat/recent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { getImageFromS3 } from '@/lib/s3';

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

    // OPTIMIZED: Single query using the new [userId, pdfId] index
    // Get chat with messages in one go using Prisma's include
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
        messages: {
          where: cursor ? {
            createdAt: {
              lt: new Date(cursor),
            },
          } : undefined,
          orderBy: {
            createdAt: 'desc', // Newest first
          },
          take: limit,
          select: {
            id: true,
            role: true,
            content: true,
            imageData: true,
            imageUrl: true,
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

    const messages = chat.messages;

    // Reverse to show oldest first (chronological order)
    const messagesAsc = [...messages].reverse();

    // Convert S3 keys to signed URLs and debug logging
    const messagesWithSignedUrls = await Promise.all(
      messagesAsc.map(async (msg) => {
        if (msg.imageUrl && !msg.imageUrl.startsWith('http')) {
          // It's an S3 key, convert to signed URL
          try {
            const signedUrl = await getImageFromS3(msg.imageUrl);
            // console.log('🔗 Generated signed URL for S3 key:', {
              key: msg.imageUrl,
              signedUrl: signedUrl.substring(0, 100) + '...'
            });
            return { ...msg, imageUrl: signedUrl };
          } catch (error) {
            // console.error('❌ Failed to generate signed URL for key:', msg.imageUrl, error);
            return msg; // Return original message if signed URL generation fails
          }
        }
        
        // Debug logging for all images
        if (msg.imageUrl || msg.imageData) {
          // console.log('📷 Message with image:', {
            id: msg.id,
            hasImageUrl: !!msg.imageUrl,
            hasImageData: !!msg.imageData,
            imageUrlType: msg.imageUrl?.startsWith('http') ? 'URL' : 'S3Key',
            imageDataLength: msg.imageData?.length
          });
        }
        
        return msg;
      })
    );

    // Determine if there are more messages (for pagination)
    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt.toISOString() : null;

    const response = NextResponse.json({
      chat: {
        id: chat.id,
        messages: messagesWithSignedUrls,
      },
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });

    // Add caching headers - cache for 10 seconds for instant loading
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    // console.error('Chat recent error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent chat' },
      { status: 500 }
    );
  }
}
