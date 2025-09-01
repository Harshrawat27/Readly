'use client';

import React from 'react';

interface ConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonStyle?: 'default' | 'danger' | 'primary';
  isLoading?: boolean;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonStyle = 'default',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getConfirmButtonClasses = () => {
    const baseClasses = 'px-4 py-2 text-sm rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (confirmButtonStyle) {
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700`;
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      default:
        return `${baseClasses} bg-gray-600 text-white hover:bg-gray-700`;
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-[#2a2a2a] rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-600/30'>
        <h3 className='text-lg font-semibold text-white mb-2'>
          {title}
        </h3>
        <div className='text-sm text-gray-300 mb-6 whitespace-pre-line'>
          {message}
        </div>
        <div className='flex gap-3 justify-end'>
          <button
            onClick={onClose}
            disabled={isLoading}
            className='px-4 py-2 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={getConfirmButtonClasses()}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;