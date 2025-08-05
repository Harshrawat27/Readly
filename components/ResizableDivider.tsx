'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizableDividerProps {
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

export default function ResizableDivider({ 
  onResize, 
  minWidth = 300, 
  maxWidth = 600, 
  defaultWidth = 384 
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [width, setWidth] = useState(defaultWidth); // eslint-disable-line @typescript-eslint/no-unused-vars
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.querySelector('.main-layout') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX;
    const newWidth = containerRect.right - mouseX;
    
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    setWidth(clampedWidth);
    if (onResize) {
      onResize(clampedWidth);
    }
  }, [isDragging, onResize, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={dividerRef}
      className="relative group cursor-col-resize"
      onMouseDown={handleMouseDown}
    >
      <div className={`w-1 h-full bg-[var(--border)] transition-all duration-200 group-hover:w-1.5 group-hover:bg-[var(--accent)] ${
        isDragging ? 'w-1.5 bg-[var(--accent)]' : ''
      }`}>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-8 bg-[var(--card-background)] border border-[var(--border)] rounded-full transition-all duration-200 ${
          isDragging || 'group-hover:opacity-100 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)]'
        } ${
          isDragging ? 'opacity-100 border-[var(--accent)] bg-[var(--accent)]' : 'opacity-0'
        }`}>
          <div className="w-full h-full flex items-center justify-center">
            <div className={`w-0.5 h-4 rounded transition-colors duration-200 ${
              isDragging || 'group-hover:bg-white'
            } ${
              isDragging ? 'bg-white' : 'bg-[var(--text-muted)]'
            }`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}