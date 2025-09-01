import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserSubscription, updateUserSubscription } from '@/lib/subscription-utils';
import { dodopayments } from '@/lib/dodopayments';
import prisma from '@/lib/prisma';

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

    // Update subscription to cancel at period end in DodoPayments
    try {
      // Cancel subscription in DodoPayments
      await dodopayments.subscriptions.update(userSub.subscription.subscriptionId, {
        cancel_at_next_billing_date: true
      });

      // Update local database to mark as cancelled at period end
      await prisma.subscription.update({
        where: { subscriptionId: userSub.subscription.subscriptionId },
        data: { 
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
        },
      });

      return NextResponse.json({
        message: `Subscription cancelled successfully. You'll continue to have access until ${new Date(userSub.subscription.currentPeriodEnd).toLocaleDateString()}.`,
        subscription: {
          status: 'cancelled',
          current_period_end: userSub.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: true,
        }
      });
    } catch (error) {
      console.error('Failed to cancel subscription in DodoPayments:', error);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}