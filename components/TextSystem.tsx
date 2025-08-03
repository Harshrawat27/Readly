'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TextElement {
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
  selectedTextId?: string | null;
  texts: TextElement[]; // Pre-loaded texts for this page
  onTextCreate?: (text: Omit<TextElement, 'id' | 'createdAt'>) => Promise<string | void>;
  onTextUpdate?: (id: string, updates: Partial<TextElement>) => Promise<void>;
  onTextDelete?: (id: string) => Promise<void>;
  onToolChange?: (tool: 'move' | 'text') => void;
  onTextSelect?: (textId: string | null, textElement?: TextElement) => void;
}

interface CursorState {
  x: number;
  y: number;
  pageNumber: number;
  visible: boolean;
}

export default function TextSystem({
  pdfId,
  pageNumber,
  isTextMode,
  selectedTextId: externalSelectedTextId,
  texts: pageTexts,
  onTextCreate,
  onTextUpdate,
  onTextDelete,
  onToolChange,
  onTextSelect,
}: TextSystemProps) {
  const [selectedTextId, setSelectedTextId] = useState<string | null>(
    externalSelectedTextId || null
  );

  // Sync external selection
  useEffect(() => {
    setSelectedTextId(externalSelectedTextId || null);
  }, [externalSelectedTextId]);

  // Notify parent of selection changes
  const handleTextSelect = (textId: string | null) => {
    setSelectedTextId(textId);
    const selectedText = textId
      ? pageTexts.find((t) => t.id === textId)
      : undefined;
    onTextSelect?.(textId, selectedText);
  };
  const [cursor, setCursor] = useState<CursorState>({
    x: 0,
    y: 0,
    pageNumber: 0,
    visible: false,
  });
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Listen for formatting updates from top bar
  useEffect(() => {
    const handleFormatUpdate = (event: CustomEvent) => {
      const { textId, updates } = event.detail;
      // Call parent update handler
      onTextUpdate?.(textId, updates);
    };

    window.addEventListener('textFormatUpdate', handleFormatUpdate as EventListener);
    
    return () => {
      window.removeEventListener('textFormatUpdate', handleFormatUpdate as EventListener);
    };
  }, [onTextUpdate]);

  const handlePageClick = useCallback(
    (event: React.MouseEvent) => {
      if (!isTextMode) return;

      const target = event.target as HTMLElement;
      const pdfPage =
        target.closest('.pdf-page') || containerRef.current?.closest('.mb-4');

      if (!pdfPage) return;

      // Don't create text if clicking on existing text
      if (target.closest('[data-text-element]')) return;

      const rect = pdfPage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Show cursor at click position
      setCursor({
        x,
        y,
        pageNumber,
        visible: true,
      });

      // Create new text element
      const newText: TextElement = {
        id: `temp-${Date.now()}`,
        content: '',
        x,
        y,
        pageNumber,
        width: 200, // Default width in pixels
        fontSize: 16,
        color: '#000000',
        textAlign: 'left',
        createdAt: new Date().toISOString(),
      };

      // Note: In a real implementation, this temp text should be handled
      // by the parent component's state management
      setEditingTextId(newText.id);
      setIsTyping(true);
      handleTextSelect(null);

      // Focus the input after a brief delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    [isTextMode, pageNumber]
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

    const textElement = pageTexts.find((t) => t.id === textId);
    if (!textElement) return;

    setEditingTextId(null);
    setIsTyping(false);
    setCursor((prev) => ({ ...prev, visible: false }));
    onToolChange?.('move');

    try {
      if (textId.startsWith('temp-')) {
        // Create new text
        await onTextCreate?.({
          ...textElement,
          content: content.trim(),
        });
      } else {
        // Update existing text
        await onTextUpdate?.(textId, { content: content.trim() });
      }
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
          onClick={handlePageClick}
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
}

function TextElement({
  text,
  isEditing,
  isSelected,
  onTextSave,
  onTextUpdate,
  onTextDelete,
  onSelect,
  onEdit,
  inputRef,
}: TextElementProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, width: 0 });
  const [localWidth, setLocalWidth] = useState(text.width);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, text.id, onTextUpdate, localWidth]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
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
        width: `${localWidth}px`,
        zIndex: 15,
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
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditing) {
            onSelect(text.id);
          }
        }}
        onDoubleClick={() => {
          if (!isEditing) {
            onEdit(text.id);
          }
        }}
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
            onBlur={(e) => onTextSave(text.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onTextSave(text.id, e.currentTarget.value);
              } else if (e.key === 'Escape') {
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
