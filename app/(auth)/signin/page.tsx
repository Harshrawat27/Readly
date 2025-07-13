import Image from 'next/image';

export default function SignIn() {
  return (
    <div className='min-h-screen flex'>
      {/* Left side - Sign in form */}
      <div className='flex-1 flex items-center justify-center px-8 py-12'>
        <div className='w-full max-w-[400px] space-y-8'>
          {/* Logo */}
          <div className='flex items-center gap-3 mb-16'>
            <div className='w-7 h-7 bg-[#ff6b35] rounded-full flex items-center justify-center'>
              <svg
                className='w-4 h-4 text-white'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M12 2L2 7v10c0 5.55 3.84 10 9 9 1.41-.07 2.72-.45 3.9-1.1' />
                <path d='M22 12c0 1-.18 1.95-.5 2.84a10 10 0 0 1-2.4 3.16' />
                <path d='M8.5 8.5l7 7' />
                <path d='M15.5 8.5l-7 7' />
              </svg>
            </div>
            <span className='text-[22px] font-medium text-[var(--text-primary)]'>
              Claude
            </span>
          </div>

          {/* Header */}
          <div className='space-y-3 mb-12'>
            <h1 className='text-[56px] font-light leading-[1.1] text-[var(--text-primary)] tracking-[-0.02em]'>
              Your ideas,
              <br />
              amplified
            </h1>
            <p className='text-[18px] text-[var(--text-secondary)] leading-[1.4] mt-4'>
              Privacy-first AI that helps you create in confidence.
            </p>
          </div>

          {/* Sign in form */}
          <div className='space-y-4'>
            {/* Google Sign In */}
            <button className='w-full flex items-center justify-center gap-3 px-4 py-[14px] border border-[var(--border)] rounded-[10px] hover:bg-gray-50 transition-colors bg-white'>
              <svg className='w-5 h-5' viewBox='0 0 24 24'>
                <path
                  fill='#4285F4'
                  d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                />
                <path
                  fill='#34A853'
                  d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                />
                <path
                  fill='#FBBC05'
                  d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                />
                <path
                  fill='#EA4335'
                  d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                />
              </svg>
              <span className='text-[15px] font-medium text-[var(--text-primary)]'>
                Continue with Google
              </span>
            </button>

            {/* Divider */}
            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-[var(--divider)]'></div>
              </div>
              <div className='relative flex justify-center text-[14px]'>
                <span className='px-3 bg-[var(--background)] text-[var(--text-muted)]'>
                  OR
                </span>
              </div>
            </div>

            {/* Email input */}
            <div className='space-y-4'>
              <input
                type='email'
                placeholder='Enter your personal or work email'
                className='w-full px-4 py-[14px] border border-[var(--input-border)] rounded-[10px] text-[15px] placeholder-[var(--text-muted)] bg-[var(--input-background)] focus:outline-none focus:border-[var(--text-primary)] transition-colors'
              />
              <button className='w-full bg-[var(--button-primary)] text-[var(--button-primary-text)] py-[14px] rounded-[10px] text-[15px] font-medium hover:opacity-90 transition-opacity'>
                Continue with email
              </button>
            </div>
          </div>

          {/* Learn more link */}
          <div className='flex justify-center pt-12'>
            <a
              href='#'
              className='text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors'
            >
              Learn more
              <svg
                className='w-4 h-4 transform rotate-90'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </a>
          </div>

          {/* Pagination dots */}
          <div className='flex justify-center gap-2 pt-6'>
            <div className='w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-30'></div>
            <div className='w-2 h-2 rounded-full bg-[var(--text-muted)] opacity-30'></div>
            <div className='w-2 h-2 rounded-full bg-[var(--text-primary)]'></div>
          </div>
        </div>
      </div>

      {/* Right side - Placeholder for slider */}
      <div className='hidden lg:flex flex-1 bg-[#f8f7f5] items-center justify-center px-8 py-12'>
        <div className='w-full max-w-lg'>
          {/* Placeholder for slider content */}
          <div className='bg-white rounded-[16px] border border-[var(--border)] p-8 shadow-sm'>
            <div className='text-center space-y-4'>
              <div className='w-16 h-16 bg-gray-100 rounded-full mx-auto'></div>
              <h3 className='text-lg font-medium text-[var(--text-primary)]'>
                Slider Content
              </h3>
              <p className='text-[var(--text-secondary)] text-sm'>
                This area will contain the image slider content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
