'use client';

interface PricingToggleProps {
  isYearly: boolean;
  onToggle: (isYearly: boolean) => void;
}

export default function PricingToggle({ isYearly, onToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      <span className={`text-lg font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
        Monthly
      </span>
      
      <button
        onClick={() => onToggle(!isYearly)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isYearly ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isYearly ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      
      <div className="flex items-center space-x-2">
        <span className={`text-lg font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
          Yearly
        </span>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
          Save up to 16%
        </span>
      </div>
    </div>
  );
}