'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import FigmaToolbar, { ToolType } from './FigmaToolbar';
import CommentSystem from './CommentSystem';
import TextSystem from './TextSystem';
import HighlightColorPicker from './HighlightColorPicker';
import { usePDFData } from '@/hooks/usePDFData';

// Dynamically import PDF components to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Document })),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Page })),
  { ssr: false }
);

// Configure PDF.js worker and styles on client side only
if (typeof window !== 'undefined') {
  import('react-pdf').then((pdfjs) => {
    // Use a more stable worker version
    // pdfjs.pdfjs.GlobalWorkerOptions.workerSrc =
    //   'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  });

  // CSS files are imported in globals.css
}

interface PDFViewerProps {
  pdfId: string | null;
  onTextSelect: (text: string) => void;
  selectedText: string;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  currentUser?: {
    id: string;
    name: string;
    image?: string;
  };
}

interface TextSelectionDialog {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

export default function PDFViewer({
  pdfId,
  onTextSelect,
  selectedText,
  scale: externalScale,
  onScaleChange,
  currentUser,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [internalScale, setInternalScale] = useState(1.2);
  const scale = externalScale || internalScale;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [selectionDialog, setSelectionDialog] = useState<TextSelectionDialog>({
    x: 0,
    y: 0,
    text: '',
    visible: false,
  });

  // Figma toolbar state
  const [activeTool, setActiveTool] = useState<ToolType>('move');

  // Text formatting state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedTextElement, setSelectedTextElement] = useState<any>(null);

  // Highlight state
  const [highlights, setHighlights] = useState<any[]>([]);

  // Load highlights when PDF changes
  useEffect(() => {
    const loadHighlights = async () => {
      if (!pdfId) {
        setHighlights([]);
        return;
      }

      try {
        const response = await fetch(`/api/highlights?pdfId=${pdfId}`);
        if (response.ok) {
          const data = await response.json();
          setHighlights(data);
        }
      } catch (error) {
        console.error('Failed to load highlights:', error);
      }
    };

    loadHighlights();
  }, [pdfId]);

  // Centralized PDF data management
  const {
    getCommentsForPage,
    getTextsForPage,
    addComment,
    updateComment,
    deleteComment,
    addReply,
    addText,
    updateText,
    deleteText,
    isLoading: isDataLoading
  } = usePDFData(pdfId);

  // Highlight functions with precise range-based positioning
  const handleHighlight = useCallback(async (color: string, text: string) => {
    if (!pdfId) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Find the PDF page container
    const pageContainer = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentElement?.closest('.pdf-page')
      : (range.commonAncestorContainer as Element)?.closest('.pdf-page');
    
    if (!pageContainer) return;
    
    const pageRect = pageContainer.getBoundingClientRect();
    
    // Get all text rectangles for precise highlighting
    const rects = range.getClientRects();
    const highlightRects = [];
    
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (rect.width > 0 && rect.height > 0) {
        // Calculate relative coordinates for each rectangle
        const relativeX = ((rect.left - pageRect.left) / pageRect.width) * 100;
        const relativeY = ((rect.top - pageRect.top) / pageRect.height) * 100;
        const relativeWidth = (rect.width / pageRect.width) * 100;
        const relativeHeight = (rect.height / pageRect.height) * 100;
        
        highlightRects.push({
          x: relativeX,
          y: relativeY,
          width: relativeWidth,
          height: relativeHeight,
        });
      }
    }
    
    // Create highlight object with multiple rectangles
    const highlight = {
      id: `highlight_${Date.now()}`,
      pdfId,
      text,
      color,
      rects: highlightRects,
      pageNumber: currentPage,
    };

    // Add to local state immediately for instant feedback
    setHighlights(prev => [...prev, highlight]);

    // Save to database in background
    try {
      await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(highlight),
      });
    } catch (error) {
      console.error('Failed to save highlight:', error);
      // Remove from local state if save failed
      setHighlights(prev => prev.filter(h => h.id !== highlight.id));
    }

    // Clear selection after highlighting
    selection.removeAllRanges();
  }, [pdfId, currentPage]);

  const handleAskReadly = useCallback((text: string) => {
    onTextSelect(text);
  }, [onTextSelect]);

  // Get highlights for a specific page
  const getHighlightsForPage = useCallback((pageNumber: number) => {
    return highlights.filter(highlight => highlight.pageNumber === pageNumber);
  }, [highlights]);

  // Handle external link detection and opening
  const handleLinkClick = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement;

    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Check if it's an external link
    try {
      const currentDomain = window.location.hostname;
      const url = new URL(href, window.location.origin);

      // If the link domain is different from current domain, open in new tab
      if (url.hostname !== currentDomain) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
      // Internal links will work normally (default behavior)
    } catch (error) {
      // If URL parsing fails, it might be a relative link or malformed
      // Let it work normally
      console.log('Link parsing error:', error);
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load PDF file based on pdfId
  useEffect(() => {
    if (pdfId) {
      const loadPdf = async () => {
        try {
          setIsLoading(true);
          setError(null);

          const response = await fetch(`/api/pdf/${pdfId}`);
          if (!response.ok) {
            throw new Error('Failed to load PDF');
          }

          const pdfData = await response.json();
          setPdfFile(pdfData.url);
          setCurrentPage(1);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setError('Failed to load PDF file');
          // Fallback to sample PDF for demo
          setPdfFile('/sample.pdf');
        } finally {
          setIsLoading(false);
        }
      };

      loadPdf();
    } else {
      setPdfFile(null);
      setNumPages(null);
      setCurrentPage(1);
    }
  }, [pdfId]);

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or cleanup when component unmounts
      setSelectionDialog({ x: 0, y: 0, text: '', visible: false });
      setError(null);
    };
  }, []);

  // Handle container width for responsive scaling
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // Handle PDF link clicks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listener for link clicks within the PDF container
    container.addEventListener('click', handleLinkClick, true);

    return () => {
      container.removeEventListener('click', handleLinkClick, true);
    };
  }, [handleLinkClick]);

  // Handle text selection with debouncing to prevent crashes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelection = () => {
      // Debounce to prevent excessive calls and flickering
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            setSelectionDialog((prev) => prev.visible ? { ...prev, visible: false } : prev);
            return;
          }

          const selectedText = selection.toString().trim();
          if (!selectedText || selectedText.length < 2) {
            setSelectionDialog((prev) => prev.visible ? { ...prev, visible: false } : prev);
            return;
          }

          const range = selection.getRangeAt(0);

          // More strict checking - ensure selection is within a PDF page text layer
          const startContainer = range.startContainer;
          const endContainer = range.endContainer;
          
          // Check if both start and end are within the same PDF page's text layer
          const startPage = startContainer.nodeType === Node.TEXT_NODE 
            ? startContainer.parentElement?.closest('.react-pdf__Page__textContent')
            : (startContainer as Element)?.closest('.react-pdf__Page__textContent');
            
          const endPage = endContainer.nodeType === Node.TEXT_NODE 
            ? endContainer.parentElement?.closest('.react-pdf__Page__textContent')
            : (endContainer as Element)?.closest('.react-pdf__Page__textContent');

          // Only show dialog if selection is within the same PDF page text layer
          if (
            startPage && 
            endPage && 
            startPage === endPage &&
            containerRef.current &&
            containerRef.current.contains(range.commonAncestorContainer)
          ) {
            // Get the first rectangle for positioning the dialog
            const rects = range.getClientRects();
            if (rects.length > 0) {
              const firstRect = rects[0];
              const lastRect = rects[rects.length - 1];
              
              setSelectionDialog({
                x: firstRect.left + (lastRect.right - firstRect.left) / 2,
                y: firstRect.top - 10,
                text: selectedText,
                visible: true,
              });
            }
          } else {
            setSelectionDialog((prev) => prev.visible ? { ...prev, visible: false } : prev);
          }
        } catch (error) {
          console.error('Selection error:', error);
          setSelectionDialog((prev) => prev.visible ? { ...prev, visible: false } : prev);
        }
      }, 200); // Longer debounce to reduce flickering
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  // Clear selection when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionDialog.visible && !event.target) {
        setSelectionDialog((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionDialog.visible]);

  // Intersection observer for current page tracking
  useEffect(() => {
    if (!numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestMatch = { pageNumber: 1, ratio: 0 };

        entries.forEach((entry) => {
          const pageNumber = parseInt(
            entry.target.getAttribute('data-page-number') || '1'
          );

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (entry.intersectionRatio > bestMatch.ratio) {
              bestMatch = { pageNumber, ratio: entry.intersectionRatio };
            }
          }
        });

        if (bestMatch.ratio > 0) {
          setCurrentPage(bestMatch.pageNumber);
        }
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
        root: containerRef.current?.querySelector('.pdf-scroll-container'),
      }
    );

    const timeoutId = setTimeout(() => {
      pageRefs.current.forEach((pageRef) => {
        if (pageRef) {
          observer.observe(pageRef);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [numPages, pdfFile]);

  // Force reset currentPage when PDF changes
  useEffect(() => {
    if (pdfFile) {
      setCurrentPage(1);
    }
  }, [pdfFile]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setCurrentPage(1);
      setIsLoading(false);
      setError(null);
      pageRefs.current = new Array(numPages).fill(null);
    },
    []
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF document');
    setIsLoading(false);
    setNumPages(null);
    setPdfFile(null); // Clear the problematic file
  }, []);

  const handleAskReadlyFromDialog = useCallback(() => {
    onTextSelect(selectionDialog.text);
    setSelectionDialog((prev) => ({ ...prev, visible: false }));

    // Clear the current selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, [selectionDialog.text, onTextSelect]);

  const calculateScale = useCallback(() => {
    // Allow full scale control, no width constraints
    return Math.max(scale, 0.5); // Minimum scale only
  }, [scale]);

  // Zoom functions with increased maximum
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(3.0, scale + 0.1); // Increased max to 300%
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  }, [scale, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.5, scale - 0.1); // Min 50%
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  }, [scale, onScaleChange]);

  const handleZoomReset = useCallback(() => {
    const resetScale = 1.0; // Reset to 100%
    if (onScaleChange) {
      onScaleChange(resetScale);
    } else {
      setInternalScale(resetScale);
    }
  }, [onScaleChange]);

  // Handle text selection
  const handleTextSelect = useCallback(
    (textId: string | null, textElement?: any) => {
      setSelectedTextId(textId);
      setSelectedTextElement(textElement || null);
    },
    []
  );

  // Handle text formatting changes from top bar with debouncing
  const handleTextFormat = useCallback(
    (updates: any) => {
      if (!selectedTextId || !selectedTextElement) return;

      // Update local state immediately for instant visual feedback
      const updatedElement = { ...selectedTextElement, ...updates };
      setSelectedTextElement(updatedElement);

      // Use the centralized updateText function which has proper debouncing
      updateText(selectedTextId, updates);
    },
    [selectedTextId, selectedTextElement, updateText]
  );

  // Handle click outside to deselect text
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't deselect if clicking on text elements, formatting controls, or toolbars
      if (
        target.closest('[data-text-element]') ||
        target.closest('.figma-toolbar') ||
        target.closest('select') ||
        target.closest('input[type="color"]') ||
        target.closest('button')
      ) {
        return;
      }

      // Deselect text
      if (selectedTextId) {
        setSelectedTextId(null);
        setSelectedTextElement(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedTextId]);

  // Memoize options to prevent unnecessary reloads
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
      standardFontDataUrl:
        'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
      disableWorker: false,
      httpHeaders: {},
    }),
    []
  );

  if (!pdfId) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <div className='w-16 h-16 bg-[var(--faded-white)] rounded-full mx-auto flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-[var(--text-muted)]'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
              <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-[var(--text-primary)]'>
            No PDF Selected
          </h3>
          <p className='text-[var(--text-muted)]'>
            Select a PDF from the sidebar to start reading
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <div className='w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center'>
            <svg
              className='w-8 h-8 text-red-500'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 8v4' />
              <path d='M12 16h.01' />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-[var(--text-primary)]'>
            Error Loading PDF
          </h3>
          <p className='text-[var(--text-muted)]'>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className='h-full flex flex-col relative'>
      {/* PDF Controls - Fixed toolbar */}
      <div className='flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card-background)] flex-shrink-0 z-10'>
        <div className='flex items-center gap-4'>
          {/* Current Page / Total Pages */}
          <span className='text-sm text-[var(--text-primary)]'>
            {numPages ? `Page ${currentPage} / ${numPages}` : 'Loading...'}
          </span>
        </div>

        <div className='flex items-center gap-4'>
          {/* Text Formatting Controls - Only show when text is selected */}
          {selectedTextElement && (
            <div className='flex items-center gap-2 border-r border-[var(--border)] pr-4'>
              {/* Font Size */}
              <select
                value={selectedTextElement.fontSize}
                onChange={(e) =>
                  handleTextFormat({ fontSize: parseInt(e.target.value) })
                }
                className='text-sm border border-[var(--border)] rounded px-2 py-1 bg-[var(--card-background)]'
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
                <option value={24}>24px</option>
                <option value={28}>28px</option>
                <option value={32}>32px</option>
              </select>

              {/* Text Color */}
              <input
                type='color'
                value={selectedTextElement.color}
                onChange={(e) => handleTextFormat({ color: e.target.value })}
                className='w-8 h-8 border border-[var(--border)] rounded cursor-pointer'
                title='Text Color'
              />

              {/* Text Alignment */}
              <div className='flex border border-[var(--border)] rounded overflow-hidden'>
                {[
                  { align: 'left', icon: '⬅' },
                  { align: 'center', icon: '↔' },
                  { align: 'right', icon: '➡' },
                ].map(({ align, icon }) => (
                  <button
                    key={align}
                    onClick={() => handleTextFormat({ textAlign: align })}
                    className={`px-3 py-1 text-sm transition-colors ${
                      selectedTextElement.textAlign === align
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--card-background)] hover:bg-[var(--faded-white)]'
                    }`}
                    title={`Align ${align}`}
                  >
                    <svg
                      className='w-4 h-4'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      {align === 'left' && (
                        <>
                          <line x1='3' y1='6' x2='21' y2='6' />
                          <line x1='3' y1='12' x2='15' y2='12' />
                          <line x1='3' y1='18' x2='18' y2='18' />
                        </>
                      )}
                      {align === 'center' && (
                        <>
                          <line x1='3' y1='6' x2='21' y2='6' />
                          <line x1='6' y1='12' x2='18' y2='12' />
                          <line x1='3' y1='18' x2='21' y2='18' />
                        </>
                      )}
                      {align === 'right' && (
                        <>
                          <line x1='3' y1='6' x2='21' y2='6' />
                          <line x1='9' y1='12' x2='21' y2='12' />
                          <line x1='6' y1='18' x2='21' y2='18' />
                        </>
                      )}
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className='flex items-center gap-2'>
            <button
              onClick={handleZoomOut}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='11' cy='11' r='8' />
                <path d='M21 21l-4.35-4.35' />
                <path d='M8 11h6' />
              </svg>
            </button>

            <button
              onClick={handleZoomReset}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
              title='Reset to 100%'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' />
                <path d='M21 3v5h-5' />
                <path d='M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' />
                <path d='M3 21v-5h5' />
              </svg>
            </button>

            <button
              onClick={handleZoomIn}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='11' cy='11' r='8' />
                <path d='M21 21l-4.35-4.35' />
                <path d='M11 8v6' />
                <path d='M8 11h6' />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Document - Scrollable container with all pages and horizontal overflow */}
      <div className='flex-1 overflow-auto bg-[var(--pdf-viewer-bg)] pdf-scroll-container'>
        <div className='p-4 min-w-fit'>
          {pdfFile && (
            <div className='flex flex-col items-center space-y-4'>
              <Document
                key={`${pdfFile}-${pdfId}`}
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4'></div>
                    <p className='text-[var(--text-muted)]'>Loading PDF...</p>
                  </div>
                }
                error={
                  <div className='text-center py-8'>
                    <div className='w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center'>
                      <svg
                        className='w-8 h-8 text-red-500'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <circle cx='12' cy='12' r='10' />
                        <path d='M12 8v4' />
                        <path d='M12 16h.01' />
                      </svg>
                    </div>
                    <p className='text-[var(--text-muted)]'>
                      Failed to load PDF
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className='mt-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm'
                    >
                      Retry
                    </button>
                  </div>
                }
                options={pdfOptions}
              >
{numPages &&
                  Array.from(new Array(numPages), (el, index) => {
                    const pageNumber = index + 1;

                    return (
                      <div
                        key={`page_${pageNumber}`}
                        ref={(el) => {
                          pageRefs.current[index] = el;
                        }}
                        data-page-number={pageNumber}
                        className='mb-4 relative'
                      >
                        <Page
                          key={`page_${pageNumber}_${calculateScale()}`}
                          pageNumber={pageNumber}
                          scale={calculateScale()}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className='pdf-page shadow-lg border'
                          loading={
                            <div className='text-center py-4'>
                              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)] mx-auto'></div>
                            </div>
                          }
                          error={
                            <div className='text-center py-4'>
                              <p className='text-[var(--text-muted)] text-sm'>
                                Failed to load page {pageNumber}
                              </p>
                            </div>
                          }
                        />
                        {/* Comment System Overlay */}
                        {pdfId && currentUser && (
                          <CommentSystem
                            pdfId={pdfId}
                            pageNumber={pageNumber}
                            isCommentMode={activeTool === 'comment'}
                            currentUser={currentUser}
                            comments={getCommentsForPage(pageNumber)}
                            onCommentCreate={addComment}
                            onCommentUpdate={updateComment}
                            onCommentDelete={deleteComment}
                            onReplyCreate={addReply}
                          />
                        )}
                        {/* Text System Overlay */}
                        {pdfId && (
                          <TextSystem
                            pdfId={pdfId}
                            pageNumber={pageNumber}
                            isTextMode={activeTool === 'text'}
                            selectedTextId={selectedTextId}
                            texts={getTextsForPage(pageNumber)}
                            onTextCreate={addText}
                            onTextUpdate={updateText}
                            onTextDelete={deleteText}
                            onToolChange={(tool) => setActiveTool(tool as ToolType)}
                            onTextSelect={handleTextSelect}
                          />
                        )}
                        
                        {/* Highlight Overlay */}
                        {getHighlightsForPage(pageNumber).map((highlight) => (
                          <div key={highlight.id}>
                            {/* Handle new multi-rect highlights */}
                            {highlight.rects ? highlight.rects.map((rect: any, rectIndex: number) => (
                              <div
                                key={`${highlight.id}-${rectIndex}`}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${rect.x}%`,
                                  top: `${rect.y}%`,
                                  width: `${rect.width}%`,
                                  height: `${rect.height}%`,
                                  backgroundColor: highlight.color,
                                  opacity: 0.4,
                                  borderRadius: '1px',
                                  zIndex: 0,
                                }}
                                title={highlight.text}
                              />
                            )) : (
                              /* Fallback for old single-rect highlights */
                              <div
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${highlight.x}%`,
                                  top: `${highlight.y}%`,
                                  width: `${highlight.width}%`,
                                  height: `${highlight.height}%`,
                                  backgroundColor: highlight.color,
                                  opacity: 0.4,
                                  borderRadius: '1px',
                                  zIndex: 0,
                                }}
                                title={highlight.text}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* Figma Toolbar */}
      <FigmaToolbar activeTool={activeTool} onToolChange={setActiveTool} />

      {/* Highlight Color Picker */}
      <HighlightColorPicker
        x={selectionDialog.x}
        y={selectionDialog.y}
        visible={selectionDialog.visible}
        selectedText={selectionDialog.text}
        onHighlight={handleHighlight}
        onAskReadly={handleAskReadlyFromDialog}
        onClose={() => setSelectionDialog(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
