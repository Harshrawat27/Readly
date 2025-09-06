import { NextRequest, NextResponse } from 'next/server';
import { dodopayments } from '@/lib/dodopayments';
import { auth } from '@/lib/auth';

const SUBSCRIPTION_PRODUCTS = [
  {
    name: 'Pro Monthly',
    description:
      '10 PDF uploads per month, 1,000 questions, up to 200 pages per PDF',
    price: 10,
    interval: 'month',
    planType: 'pro',
  },
  {
    name: 'Pro Yearly',
    description:
      '10 PDF uploads per month, 1,000 questions, up to 200 pages per PDF - Save 16%',
    price: 100,
    interval: 'year',
    planType: 'pro',
  },
  {
    name: 'Ultimate Monthly',
    description:
      'Unlimited PDF uploads, unlimited questions, up to 2000 pages per PDF',
    price: 15,
    interval: 'month',
    planType: 'ultimate',
  },
  {
    name: 'Ultimate Yearly',
    description:
      'Unlimited PDF uploads, unlimited questions, up to 2000 pages per PDF - Save 37%',
    price: 150,
    interval: 'year',
    planType: 'ultimate',
  },
];

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (optional: add admin check)
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    for (const plan of SUBSCRIPTION_PRODUCTS) {
      try {
        // console.log(`Creating product: ${plan.name}`);

        const product = await dodopayments.products.create({
          price: {
            type: 'recurring_price',
            price: plan.price * 100, // Convert to cents
            currency: 'USD',
            payment_frequency_count: 1,
            payment_frequency_interval: plan.interval === 'month' ? 'Month' : 'Year',
            subscription_period_count: 10,
            subscription_period_interval: 'Year',
            trial_period_days: 0,
            discount: 0,
            purchasing_power_parity: false,
            tax_inclusive: false
          },
          tax_category: 'saas',
          name: plan.name,
          description: plan.description
        });

        results.push({
          success: true,
          plan: plan.name,
          product: {
            id: product.product_id,
            name: product.name,
            price: typeof product.price === 'number' ? product.price / 100 : plan.price,
          },
        });
      } catch (error) {
        // console.error(`Failed to create ${plan.name}:`, error);
        results.push({
          success: false,
          plan: plan.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Created ${successCount} products, ${failCount} failed`,
      results,
      summary: {
        total: SUBSCRIPTION_PRODUCTS.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    // console.error('Product creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create products', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
