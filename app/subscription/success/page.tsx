'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    router.push('/new');
  };

  return (
    <div
      className='min-h-screen relative overflow-hidden'
      style={{ background: 'var(--background)' }}
    >
      {/* Background Elements */}
      <div className='absolute inset-0 bg-gradient-to-br from-[#c96342]/10 via-transparent to-[#e07c54]/10'></div>
      <div className='absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-[#c96342]/20 to-[#e07c54]/20 rounded-full blur-3xl'></div>
      <div className='absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-[#e07c54]/20 to-[#c96342]/20 rounded-full blur-3xl'></div>

      <div className='flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative z-10'>
        <div className='max-w-lg w-full'>
          <div className='text-center'>
            {isLoading ? (
              <div className='space-y-8'>
                {/* Loading Animation */}
                <div className='mx-auto w-24 h-24 rounded-full bg-gradient-to-r from-[#c96342] to-[#e07c54] p-6 shadow-2xl'>
                  <svg
                    className='animate-spin w-12 h-12 text-white'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </div>

                {/* Processing Card */}
                <div
                  className='p-10 rounded-3xl shadow-2xl backdrop-blur-xl'
                  style={{
                    background: 'var(--card-background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <h2
                    className='text-4xl font-bold mb-6'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Processing your subscription...
                  </h2>
                  <p
                    className='text-xl leading-relaxed'
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Please wait while we activate your new plan.
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-8'>
                {/* Success Animation with Confetti */}
                <div className='mx-auto w-20 h-20 relative'>
                  {/* Confetti particles */}
                  <div className='absolute inset-0 pointer-events-none'>
                    {/* Top particles */}
                    <div className='absolute top-4 left-8 w-3 h-3 bg-[#c96342] rounded-sm animate-confetti-1'></div>
                    <div className='absolute top-6 right-10 w-2 h-4 bg-[#e07c54] rounded-sm animate-confetti-2'></div>
                    <div className='absolute top-2 left-16 w-4 h-2 bg-[#fbbf24] rounded-sm animate-confetti-3'></div>
                    <div className='absolute top-8 right-6 w-2 h-3 bg-[#8b5cf6] rounded-sm animate-confetti-4'></div>

                    {/* Side particles */}
                    <div className='absolute top-12 left-2 w-3 h-2 bg-[#10b981] rounded-sm animate-confetti-5'></div>
                    <div className='absolute top-14 right-2 w-2 h-2 bg-[#f59e0b] rounded-sm animate-confetti-6'></div>
                    <div className='absolute top-16 left-6 w-4 h-3 bg-[#ef4444] rounded-sm animate-confetti-7'></div>
                    <div className='absolute top-18 right-8 w-2 h-4 bg-[#3b82f6] rounded-sm animate-confetti-8'></div>

                    {/* Bottom particles */}
                    <div className='absolute top-20 left-12 w-3 h-2 bg-[#c96342] rounded-sm animate-confetti-9'></div>
                    <div className='absolute top-22 right-12 w-2 h-3 bg-[#e07c54] rounded-sm animate-confetti-10'></div>
                    <div className='absolute top-24 left-4 w-4 h-2 bg-[#8b5cf6] rounded-sm animate-confetti-11'></div>
                    <div className='absolute top-26 right-4 w-2 h-4 bg-[#fbbf24] rounded-sm animate-confetti-12'></div>
                  </div>

                  {/* Main circle */}
                  <div className='relative w-full h-full rounded-full bg-gradient-to-r from-[#c96342] to-[#e07c54] shadow-2xl flex items-center justify-center animate-bounce-once'>
                    <svg
                      className='w-12 h-12 text-white'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='3'
                        d='M5 13l4 4L19 7'
                      ></path>
                    </svg>
                  </div>
                </div>

                <style jsx>{`
                  @keyframes confetti-1 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-80px) translateX(-20px)
                        rotate(180deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-2 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-60px) translateX(30px)
                        rotate(-120deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-3 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-70px) translateX(-15px)
                        rotate(270deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-4 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-85px) translateX(25px)
                        rotate(-180deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-5 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-40px) translateX(-40px)
                        rotate(90deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-6 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-50px) translateX(40px)
                        rotate(-90deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-7 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-30px) translateX(-30px)
                        rotate(145deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-8 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-45px) translateX(35px)
                        rotate(-200deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-9 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-20px) translateX(-25px)
                        rotate(60deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-10 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-35px) translateX(20px)
                        rotate(-75deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-11 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-25px) translateX(-35px)
                        rotate(120deg);
                      opacity: 0;
                    }
                  }
                  @keyframes confetti-12 {
                    0% {
                      transform: translateY(0) rotate(0deg);
                      opacity: 1;
                    }
                    100% {
                      transform: translateY(-40px) translateX(30px)
                        rotate(-150deg);
                      opacity: 0;
                    }
                  }
                  @keyframes bounce-once {
                    0%,
                    20%,
                    53%,
                    80%,
                    100% {
                      transform: translateY(0);
                    }
                    40%,
                    43% {
                      transform: translateY(-15px);
                    }
                    70% {
                      transform: translateY(-7px);
                    }
                  }

                  .animate-confetti-1 {
                    animation: confetti-1 1.2s ease-out forwards;
                  }
                  .animate-confetti-2 {
                    animation: confetti-2 1.4s ease-out forwards;
                  }
                  .animate-confetti-3 {
                    animation: confetti-3 1.1s ease-out forwards;
                  }
                  .animate-confetti-4 {
                    animation: confetti-4 1.3s ease-out forwards;
                  }
                  .animate-confetti-5 {
                    animation: confetti-5 1.5s ease-out forwards;
                  }
                  .animate-confetti-6 {
                    animation: confetti-6 1.2s ease-out forwards;
                  }
                  .animate-confetti-7 {
                    animation: confetti-7 1.4s ease-out forwards;
                  }
                  .animate-confetti-8 {
                    animation: confetti-8 1.1s ease-out forwards;
                  }
                  .animate-confetti-9 {
                    animation: confetti-9 1.6s ease-out forwards;
                  }
                  .animate-confetti-10 {
                    animation: confetti-10 1.3s ease-out forwards;
                  }
                  .animate-confetti-11 {
                    animation: confetti-11 1.5s ease-out forwards;
                  }
                  .animate-confetti-12 {
                    animation: confetti-12 1.2s ease-out forwards;
                  }
                  .animate-bounce-once {
                    animation: bounce-once 1s ease-out forwards;
                  }
                `}</style>

                {/* Success Card */}
                <div
                  className='p-10 rounded-3xl shadow-2xl backdrop-blur-xl'
                  style={{
                    background: 'var(--card-background)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <h2
                    className='text-4xl font-bold mb-6'
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Subscription Successful!
                  </h2>
                  <p
                    className='text-xl leading-relaxed mb-8'
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Your subscription has been activated successfully. You can
                    now access all premium features.
                  </p>

                  {/* Action Button */}
                  <div className='mt-8'>
                    <button
                      onClick={handleContinue}
                      className='group w-full px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 bg-gradient-to-r from-[#c96342] to-[#e07c54] text-white shadow-xl'
                    >
                      Continue to ReadItEasy
                      <svg
                        className='inline w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
                          clipRule='evenodd'
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className='absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-[#c96342]/5 to-[#e07c54]/5 rounded-full blur-2xl'></div>
      <div className='absolute bottom-1/3 right-1/3 w-24 h-24 bg-gradient-to-r from-[#c96342]/5 to-[#e07c54]/5 rounded-full blur-2xl'></div>
    </div>
  );
}
