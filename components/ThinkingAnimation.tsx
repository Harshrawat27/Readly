'use client';

interface ThinkingAnimationProps {
  className?: string;
}

export default function ThinkingAnimation({
  className = '',
}: ThinkingAnimationProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className='text-[var(--text-muted)] text-sm'>Thinking</span>
      <div className='flex gap-1 items-end'>
        <div
          className='w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full'
          style={{
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: '0s',
          }}
        />
        <div
          className='w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full'
          style={{
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: '0.15s',
          }}
        />
        <div
          className='w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full'
          style={{
            animation: 'wave 1.2s ease-in-out infinite',
            animationDelay: '0.3s',
          }}
        />
      </div>
      <style jsx>{`
        @keyframes wave {
          0%,
          60%,
          100% {
            transform: initial;
            opacity: 0.4;
          }
          30% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
