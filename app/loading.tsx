export default function Loading() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-[var(--background)]'>
      <div className='text-center space-y-6'>
        <div className='flex justify-center'>
          <div className='animate-pulse flex space-x-1'>
            <div className='h-3 w-3 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:-0.3s]'></div>
            <div className='h-3 w-3 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:-0.15s]'></div>
            <div className='h-3 w-3 bg-[var(--accent)] rounded-full animate-bounce'></div>
          </div>
        </div>
        <div className='space-y-2'>
          <div className='h-6 bg-[var(--card-bg)] rounded-md w-32 mx-auto animate-pulse'></div>
          <div className='h-4 bg-[var(--card-bg)] rounded-md w-24 mx-auto animate-pulse'></div>
        </div>
      </div>
    </div>
  );
}