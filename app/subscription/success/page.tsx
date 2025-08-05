'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscriptionSuccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Give the webhook some time to process
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="mx-auto h-12 w-12 text-green-600">
                <svg className="animate-spin h-12 w-12" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Processing your subscription...
              </h2>
              <p className="mt-2 text-gray-600">
                Please wait while we activate your new plan.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto h-12 w-12 text-green-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Subscription Successful!
              </h2>
              <p className="mt-2 text-gray-600">
                Your subscription has been activated. You now have access to premium features.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleContinue}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue to Readly
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}