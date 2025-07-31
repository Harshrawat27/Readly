import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

    // Verify user has access to this PDF
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const texts = await prisma.textElement.findMany({
      where: {
        pdfId: pdfId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(texts);
  } catch (error) {
    console.error('Error fetching texts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, x, y, pageNumber, width, fontSize, color, textAlign, pdfId } = await request.json();

    if (
      !content ||
      !pdfId ||
      x === undefined ||
      y === undefined ||
      !pageNumber ||
      !width ||
      !fontSize ||
      !color ||
      !textAlign
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user has access to this PDF
    const pdf = await prisma.pDF.findFirst({
      where: {
        id: pdfId,
        userId: session.user.id,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

    const textElement = await prisma.textElement.create({
      data: {
        content,
        x: parseFloat(x),
        y: parseFloat(y),
        pageNumber: parseInt(pageNumber),
        width: parseInt(width),
        fontSize: parseInt(fontSize),
        color,
        textAlign,
        pdfId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(textElement);
  } catch (error) {
    console.error('Error creating text:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}