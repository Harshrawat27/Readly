'use client';

import { useState } from 'react';
import { SubscriptionPlan } from '@/lib/subscription-plans';

interface PricingCardProps {
  plan: SubscriptionPlan;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  currentPlan?: string;
  isPopular?: boolean;
  isYearly?: boolean;
}

export default function PricingCard({
  plan,
  onSelectPlan,
  isLoading,
  currentPlan,
  isPopular = false,
}: PricingCardProps) {
  const [selecting, setSelecting] = useState(false);

  const isFreePlan = plan.name === 'free';
  const isCurrentPlan = currentPlan === plan.id;
  const isYearlyPlan = plan.interval === 'year';

  // Calculate monthly price for yearly plans
  const monthlyPrice = isYearlyPlan
    ? (plan.price / 12).toFixed(0)
    : plan.price.toString();

  const handleSelect = async () => {
    if (isCurrentPlan || isFreePlan) return;

    setSelecting(true);
    await onSelectPlan(plan.id);
    setSelecting(false);
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (isFreePlan) return 'Get started';
    if (selecting || isLoading) return 'Processing...';
    return isPopular
      ? 'Get Max plan'
      : `Get ${plan.name === 'pro' ? 'Pro' : 'Ultimate'} plan`;
  };

  const getPlanName = () => {
    if (isFreePlan) return 'Free';
    if (plan.name === 'pro') return 'Pro';
    if (plan.name === 'ultimate') return 'Max';
    return plan.displayName;
  };

  const getPlanDescription = () => {
    if (isFreePlan) return 'Perfect for getting started';
    if (plan.name === 'pro') return 'Research, code, and organize';
    if (plan.name === 'ultimate') return 'Higher limits, priority access';
    return 'Advanced features for power users';
  };

  const getIconPath = () => {
    if (isFreePlan) {
      return 'M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z';
    }
    // Pro/Max icon (anchor-like icon from the design)
    return 'M12 2v20m-6-6v-4a6 6 0 0 1 12 0v4m-6 0v6';
  };

  return (
    <div
      className={`relative bg-[#2a2a2a] rounded-2xl p-6 transition-all duration-200 hover:bg-[#303030] ${
        isPopular ? 'ring-2 ring-blue-500 transform scale-105' : ''
      }`}
    >
      {/* Most Popular Badge */}
      {isPopular && (
        <div className='absolute -top-3 left-1/2 transform -translate-x-1/2'>
          <div className='bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium'>
            Most Popular
          </div>
        </div>
      )}

      {/* Icon */}
      <div className='mb-6'>
        <div className='w-8 h-8 text-white'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
          >
            <path d={getIconPath()} />
          </svg>
        </div>
      </div>

      {/* Plan Name and Description */}
      <div className='mb-6'>
        <h3 className='text-2xl font-semibold text-white mb-2'>
          {getPlanName()}
        </h3>
        <p className='text-gray-400 text-sm'>{getPlanDescription()}</p>
      </div>

      {/* Price */}
      <div className='mb-8'>
        {isFreePlan ? (
          <div className='text-3xl font-bold text-white'>Free</div>
        ) : (
          <div>
            {!isPopular ? (
              <div className='text-3xl font-bold text-white'>
                USD {monthlyPrice}
                <span className='text-base font-normal text-gray-400'>
                  {isYearlyPlan ? ' / month billed annually' : ' / month'}
                </span>
              </div>
            ) : (
              <div>
                <div className='text-gray-400 text-sm mb-1'>From</div>
                <div className='text-3xl font-bold text-white'>
                  USD {monthlyPrice}
                  <span className='text-base font-normal text-gray-400'>
                    {isYearlyPlan
                      ? ' / month billed annually'
                      : ' / month billed monthly'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className='mb-8'>
        <button
          onClick={handleSelect}
          disabled={isCurrentPlan || selecting || isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isCurrentPlan
              ? 'bg-gray-600 text-gray-300 cursor-default'
              : isPopular
              ? 'bg-white text-black hover:bg-gray-100 active:transform active:scale-95'
              : 'border border-gray-600 text-white hover:bg-[#3a3a3a] active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {getButtonText()}
        </button>
      </div>

      {/* Features List */}
      <div className='space-y-3'>
        <div className='text-sm font-medium text-gray-300 mb-3'>
          {isFreePlan
            ? 'What you get:'
            : isPopular
            ? 'Everything in Pro, plus:'
            : 'Everything in Free and:'}
        </div>

        {/* Custom feature list based on plan */}
        <div className='space-y-3 text-sm text-gray-300'>
          {isFreePlan ? (
            <>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>3 PDF uploads per month</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>50 questions per month</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Up to 10MB file size</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Up to 50 pages per PDF</span>
              </div>
            </>
          ) : plan.name === 'pro' ? (
            <>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>10 PDF uploads per month</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>1,000 questions per month</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Up to 50MB file size</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Up to 200 pages per PDF</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Priority support</span>
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Choose 5x or 20x more usage than Pro*</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Unlimited PDF uploads</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Unlimited questions</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Early access to advanced features</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-green-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span>Priority access at high traffic times</span>
              </div>
              <div className='flex items-center'>
                <svg
                  className='w-4 h-4 mr-3 text-blue-400 flex-shrink-0'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd'
                  />
                </svg>
                <span className='text-blue-400'>Includes Readly Code</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
