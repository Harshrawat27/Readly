'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  pageNumber: number;
  width: number;
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  createdAt: string;
}

interface TextSystemProps {
  pdfId: string;
  pageNumber: number;
  isTextMode: boolean;
  isMoveMode: boolean;
  selectedTextId?: string | null;
  texts: TextElement[]; // Pre-loaded texts for this page
  onTextCreate?: (text: Omit<TextElement, 'id' | 'createdAt'>) => Promise<string | void>;
  onTextUpdate?: (id: string, updates: Partial<TextElement>) => Promise<void>;
  onTextDelete?: (id: string) => Promise<void>;
  onToolChange?: (tool: 'move' | 'text') => void;
  onTextSelect?: (textId: string | null, textElement?: TextElement) => void;
  scale?: number; // PDF zoom scale factor
}

interface CursorState {
  x: number;
  y: number;
  pageNumber: number;
  visible: boolean;
}

export default function TextSystem({
  pdfId, // eslint-disable-line @typescript-eslint/no-unused-vars
  pageNumber,
  isTextMode,
  isMoveMode,
  selectedTextId: externalSelectedTextId,
  texts: pageTexts,
  onTextCreate,
  onTextUpdate,
  onTextDelete,
  onToolChange,
  onTextSelect,
  scale = 1,
}: TextSystemProps) {
  const [selectedTextId, setSelectedTextId] = useState<string | null>(
    externalSelectedTextId || null
  );

  // Sync external selection
  useEffect(() => {
    setSelectedTextId(externalSelectedTextId || null);
  }, [externalSelectedTextId]);

  // Notify parent of selection changes
  const handleTextSelect = useCallback((textId: string | null) => {
    setSelectedTextId(textId);
    const selectedText = textId
      ? pageTexts.find((t) => t.id === textId)
      : undefined;
    onTextSelect?.(textId, selectedText);
  }, [pageTexts, onTextSelect]);
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    pageNumber: 0,
    visible: false,
  });
  const [pressStart, setPressStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Note: Formatting updates are now handled directly through the centralized updateText function

  const handlePageMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!isTextMode) return;

      const target = event.target as HTMLElement;
      // Don't handle if clicking on existing text
      if (target.closest('[data-text-element]')) return;

      setPressStart({
        x: event.clientX,
        y: event.clientY,
        time: Date.now()
      });
    },
    [isTextMode]
  );

  const handlePageMouseUp = useCallback(
    async (event: React.MouseEvent) => {
      if (!isTextMode || !pressStart) {
        setPressStart(null);
        return;
      }

      // Check if this was a press (short duration, minimal movement)
      const pressTime = Date.now() - pressStart.time;
      const pressMoveDistance = Math.sqrt(
        Math.pow(event.clientX - pressStart.x, 2) + 
        Math.pow(event.clientY - pressStart.y, 2)
      );

      setPressStart(null);

      // Only create text if it was a quick press (< 200ms, < 5px movement)
      if (pressTime > 200 || pressMoveDistance > 5) return;

      const target = event.target as HTMLElement;
      const pdfPage =
        target.closest('.pdf-page') || containerRef.current?.closest('.mb-4');

      if (!pdfPage) return;

      // Don't create text if clicking on existing text
      if (target.closest('[data-text-element]')) return;

      const rect = pdfPage.getBoundingClientRect();
      // Convert screen coordinates to PDF coordinate space by dividing by scale
      const x = (((event.clientX - rect.left) / scale) / (rect.width / scale)) * 100;
      const y = (((event.clientY - rect.top) / scale) / (rect.height / scale)) * 100;

      // Show cursor at press position
      setCursor({
        x,
        y,
        pageNumber,
        visible: true,
      });

      try {
        // Create new text element using the centralized data management
        const tempId = await onTextCreate?.({
          content: '',
          x,
          y,
          pageNumber,
          width: 200, // Default width in pixels
          fontSize: 16,
          color: '#000000',
          textAlign: 'left',
        });

        // Use the temporary ID returned from addText
        const textId = tempId || `temp-${Date.now()}`;
        setEditingTextId(textId);
        setIsTyping(true);
        handleTextSelect(null);

        // Focus the input after a brief delay
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      } catch (error) {
        console.error('Error creating text element:', error);
        setCursor((prev) => ({ ...prev, visible: false }));
      }
    },
    [isTextMode, pageNumber, onTextCreate, handleTextSelect, pressStart, scale]
  );

  const handleTextSave = async (textId: string, content: string) => {
    if (!content.trim()) {
      // Delete text if empty
      await onTextDelete?.(textId);
      setEditingTextId(null);
      setIsTyping(false);
      setCursor((prev) => ({ ...prev, visible: false }));
      return;
    }

    setEditingTextId(null);
    setIsTyping(false);
    setCursor((prev) => ({ ...prev, visible: false }));
    onToolChange?.('move');

    try {
      // Since we're now creating text elements immediately in handlePageClick,
      // we only need to update the content here
      await onTextUpdate?.(textId, { content: content.trim() });
    } catch (error) {
      console.error('Error saving text:', error);
    }
  };

  const handleTextUpdateDirect = (textId: string, updates: Partial<TextElement>) => {
    // Also update the selected text element for formatting controls
    const updatedText = pageTexts.find((t) => t.id === textId);
    if (updatedText && selectedTextId === textId) {
      onTextSelect?.(textId, { ...updatedText, ...updates });
    }

    // Call parent update handler
    onTextUpdate?.(textId, updates);
  };

  const handleTextDeleteDirect = (textId: string) => {
    handleTextSelect(null);
    onTextDelete?.(textId);
  };

  // Filter texts for current page
  // Texts are already filtered by page from parent component

  return (
    <div
      ref={containerRef}
      className='absolute inset-0 pointer-events-none'
      style={{ zIndex: isTextMode ? 10 : 5 }}
    >
      {/* Page Click Handler */}
      {isTextMode && (
        <div
          className='absolute inset-0 pointer-events-auto cursor-crosshair bg-transparent'
          onMouseDown={handlePageMouseDown}
          onMouseUp={handlePageMouseUp}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        />
      )}

      {/* Blinking Cursor */}
      {cursor.visible && cursor.pageNumber === pageNumber && (
        <div
          className='absolute pointer-events-none'
          style={{
            left: `${cursor.x}%`,
            top: `${cursor.y}%`,
            zIndex: 20,
          }}
        >
          <div className='w-0.5 h-6 bg-black animate-blink' />
        </div>
      )}

      {/* Text Elements */}
      {pageTexts.map((text) => (
        <TextElement
          key={text.id}
          text={text}
          isEditing={editingTextId === text.id}
          isSelected={selectedTextId === text.id}
          onTextSave={handleTextSave}
          onTextUpdate={handleTextUpdateDirect}
          onTextDelete={handleTextDeleteDirect}
          onSelect={handleTextSelect}
          onEdit={setEditingTextId}
          inputRef={inputRef}
          isDraggable={isTextMode || isMoveMode}
          scale={scale}
        />
      ))}

      {/* Text Mode Indicator */}
      {isTextMode && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none'>
          <div className='bg-[var(--accent)] text-white px-4 py-2 rounded-full text-sm font-medium'>
            Click anywhere to add text
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Text Element Component with Resizable Box
interface TextElementProps {
  text: TextElement;
  isEditing: boolean;
  isSelected: boolean;
  onTextSave: (id: string, content: string) => void;
  onTextUpdate: (id: string, updates: Partial<TextElement>) => void;
  onTextDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isDraggable?: boolean;
  scale?: number;
}

function TextElement({
  text,
  isEditing,
  isSelected,
  onTextSave,
  onTextUpdate,
  onTextDelete, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSelect,
  onEdit,
  inputRef,
  isDraggable = false,
  scale = 1,
}: TextElementProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, textX: 0, textY: 0 });
  const [dragStartTime, setDragStartTime] = useState(0);
  const [localWidth, setLocalWidth] = useState(text.width);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      width: text.width,
    });
  };

  // Sync local width with prop changes
  useEffect(() => {
    setLocalWidth(text.width);
  }, [text.width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const newWidth = Math.max(100, resizeStart.width + deltaX); // Minimum width 100px

      // Update local width immediately for smooth visual feedback
      setLocalWidth(newWidth);

      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Debounce API call for resize operations
      resizeTimeoutRef.current = setTimeout(() => {
        onTextUpdate(text.id, { width: newWidth });
      }, 150); // 150ms debounce for resize
    };

    const handleMouseUp = () => {
      setIsResizing(false);

      // Trigger immediate update on mouse up
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        onTextUpdate(text.id, { width: localWidth });
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [isResizing, resizeStart, text.id, onTextUpdate, localWidth]);

  // Handle debounced content updates while typing
  const handleContentChange = (newContent: string) => {
    // Clear existing timeout
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
    }

    // Set up debounced update
    contentUpdateTimeoutRef.current = setTimeout(() => {
      onTextUpdate(text.id, { content: newContent });
    }, 1000); // 1 second debounce for content changes
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return; // Don't allow drag when editing
    
    e.preventDefault();
    e.stopPropagation();
    
    if (isDraggable) {
      setIsDragging(true);
      setDragStartTime(Date.now());
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        textX: text.x,
        textY: text.y,
      });
    }
    
    onSelect(text.id);
  };

  // Handle double click for editing
  const handleDoubleClick = () => {
    if (!isEditing) {
      onEdit(text.id);
    }
  };

  // Handle dragging movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const pdfPage =
        containerRef.current.closest('.pdf-page') ||
        containerRef.current.closest('[data-page-number]') ||
        containerRef.current.closest('.mb-4');

      if (!pdfPage) return;

      const rect = pdfPage.getBoundingClientRect();
      
      // Calculate movement delta adjusted for scale
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;
      
      // Convert to percentage based on container size
      const newX = dragStart.textX + (deltaX / (rect.width / scale)) * 100;
      const newY = dragStart.textY + (deltaY / (rect.height / scale)) * 100;

      // Constrain to bounds
      const clampedX = Math.max(0, Math.min(95, newX));
      const clampedY = Math.max(0, Math.min(95, newY));

      // Update position immediately for smooth visual feedback (like shapes)
      onTextUpdate(text.id, { x: clampedX, y: clampedY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      
      // Check if this was a drag or just a click
      const dragTime = Date.now() - dragStartTime;
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - dragStart.x, 2) + 
        Math.pow(e.clientY - dragStart.y, 2)
      );
      
      // If it was a quick click (less than 200ms and moved less than 5px), select for editing
      if (dragTime < 200 && dragDistance < 5) {
        setTimeout(() => {
          onSelect(text.id);
        }, 10);
      }
      
      // Movement is completed automatically by setIsDragging(false)

      // No need for force final position update since we update immediately
    };

    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart, dragStartTime, text.id, onTextUpdate, onSelect, scale]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className='absolute pointer-events-auto'
      data-text-element
      style={{
        left: `${text.x}%`,
        top: `${text.y}%`,
        width: `${localWidth * scale}px`,
        zIndex: 15,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Blue Resizable Container */}
      <div
        className={`
          relative border-2 border-dashed transition-all duration-200
          ${
            isSelected || isEditing
              ? 'border-blue-500 bg-blue-50/10'
              : 'border-transparent hover:border-blue-300'
          }
        `}
        style={{ minHeight: '30px' }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.stopPropagation();
          // Click handling is now in mouseUp to distinguish from drag
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Text Content */}
        {isEditing ? (
          <textarea
            ref={inputRef}
            defaultValue={text.content}
            className='w-full h-full resize-none border-none bg-transparent outline-none p-1'
            style={{
              fontSize: `${text.fontSize}px`,
              color: text.color,
              textAlign: text.textAlign,
              fontFamily: 'inherit',
              lineHeight: '1.2',
              minHeight: '28px',
            }}
            onChange={(e) => {
              // Debounced content update while typing
              handleContentChange(e.target.value);
            }}
            onBlur={(e) => {
              // Clear debounce timer and save immediately on blur
              if (contentUpdateTimeoutRef.current) {
                clearTimeout(contentUpdateTimeoutRef.current);
              }
              onTextSave(text.id, e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Clear debounce timer and save immediately on Enter
                if (contentUpdateTimeoutRef.current) {
                  clearTimeout(contentUpdateTimeoutRef.current);
                }
                onTextSave(text.id, e.currentTarget.value);
              } else if (e.key === 'Escape') {
                // Clear debounce timer and cancel on Escape
                if (contentUpdateTimeoutRef.current) {
                  clearTimeout(contentUpdateTimeoutRef.current);
                }
                onTextSave(text.id, '');
              }
            }}
            autoFocus
          />
        ) : (
          <div
            className='p-1 min-h-7 cursor-pointer'
            style={{
              fontSize: `${text.fontSize}px`,
              color: text.color,
              textAlign: text.textAlign,
              lineHeight: '1.2',
            }}
          >
            {text.content || 'Click to edit'}
          </div>
        )}

        {/* Resize Handles */}
        {(isSelected || isEditing) && (
          <>
            {/* Corner resize handles */}
            <div
              className='absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize'
              style={{ borderRadius: '1px' }}
            />
            <div
              className='absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize'
              style={{ borderRadius: '1px' }}
            />
            <div
              className='absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize'
              style={{ borderRadius: '1px' }}
            />
            <div
              className='absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize'
              onMouseDown={handleResizeStart}
              style={{ borderRadius: '1px' }}
            />

            {/* Side resize handles */}
            <div
              className='absolute top-1/2 -right-1 w-2 h-4 bg-blue-500 border border-white cursor-e-resize transform -translate-y-1/2'
              onMouseDown={handleResizeStart}
              style={{ borderRadius: '1px' }}
            />
            <div
              className='absolute -bottom-1 left-1/2 w-4 h-2 bg-blue-500 border border-white cursor-s-resize transform -translate-x-1/2'
              style={{ borderRadius: '1px' }}
            />

            {/* Size indicator */}
            <div
              className='absolute -bottom-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded'
              style={{ fontSize: '10px' }}
            >
              {localWidth} × 30
            </div>
          </>
        )}
      </div>
    </div>
  );
}
