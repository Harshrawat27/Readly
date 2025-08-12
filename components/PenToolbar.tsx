'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PenSettings {
  brushWidth: number;
  brushColor: string;
}

const PenToolbar: React.FC = () => {
  const [penSettings, setPenSettings] = useState<PenSettings>({
    brushWidth: 3,
    brushColor: '#000000'
  });
  
  const sizeInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Initialize with global settings
  useEffect(() => {
    setPenSettings({
      brushWidth: 3,
      brushColor: '#000000'
    });
  }, []);

  // Update input values when settings change
  useEffect(() => {
    if (sizeInputRef.current) {
      sizeInputRef.current.value = penSettings.brushWidth.toString();
    }
    if (colorInputRef.current) {
      colorInputRef.current.value = penSettings.brushColor;
    }
  }, [penSettings]);

  const handleSizeChange = (value: number) => {
    const newSize = Math.max(1, Math.min(50, value));
    setPenSettings(prev => ({ ...prev, brushWidth: newSize }));
    
    // Notify PenTool component
    window.dispatchEvent(new CustomEvent('penSettingsChange', {
      detail: { brushWidth: newSize }
    }));
  };

  const handleColorChange = (color: string) => {
    setPenSettings(prev => ({ ...prev, brushColor: color }));
    
    // Notify PenTool component
    window.dispatchEvent(new CustomEvent('penSettingsChange', {
      detail: { brushColor: color }
    }));
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white shadow-lg rounded-lg border px-4 py-2 flex items-center space-x-4">
        {/* Brush Size */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Size:</span>
          <input
            ref={sizeInputRef}
            type="range"
            min="1"
            max="50"
            value={penSettings.brushWidth}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            onChange={(e) => handleSizeChange(parseInt(e.target.value))}
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((penSettings.brushWidth - 1) / 49) * 100}%, #e5e7eb ${((penSettings.brushWidth - 1) / 49) * 100}%, #e5e7eb 100%)`
            }}
          />
          <span className="text-sm text-gray-500 w-8 text-center">{penSettings.brushWidth}</span>
        </div>

        {/* Color Picker */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Color:</span>
          <input
            ref={colorInputRef}
            type="color"
            value={penSettings.brushColor}
            className="w-8 h-8 rounded border cursor-pointer"
            onChange={(e) => handleColorChange(e.target.value)}
          />
          {/* Quick colors */}
          <div className="flex space-x-1">
            {['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00'].map(color => (
              <button
                key={color}
                className={`w-6 h-6 rounded border-2 hover:border-gray-500 transition-colors ${
                  penSettings.brushColor === color ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
              />
            ))}
          </div>
        </div>

        {/* Undo/Clear buttons - these will dispatch events to PenTool */}
        <div className="flex items-center space-x-2 border-l border-gray-200 pl-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('penUndo'))}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('penClear'))}
            className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Custom styles for the range slider */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default PenToolbar;