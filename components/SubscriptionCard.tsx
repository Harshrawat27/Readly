'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';
import Toast from './Toast';
import ConfirmationPopup from './ConfirmationPopup';

interface SubscriptionData {
  plan: {
    name: string;
    displayName: string;
    price: number;
    interval: string;
  };
  subscription: {
    subscriptionId: string;
    currentPeriodEnd: string;
  } | null;
  limits: {
    maxPdfs: number;
    maxFileSize: number;
    maxQuestionsPerMonth: number;
    maxPagesPerPdf: number;
  };
  usage: {
    totalPdfsUploaded: number;
    monthlyQuestionsUsed: number;
  };
  user: {
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionEndDate: string | null;
  };
}

export default function SubscriptionCard() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; price_amount: number; description?: string }>>([]);
  
  // Toast and popup states
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [showToast, setShowToast] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setShowCancelConfirm(false);
    
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchSubscriptionData();
        setToastMessage('Subscription cancelled successfully. You will retain access until the end of your billing period.');
        setToastType('success');
        setShowToast(true);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      setToastMessage('Failed to cancel subscription. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      // Find the product that matches this plan
      const plan = SUBSCRIPTION_PLANS[planName];
      const product = products.find(p => 
        p.name.toLowerCase().includes(planName) || 
        p.description?.toLowerCase().includes(planName) ||
        (plan && p.price_amount === plan.price * 100) // Match by price (in cents)
      );

      if (!product) {
        throw new Error('Product not found for selected plan');
      }

      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          productId: product.id, 
          planName 
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_link) {
        window.location.href = data.payment_link;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      setToastMessage('Failed to start upgrade process. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Failed to load subscription data</p>
      </div>
    );
  }

  const { plan, usage, limits, user, subscription } = subscriptionData;
  const currentPlan = plan.name;
  const isFreePlan = currentPlan === 'free';
  const isCancelled = user.subscriptionStatus === 'cancelled';

  // Calculate usage percentages
  const pdfUsagePercent = limits.maxPdfs === -1 ? 0 : (usage.totalPdfsUploaded / limits.maxPdfs) * 100;
  const questionUsagePercent = limits.maxQuestionsPerMonth === -1 ? 0 : (usage.monthlyQuestionsUsed / limits.maxQuestionsPerMonth) * 100;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {plan.displayName} Plan
            {isCancelled && (
              <span className="ml-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                Cancelled
              </span>
            )}
          </h2>
          <p className="text-gray-600">
            {isFreePlan ? 'Free forever' : `$${plan.price}/${plan.interval}`}
          </p>
          {subscription && subscription.currentPeriodEnd && (
            <p className="text-sm text-gray-500 mt-1">
              {isCancelled ? 'Access until' : 'Renews on'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
        
        {!isFreePlan && !isCancelled && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            disabled={isCancelling}
            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>

      {/* Usage Statistics */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>PDF Uploads</span>
            <span>
              {usage.totalPdfsUploaded}
              {limits.maxPdfs !== -1 && ` / ${limits.maxPdfs}`}
            </span>
          </div>
          {limits.maxPdfs !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${pdfUsagePercent >= 90 ? 'bg-red-500' : pdfUsagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(pdfUsagePercent, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Monthly Questions</span>
            <span>
              {usage.monthlyQuestionsUsed}
              {limits.maxQuestionsPerMonth !== -1 && ` / ${limits.maxQuestionsPerMonth}`}
            </span>
          </div>
          {limits.maxQuestionsPerMonth !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${questionUsagePercent >= 90 ? 'bg-red-500' : questionUsagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(questionUsagePercent, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Max File Size:</span> {limits.maxFileSize}MB
          </div>
          <div>
            <span className="font-medium">Max Pages:</span> {limits.maxPagesPerPdf === -1 ? 'Unlimited' : limits.maxPagesPerPdf}
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {(isFreePlan || isCancelled) && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
          <div className="grid gap-3">
            {Object.entries(SUBSCRIPTION_PLANS)
              .filter(([planName]) => planName !== 'free' && planName !== currentPlan)
              .map(([planName, planData]) => (
                <div key={planName} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{planData.displayName}</h4>
                    <p className="text-sm text-gray-600">${planData.price}/{planData.interval}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {planData.maxPdfsPerMonth === -1 ? 'Unlimited' : planData.maxPdfsPerMonth} PDFs/month, 
                      {planData.maxQuestionsPerMonth === -1 ? ' Unlimited' : ` ${planData.maxQuestionsPerMonth}`} questions/month
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade(planName)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Upgrade
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
      
      {/* Toast */}
      <Toast
        isOpen={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
      
      {/* Cancel Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        confirmButtonStyle="danger"
        isLoading={isCancelling}
      />
    </div>
  );
}