'use client';

import React, { useEffect } from 'react';

interface ToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  isOpen,
  onClose,
  message,
  type = 'info',
  duration = 4000,
}) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-500';
      case 'error':
        return 'bg-red-600 border-red-500';
      default:
        return 'bg-blue-600 border-blue-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M20 6L9 17l-5-5' />
          </svg>
        );
      case 'error':
        return (
          <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='12' cy='12' r='10' />
            <line x1='15' y1='9' x2='9' y2='15' />
            <line x1='9' y1='9' x2='15' y2='15' />
          </svg>
        );
      default:
        return (
          <svg className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='16' x2='12' y2='12' />
            <line x1='12' y1='8' x2='12.01' y2='8' />
          </svg>
        );
    }
  };

  return (
    <div className='fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300'>
      <div className={`${getToastStyles()} text-white px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 max-w-sm`}>
        <div className='flex-shrink-0'>
          {getIcon()}
        </div>
        <div className='flex-1 text-sm'>
          {message}
        </div>
        <button
          onClick={onClose}
          className='flex-shrink-0 text-white/70 hover:text-white transition-colors'
        >
          <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <path d='M18 6L6 18' />
            <path d='M6 6l12 12' />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;