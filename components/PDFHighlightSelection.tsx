'use client';

import { useState, useEffect } from 'react';
import { HighlightColor } from './PDFAnnotationToolbar';

interface HighlightOption {
  color: HighlightColor;
  name: string;
}

interface PDFHighlightSelectionProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  onHighlight: (color: HighlightColor) => void;
  onAskReadly: () => void;
  visible: boolean;
  onClose: () => void;
}

const highlightColors: HighlightOption[] = [
  { color: '#ffeb3b', name: 'Yellow' },
  { color: '#4caf50', name: 'Green' },
  { color: '#2196f3', name: 'Blue' },
  { color: '#ff9800', name: 'Orange' },
  { color: '#f44336', name: 'Red' },
];

export default function PDFHighlightSelection({
  selectedText,
  selectionRect,
  onHighlight,
  onAskReadly,
  visible,
  onClose,
}: PDFHighlightSelectionProps) {
  const [showHighlightColors, setShowHighlightColors] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowHighlightColors(false);
    }
  }, [visible]);

  if (!visible || !selectionRect) return null;

  const position = {
    left: Math.min(selectionRect.left + selectionRect.width / 2, window.innerWidth - 200),
    top: Math.max(selectionRect.top - 60, 20),
  };

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2"
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
        {/* Main buttons */}
        <div className="flex items-center p-2 gap-1">
          <button
            onClick={onAskReadly}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
            Ask Readly
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          <button
            onClick={() => setShowHighlightColors(!showHighlightColors)}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H1l2-2 2 2" />
              <path d="M22 12h-8l-2-2 2-2" />
              <path d="M12 2v8" />
              <path d="M12 14v8" />
            </svg>
            Highlight
            <svg
              className={`w-3 h-3 transition-transform ${showHighlightColors ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Highlight color options */}
        {showHighlightColors && (
          <div className="border-t border-gray-200 p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Choose color:</span>
              <div className="flex gap-1">
                {highlightColors.map((colorOption) => (
                  <button
                    key={colorOption.color}
                    onClick={() => {
                      onHighlight(colorOption.color);
                      setShowHighlightColors(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-500 hover:scale-110 transition-all duration-200"
                    style={{ backgroundColor: colorOption.color }}
                    title={`Highlight with ${colorOption.name}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Arrow pointing to selection */}
      <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"
        style={{ marginTop: '-1px' }}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-white" />
      </div>
    </div>
  );
}