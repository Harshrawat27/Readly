'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'arrow' | 'line';
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  rotation: number; // degrees
  color: string;
  strokeWidth: number;
  fillColor?: string;
  opacity: number;
  pageNumber: number;
  zIndex: number;
  createdAt: Date;
  updatedAt: Date;
  pdfId: string;
  userId: string;
}

interface ShapeSystemProps {
  pageNumber: number;
  shapes: Shape[];
  isShapeMode: boolean;
  activeShapeType: string;
  selectedShapeId: string | null;
  onShapeCreate: (shapeData: Partial<Shape>) => Promise<void>;
  onShapeUpdate: (shapeId: string, updates: Partial<Shape>) => Promise<void>;
  onShapeDelete: (shapeId: string) => Promise<void>;
  onShapeSelect: (shapeId: string | null) => void;
}

const ShapeSystem: React.FC<ShapeSystemProps> = ({
  pageNumber,
  shapes,
  isShapeMode,
  activeShapeType,
  selectedShapeId,
  onShapeCreate,
  onShapeUpdate,
  onShapeDelete,
  onShapeSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingShape, setDrawingShape] = useState<Partial<Shape> | null>(null);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{x: number, y: number} | null>(null);
  
  // Selection and dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');

  // Debounced update function
  const debouncedUpdate = useDebounce((shapeId: string, updates: Partial<Shape>) => {
    onShapeUpdate(shapeId, updates);
  }, 200);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    
    return { x, y };
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isShapeMode) {
      // Check if clicking on existing shape for selection
      const target = e.target as HTMLElement;
      const shapeElement = target.closest('[data-shape-id]');
      
      if (shapeElement) {
        const shapeId = shapeElement.getAttribute('data-shape-id');
        if (shapeId) {
          onShapeSelect(shapeId);
          
          // Check if clicking on resize handle
          const handleElement = target.closest('[data-resize-handle]');
          if (handleElement) {
            setIsResizing(true);
            setResizeHandle(handleElement.getAttribute('data-resize-handle') || '');
            return;
          }
          
          // Start dragging
          const { x, y } = getRelativePosition(e.clientX, e.clientY);
          const shape = shapes.find(s => s.id === shapeId);
          if (shape) {
            setIsDragging(true);
            setDragOffset({ x: x - shape.x, y: y - shape.y });
          }
        }
      } else {
        onShapeSelect(null);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    const { x, y } = getRelativePosition(e.clientX, e.clientY);

    if (activeShapeType === 'rectangle' || activeShapeType === 'circle') {
      // Rectangle and Circle: drag to create
      setIsDrawing(true);
      setStartPoint({ x, y });
      setCurrentPoint({ x, y });
      
      const newShape: Partial<Shape> = {
        type: activeShapeType as Shape['type'],
        x,
        y,
        width: 0,
        height: 0,
        color: '#000000',
        strokeWidth: 2,
        fillColor: '#E5E7EB', // Default gray fill
        opacity: 1,
        pageNumber,
        zIndex: shapes.length,
      };
      setDrawingShape(newShape);
      
    } else if (activeShapeType === 'line' || activeShapeType === 'arrow') {
      // Line and Arrow: two-click mode
      if (!startPoint) {
        // First click - set start point
        setStartPoint({ x, y });
        setCurrentPoint({ x, y });
        setIsDrawing(true);
      } else {
        // Second click - create the line/arrow
        const width = Math.abs(x - startPoint.x);
        const height = Math.abs(y - startPoint.y);
        const shapeX = Math.min(x, startPoint.x);
        const shapeY = Math.min(y, startPoint.y);
        
        const newShape: Partial<Shape> = {
          type: activeShapeType as Shape['type'],
          x: shapeX,
          y: shapeY,
          width: width,
          height: height,
          color: '#000000',
          strokeWidth: 2,
          fillColor: undefined,
          opacity: 1,
          pageNumber,
          zIndex: shapes.length,
        };
        
        // Create the shape
        onShapeCreate(newShape);
        
        // Reset states
        setStartPoint(null);
        setCurrentPoint(null);
        setIsDrawing(false);
      }
    }
  }, [isShapeMode, activeShapeType, startPoint, shapes, pageNumber, onShapeCreate, onShapeSelect, getRelativePosition]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { x, y } = getRelativePosition(e.clientX, e.clientY);
    
    if (isDragging && selectedShapeId) {
      // Drag existing shape
      const shape = shapes.find(s => s.id === selectedShapeId);
      if (shape) {
        const newX = Math.max(0, Math.min(100 - shape.width, x - dragOffset.x));
        const newY = Math.max(0, Math.min(100 - shape.height, y - dragOffset.y));
        debouncedUpdate(selectedShapeId, { x: newX, y: newY });
      }
    } else if (isResizing && selectedShapeId) {
      // Resize existing shape
      const shape = shapes.find(s => s.id === selectedShapeId);
      if (shape) {
        let updates: Partial<Shape> = {};
        const deltaX = x - (shape.x + shape.width/2);
        const deltaY = y - (shape.y + shape.height/2);
        
        switch (resizeHandle) {
          case 'se':
            updates = {
              width: Math.max(5, shape.width + (deltaX * 2)),
              height: Math.max(5, shape.height + (deltaY * 2))
            };
            break;
        }
        
        if (Object.keys(updates).length > 0) {
          debouncedUpdate(selectedShapeId, updates);
        }
      }
    } else if (isDrawing && startPoint) {
      setCurrentPoint({ x, y });
      
      if (activeShapeType === 'rectangle' || activeShapeType === 'circle') {
        // Update drawing shape for rectangle/circle
        const width = Math.abs(x - startPoint.x);
        const height = Math.abs(y - startPoint.y);
        const shapeX = Math.min(x, startPoint.x);
        const shapeY = Math.min(y, startPoint.y);
        
        setDrawingShape(prev => prev ? {
          ...prev,
          x: shapeX,
          y: shapeY,
          width,
          height
        } : null);
      }
    }
  }, [isDragging, isResizing, isDrawing, selectedShapeId, startPoint, activeShapeType, shapes, dragOffset, resizeHandle, debouncedUpdate, getRelativePosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(async () => {
    if (isDrawing && drawingShape && activeShapeType !== 'line' && activeShapeType !== 'arrow') {
      // Complete rectangle/circle creation
      if (drawingShape.width && drawingShape.height && 
          drawingShape.width > 2 && drawingShape.height > 2) {
        await onShapeCreate(drawingShape);
      }
      
      setIsDrawing(false);
      setDrawingShape(null);
      setStartPoint(null);
      setCurrentPoint(null);
    }
    
    setIsDragging(false);
    setIsResizing(false);
    setDragOffset({ x: 0, y: 0 });
    setResizeHandle('');
  }, [isDrawing, drawingShape, activeShapeType, onShapeCreate]);

  // Mouse event listeners
  useEffect(() => {
    if (isDragging || isResizing || (isDrawing && (activeShapeType === 'rectangle' || activeShapeType === 'circle'))) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, isDrawing, activeShapeType, handleMouseMove, handleMouseUp]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedShapeId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        onShapeDelete(selectedShapeId);
        onShapeSelect(null);
      }
      
      if (e.key === 'Escape') {
        // Cancel current drawing
        setIsDrawing(false);
        setDrawingShape(null);
        setStartPoint(null);
        setCurrentPoint(null);
        onShapeSelect(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedShapeId, onShapeDelete, onShapeSelect]);

  // Render individual shape
  const renderShape = (shape: Shape | Partial<Shape>, isPreview = false) => {
    const isSelected = !isPreview && 'id' in shape && shape.id === selectedShapeId;
    
    if (!shape.x || !shape.y || !shape.width || !shape.height) return null;
    
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: `${shape.width}%`,
      height: `${shape.height}%`,
      pointerEvents: isPreview ? 'none' : 'auto',
      zIndex: shape.zIndex || 0,
    };

    let element;
    const commonProps = {
      fill: shape.fillColor || 'none',
      stroke: shape.color || '#000000',
      strokeWidth: shape.strokeWidth || 2,
      opacity: shape.opacity || 1,
    };

    switch (shape.type) {
      case 'rectangle':
        element = <rect {...commonProps} width="100%" height="100%" rx="2" />;
        break;
        
      case 'circle':
        element = <ellipse {...commonProps} cx="50%" cy="50%" rx="50%" ry="50%" />;
        break;
        
      case 'line':
        element = <line {...commonProps} x1="0%" y1="100%" x2="100%" y2="0%" />;
        break;
        
      case 'arrow':
        // Calculate arrow direction
        const arrowSize = Math.min(shape.width || 0, shape.height || 0) * 0.3;
        element = (
          <g>
            <line {...commonProps} x1="0%" y1="100%" x2="100%" y2="0%" />
            <polygon 
              {...commonProps} 
              points={`100,0 ${100-arrowSize},${arrowSize} ${100-arrowSize},${-arrowSize}`}
              transform-origin="100% 0%"
            />
          </g>
        );
        break;
        
      default:
        element = <rect {...commonProps} width="100%" height="100%" />;
    }

    return (
      <div 
        key={('id' in shape) ? shape.id : 'preview'}
        style={style}
        data-shape-id={('id' in shape) ? shape.id : undefined}
      >
        <svg 
          width="100%" 
          height="100%" 
          style={{ 
            cursor: isShapeMode ? 'crosshair' : (isSelected ? 'move' : 'pointer'),
            outline: isPreview ? '2px dashed #007bff' : (isSelected ? '2px solid #007bff' : 'none'),
          }}
        >
          {element}
        </svg>
        
        {/* Selection handles */}
        {isSelected && !isShapeMode && (
          <>
            <div 
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                width: 12,
                height: 12,
                backgroundColor: '#007bff',
                border: '2px solid white',
                borderRadius: '50%',
                cursor: 'se-resize'
              }}
              data-resize-handle="se"
            />
          </>
        )}
      </div>
    );
  };

  // Render preview line for line/arrow tools
  const renderPreviewLine = () => {
    if (!isDrawing || !startPoint || !currentPoint || 
        (activeShapeType !== 'line' && activeShapeType !== 'arrow')) {
      return null;
    }

    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);
    const x = Math.min(currentPoint.x, startPoint.x);
    const y = Math.min(currentPoint.y, startPoint.y);

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${x}%`,
      top: `${y}%`,
      width: `${width}%`,
      height: `${height}%`,
      pointerEvents: 'none',
      zIndex: 9999,
    };

    let element;
    if (activeShapeType === 'line') {
      element = <line stroke="#007bff" strokeWidth="2" strokeDasharray="5,5" x1="0%" y1="100%" x2="100%" y2="0%" />;
    } else {
      const arrowSize = Math.min(width, height) * 0.3;
      element = (
        <g>
          <line stroke="#007bff" strokeWidth="2" strokeDasharray="5,5" x1="0%" y1="100%" x2="100%" y2="0%" />
          <polygon 
            fill="#007bff" 
            stroke="#007bff" 
            strokeWidth="2"
            points={`100,0 ${100-arrowSize},${arrowSize} ${100-arrowSize},${-arrowSize}`}
          />
        </g>
      );
    }

    return (
      <div style={style}>
        <svg width="100%" height="100%">
          {element}
        </svg>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ 
        zIndex: 10, 
        cursor: isShapeMode ? 'crosshair' : 'default',
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Render existing shapes */}
      {shapes.map(shape => renderShape(shape))}
      
      {/* Render shape being drawn (rectangle/circle) */}
      {drawingShape && renderShape(drawingShape, true)}
      
      {/* Render preview line (line/arrow) */}
      {renderPreviewLine()}
    </div>
  );
};

export default ShapeSystem;