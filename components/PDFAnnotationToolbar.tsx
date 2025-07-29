'use client';

import { useState } from 'react';

export type AnnotationTool = 'select' | 'highlight' | 'text' | 'arrow' | 'comment';
export type HighlightColor = '#ffeb3b' | '#4caf50' | '#2196f3' | '#ff9800' | '#f44336';

interface PDFAnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  selectedHighlightColor: HighlightColor;
  onHighlightColorChange: (color: HighlightColor) => void;
  showHighlightColors: boolean;
  onShowHighlightColors: (show: boolean) => void;
}

const highlightColors: { color: HighlightColor; name: string }[] = [
  { color: '#ffeb3b', name: 'Yellow' },
  { color: '#4caf50', name: 'Green' },
  { color: '#2196f3', name: 'Blue' },
  { color: '#ff9800', name: 'Orange' },
  { color: '#f44336', name: 'Red' },
];

export default function PDFAnnotationToolbar({
  activeTool,
  onToolChange,
  selectedHighlightColor,
  onHighlightColorChange,
  showHighlightColors,
  onShowHighlightColors,
}: PDFAnnotationToolbarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const tools = [
    {
      id: 'select' as AnnotationTool,
      name: 'Select',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      ),
    },
    {
      id: 'highlight' as AnnotationTool,
      name: 'Highlight',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11H1l2-2 2 2" />
          <path d="M22 12h-8l-2-2 2-2" />
          <path d="M12 2v8" />
          <path d="M12 14v8" />
        </svg>
      ),
    },
    {
      id: 'text' as AnnotationTool,
      name: 'Text',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4,7 4,4 20,4 20,7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
    },
    {
      id: 'arrow' as AnnotationTool,
      name: 'Arrow',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7,7 17,7 17,17" />
        </svg>
      ),
    },
    {
      id: 'comment' as AnnotationTool,
      name: 'Comment',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-2 flex items-center gap-1">
        {tools.map((tool) => (
          <div key={tool.id} className="relative">
            <button
              onClick={() => {
                if (tool.id === 'highlight') {
                  onShowHighlightColors(!showHighlightColors);
                }
                onToolChange(tool.id);
              }}
              onMouseEnter={() => setShowTooltip(tool.id)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`
                relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center
                ${
                  activeTool === tool.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              {tool.icon}
              
              {/* Tooltip */}
              {showTooltip === tool.id && (
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                  {tool.name}
                </div>
              )}
            </button>

            {/* Highlight Color Picker */}
            {tool.id === 'highlight' && showHighlightColors && activeTool === 'highlight' && (
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex gap-1">
                  {highlightColors.map((colorOption) => (
                    <button
                      key={colorOption.color}
                      onClick={() => {
                        onHighlightColorChange(colorOption.color);
                        onShowHighlightColors(false);
                      }}
                      className={`
                        w-8 h-8 rounded-full border-2 transition-all duration-200
                        ${
                          selectedHighlightColor === colorOption.color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                        }
                      `}
                      style={{ backgroundColor: colorOption.color }}
                      title={colorOption.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Clear All Button */}
        <button
          onClick={() => {
            // This will be handled by parent component
          }}
          onMouseEnter={() => setShowTooltip('clear')}
          onMouseLeave={() => setShowTooltip(null)}
          className="relative p-3 rounded-xl transition-all duration-200 flex items-center justify-center hover:bg-red-50 text-red-600"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          
          {showTooltip === 'clear' && (
            <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
              Clear All
            </div>
          )}
        </button>
      </div>
    </div>
  );
}