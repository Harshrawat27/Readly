'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PenToolProps {
  isActive: boolean;
  pdfId: string;
  pageNumber: number;
  containerRef: React.RefObject<HTMLElement | null>;
  showDrawings?: boolean; // New prop to control visibility
  scale?: number; // PDF zoom scale factor
  // Centralized data management props
  strokes: Stroke[];
  onStrokesUpdate: (strokes: Stroke[]) => void;
  onStrokesSave: (strokes: Stroke[]) => void;
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface TouchWithForce extends Touch {
  force: number;
}

interface Stroke {
  id: string;
  points: Point[];
  width: number;
  color: string;
  timestamp: number;
}

// interface PenDrawing {
//   id: string;
//   pdfId: string;
//   pageNumber: number;
//   strokes: Stroke[];
//   createdAt: Date;
//   updatedAt: Date;
// }

// Global pen settings that persist across all pen tools
let globalPenSettings = {
  brushWidth: 3,
  brushColor: '#000000',
};

const PenTool: React.FC<PenToolProps> = ({
  isActive,
  containerRef,
  showDrawings = true,
  scale = 1,
  strokes,
  onStrokesUpdate,
  onStrokesSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  // Remove local state management - use props instead
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current pen settings
  const [penSettings, setPenSettings] = useState(globalPenSettings);

  // Listen for global pen settings changes from toolbar
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      const { brushWidth, brushColor } = event.detail;
      setPenSettings((prev) => {
        const newSettings = {
          ...prev,
          ...(brushWidth !== undefined && { brushWidth }),
          ...(brushColor !== undefined && { brushColor }),
        };

        // Update global settings
        globalPenSettings = newSettings;

        return newSettings;
      });
    };

    window.addEventListener(
      'penSettingsChange',
      handleSettingsChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'penSettingsChange',
        handleSettingsChange as EventListener
      );
    };
  }, []);

  // Update global settings when local settings change
  useEffect(() => {
    globalPenSettings = penSettings;
  }, [penSettings]);

  // Canvas context with high DPI support
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Setup high-DPI canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual size in memory (scaled for high DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale the canvas back down using CSS
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = getContext();
    if (ctx) {
      // Scale the drawing context so everything draws at high DPI
      ctx.scale(dpr, dpr);

      // Enable better line rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    // Redraw all strokes after setup
    redrawCanvas();
  }, [containerRef, getContext]); // Remove redrawCanvas to avoid circular dependency

  // Redraw all strokes on canvas with scaling applied
  const redrawCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw all strokes with scaling applied
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * scale; // Scale line width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      // Scale coordinates when rendering
      ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
      }

      ctx.stroke();
    });
  }, [strokes, getContext, scale]);

  // Remove loadDrawings - data comes from props

  // Save drawings with debouncing using the centralized save function
  const saveDrawings = useCallback(
    (strokesToSave: Stroke[]) => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set up debounced save
      saveTimeoutRef.current = setTimeout(() => {
        onStrokesSave(strokesToSave);
      }, 500); // 500ms debounce
    },
    [onStrokesSave]
  );

  // Remove loading effect - data comes from props

  // Setup canvas when component loads or when strokes change or scale changes
  useEffect(() => {
    if (showDrawings) {
      setupCanvas();
    }
  }, [showDrawings, setupCanvas, strokes, scale]);

  // Handle window resize
  useEffect(() => {
    if (!showDrawings) return;

    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [showDrawings, setupCanvas]);

  // Get coordinates relative to canvas, converted to PDF coordinate space
  const getCanvasCoordinates = useCallback(
    (e: MouseEvent | TouchEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          // Convert screen coordinates to PDF coordinate space by dividing by scale
          x: (touch.clientX - rect.left) / scale,
          y: (touch.clientY - rect.top) / scale,
          pressure: (touch as TouchWithForce).force || 0.5,
        };
      } else {
        return {
          // Convert screen coordinates to PDF coordinate space by dividing by scale
          x: (e.clientX - rect.left) / scale,
          y: (e.clientY - rect.top) / scale,
          pressure: 0.5,
        };
      }
    },
    [scale]
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isActive || !canvasRef.current) return;

      e.preventDefault();
      const point = getCanvasCoordinates(e);

      setIsDrawing(true);
      setCurrentStroke([point]);
    },
    [isActive, getCanvasCoordinates]
  );

  // Continue drawing
  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !isActive) return;

      e.preventDefault();
      const point = getCanvasCoordinates(e);
      const ctx = getContext();

      if (!ctx) return;

      setCurrentStroke((prev) => {
        const newStroke = [...prev, point];

        // Draw the line segment with scaling applied
        if (newStroke.length >= 2) {
          const prevPoint = newStroke[newStroke.length - 2];

          ctx.strokeStyle = penSettings.brushColor;
          ctx.lineWidth = penSettings.brushWidth * scale; // Scale line width
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          // Scale coordinates when drawing
          ctx.moveTo(prevPoint.x * scale, prevPoint.y * scale);
          ctx.lineTo(point.x * scale, point.y * scale);
          ctx.stroke();
        }

        return newStroke;
      });
    },
    [isDrawing, isActive, getCanvasCoordinates, getContext, penSettings, scale]
  );

  // End drawing
  const endDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentStroke.length > 1) {
      const newStroke: Stroke = {
        id: Date.now().toString(),
        points: currentStroke,
        width: penSettings.brushWidth,
        color: penSettings.brushColor,
        timestamp: Date.now(),
      };

      const newStrokes = [...strokes, newStroke];
      
      // Update strokes via centralized management
      onStrokesUpdate(newStrokes);
      
      // Save to database
      saveDrawings(newStrokes);

      // Force a redraw after stroke completion to ensure visibility
      setTimeout(() => {
        const ctx = getContext();
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

          // Redraw all strokes including the new one with scaling applied
          newStrokes.forEach((stroke) => {
            if (stroke.points.length < 2) return;

            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width * scale; // Scale line width
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            // Scale coordinates when rendering
            ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale);

            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x * scale, stroke.points[i].y * scale);
            }

            ctx.stroke();
          });
        }
      }, 10); // Small delay to ensure state update
    }

    setCurrentStroke([]);
  }, [isDrawing, currentStroke, penSettings, saveDrawings, getContext, scale]);

  // Event handlers
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => startDrawing(e);
    const handleMouseMove = (e: MouseEvent) => draw(e);
    const handleMouseUp = () => endDrawing();
    const handleMouseLeave = () => endDrawing();

    const handleTouchStart = (e: TouchEvent) => startDrawing(e);
    const handleTouchMove = (e: TouchEvent) => draw(e);
    const handleTouchEnd = () => endDrawing();

    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isActive, startDrawing, draw, endDrawing]);

  // Clear all strokes
  const clearCanvas = useCallback(() => {
    const newStrokes: Stroke[] = [];
    onStrokesUpdate(newStrokes);
    saveDrawings(newStrokes);

    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }, [getContext, saveDrawings, onStrokesUpdate]);

  // Undo last stroke
  const undoStroke = useCallback(() => {
    const newStrokes = strokes.slice(0, -1);
    onStrokesUpdate(newStrokes);
    saveDrawings(newStrokes);
  }, [strokes, onStrokesUpdate, saveDrawings]);

  // Listen for undo/clear events from toolbar
  useEffect(() => {
    const handleUndo = () => undoStroke();
    const handleClear = () => clearCanvas();

    window.addEventListener('penUndo', handleUndo);
    window.addEventListener('penClear', handleClear);

    return () => {
      window.removeEventListener('penUndo', handleUndo);
      window.removeEventListener('penClear', handleClear);
    };
  }, [undoStroke, clearCanvas]);

  // Keyboard shortcuts for pen controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if pen tool is active and not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case '[':
          e.preventDefault();
          const newWidthDown = Math.max(1, penSettings.brushWidth - 1);
          window.dispatchEvent(
            new CustomEvent('penSettingsChange', {
              detail: { brushWidth: newWidthDown },
            })
          );
          break;
        case ']':
          e.preventDefault();
          const newWidthUp = Math.min(50, penSettings.brushWidth + 1);
          window.dispatchEvent(
            new CustomEvent('penSettingsChange', {
              detail: { brushWidth: newWidthUp },
            })
          );
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoStroke();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, penSettings.brushWidth, undoStroke]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!showDrawings) return null;

  return (
    <>
      {/* Drawing Canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 ${
          isActive
            ? 'pointer-events-auto cursor-crosshair'
            : 'pointer-events-none'
        }`}
        style={{
          touchAction: isActive ? 'none' : 'auto',
          userSelect: 'none',
        }}
      />
    </>
  );
};

export default PenTool;
