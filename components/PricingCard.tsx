'use client';

import { useState } from 'react';
import { SubscriptionPlan } from '@/lib/subscription-plans';

interface PricingCardProps {
  plan: SubscriptionPlan;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  currentPlan?: string;
}

export default function PricingCard({ plan, onSelectPlan, isLoading, currentPlan }: PricingCardProps) {
  const [selecting, setSelecting] = useState(false);
  
  const isFreePlan = plan.name === 'free';
  const isCurrentPlan = currentPlan === plan.id;
  const isYearly = plan.interval === 'year';
  
  const monthlyPrice = isYearly ? (plan.price / 12).toFixed(2) : plan.price.toString();
  
  const handleSelect = async () => {
    if (isCurrentPlan || isFreePlan) return;
    
    setSelecting(true);
    await onSelectPlan(plan.id);
    setSelecting(false);
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isFreePlan) return 'Free Forever';
    if (selecting || isLoading) return 'Processing...';
    return 'Get Started';
  };

  return (
    <div className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 transition-all duration-200 hover:scale-105 ${
      isCurrentPlan ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'
    }`}>
      {isYearly && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Save 16%
          </span>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-4 right-4">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Active
          </span>
        </div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.displayName}</h3>
        <div className="mb-4">
          {isFreePlan ? (
            <div className="text-4xl font-bold text-gray-900">Free</div>
          ) : (
            <>
              <div className="text-4xl font-bold text-gray-900">
                ${monthlyPrice}
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              {isYearly && (
                <div className="text-sm text-gray-600">
                  Billed yearly (${plan.price}/year)
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <button
          onClick={handleSelect}
          disabled={isCurrentPlan || isFreePlan || selecting || isLoading}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            isCurrentPlan
              ? 'bg-gray-100 text-gray-500 cursor-default'
              : isFreePlan
              ? 'bg-gray-100 text-gray-700 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {getButtonText()}
        </button>

        <div className="text-center text-sm text-gray-500">
          <div>
            <strong>PDF Uploads:</strong> {plan.maxPdfsPerMonth === -1 ? 'Unlimited' : `${plan.maxPdfsPerMonth}/month`}
          </div>
          <div>
            <strong>Questions:</strong> {plan.maxQuestionsPerMonth === -1 ? 'Unlimited' : `${plan.maxQuestionsPerMonth}/month`}
          </div>
          <div>
            <strong>Max File Size:</strong> {plan.maxFileSize}MB
          </div>
          <div>
            <strong>Max Pages:</strong> {plan.maxPagesPerPdf === -1 ? 'Unlimited' : plan.maxPagesPerPdf}
          </div>
        </div>
      </div>
    </div>
  );
}