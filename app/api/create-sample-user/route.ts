// app/api/create-sample-user/route.ts
import { PrismaClient } from '@/lib/generated/prisma';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // Generate a random number to make emails unique
    const randomNum = Math.floor(Math.random() * 10000);

    const sampleUser = await prisma.user.create({
      data: {
        email: `sampleuser${randomNum}@example.com`,
        name: `Sample User ${randomNum}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sample user created successfully!',
      user: sampleUser,
    });
  } catch (error) {
    console.error('Error creating sample user:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create sample user',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
