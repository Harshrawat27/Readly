'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import PDFAnnotationToolbar, { AnnotationTool, HighlightColor } from './PDFAnnotationToolbar';
import PDFAnnotationLayer from './PDFAnnotationLayer';
import PDFHighlightSelection from './PDFHighlightSelection';
import PDFCommentTooltip from './PDFCommentTooltip';
import PDFCommentModal from './PDFCommentModal';

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
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';
  });

  // CSS files are imported in globals.css
}

interface PDFViewerProps {
  pdfId: string | null;
  onTextSelect: (text: string) => void;
  selectedText: string;
  scale?: number;
  onScaleChange?: (scale: number) => void;
}

interface TextSelectionDialog {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

interface Comment {
  id: string;
  x: number;
  y: number;
  content: string;
  pageNumber: number;
}

interface Highlight {
  id: string;
  text: string;
  color: HighlightColor;
  pageNumber: number;
  rect: DOMRect;
}

export default function PDFViewer({
  pdfId,
  onTextSelect,
  selectedText,
  scale: externalScale,
  onScaleChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [internalScale, setInternalScale] = useState(1.2);
  const scale = externalScale || internalScale;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [selectionDialog, setSelectionDialog] = useState<TextSelectionDialog>({
    x: 0,
    y: 0,
    text: '',
    visible: false,
  });
  
  // Annotation states
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<HighlightColor>('#ffeb3b');
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [hoveredComment, setHoveredComment] = useState<Comment | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{[key: number]: {width: number, height: number}}>({});

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

  // Handle text selection with debouncing to prevent crashes
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelection = () => {
      // Debounce to prevent excessive calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        try {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            setSelectionDialog((prev) => ({ ...prev, visible: false }));
            setSelectionRect(null);
            return;
          }

          const selectedText = selection.toString().trim();
          if (!selectedText || selectedText.length < 3) {
            setSelectionDialog((prev) => ({ ...prev, visible: false }));
            setSelectionRect(null);
            return;
          }

          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          // Check if selection is within PDF viewer
          if (
            containerRef.current &&
            containerRef.current.contains(range.commonAncestorContainer)
          ) {
            setSelectionDialog({
              x: rect.left + rect.width / 2,
              y: rect.top - 10,
              text: selectedText,
              visible: true,
            });
            setSelectionRect(rect);
          }
        } catch (error) {
          console.error('Selection error:', error);
          setSelectionDialog((prev) => ({ ...prev, visible: false }));
          setSelectionRect(null);
        }
      }, 100); // 100ms debounce
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

  // Intersection Observer for tracking current page and progressive loading
  useEffect(() => {
    if (!numPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the page with highest intersection ratio that's at least 50% visible
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

          // Progressive loading: load pages that are becoming visible
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setLoadedPages((prev) => {
              const newSet = new Set(prev);
              // Load current page and nearby pages
              newSet.add(pageNumber);
              if (pageNumber > 1) newSet.add(pageNumber - 1);
              if (pageNumber < numPages) newSet.add(pageNumber + 1);
              return newSet;
            });
          }
        });

        // If we found a visible page, update current page
        if (bestMatch.ratio > 0) {
          setCurrentPage(bestMatch.pageNumber);
        }
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9], // Lower threshold for progressive loading
        root: containerRef.current?.querySelector('.pdf-scroll-container'),
      }
    );

    // Small delay to ensure DOM is ready
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
      // Start with first page loaded
      setLoadedPages(new Set([1]));
      // Reset page dimensions
      setPageDimensions({});
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

  const handleAskReadly = useCallback(() => {
    onTextSelect(selectionDialog.text);
    setSelectionDialog((prev) => ({ ...prev, visible: false }));
    setSelectionRect(null);

    // Clear the current selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, [selectionDialog.text, onTextSelect]);

  // Handle highlighting
  const handleHighlight = useCallback((color: HighlightColor) => {
    if (!selectionRect || !selectionDialog.text) return;

    const highlight: Highlight = {
      id: Date.now().toString(),
      text: selectionDialog.text,
      color,
      pageNumber: currentPage,
      rect: selectionRect,
    };

    setHighlights((prev) => [...prev, highlight]);
    setSelectionDialog((prev) => ({ ...prev, visible: false }));
    setSelectionRect(null);

    // Clear the current selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, [selectionRect, selectionDialog.text, currentPage]);

  // Handle comment addition
  const handleCommentAdd = useCallback((comment: Omit<Comment, 'id'>) => {
    const newComment: Comment = {
      ...comment,
      id: Date.now().toString(),
    };
    setComments((prev) => [...prev, newComment]);
  }, []);

  // Handle comment editing
  const handleCommentEdit = useCallback((commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, content: newContent } : comment
      )
    );
  }, []);

  // Handle comment deletion
  const handleCommentDelete = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  // Handle comment hover
  const handleCommentHover = useCallback((comment: Comment, position: { x: number; y: number }) => {
    setHoveredComment(comment);
    setHoverPosition(position);
  }, []);

  // Handle comment click
  const handleCommentClick = useCallback((comment: Comment) => {
    setSelectedComment(comment);
    setShowCommentModal(true);
    setHoveredComment(null);
  }, []);

  // Close tooltips and modals
  const closeTooltip = useCallback(() => {
    setHoveredComment(null);
    setHoverPosition(null);
  }, []);

  const closeCommentModal = useCallback(() => {
    setShowCommentModal(false);
    setSelectedComment(null);
  }, []);

  // Close selection dialog
  const closeSelectionDialog = useCallback(() => {
    setSelectionDialog((prev) => ({ ...prev, visible: false }));
    setSelectionRect(null);
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const calculateScale = useCallback(() => {
    // Allow full scale control, no width constraints
    return Math.max(scale, 0.5); // Minimum scale only
  }, [scale]);

  // Handle page load success to capture dimensions
  const onPageLoadSuccess = useCallback((page: any, pageNumber: number) => {
    const viewport = page.getViewport({ scale: calculateScale() });
    setPageDimensions(prev => ({
      ...prev,
      [pageNumber]: {
        width: viewport.width,
        height: viewport.height
      }
    }));
  }, [calculateScale]);

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
                    const shouldLoad = loadedPages.has(pageNumber);

                    return (
                      <div
                        key={`page-wrapper-${pageNumber}`}
                        ref={(el) => {
                          pageRefs.current[index] = el;
                        }}
                        data-page-number={pageNumber}
                        className='mb-4 relative'
                      >
                        {shouldLoad ? (
                          <Page
                            key={`page_${pageNumber}_${calculateScale()}`}
                            pageNumber={pageNumber}
                            scale={calculateScale()}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            className='pdf-page shadow-lg border'
                            onLoadSuccess={(page) => onPageLoadSuccess(page, pageNumber)}
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
                        ) : (
                          <div
                            className='pdf-page-placeholder shadow-lg border bg-gray-100 flex items-center justify-center'
                            style={{ height: '600px', minHeight: '600px' }}
                          >
                            <div className='text-center text-gray-500'>
                              <div className='w-8 h-8 mx-auto mb-2 opacity-50'>
                                <svg
                                  viewBox='0 0 24 24'
                                  fill='none'
                                  stroke='currentColor'
                                  strokeWidth='2'
                                >
                                  <path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20' />
                                  <path d='M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' />
                                </svg>
                              </div>
                              <p className='text-sm'>Page {pageNumber}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Annotation Layer */}
                        {shouldLoad && pageDimensions[pageNumber] && (
                          <PDFAnnotationLayer
                            activeTool={activeTool}
                            highlightColor={selectedHighlightColor}
                            pageNumber={pageNumber}
                            pageWidth={pageDimensions[pageNumber].width / calculateScale()}
                            pageHeight={pageDimensions[pageNumber].height / calculateScale()}
                            scale={calculateScale()}
                            onCommentAdd={handleCommentAdd}
                            comments={comments}
                          />
                        )}
                      </div>
                    );
                  })}
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* PDF Annotation Toolbar */}
      <PDFAnnotationToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        selectedHighlightColor={selectedHighlightColor}
        onHighlightColorChange={setSelectedHighlightColor}
        showHighlightColors={showHighlightColors}
        onShowHighlightColors={setShowHighlightColors}
      />

      {/* Text Selection with Highlight Options */}
      <PDFHighlightSelection
        selectedText={selectionDialog.text}
        selectionRect={selectionRect}
        onHighlight={handleHighlight}
        onAskReadly={handleAskReadly}
        visible={selectionDialog.visible}
        onClose={closeSelectionDialog}
      />

      {/* Comment Tooltip */}
      <PDFCommentTooltip
        comment={hoveredComment}
        position={hoverPosition}
        onClose={closeTooltip}
        onViewFull={handleCommentClick}
      />

      {/* Comment Modal */}
      <PDFCommentModal
        comment={selectedComment}
        isOpen={showCommentModal}
        onClose={closeCommentModal}
        onEdit={handleCommentEdit}
        onDelete={handleCommentDelete}
      />
    </div>
  );
}
