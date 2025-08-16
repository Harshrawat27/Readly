'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCaptureSystemProps {
  isActive: boolean;
  onImageCapture: (imageBlob: Blob, question?: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface SelectionRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSelecting: boolean;
}

interface CaptureDialog {
  x: number;
  y: number;
  visible: boolean;
  imageBlob?: Blob;
}

export default function ImageCaptureSystem({
  isActive,
  onImageCapture,
  containerRef,
}: ImageCaptureSystemProps) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isSelecting: false,
  });

  const [captureDialog, setCaptureDialog] = useState<CaptureDialog>({
    x: 0,
    y: 0,
    visible: false,
  });

  const [question, setQuestion] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle mouse move during selection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive || !selectionRect.isSelecting || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSelectionRect((prev) => ({
        ...prev,
        currentX: x,
        currentY: y,
      }));
    },
    [isActive, selectionRect.isSelecting, containerRef]
  );

  // Handle mouse down to start selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive || !containerRef.current) return;

      // Prevent default to avoid text selection conflicts
      e.preventDefault();
      e.stopPropagation();

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setSelectionRect({
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        isSelecting: true,
      });

      setCaptureDialog({ x: 0, y: 0, visible: false });
    },
    [isActive, containerRef]
  );

  // Capture the selected area as an image
  const captureSelectedArea = useCallback(async (): Promise<Blob | null> => {
    if (!containerRef.current || !canvasRef.current) return null;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Calculate the selection bounds
    const left = Math.min(selectionRect.startX, selectionRect.currentX);
    const top = Math.min(selectionRect.startY, selectionRect.currentY);
    const width = Math.abs(selectionRect.currentX - selectionRect.startX);
    const height = Math.abs(selectionRect.currentY - selectionRect.startY);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    try {
      // Use html2canvas to capture the container
      const html2canvas = (await import('html2canvas')).default;
      
      const screenshot = await html2canvas(container, {
        x: left,
        y: top,
        width: width,
        height: height,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
      });

      // Draw the screenshot to our canvas
      ctx.drawImage(screenshot, 0, 0, width, height);

      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              console.error('Failed to create blob from canvas');
              resolve(null);
            }
          },
          'image/png',
          0.9
        );
      });
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      return null;
    }
  }, [selectionRect, containerRef]);

  // Handle mouse up to complete selection
  const handleMouseUp = useCallback(async () => {
    if (!selectionRect.isSelecting || !containerRef.current) return;

    const minWidth = 50;
    const minHeight = 50;
    const width = Math.abs(selectionRect.currentX - selectionRect.startX);
    const height = Math.abs(selectionRect.currentY - selectionRect.startY);

    // Check if selection is large enough
    if (width < minWidth || height < minHeight) {
      setSelectionRect((prev) => ({ ...prev, isSelecting: false }));
      return;
    }

    // Capture the selected area
    try {
      const imageBlob = await captureSelectedArea();
      
      if (imageBlob && imageBlob instanceof Blob) {
        // Position dialog near the selection
        const dialogX = Math.min(selectionRect.currentX, window.innerWidth - 320);
        const dialogY = Math.min(selectionRect.currentY, window.innerHeight - 200);

        setCaptureDialog({
          x: dialogX,
          y: dialogY,
          visible: true,
          imageBlob,
        });
      } else {
        console.error('Failed to capture valid image blob', imageBlob);
      }
    } catch (error) {
      console.error('Failed to capture image:', error);
    }

    setSelectionRect((prev) => ({ ...prev, isSelecting: false }));
  }, [selectionRect, containerRef, captureSelectedArea]);

  // Handle sending the captured image with question
  const handleSendImage = useCallback(() => {
    if (captureDialog.imageBlob && captureDialog.imageBlob instanceof Blob) {
      onImageCapture(captureDialog.imageBlob, question || 'What can you tell me about this image?');
      setCaptureDialog({ x: 0, y: 0, visible: false });
      setQuestion('');
    } else {
      console.error('No valid image blob to send', captureDialog.imageBlob);
    }
  }, [captureDialog.imageBlob, question, onImageCapture]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setCaptureDialog({ x: 0, y: 0, visible: false });
    setQuestion('');
    setSelectionRect({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isSelecting: false,
    });
  }, []);

  // Add escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleCancel]);

  if (!isActive) return null;

  // Calculate selection rectangle for display
  const left = Math.min(selectionRect.startX, selectionRect.currentX);
  const top = Math.min(selectionRect.startY, selectionRect.currentY);
  const width = Math.abs(selectionRect.currentX - selectionRect.startX);
  const height = Math.abs(selectionRect.currentY - selectionRect.startY);

  return (
    <>
      {/* Screenshot capture overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0"
        style={{ 
          zIndex: 50,
          pointerEvents: 'auto',
          cursor: 'crosshair',
          backgroundColor: 'rgba(0, 0, 0, 0.1)' // Slight tint to show it's active
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Instruction overlay */}
      <div 
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Drag to select an area to capture
        </div>
      </div>

      {/* Selection visualization - only during active selection */}
      {selectionRect.isSelecting && (
        <div 
          className="absolute inset-0"
          style={{ pointerEvents: 'none', zIndex: 50 }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-30" />
          
          {/* Selection rectangle */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-10"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* Selection info */}
            <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              {Math.round(width)} × {Math.round(height)}
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />

      {/* Capture Dialog */}
      {captureDialog.visible && (
        <div
          className="fixed z-50 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-xl p-4 w-80"
          style={{
            left: `${captureDialog.x}px`,
            top: `${captureDialog.y}px`,
          }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
              Ask Readly about this image
            </h3>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this image?"
              className="w-full p-2 border border-[var(--border)] rounded-md bg-[var(--input-background)] text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent)]"
              rows={3}
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendImage}
              className="px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-md hover:opacity-90 transition-opacity"
            >
              Ask Readly
            </button>
          </div>
        </div>
      )}
    </>
  );
}