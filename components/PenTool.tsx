'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface PenToolProps {
  isActive: boolean;
  pdfId: string;
  pageNumber: number;
  containerRef: React.RefObject<HTMLElement | null>;
  showDrawings?: boolean; // New prop to control visibility
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  id: string;
  points: Point[];
  width: number;
  color: string;
  timestamp: number;
}

interface PenDrawing {
  id: string;
  pdfId: string;
  pageNumber: number;
  strokes: Stroke[];
  createdAt: Date;
  updatedAt: Date;
}

// Global pen settings that persist across all pen tools
let globalPenSettings = {
  brushWidth: 3,
  brushColor: '#000000'
};

const PenTool: React.FC<PenToolProps> = ({ 
  isActive, 
  pdfId,
  pageNumber,
  containerRef,
  showDrawings = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current pen settings
  const [penSettings, setPenSettings] = useState(globalPenSettings);

  // Listen for global pen settings changes from toolbar
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      const { brushWidth, brushColor } = event.detail;
      setPenSettings(prev => {
        const newSettings = {
          ...prev,
          ...(brushWidth !== undefined && { brushWidth }),
          ...(brushColor !== undefined && { brushColor })
        };
        
        // Update global settings
        globalPenSettings = newSettings;
        
        return newSettings;
      });
    };

    window.addEventListener('penSettingsChange', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('penSettingsChange', handleSettingsChange as EventListener);
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
  }, [containerRef, getContext]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw all strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      
      ctx.stroke();
    });
  }, [strokes, getContext]);

  // Load drawings from database
  const loadDrawings = useCallback(async () => {
    if (!pdfId || !pageNumber) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/pen-drawings?pdfId=${pdfId}&pageNumber=${pageNumber}`);
      if (response.ok) {
        const drawing = await response.json();
        if (drawing && drawing.strokes) {
          setStrokes(drawing.strokes);
        }
      }
    } catch (error) {
      console.error('Failed to load pen drawings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pdfId, pageNumber]);

  // Save drawings to database with debouncing
  const saveDrawings = useCallback(async (strokesToSave: Stroke[]) => {
    if (!pdfId || !pageNumber) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set up debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch('/api/pen-drawings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfId,
            pageNumber,
            strokes: strokesToSave
          })
        });
      } catch (error) {
        console.error('Failed to save pen drawings:', error);
      }
    }, 500); // 500ms debounce
  }, [pdfId, pageNumber]);

  // Load drawings when component mounts or page changes
  useEffect(() => {
    loadDrawings();
  }, [loadDrawings]);

  // Setup canvas when component loads or when strokes change
  useEffect(() => {
    if (!isLoading && showDrawings) {
      setupCanvas();
    }
  }, [isLoading, showDrawings, setupCanvas, strokes]);

  // Handle window resize
  useEffect(() => {
    if (!showDrawings) return;
    
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [showDrawings, setupCanvas]);

  // Get coordinates relative to canvas
  const getCanvasCoordinates = useCallback((e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        pressure: (touch as any).force || 0.5
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: 0.5
      };
    }
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isActive || !canvasRef.current) return;
    
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    
    setIsDrawing(true);
    setCurrentStroke([point]);
  }, [isActive, getCanvasCoordinates]);

  // Continue drawing
  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing || !isActive) return;
    
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    const ctx = getContext();
    
    if (!ctx) return;

    setCurrentStroke(prev => {
      const newStroke = [...prev, point];
      
      // Draw the line segment
      if (newStroke.length >= 2) {
        const prevPoint = newStroke[newStroke.length - 2];
        
        ctx.strokeStyle = penSettings.brushColor;
        ctx.lineWidth = penSettings.brushWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
      
      return newStroke;
    });
  }, [isDrawing, isActive, getCanvasCoordinates, getContext, penSettings]);

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
        timestamp: Date.now()
      };
      
      setStrokes(prev => {
        const newStrokes = [...prev, newStroke];
        // Save to database
        saveDrawings(newStrokes);
        
        // Force a redraw after stroke completion to ensure visibility
        setTimeout(() => {
          const ctx = getContext();
          if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            
            // Redraw all strokes including the new one
            newStrokes.forEach(stroke => {
              if (stroke.points.length < 2) return;
              
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = stroke.width;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              ctx.beginPath();
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              
              for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
              }
              
              ctx.stroke();
            });
          }
        }, 10); // Small delay to ensure state update
        
        return newStrokes;
      });
    }
    
    setCurrentStroke([]);
  }, [isDrawing, currentStroke, penSettings, saveDrawings]);

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
    setStrokes(newStrokes);
    saveDrawings(newStrokes);
    
    const ctx = getContext();
    if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }, [getContext, saveDrawings]);

  // Undo last stroke
  const undoStroke = useCallback(() => {
    setStrokes(prev => {
      const newStrokes = prev.slice(0, -1);
      saveDrawings(newStrokes);
      return newStrokes;
    });
  }, [saveDrawings]);

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '[':
          e.preventDefault();
          const newWidthDown = Math.max(1, penSettings.brushWidth - 1);
          window.dispatchEvent(new CustomEvent('penSettingsChange', {
            detail: { brushWidth: newWidthDown }
          }));
          break;
        case ']':
          e.preventDefault();
          const newWidthUp = Math.min(50, penSettings.brushWidth + 1);
          window.dispatchEvent(new CustomEvent('penSettingsChange', {
            detail: { brushWidth: newWidthUp }
          }));
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
        className={`absolute inset-0 z-10 ${isActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
        style={{ 
          touchAction: isActive ? 'none' : 'auto',
          userSelect: 'none'
        }}
      />

    </>
  );
};

export default PenTool;