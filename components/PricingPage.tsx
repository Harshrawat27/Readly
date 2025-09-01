'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import PricingCard from './PricingCard';
import BillingForm, { BillingInfo } from './BillingForm';
import ConfirmationPopup from './ConfirmationPopup';

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
  
  // New state for popups
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    planId: string;
    productId: string;
    billingInfo?: BillingInfo;
  } | null>(null);

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
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) return;

    // Find matching product
    const product = findMatchingProduct(plan);
    if (!product) {
      // Show error popup instead of alert
      setShowConfirmPopup(true);
      setSelectedPlan({ planId: 'error', productId: '', billingInfo: undefined });
      return;
    }

    // Check if user has an active subscription
    const hasActiveSubscription = subscriptionData?.user?.subscriptionStatus === 'active' && 
                                 subscriptionData?.user?.subscriptionPlan !== 'free';

    if (hasActiveSubscription) {
      // Show confirmation popup for plan changes
      setSelectedPlan({ planId, productId: product.product_id });
      setShowConfirmPopup(true);
    } else {
      // Show billing form for new subscriptions
      setSelectedPlan({ planId, productId: product.product_id });
      setShowBillingForm(true);
    }
  };

  const findMatchingProduct = (plan: any) => {
    // Multiple matching strategies using correct Dodo field names
    let product = null;

    // Strategy 1: Exact match by name pattern and price
    product = products.find((p) => {
      const planName = plan.name;
      const isYearlyPlan = plan.interval === 'year';
      const expectedPrice = plan.price * 100;

      const nameMatch = p.name.toLowerCase().includes(planName.toLowerCase());
      const intervalMatch = isYearlyPlan
        ? p.name.toLowerCase().includes('year') ||
          p.price_detail.payment_frequency_interval.toLowerCase() === 'year'
        : p.name.toLowerCase().includes('month') ||
          p.price_detail.payment_frequency_interval.toLowerCase() === 'month';
      const priceMatch = p.price === expectedPrice;

      return nameMatch && intervalMatch && priceMatch;
    });

    // Strategy 2: Match by price only
    if (!product) {
      product = products.find((p) => p.price === plan.price * 100);
    }

    // Strategy 3: Match by plan name only
    if (!product) {
      product = products.find((p) =>
        p.name.toLowerCase().includes(plan.name.toLowerCase())
      );
    }

    return product;
  };

  const handleBillingSubmit = async (billingInfo: BillingInfo) => {
    if (!selectedPlan) return;

    setLoadingPlanId(selectedPlan.planId);
    setShowBillingForm(false);

    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: selectedPlan.productId,
          planName: selectedPlan.planId,
          billingInfo,
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_link) {
        window.location.href = data.payment_link;
      } else if (response.status === 401) {
        window.location.href = '/signin?redirect=/pricing';
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Show error popup
      setSelectedPlan({ planId: 'checkout-error', productId: '', billingInfo });
      setShowConfirmPopup(true);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handlePlanChangeConfirm = async () => {
    if (!selectedPlan) return;

    setLoadingPlanId(selectedPlan.planId);
    setShowConfirmPopup(false);

    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPlanName: selectedPlan.planId,
          newProductId: selectedPlan.productId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success popup
        setSelectedPlan({ planId: 'success', productId: data.message, billingInfo: undefined });
        setShowConfirmPopup(true);
        // Refresh subscription data
        await fetchSubscriptionData();
      } else if (response.status === 401) {
        window.location.href = '/signin?redirect=/pricing';
      } else {
        throw new Error(data.error || 'Failed to change plan');
      }
    } catch (error) {
      console.error('Plan change error:', error);
      // Show error popup
      setSelectedPlan({ planId: 'change-error', productId: '', billingInfo: undefined });
      setShowConfirmPopup(true);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const closePopups = () => {
    setShowBillingForm(false);
    setShowConfirmPopup(false);
    setSelectedPlan(null);
  };

  // Get confirmation popup content based on selected plan
  const getConfirmationContent = () => {
    if (!selectedPlan) return { title: '', message: '', confirmText: '', cancelText: '' };

    if (selectedPlan.planId === 'error') {
      return {
        title: 'Product Not Found',
        message: 'No matching products found in DodoPayments. Please contact support.',
        confirmText: 'OK',
        cancelText: '',
      };
    }

    if (selectedPlan.planId === 'checkout-error') {
      return {
        title: 'Checkout Failed',
        message: 'Failed to create checkout session. Please try again.',
        confirmText: 'OK',
        cancelText: '',
      };
    }

    if (selectedPlan.planId === 'change-error') {
      return {
        title: 'Plan Change Failed',
        message: 'Failed to change your plan. Please try again.',
        confirmText: 'OK',
        cancelText: '',
      };
    }

    if (selectedPlan.planId === 'success') {
      return {
        title: 'Plan Changed Successfully',
        message: selectedPlan.productId, // Contains the success message
        confirmText: 'OK',
        cancelText: '',
      };
    }

    const plan = SUBSCRIPTION_PLANS[selectedPlan.planId];
    const currentPlan = SUBSCRIPTION_PLANS[subscriptionData?.user?.subscriptionPlan || 'free'];
    
    if (!plan) return { title: '', message: '', confirmText: '', cancelText: '' };

    const isUpgrade = plan.price > currentPlan.price;

    if (isUpgrade) {
      return {
        title: `Upgrade to ${plan.displayName}`,
        message: `You'll be charged the prorated amount for the remaining billing period.\n\nNew features will be available immediately.`,
        confirmText: 'Upgrade Now',
        cancelText: 'Cancel',
      };
    } else {
      return {
        title: `Downgrade to ${plan.displayName}`,
        message: `You'll be switched to ${plan.displayName} immediately with no refund for unused credits from your current plan.\n\n💡 Tip: Downgrading just before the end of your billing cycle would be more beneficial.`,
        confirmText: 'Downgrade Now',
        cancelText: 'Cancel',
      };
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

      {/* Billing Form */}
      {selectedPlan && (
        <BillingForm
          isOpen={showBillingForm}
          onClose={closePopups}
          onSubmit={handleBillingSubmit}
          planName={SUBSCRIPTION_PLANS[selectedPlan.planId]?.displayName || ''}
          planPrice={SUBSCRIPTION_PLANS[selectedPlan.planId]?.price || 0}
          isLoading={loadingPlanId === selectedPlan.planId}
        />
      )}

      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showConfirmPopup}
        onClose={closePopups}
        onConfirm={() => {
          const content = getConfirmationContent();
          if (content.cancelText) {
            handlePlanChangeConfirm();
          } else {
            closePopups();
          }
        }}
        title={getConfirmationContent().title}
        message={getConfirmationContent().message}
        confirmText={getConfirmationContent().confirmText}
        cancelText={getConfirmationContent().cancelText}
        confirmButtonStyle={selectedPlan?.planId.includes('error') ? 'default' : 'primary'}
        isLoading={loadingPlanId !== null}
      />
    </div>
  );
}
