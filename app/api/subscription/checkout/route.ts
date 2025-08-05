import { NextRequest, NextResponse } from 'next/server';
import { dodopayments } from '@/lib/dodopayments';
import { auth } from '@/lib/auth';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

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

    const { productId, planName } = await request.json();

    if (!productId || !planName || planName === 'free') {
      return NextResponse.json(
        { error: 'Product ID and plan name are required' },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS[planName];
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    const response = await dodopayments.subscriptions.create({
      billing: {
        city: "Not Provided",
        country: "US",
        state: "Not Provided",
        street: "Not Provided",
        zipcode: "00000",
      },
      customer: {
        email: session.user.email,
        name: session.user.name || 'Customer',
      },
      payment_link: true,
      product_id: productId,
      quantity: 1,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success`,
      metadata: {
        userId: session.user.id,
        planName: planName,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Subscription checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}