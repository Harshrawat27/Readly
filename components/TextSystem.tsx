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
  onTextCreate?: (text: Omit<TextElement, 'id' | 'createdAt'>) => void;
  onTextUpdate?: (id: string, updates: Partial<TextElement>) => void;
  onTextDelete?: (id: string) => void;
  onToolChange?: (tool: 'move' | 'text') => void;
  onTextSelect?: (textId: string | null, textElement?: TextElement) => void;
  onFormatUpdate?: (updateFn: (id: string, updates: Partial<TextElement>) => void) => void;
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
  onTextCreate,
  onTextUpdate,
  onTextDelete,
  onToolChange,
  onTextSelect,
  onFormatUpdate,
}: TextSystemProps) {
  const [texts, setTexts] = useState<TextElement[]>([]);
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
      ? texts.find((t) => t.id === textId)
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

  // Load texts for current PDF
  useEffect(() => {
    if (pdfId) {
      loadTexts();
    }
  }, [pdfId]);

  // Create a format update function for external use
  const handleExternalFormatUpdate = useCallback((id: string, updates: Partial<TextElement>) => {
    console.log('TextSystem: handleExternalFormatUpdate called', { id, updates });
    setTexts((prev) => {
      const newTexts = prev.map((text) => (text.id === id ? { ...text, ...updates } : text));
      console.log('TextSystem: Updated texts', newTexts);
      return newTexts;
    });
  }, []);

  // Pass the update function to parent via callback
  useEffect(() => {
    if (onFormatUpdate) {
      console.log('TextSystem: Registering handleExternalFormatUpdate with parent');
      onFormatUpdate(handleExternalFormatUpdate);
    }
  }, [onFormatUpdate, handleExternalFormatUpdate]);

  const loadTexts = async () => {
    try {
      const response = await fetch(`/api/texts?pdfId=${pdfId}`);
      if (response.ok) {
        const data = await response.json();
        setTexts(data);
      }
    } catch (error) {
      console.error('Error loading texts:', error);
    }
  };

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

      setTexts((prev) => [...prev, newText]);
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
      await handleTextDelete(textId);
      setEditingTextId(null);
      setIsTyping(false);
      setCursor((prev) => ({ ...prev, visible: false }));
      return;
    }

    const textElement = texts.find((t) => t.id === textId);
    if (!textElement) return;

    // Update local state
    setTexts((prev) =>
      prev.map((text) =>
        text.id === textId ? { ...text, content: content.trim() } : text
      )
    );

    setEditingTextId(null);
    setIsTyping(false);
    setCursor((prev) => ({ ...prev, visible: false }));

    // Auto-switch to move tool after text creation
    onToolChange?.('move');

    // Check if this is a new text (temp ID) or existing text
    if (textId.startsWith('temp-')) {
      // Create new text
      try {
        const response = await fetch('/api/texts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...textElement,
            content: content.trim(),
            pdfId,
          }),
        });

        if (response.ok) {
          const realText = await response.json();
          // Replace temp text with real one
          setTexts((prev) =>
            prev.map((text) => (text.id === textId ? realText : text))
          );
          onTextCreate?.(realText);
        }
      } catch (error) {
        console.error('Error creating text:', error);
      }
    } else {
      // Update existing text
      await handleTextUpdate(textId, { content: content.trim() });
    }
  };

  const handleTextUpdate = async (
    textId: string,
    updates: Partial<TextElement>
  ) => {
    // Update local state immediately for instant visual feedback
    setTexts((prev) =>
      prev.map((text) => (text.id === textId ? { ...text, ...updates } : text))
    );

    // Also update the selected text element for formatting controls
    const updatedText = texts.find((t) => t.id === textId);
    if (updatedText && selectedTextId === textId) {
      onTextSelect?.(textId, { ...updatedText, ...updates });
    }

    // Background API call (no debouncing for formatting changes)
    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        onTextUpdate?.(textId, updates);
      } else {
        // Rollback on error - restore original state
        const originalText = texts.find((t) => t.id === textId);
        if (originalText) {
          setTexts((prev) =>
            prev.map((text) => (text.id === textId ? originalText : text))
          );
          if (selectedTextId === textId) {
            onTextSelect?.(textId, originalText);
          }
        }
      }
    } catch (error) {
      console.error('Error updating text:', error);
      // Rollback on error - restore original state
      const originalText = texts.find((t) => t.id === textId);
      if (originalText) {
        setTexts((prev) =>
          prev.map((text) => (text.id === textId ? originalText : text))
        );
        if (selectedTextId === textId) {
          onTextSelect?.(textId, originalText);
        }
      }
    }
  };

  const handleTextDelete = async (textId: string) => {
    // Remove from local state
    setTexts((prev) => prev.filter((text) => text.id !== textId));
    handleTextSelect(null);

    // Background API call
    try {
      const response = await fetch(`/api/texts/${textId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onTextDelete?.(textId);
      }
    } catch (error) {
      console.error('Error deleting text:', error);
    }
  };

  // Filter texts for current page
  const pageTexts = texts.filter((text) => text.pageNumber === pageNumber);

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
          onTextUpdate={handleTextUpdate}
          onTextDelete={handleTextDelete}
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

  // Also sync when any text property changes (for formatting updates)
  useEffect(() => {
    setLocalWidth(text.width);
  }, [text]);

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
