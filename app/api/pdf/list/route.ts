import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optimized query: Order by uploadedAt (newest to oldest)
    // Use the existing index [userId, uploadedAt] for maximum performance
    const pdfs = await prisma.pDF.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        uploadedAt: 'desc', // Newest to oldest, simple chronological order
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        uploadedAt: true,
        lastAccessedAt: true,
      },
      take: 50, // Limit results - most users don't have 50+ PDFs
    });

    // Set cache headers for better performance
    const response = NextResponse.json(pdfs);
    
    // Cache for 30 seconds - balances freshness with performance
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('PDF list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDFs' },
      { status: 500 }
    );
  }
}
