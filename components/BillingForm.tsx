'use client';

import React, { useState } from 'react';

export interface BillingInfo {
  street: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
}

interface BillingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (billingInfo: BillingInfo) => void;
  planName: string;
  planPrice: number;
  isLoading?: boolean;
}

const BillingForm: React.FC<BillingFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  planName,
  planPrice,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<BillingInfo>({
    street: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'US',
  });

  const [errors, setErrors] = useState<Partial<BillingInfo>>({});

  if (!isOpen) return null;

  const handleInputChange = (field: keyof BillingInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<BillingInfo> = {};

    if (!formData.street.trim()) newErrors.street = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipcode.trim()) newErrors.zipcode = 'ZIP code is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'IN', name: 'India' },
    { code: 'JP', name: 'Japan' },
    { code: 'SG', name: 'Singapore' },
  ];

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-[#2a2a2a] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='p-6 border-b border-gray-600/50'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-xl font-semibold text-white'>
                Billing Information
              </h3>
              <p className='text-gray-400 mt-1 text-sm'>
                We need this information for billing purposes
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className='p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50'
            >
              <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='M18 6L6 18' />
                <path d='M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* Plan Info */}
        <div className='p-6 bg-blue-600/10 border-b border-gray-600/50'>
          <div className='text-center'>
            <div className='text-white font-medium'>
              {planName} Plan
            </div>
            <div className='text-2xl font-bold text-white mt-1'>
              ${planPrice}/month
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {/* Street Address */}
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Street Address *
            </label>
            <input
              type='text'
              value={formData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              disabled={isLoading}
              className='w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
              placeholder='123 Main Street'
            />
            {errors.street && <p className='text-red-400 text-xs mt-1'>{errors.street}</p>}
          </div>

          {/* City & State */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                City *
              </label>
              <input
                type='text'
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={isLoading}
                className='w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
                placeholder='New York'
              />
              {errors.city && <p className='text-red-400 text-xs mt-1'>{errors.city}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                State *
              </label>
              <input
                type='text'
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                disabled={isLoading}
                className='w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
                placeholder='NY'
              />
              {errors.state && <p className='text-red-400 text-xs mt-1'>{errors.state}</p>}
            </div>
          </div>

          {/* ZIP Code & Country */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                ZIP Code *
              </label>
              <input
                type='text'
                value={formData.zipcode}
                onChange={(e) => handleInputChange('zipcode', e.target.value)}
                disabled={isLoading}
                className='w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
                placeholder='10001'
              />
              {errors.zipcode && <p className='text-red-400 text-xs mt-1'>{errors.zipcode}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Country *
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                disabled={isLoading}
                className='w-full px-3 py-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code} className='bg-[#1a1a1a] text-white'>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && <p className='text-red-400 text-xs mt-1'>{errors.country}</p>}
            </div>
          </div>

          {/* Buttons */}
          <div className='flex gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isLoading}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Processing...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BillingForm;