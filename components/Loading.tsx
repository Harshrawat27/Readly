'use client';

export default function Loading() {
  return (
    <div className='h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Main Three-Panel Layout - Full height */}
      <div className='flex h-full'>
        {/* PDF History Sidebar - Skeleton */}
        <div className='w-80 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0'>
          <div className='p-4 space-y-4'>
            {/* Logo Area */}
            {/* Readly Logo */}
            <div className='flex items-center gap-3'>
              <div className='w-6 h-6 bg-[var(--accent)] rounded-md flex items-center justify-center'>
                <svg
                  className='w-4 h-4 text-white'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                </svg>
              </div>
              <h1 className='text-lg font-medium text-[var(--text-primary)]'>
                ReadItEasy
              </h1>
            </div>

            {/* Upload Button Skeleton */}
            <div className='h-12 bg-[var(--faded-white)] rounded-lg animate-pulse'></div>

            {/* PDF List Skeleton */}
            <div className='space-y-3 mt-6'>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className='flex items-center space-x-3 p-3 rounded-lg'
                >
                  <div className='w-10 h-12 bg-[var(--faded-white)] rounded animate-pulse'></div>
                  <div className='flex-1 space-y-2'>
                    <div
                      className='h-4 bg-[var(--faded-white)] rounded animate-pulse'
                      style={{ width: `${Math.random() * 60 + 40}%` }}
                    ></div>
                    <div
                      className='h-3 bg-[var(--faded-white)] rounded animate-pulse'
                      style={{ width: `${Math.random() * 40 + 30}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* User Profile Skeleton */}
            <div className='absolute bottom-6 left-6 right-6 w-[300px]'>
              <div className='flex items-center space-x-3 p-3 rounded-lg'>
                <div className='w-8 h-8 bg-[var(--faded-white)] rounded-full animate-pulse'></div>
                <div className='flex-1'>
                  <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse w-3/4'></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer - Skeleton */}
        <div className='flex-1 min-w-0 bg-[var(--pdf-viewer-bg)] relative flex items-center justify-center'>
          <div className='text-center space-y-6 w-[100%] h-[100%]'>
            {/* PDF Viewer Skeleton */}
            <div className=' w-[100%] h-[100%]  border border-[var(--pdf-viewer-bg)]  mx-auto relative overflow-hidden'>
              <div className='absolute inset-0 bg-gradient-to-br from-[var(--faded-white)] via-transparent to-[var(--faded-white)] animate-pulse'></div>
              <div className='p-6 space-y-4'>
                <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse'></div>
                <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse w-5/6'></div>
                <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse w-4/6'></div>
                <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse w-full'></div>
                <div className='h-4 bg-[var(--faded-white)] rounded animate-pulse w-3/4'></div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div className='w-1 bg-[var(--border)] flex-shrink-0'></div>

        {/* Chat Panel - Skeleton */}
        <div className='w-96 h-full bg-[var(--chat-bg)] border-l border-[var(--border)] flex-shrink-0 flex flex-col justify-between items-stretch'>
          <div className='p-4 border-b border-[var(--border)] bg-[var(--card-background)]'>
            <div className='flex items-center justify-between'>
              <div className='h-6 w-32 bg-[var(--faded-white)] rounded animate-pulse'></div>
              <div className='h-5 w-20 bg-[var(--faded-white)] rounded animate-pulse'></div>
            </div>
            <div className='h-4 w-40 bg-[var(--faded-white)] rounded animate-pulse mt-2'></div>
          </div>

          {/* Chat Messages Skeleton */}
          <div className='p-4 space-y-4 flex-1'>
            <div className='text-center py-8'>
              <div className='w-12 h-12 bg-[var(--faded-white)] rounded-full mx-auto mb-3 animate-pulse'></div>
              <div className='h-4 w-48 bg-[var(--faded-white)] rounded animate-pulse mx-auto'></div>
            </div>

            {/* Sample chat bubbles */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`flex ${
                  i % 2 === 0 ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    i % 2 === 0
                      ? 'bg-[#0F0F0E]'
                      : 'bg-[var(--card-background)] border border-[var(--border)]'
                  }`}
                >
                  <div className='space-y-2'>
                    <div
                      className='h-4 bg-gray-300/20 rounded animate-pulse'
                      style={{ width: `${Math.random() * 200 + 100}px` }}
                    ></div>
                    <div
                      className='h-4 bg-gray-300/20 rounded animate-pulse'
                      style={{ width: `${Math.random() * 150 + 80}px` }}
                    ></div>
                  </div>
                  <div className='h-3 w-12 bg-gray-300/20 rounded animate-pulse mt-2'></div>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area Skeleton */}
          <div className='p-4 border-t border-[var(--border)] bg-[var(--card-background)]'>
            <div className='border border-[var(--border)] rounded-xl bg-[var(--input-background)]'>
              <div className='h-12 bg-[var(--faded-white)] rounded-t-xl animate-pulse'></div>
              <div className='flex items-center justify-between p-4'>
                <div className='flex space-x-2'>
                  <div className='w-8 h-8 bg-[var(--faded-white)] rounded-lg animate-pulse'></div>
                  <div className='w-8 h-8 bg-[var(--faded-white)] rounded-lg animate-pulse'></div>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='h-6 w-24 bg-[var(--faded-white)] rounded animate-pulse'></div>
                  <div className='w-8 h-8 bg-[var(--accent)]/50 rounded-lg animate-pulse'></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
