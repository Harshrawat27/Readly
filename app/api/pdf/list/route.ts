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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pdfs = await prisma.pDF.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        uploadedAt: true,
        lastAccessedAt: true,
      },
    });

    return NextResponse.json(pdfs);

  } catch (error) {
    console.error('PDF list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDFs' },
      { status: 500 }
    );
  }
}