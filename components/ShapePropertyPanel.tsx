'use client';

import React, { useState } from 'react';
import { Shape } from './ShapeSystem';
import { useDebounce } from '@/hooks/useDebounce';

interface ShapePropertyPanelProps {
  selectedShape: Shape | null;
  onShapeUpdate: (shapeId: string, updates: Partial<Shape>) => void;
  onDeleteShape: (shapeId: string) => void;
  onClose: () => void;
}

const ShapePropertyPanel: React.FC<ShapePropertyPanelProps> = ({
  selectedShape,
  onShapeUpdate,
  onDeleteShape,
  onClose,
}) => {
  const [localColor, setLocalColor] = useState(selectedShape?.color || '#000000');
  const [localFillColor, setLocalFillColor] = useState(selectedShape?.fillColor || '');

  // Debounced updates
  const debouncedUpdate = useDebounce((shapeId: string, updates: Partial<Shape>) => {
    onShapeUpdate(shapeId, updates);
  }, 300);

  const handleColorChange = (color: string) => {
    if (!selectedShape) return;
    setLocalColor(color);
    debouncedUpdate(selectedShape.id, { color });
  };

  const handleFillColorChange = (fillColor: string) => {
    if (!selectedShape) return;
    setLocalFillColor(fillColor);
    debouncedUpdate(selectedShape.id, { fillColor: fillColor || undefined });
  };

  const handleDelete = () => {
    if (selectedShape && window.confirm('Delete this shape?')) {
      onDeleteShape(selectedShape.id);
      onClose();
    }
  };

  if (!selectedShape) return null;

  return (
    <div className="fixed top-20 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 capitalize">
          {selectedShape.type}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg font-bold w-6 h-6 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Colors */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Stroke Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fill Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localFillColor || '#ffffff'}
              onChange={(e) => handleFillColorChange(e.target.value)}
              className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={localFillColor}
              onChange={(e) => handleFillColorChange(e.target.value)}
              placeholder="none"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Stroke Width: {selectedShape.strokeWidth}px
          </label>
          <input
            type="range"
            value={selectedShape.strokeWidth}
            onChange={(e) => debouncedUpdate(selectedShape.id, { strokeWidth: parseFloat(e.target.value) })}
            className="w-full"
            min="0.5"
            max="10"
            step="0.5"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Opacity: {Math.round(selectedShape.opacity * 100)}%
          </label>
          <input
            type="range"
            value={selectedShape.opacity}
            onChange={(e) => debouncedUpdate(selectedShape.id, { opacity: parseFloat(e.target.value) })}
            className="w-full"
            min="0"
            max="1"
            step="0.1"
          />
        </div>

        {/* Delete Button */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShapePropertyPanel;