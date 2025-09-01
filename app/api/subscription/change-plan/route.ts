import { NextRequest, NextResponse } from 'next/server';
import { dodopayments } from '@/lib/dodopayments';
import { auth } from '@/lib/auth';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import { getUserSubscription, updateUserSubscription } from '@/lib/subscription-utils';
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

    const { newPlanName, newProductId } = await request.json();

    // Get user's current subscription
    const userSub = await getUserSubscription(session.user.id);
    if (!userSub?.subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const { subscription: currentSub } = userSub;
    const currentPlan = SUBSCRIPTION_PLANS[userSub.user.subscriptionPlan];

    if (!currentPlan) {
      return NextResponse.json(
        { error: 'Invalid current plan configuration' },
        { status: 400 }
      );
    }

    // Handle "free plan" selection as cancellation
    if (newPlanName === 'free') {
      // Cancel the subscription at end of billing cycle
      try {
        // Cancel subscription in DodoPayments
        await dodopayments.subscriptions.update(currentSub.subscriptionId, {
          cancel_at_next_billing_date: true
        });

        // Update local database to mark as cancelled at period end
        await prisma.subscription.update({
          where: { subscriptionId: currentSub.subscriptionId },
          data: { 
            cancelAtPeriodEnd: true,
            cancelledAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: `Your subscription will be cancelled at the end of your billing cycle (${new Date(currentSub.currentPeriodEnd).toLocaleDateString()}). You'll continue to have access to your current features until then.`,
          planChange: {
            from: userSub.user.subscriptionPlan,
            to: 'free',
            type: 'cancellation',
            effectiveDate: currentSub.currentPeriodEnd,
          },
        });
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        return NextResponse.json(
          { error: 'Failed to cancel subscription' },
          { status: 500 }
        );
      }
    }

    // Validate new plan
    if (!newProductId) {
      return NextResponse.json(
        { error: 'Product ID is required for plan changes' },
        { status: 400 }
      );
    }

    const newPlan = SUBSCRIPTION_PLANS[newPlanName];
    if (!newPlan) {
      return NextResponse.json(
        { error: 'Invalid plan configuration' },
        { status: 400 }
      );
    }

    // Check if it's the same plan
    if (userSub.user.subscriptionPlan === newPlanName) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      );
    }

    // Use prorated_immediately for all plan changes (both upgrades and downgrades)
    // This will handle credits automatically - no refunds for downgrades, charges for upgrades
    const response = await dodopayments.subscriptions.changePlan(
      currentSub.subscriptionId,
      {
        product_id: newProductId,
        proration_billing_mode: 'prorated_immediately',
        quantity: 1,
      }
    );

    // Update the subscription in our database immediately
    await updateUserSubscription(session.user.id, {
      subscriptionId: currentSub.subscriptionId,
      customerId: currentSub.customerId,
      plan: newPlanName,
      status: 'active',
      currentPeriodStart: currentSub.currentPeriodStart,
      currentPeriodEnd: currentSub.currentPeriodEnd,
      productId: newProductId,
    });

    const isUpgrade = newPlan.price > currentPlan.price;
    const message = isUpgrade 
      ? 'Plan upgraded successfully with prorated billing'
      : 'Plan changed successfully. Any unused credits have been applied to your new plan.';

    return NextResponse.json({
      success: true,
      message,
      planChange: {
        from: userSub.user.subscriptionPlan,
        to: newPlanName,
        type: isUpgrade ? 'upgrade' : 'downgrade',
        prorated: true,
        effectiveDate: 'immediate',
      },
      response,
    });
  } catch (error) {
    console.error('Plan change error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to change plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}