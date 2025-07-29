'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  x: number;
  y: number;
  content: string;
  pageNumber: number;
}

interface PDFCommentTooltipProps {
  comment: Comment | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onViewFull: (comment: Comment) => void;
}

export default function PDFCommentTooltip({
  comment,
  position,
  onClose,
  onViewFull,
}: PDFCommentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (comment && position) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [comment, position]);

  if (!comment || !position || !isVisible) return null;

  const maxPreviewLength = 100;
  const previewText = comment.content.length > maxPreviewLength 
    ? comment.content.substring(0, maxPreviewLength) + '...'
    : comment.content;

  return (
    <div
      className="fixed z-50 max-w-sm"
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 250),
        top: Math.max(position.y - 60, 20),
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Comment
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview content */}
        <div className="text-sm text-gray-700 mb-3 leading-relaxed">
          {previewText}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {comment.content.length > maxPreviewLength && (
            <button
              onClick={() => onViewFull(comment)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View Full
            </button>
          )}
        </div>
      </div>

      {/* Arrow pointing to comment */}
      <div
        className="absolute w-0 h-0 border-t-4 border-l-4 border-r-4 border-transparent border-t-gray-200"
        style={{
          left: '20px',
          top: '100%',
          marginTop: '-1px',
        }}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-t-3 border-l-3 border-r-3 border-transparent border-t-white" />
      </div>
    </div>
  );
}