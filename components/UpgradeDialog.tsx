'use client';

import { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/subscription-plans';

interface UpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reason: string;
  currentPlan?: string;
}

export default function UpgradeDialog({ isOpen, onClose, reason, currentPlan = 'free' }: UpgradeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  if (!isOpen) return null;

  const availablePlans = Object.entries(SUBSCRIPTION_PLANS).filter(
    ([planName]) => planName !== 'free' && planName !== currentPlan
  );

  const handleUpgrade = async (planName: string) => {
    setIsLoading(true);
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
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Required</h2>
          <p className="text-gray-600 mb-4">{reason}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {availablePlans.map(([planName, plan]: [string, SubscriptionPlan]) => (
            <div
              key={planName}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedPlan === planName
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(planName)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plan.displayName}</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
                  </p>
                </div>
                <input
                  type="radio"
                  name="plan"
                  checked={selectedPlan === planName}
                  onChange={() => setSelectedPlan(planName)}
                  className="mt-1"
                />
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => handleUpgrade(selectedPlan)}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : `Upgrade to ${SUBSCRIPTION_PLANS[selectedPlan]?.displayName}`}
          </button>
        </div>
      </div>
    </div>
  );
}