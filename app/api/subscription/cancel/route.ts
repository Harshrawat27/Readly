import { NextRequest, NextResponse } from 'next/server';
import { dodopayments } from '@/lib/dodopayments';
import { auth } from '@/lib/auth';
import { getUserSubscription, updateUserSubscription } from '@/lib/subscription-utils';

export async function POST(request: NextRequest) {
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
    if (!userSub?.subscription?.subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Update subscription to cancel at period end
    // Note: DodoPayments may handle cancellation differently
    // This might need to be adjusted based on their API documentation

    // Update local database
    await updateUserSubscription(session.user.id, {
      subscriptionId: userSub.subscription.subscriptionId,
      plan: userSub.user.subscriptionPlan,
      status: 'cancelled',
    });

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      subscription: {
        status: 'cancelled',
        current_period_end: userSub.subscription.currentPeriodEnd,
      }
    });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}