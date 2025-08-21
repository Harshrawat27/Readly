'use client';

import { useState } from 'react';
import { ToolType } from './FigmaToolbar';

interface ShapeToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  currentColor: string;
  currentStrokeWidth: number;
}

export default function ShapeToolbar({
  activeTool,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  currentColor,
  currentStrokeWidth,
}: ShapeToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isShapeToolActive = ['rectangle', 'ellipse', 'line', 'arrow'].includes(activeTool);

  if (!isShapeToolActive) return null;

  const predefinedColors = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#808080', // Gray
  ];

  const strokeWidths = [1, 2, 3, 4, 5, 8, 10];

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-[var(--card-background)] rounded-xl shadow-2xl border border-[var(--border)] p-4">
        <div className="flex items-center gap-4">
          {/* Shape Type Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Shape:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToolChange('rectangle')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  activeTool === 'rectangle'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
                }`}
                title="Rectangle"
              >
                <RectangleIcon />
              </button>
              <button
                onClick={() => onToolChange('ellipse')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  activeTool === 'ellipse'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
                }`}
                title="Circle/Ellipse"
              >
                <EllipseIcon />
              </button>
              <button
                onClick={() => onToolChange('line')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  activeTool === 'line'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
                }`}
                title="Line"
              >
                <LineIcon />
              </button>
              <button
                onClick={() => onToolChange('arrow')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  activeTool === 'arrow'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
                }`}
                title="Arrow"
              >
                <ArrowIcon />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-[var(--border)]" />

          {/* Color Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Color:</span>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-8 h-8 rounded-lg border-2 border-[var(--border)] flex items-center justify-center hover:border-[var(--accent)] transition-colors"
                style={{ backgroundColor: currentColor }}
                title="Shape Color"
              >
                {currentColor === '#000000' && (
                  <div className="w-4 h-4 bg-white rounded opacity-50" />
                )}
              </button>

              {showColorPicker && (
                <div className="absolute bottom-full mb-2 left-0 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-xl p-3 min-w-[200px]">
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onColorChange(color);
                          setShowColorPicker(false);
                        }}
                        className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 hover:scale-110 ${
                          currentColor === color
                            ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-30'
                            : 'border-[var(--border)] hover:border-[var(--accent)]'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="border-t border-[var(--border)] pt-3">
                    <label className="block text-xs text-[var(--text-secondary)] mb-2">
                      Custom Color:
                    </label>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => onColorChange(e.target.value)}
                      className="w-full h-8 rounded-lg border border-[var(--border)] bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-[var(--border)]" />

          {/* Stroke Width Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Width:</span>
            <div className="flex items-center gap-1">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => onStrokeWidthChange(width)}
                  className={`w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center ${
                    currentStrokeWidth === width
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
                  }`}
                  title={`${width}px`}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{
                      width: Math.min(width * 2, 16),
                      height: Math.min(width * 2, 16),
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-[var(--border)]" />

          {/* Move Tool */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToolChange('move')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                activeTool === 'move'
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-primary)] hover:bg-[var(--faded-white)]'
              }`}
              title="Move/Select Shapes"
            >
              <MoveIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components
const RectangleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const EllipseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const LineIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5"
  >
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="w-5 h-5"
  >
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7,7 17,7 17,17" />
  </svg>
);

const MoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
  </svg>
);