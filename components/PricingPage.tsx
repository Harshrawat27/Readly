'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import PricingCard from './PricingCard';
import PricingToggle from './PricingToggle';

interface SubscriptionData {
  plan: {
    name: string;
    displayName: string;
    price: number;
    interval: string;
  };
  user: {
    subscriptionPlan: string;
    subscriptionStatus: string;
  };
}

interface DodoProduct {
  product_id: string;
  name: string;
  price: number;
  description?: string;
  price_detail: {
    payment_frequency_interval: string;
  };
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [products, setProducts] = useState<DodoProduct[]>([]);

  useEffect(() => {
    fetchSubscriptionData();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    }
  };

  const handlePlanSelection = async (planId: string) => {
    setLoadingPlanId(planId);
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan) throw new Error('Plan not found');

      console.log('Selected plan:', plan);
      console.log('Available products:', products);

      // Multiple matching strategies using correct Dodo field names
      let product = null;

      // Strategy 1: Exact match by name pattern and price
      product = products.find(p => {
        const planName = plan.name; // 'pro' or 'ultimate'
        const isYearlyPlan = plan.interval === 'year';
        const expectedPrice = plan.price * 100; // Convert to cents
        
        const nameMatch = p.name.toLowerCase().includes(planName.toLowerCase());
        const intervalMatch = isYearlyPlan 
          ? (p.name.toLowerCase().includes('year') || p.price_detail.payment_frequency_interval.toLowerCase() === 'year')
          : (p.name.toLowerCase().includes('month') || p.price_detail.payment_frequency_interval.toLowerCase() === 'month');
        const priceMatch = p.price === expectedPrice; // Note: using 'price' field, not 'price_amount'
        
        console.log(`Checking ${p.name}: name=${nameMatch}, interval=${intervalMatch}, price=${priceMatch} (${p.price} vs ${expectedPrice})`);
        
        return nameMatch && intervalMatch && priceMatch;
      });

      // Strategy 2: Match by price only (in case naming is different)
      if (!product) {
        product = products.find(p => p.price === plan.price * 100);
        if (product) console.log('Found product by price match:', product);
      }

      // Strategy 3: Match by plan name only
      if (!product) {
        product = products.find(p => p.name.toLowerCase().includes(plan.name.toLowerCase()));
        if (product) console.log('Found product by name match:', product);
      }

      if (!product) {
        // Show detailed error with available options
        const availableProducts = products.map(p => `${p.name} ($${p.price/100})`).join(', ');
        throw new Error(`No products available in Dodo Payments. Please create products first. Looking for: ${plan.displayName} ($${plan.price}). Available: ${availableProducts}`);
      }

      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: product.product_id, 
          planName: planId 
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_link) {
        window.location.href = data.payment_link;
      } else if (response.status === 401) {
        // User not authenticated
        alert('Please sign in to upgrade your plan. You will be redirected to the sign-in page.');
        window.location.href = '/signin?redirect=/pricing';
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        alert('Please sign in to upgrade your plan. You will be redirected to the sign-in page.');
        window.location.href = '/signin?redirect=/pricing';
      } else {
        alert('Failed to start upgrade process. Please try again.');
      }
    } finally {
      setLoadingPlanId(null);
    }
  };

  // Get the plans to display based on the toggle
  const getDisplayPlans = () => {
    if (isYearly) {
      return [
        SUBSCRIPTION_PLANS.free,
        SUBSCRIPTION_PLANS.pro_yearly,
        SUBSCRIPTION_PLANS.ultimate_yearly,
      ];
    } else {
      return [
        SUBSCRIPTION_PLANS.free,
        SUBSCRIPTION_PLANS.pro_monthly,
        SUBSCRIPTION_PLANS.ultimate_monthly,
      ];
    }
  };

  const displayPlans = getDisplayPlans();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlock the full potential of Readly with our premium plans. 
            Upload more PDFs, ask unlimited questions, and get priority support.
          </p>
        </div>

        <PricingToggle isYearly={isYearly} onToggle={setIsYearly} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onSelectPlan={handlePlanSelection}
              isLoading={loadingPlanId === plan.id}
              currentPlan={subscriptionData?.user.subscriptionPlan}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have access to premium features until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens when I reach my limits?
              </h3>
              <p className="text-gray-600">
                When you reach your monthly limits, you&apos;ll need to wait until the next month for them to reset, or upgrade to a higher plan for increased limits.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are there any hidden fees?
              </h3>
              <p className="text-gray-600">
                No, there are no hidden fees. The price you see is exactly what you&apos;ll pay. All plans include secure payment processing and customer support.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards and debit cards through our secure payment processor, Dodo Payments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}