import Image from 'next/image';

export default function SignIn() {
  return (
    <div className='min-h-screen flex'>
      {/* Left side - Form */}
      <div className='flex-1 flex items-center justify-center px-8 py-12'>
        <div className='w-full max-w-md space-y-8'>
          {/* Logo */}
          <div className='flex items-center gap-2 mb-12'>
            <div className='w-8 h-8 bg-accent rounded-full flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-white'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
              </svg>
            </div>
            <span className='text-xl font-semibold'>Claude</span>
          </div>

          {/* Header */}
          <div className='space-y-2'>
            <h1 className='text-5xl font-normal leading-tight'>
              Your ideas,
              <br />
              amplified
            </h1>
            <p className='text-lg text-secondary'>
              Privacy-first AI that helps you create in confidence.
            </p>
          </div>

          {/* Sign in form */}
          <div className='space-y-4'>
            {/* Google Sign In */}
            <button className='w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-gray-50 transition-colors'>
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
              <span className='text-sm font-medium'>Continue with Google</span>
            </button>

            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-divider'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-2 bg-background text-muted'>OR</span>
              </div>
            </div>

            {/* Email input */}
            <div className='space-y-3'>
              <input
                type='email'
                placeholder='Enter your personal or work email'
                className='w-full input'
              />
              <button className='w-full button-primary'>
                Continue with email
              </button>
            </div>
          </div>

          {/* Learn more link */}
          <div className='flex justify-center pt-8'>
            <a
              href='#'
              className='text-sm text-secondary hover:text-primary flex items-center gap-1'
            >
              Learn more
              <svg
                className='w-4 h-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </a>
          </div>

          {/* Pagination dots */}
          <div className='flex justify-center gap-2 pt-4'>
            <div className='w-2 h-2 rounded-full bg-gray-300'></div>
            <div className='w-2 h-2 rounded-full bg-gray-300'></div>
            <div className='w-2 h-2 rounded-full bg-gray-900'></div>
          </div>
        </div>
      </div>

      {/* Right side - Feature showcase */}
      <div className='hidden lg:flex flex-1 bg-gray-50 items-center justify-center px-8 py-12'>
        <div className='max-w-lg'>
          <div className='flex items-start gap-4 mb-6'>
            <div className='w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0'>
              <svg
                className='w-6 h-6 text-gray-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                />
              </svg>
            </div>
            <div className='space-y-2'>
              <p className='text-sm text-gray-600'>
                Claude, create a report to analyze product usage and user
                feedback.
              </p>
            </div>
          </div>

          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>Here's the report.</p>

            <div className='card p-6 space-y-4'>
              <h3 className='text-lg font-semibold'>
                Customer Insights Report
              </h3>
              <p className='text-sm text-secondary'>
                This report provides an analysis of customer feedback across
                various segments and time periods. The data presented offers
                insights into our current performance and customer satisfaction
                levels.
              </p>

              <div className='space-y-2'>
                <h4 className='text-sm font-semibold'>Overview</h4>
                <div className='grid grid-cols-4 gap-4 text-sm'>
                  <div>
                    <div className='text-muted text-xs'>Users</div>
                    <div className='font-semibold'>23,000</div>
                  </div>
                  <div>
                    <div className='text-muted text-xs'>NPS score</div>
                    <div className='font-semibold'>80</div>
                  </div>
                  <div>
                    <div className='text-muted text-xs'>Projects</div>
                    <div className='font-semibold'>45</div>
                  </div>
                  <div>
                    <div className='text-muted text-xs'>Notes</div>
                    <div className='font-semibold'>465</div>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <h4 className='text-sm font-semibold'>
                  Trend: Users are creating more notes
                </h4>
                <p className='text-sm text-secondary'>
                  The graph shows a clear upward trend in note creation over
                  time. Starting from approximately 50 notes at the beginning of
                  the observed period, it has increased to nearly 300 by the
                  end. This
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
