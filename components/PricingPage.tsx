'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import PricingCard from './PricingCard';

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
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionData | null>(null);
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
      product = products.find((p) => {
        const planName = plan.name; // 'pro' or 'ultimate'
        const isYearlyPlan = plan.interval === 'year';
        const expectedPrice = plan.price * 100; // Convert to cents

        const nameMatch = p.name.toLowerCase().includes(planName.toLowerCase());
        const intervalMatch = isYearlyPlan
          ? p.name.toLowerCase().includes('year') ||
            p.price_detail.payment_frequency_interval.toLowerCase() === 'year'
          : p.name.toLowerCase().includes('month') ||
            p.price_detail.payment_frequency_interval.toLowerCase() === 'month';
        const priceMatch = p.price === expectedPrice; // Note: using 'price' field, not 'price_amount'

        console.log(
          `Checking ${p.name}: name=${nameMatch}, interval=${intervalMatch}, price=${priceMatch} (${p.price} vs ${expectedPrice})`
        );

        return nameMatch && intervalMatch && priceMatch;
      });

      // Strategy 2: Match by price only (in case naming is different)
      if (!product) {
        product = products.find((p) => p.price === plan.price * 100);
        if (product) console.log('Found product by price match:', product);
      }

      // Strategy 3: Match by plan name only
      if (!product) {
        product = products.find((p) =>
          p.name.toLowerCase().includes(plan.name.toLowerCase())
        );
        if (product) console.log('Found product by name match:', product);
      }

      if (!product) {
        // Show detailed error with available options
        const availableProducts = products
          .map((p) => `${p.name} ($${p.price / 100})`)
          .join(', ');
        throw new Error(
          `No products available in Dodo Payments. Please create products first. Looking for: ${plan.displayName} ($${plan.price}). Available: ${availableProducts}`
        );
      }

      // Check if user has an active subscription
      const hasActiveSubscription = subscriptionData?.user?.subscriptionStatus === 'active' && 
                                   subscriptionData?.user?.subscriptionPlan !== 'free';

      let response, data;

      if (hasActiveSubscription) {
        // Use plan change endpoint for existing subscribers
        response = await fetch('/api/subscription/change-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newPlanName: planId,
            newProductId: product.product_id,
          }),
        });

        data = await response.json();

        if (response.ok) {
          alert(data.message || 'Plan changed successfully!');
          // Refresh subscription data to show updated plan
          await fetchSubscriptionData();
        } else if (response.status === 401) {
          // User not authenticated
          alert(
            'Please sign in to change your plan. You will be redirected to the sign-in page.'
          );
          window.location.href = '/signin?redirect=/pricing';
        } else {
          throw new Error(data.error || 'Failed to change plan');
        }
      } else {
        // Use checkout endpoint for new subscribers
        response = await fetch('/api/subscription/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: product.product_id,
            planName: planId,
          }),
        });

        data = await response.json();

        if (response.ok && data.payment_link) {
          window.location.href = data.payment_link;
        } else if (response.status === 401) {
          // User not authenticated
          alert(
            'Please sign in to upgrade your plan. You will be redirected to the sign-in page.'
          );
          window.location.href = '/signin?redirect=/pricing';
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        alert(
          'Please sign in to manage your plan. You will be redirected to the sign-in page.'
        );
        window.location.href = '/signin?redirect=/pricing';
      } else {
        alert('Failed to process request. Please try again.');
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
    <div className='min-h-screen bg-[#1a1a1a] text-white py-12'>
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-white mb-8'>
            Plans that grow with you
          </h1>


          {/* Toggle Buttons */}
          <div className='flex justify-center items-center mb-12'>
            <div className='bg-[#2a2a2a] rounded-lg p-1 flex items-center'>
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  !isYearly
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  isYearly
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
              </button>
              {/* Discount badge */}
            </div>
            <div className='ml-2 bg-accent text-white px-2 py-1 rounded-full text-xs font-medium'>
              Save 16%
            </div>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto'>
          {displayPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onSelectPlan={handlePlanSelection}
              isLoading={loadingPlanId === plan.id}
              currentPlan={subscriptionData?.user.subscriptionPlan}
              isPopular={plan.name === 'ultimate'}
              isYearly={isYearly}
            />
          ))}
        </div>

        {/* Usage Limits Notice */}
        <div className='mt-8 text-center'>
          <p className='text-gray-400 text-sm'>
            *Usage limits apply. Prices shown don&apos;t include applicable tax.
          </p>
        </div>
      </div>
    </div>
  );
}
