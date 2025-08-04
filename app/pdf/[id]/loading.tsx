export default function Loading() {
  return (
    <div className='h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]'>
      {/* Loading Layout mimicking the main layout */}
      <div className='main-layout flex h-full'>
        {/* PDF History Sidebar Skeleton */}
        <div className='bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex-shrink-0 w-80 max-w-[400px]'>
          <div className='p-4 space-y-4'>
            {/* Header skeleton */}
            <div className='flex items-center gap-3 pb-4 border-b border-[var(--border)]'>
              <div className='w-8 h-8 bg-[var(--card-bg)] rounded-full animate-pulse'></div>
              <div className='h-5 bg-[var(--card-bg)] rounded w-24 animate-pulse'></div>
            </div>
            
            {/* PDF list skeleton */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className='p-3 bg-[var(--card-bg)] rounded-lg animate-pulse space-y-2'>
                <div className='h-4 bg-[var(--background)] rounded w-full'></div>
                <div className='h-3 bg-[var(--background)] rounded w-2/3'></div>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Viewer Skeleton */}
        <div className='flex-1 bg-[var(--pdf-viewer-bg)] relative overflow-hidden' style={{ minWidth: '400px' }}>
          <div className='h-full flex items-center justify-center'>
            <div className='text-center space-y-4'>
              <div className='w-16 h-16 border-4 border-[var(--card-bg)] border-t-[var(--accent)] rounded-full animate-spin mx-auto'></div>
              <div className='space-y-2'>
                <div className='h-4 bg-[var(--card-bg)] rounded w-32 mx-auto animate-pulse'></div>
                <div className='h-3 bg-[var(--card-bg)] rounded w-24 mx-auto animate-pulse'></div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizer skeleton */}
        <div className='w-1 bg-[var(--border)] cursor-col-resize'></div>

        {/* Chat Panel Skeleton */}
        <div className='bg-[var(--chat-bg)] flex-shrink-0 w-96 flex flex-col'>
          {/* Chat header skeleton */}
          <div className='p-4 border-b border-[var(--border)]'>
            <div className='h-6 bg-[var(--card-bg)] rounded w-20 animate-pulse'></div>
          </div>
          
          {/* Chat messages skeleton */}
          <div className='flex-1 p-4 space-y-4'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg animate-pulse space-y-2 ${
                  i % 2 === 0 ? 'bg-[var(--card-bg)]' : 'bg-[var(--accent)] bg-opacity-20'
                }`}>
                  <div className='h-3 bg-[var(--background)] rounded w-full'></div>
                  <div className='h-3 bg-[var(--background)] rounded w-2/3'></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Chat input skeleton */}
          <div className='p-4 border-t border-[var(--border)]'>
            <div className='h-10 bg-[var(--card-bg)] rounded-lg animate-pulse'></div>
          </div>
        </div>
      </div>
    </div>
  );
}