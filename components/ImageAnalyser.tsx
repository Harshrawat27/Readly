'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageAnalyserProps {
  isActive: boolean;
  pageNumber: number;
  containerRef: React.RefObject<HTMLElement | null>;
  onImageAnalyse: (imageDataUrl: string) => void;
  onHighlight: (
    color: string,
    area: { x: number; y: number; width: number; height: number }
  ) => void;
}

interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface AnalysisDialog {
  x: number;
  y: number;
  visible: boolean;
  imageData: string;
  area: { x: number; y: number; width: number; height: number };
}

const highlightColors = [
  {
    name: 'Yellow',
    color: '#FDE047',
    bg: 'bg-yellow-400',
    hover: 'hover:bg-yellow-500',
  },
  {
    name: 'Green',
    color: '#4ADE80',
    bg: 'bg-green-400',
    hover: 'hover:bg-green-500',
  },
  {
    name: 'Blue',
    color: '#60A5FA',
    bg: 'bg-blue-400',
    hover: 'hover:bg-blue-500',
  },
  {
    name: 'Pink',
    color: '#F472B6',
    bg: 'bg-pink-400',
    hover: 'hover:bg-pink-500',
  },
  {
    name: 'Purple',
    color: '#A78BFA',
    bg: 'bg-purple-400',
    hover: 'hover:bg-purple-500',
  },
];

