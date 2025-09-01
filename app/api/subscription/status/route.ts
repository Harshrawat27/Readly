import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSubscription } from '@/lib/subscription-utils';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userSub = await getUserSubscription(session.user.id);
    if (!userSub) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }


    return NextResponse.json({
      plan: userSub.plan,
      subscription: userSub.subscription,
      limits: userSub.limits,
      usage: userSub.usage,
      user: {
        subscriptionPlan: userSub.user.subscriptionPlan,
        subscriptionStatus: userSub.user.subscriptionStatus,
        subscriptionEndDate: userSub.user.subscriptionEndDate,
      },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}