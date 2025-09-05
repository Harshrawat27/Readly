'use client';

import React from 'react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/subscription-plans';

interface LimitReachedPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'pro' | 'ultimate';
  limitType: 'pdfs' | 'fileSize' | 'questions' | 'pages';
  onUpgrade: (planName: 'pro' | 'ultimate') => void;
}

const limitMessages = {
  pdfs: 'You have reached your PDF upload limit',
  fileSize: 'File size exceeds your plan limit',
  questions: 'You have used all your questions for this month',
  pages: 'PDF page count exceeds your plan limit',
};

const LimitReachedPopup: React.FC<LimitReachedPopupProps> = ({
  isOpen,
  onClose,
  currentPlan,
  limitType,
  onUpgrade,
}) => {
  if (!isOpen) return null;

  const getAvailablePlans = (): SubscriptionPlan[] => {
    const plans = [];

    if (currentPlan === 'free') {
      plans.push(SUBSCRIPTION_PLANS.pro);
      plans.push(SUBSCRIPTION_PLANS.ultimate);
    } else if (currentPlan === 'pro') {
      plans.push(SUBSCRIPTION_PLANS.ultimate);
    }

    return plans;
  };

  const formatFeatureValue = (value: number, unit: string) => {
    if (value === -1) return 'Unlimited';
    return `${value.toLocaleString()}${unit}`;
  };

  const getFeatureByLimitType = (plan: SubscriptionPlan) => {
    switch (limitType) {
      case 'pdfs':
        return formatFeatureValue(plan.maxPdfsPerMonth, ' PDFs per month');
      case 'fileSize':
        return formatFeatureValue(plan.maxFileSize, 'MB file size');
      case 'questions':
        return formatFeatureValue(
          plan.maxQuestionsPerMonth,
          ' questions/month'
        );
      case 'pages':
        return formatFeatureValue(plan.maxPagesPerPdf, ' pages per PDF');
      default:
        return '';
    }
  };

  const availablePlans = getAvailablePlans();

  if (availablePlans.length === 0) {
    return (
      <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
        <div className='bg-[#2a2a2a] rounded-2xl p-6 max-w-md w-full mx-4'>
          <div className='text-center'>
            <div className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-white'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M12 9v3.75m0 5.25h.008v.008H12V18zm0-13.5a9 9 0 1 1 0 18 9 9 0 0 1 0-18z' />
              </svg>
            </div>
            <h3 className='text-lg font-semibold text-white mb-2'>
              {limitMessages[limitType]}
            </h3>
            <p className='text-gray-400 mb-6'>
              You&apos;re already on our highest plan. Thank you for being an
              Ultimate subscriber!
            </p>
            <button
              onClick={onClose}
              className='w-full px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-all duration-200'
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-[#2a2a2a] rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='p-6 border-b border-gray-600/50'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-xl font-semibold text-white'>
                {limitMessages[limitType]}
              </h3>
              <p className='text-gray-400 mt-1'>
                Upgrade your plan to continue using ReaditEasy
              </p>
            </div>
            <button
              onClick={onClose}
              className='p-2 hover:bg-[#303030] rounded-lg transition-colors text-gray-400 hover:text-white'
            >
              <svg
                className='w-5 h-5'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M18 6L6 18' />
                <path d='M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Current Plan Info */}
        <div className='p-6 bg-gray-600/20'>
          <div className='text-center'>
            <span className='inline-block px-3 py-1 bg-gray-600/50 text-gray-300 rounded-full text-sm'>
              Current: {SUBSCRIPTION_PLANS[currentPlan].displayName} Plan
            </span>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className='p-6'>
          <div
            className={`grid gap-6 ${
              availablePlans.length === 1
                ? 'max-w-sm mx-auto'
                : 'md:grid-cols-2'
            }`}
          >
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-[#1a1a1a] rounded-2xl p-6 transition-all duration-200 hover:bg-[#303030] ${
                  plan.name === 'ultimate'
                    ? 'ring-2 ring-blue-500'
                    : 'border border-gray-600/30'
                }`}
              >
                {plan.name === 'ultimate' && (
                  <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
                    <span className='bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium'>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className='text-center mb-6'>
                  <h4 className='text-lg font-semibold text-white mb-2'>
                    {plan.displayName}
                  </h4>
                  <div className='flex items-baseline justify-center gap-1'>
                    <span className='text-3xl font-bold text-white'>
                      USD {plan.price}
                    </span>
                    <span className='text-gray-400'>/{plan.interval}</span>
                  </div>
                </div>

                {/* Key Feature for this limit */}
                <div className='mb-4 p-3 bg-blue-600/10 rounded-lg border border-blue-600/20'>
                  <div className='flex items-center gap-2'>
                    <svg
                      className='w-5 h-5 text-blue-400'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <polyline points='20,6 9,17 4,12' />
                    </svg>
                    <span className='font-medium text-white'>
                      {getFeatureByLimitType(plan)}
                    </span>
                  </div>
                </div>

                {/* Other Features */}
                <div className='space-y-3 mb-6'>
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className='flex items-center gap-2'>
                      <svg
                        className='w-4 h-4 text-green-400 flex-shrink-0'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <polyline points='20,6 9,17 4,12' />
                      </svg>
                      <span className='text-sm text-gray-300'>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onUpgrade(plan.name as 'pro' | 'ultimate')}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    plan.name === 'ultimate'
                      ? 'bg-white text-black hover:bg-gray-100 active:transform active:scale-95'
                      : 'border border-gray-600 text-white hover:bg-[#3a3a3a] active:transform active:scale-95'
                  }`}
                >
                  Upgrade to {plan.displayName}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className='p-6 border-t border-gray-600/50 bg-gray-600/20'>
          <div className='text-center text-sm text-gray-400'>
            <p>✨ Instant upgrade • 💳 Cancel anytime • 🔒 Secure payment</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitReachedPopup;