export default function ImageAnalyser({
  isActive,
  pageNumber, // eslint-disable-line @typescript-eslint/no-unused-vars
  containerRef,
  onImageAnalyse,
  onHighlight,
}: ImageAnalyserProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionArea, setSelectionArea] = useState<SelectionArea | null>(
    null
  );
  const [analysisDialog, setAnalysisDialog] = useState<AnalysisDialog>({
    x: 0,
    y: 0,
    visible: false,
    imageData: '',
    area: { x: 0, y: 0, width: 0, height: 0 },
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  const captureSelectedArea = useCallback(
    (area: SelectionArea) => {
      if (!containerRef.current) return null;

      const container = containerRef.current;
      const canvas = container.querySelector('canvas');
      if (!canvas) return null;

      // Create a temporary canvas for capturing the selected area
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      const containerRect = container.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      // Calculate the selection area relative to the canvas
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;

      const canvasStartX =
        (Math.min(area.startX, area.endX) -
          (canvasRect.left - containerRect.left)) *
        scaleX;
      const canvasStartY =
        (Math.min(area.startY, area.endY) -
          (canvasRect.top - containerRect.top)) *
        scaleY;
      const canvasWidth = Math.abs(area.endX - area.startX) * scaleX;
      const canvasHeight = Math.abs(area.endY - area.startY) * scaleY;

      // Set the temp canvas size to match the selection
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;

      // Draw the selected area from the main canvas to the temp canvas
      tempCtx.drawImage(
        canvas,
        canvasStartX,
        canvasStartY,
        canvasWidth,
        canvasHeight,
        0,
        0,
        canvasWidth,
        canvasHeight
      );

      return tempCanvas.toDataURL('image/png');
    },
    [containerRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setIsSelecting(true);
      setSelectionArea({ startX, startY, endX: startX, endY: startY });
      setAnalysisDialog((prev) => ({ ...prev, visible: false }));
    },
    [isActive, containerRef]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selectionArea || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      setSelectionArea((prev) => (prev ? { ...prev, endX, endY } : null));
    },
    [isSelecting, selectionArea, containerRef]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selectionArea || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;

      const finalArea = { ...selectionArea, endX, endY };

      // Only proceed if the selection has meaningful size
      const width = Math.abs(finalArea.endX - finalArea.startX);
      const height = Math.abs(finalArea.endY - finalArea.startY);

      if (width > 10 && height > 10) {
        const imageData = captureSelectedArea(finalArea);
        if (imageData) {
          // Show the analysis dialog at the mouse position
          setAnalysisDialog({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            imageData,
            area: {
              x:
                (Math.min(finalArea.startX, finalArea.endX) / rect.width) * 100,
              y:
                (Math.min(finalArea.startY, finalArea.endY) / rect.height) *
                100,
              width: (width / rect.width) * 100,
              height: (height / rect.height) * 100,
            },
          });
        }
      }

      setIsSelecting(false);
      setSelectionArea(null);
    },
    [isSelecting, selectionArea, containerRef, captureSelectedArea]
  );

  const handleAnalysisDialogClose = useCallback(() => {
    setAnalysisDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleAskReadily = useCallback(() => {
    if (analysisDialog.imageData) {
      onImageAnalyse(analysisDialog.imageData);
      handleAnalysisDialogClose();
    }
  }, [analysisDialog.imageData, onImageAnalyse, handleAnalysisDialogClose]);

  const handleHighlightArea = useCallback(
    (color: string) => {
      if (analysisDialog.area) {
        onHighlight(color, analysisDialog.area);
        handleAnalysisDialogClose();
      }
    },
    [analysisDialog.area, onHighlight, handleAnalysisDialogClose]
  );

  // Close dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (analysisDialog.visible && !target.closest('.analysis-dialog')) {
        handleAnalysisDialogClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [analysisDialog.visible, handleAnalysisDialogClose]);

  if (!isActive) return null;

  return (
    <>
      {/* Selection Overlay */}
      <div
        ref={overlayRef}
        className='absolute inset-0 z-30'
        style={{ cursor: isActive ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Dark overlay for non-selected areas */}
        {selectionArea && (
          <>
            {/* Top overlay */}
            <div
              className='absolute bg-black bg-opacity-60'
              style={{
                left: 0,
                top: 0,
                width: '100%',
                height: Math.min(selectionArea.startY, selectionArea.endY),
              }}
            />
            {/* Bottom overlay */}
            <div
              className='absolute bg-black bg-opacity-60'
              style={{
                left: 0,
                top: Math.max(selectionArea.startY, selectionArea.endY),
                width: '100%',
                height: `calc(100% - ${Math.max(
                  selectionArea.startY,
                  selectionArea.endY
                )}px)`,
              }}
            />
            {/* Left overlay */}
            <div
              className='absolute bg-black bg-opacity-60'
              style={{
                left: 0,
                top: Math.min(selectionArea.startY, selectionArea.endY),
                width: Math.min(selectionArea.startX, selectionArea.endX),
                height: Math.abs(selectionArea.endY - selectionArea.startY),
              }}
            />
            {/* Right overlay */}
            <div
              className='absolute bg-black bg-opacity-60'
              style={{
                left: Math.max(selectionArea.startX, selectionArea.endX),
                top: Math.min(selectionArea.startY, selectionArea.endY),
                width: `calc(100% - ${Math.max(
                  selectionArea.startX,
                  selectionArea.endX
                )}px)`,
                height: Math.abs(selectionArea.endY - selectionArea.startY),
              }}
            />
            {/* Selection border */}
            <div
              className='absolute border-2 border-blue-500 border-dashed'
              style={{
                left: Math.min(selectionArea.startX, selectionArea.endX),
                top: Math.min(selectionArea.startY, selectionArea.endY),
                width: Math.abs(selectionArea.endX - selectionArea.startX),
                height: Math.abs(selectionArea.endY - selectionArea.startY),
              }}
            />
          </>
        )}
      </div>

      {/* Analysis Dialog */}
      {analysisDialog.visible && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={handleAnalysisDialogClose}
          />

          {/* Dialog */}
          <div
            className='fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 analysis-dialog'
            style={{
              left: Math.max(
                10,
                Math.min(analysisDialog.x - 120, window.innerWidth - 250)
              ),
              top: Math.max(10, analysisDialog.y - 10),
            }}
          >
            {/* Preview */}
            <div className='mb-3'>
              <img
                src={analysisDialog.imageData}
                alt='Selected area'
                className='max-w-[200px] max-h-[100px] object-contain rounded border'
              />
            </div>

            {/* Color options */}
            <div className='flex gap-2 mb-3'>
              {highlightColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleHighlightArea(color.color)}
                  className={`w-8 h-8 rounded-full border-2 border-gray-300 ${color.bg} ${color.hover} transition-all hover:scale-110 hover:shadow-md`}
                  title={`Highlight with ${color.name}`}
                />
              ))}
            </div>

            {/* Ask ReaditEasy button */}
            <button
              onClick={handleAskReadily}
              className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity text-sm'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M8 12h8' />
                <path d='M12 8v8' />
              </svg>
              Ask ReaditEasy
            </button>
          </div>
        </>
      )}
    </>
  );
}
