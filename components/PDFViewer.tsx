'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import FigmaToolbar, { ToolType } from './FigmaToolbar';
import CommentSystem from './CommentSystem';
import TextSystem, { TextElement } from './TextSystem';
import HighlightColorPicker from './HighlightColorPicker';
import { usePDFData } from '@/hooks/usePDFData';

// Dynamically import PDF components
const Document = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Document })),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Page })),
  { ssr: false }
);

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  import('react-pdf').then((pdfjs) => {
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  });
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

// Virtualization constants
const PAGE_BUFFER = 3; // Number of pages to render before and after visible pages
const PLACEHOLDER_HEIGHT = 1000; // Estimated height for unrendered pages

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
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [selectionDialog, setSelectionDialog] = useState<TextSelectionDialog>({
    x: 0,
    y: 0,
    text: '',
    visible: false,
  });

  // Virtualization state
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
  const [pageHeights, setPageHeights] = useState<Map<number, number>>(
    new Map()
  );
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // PDF document reference for programmatic navigation
  const pdfDocumentRef = useRef<any>(null);

  // Figma toolbar state
  const [activeTool, setActiveTool] = useState<ToolType>('move');

  // Text formatting state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedTextElement, setSelectedTextElement] =
    useState<TextElement | null>(null);

  // Highlight state
  const [highlights, setHighlights] = useState<Array<Record<string, unknown>>>(
    []
  );

  // Load highlights
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
  } = usePDFData(pdfId);

  const [currentSelectionData, setCurrentSelectionData] = useState<{
    text: string;
    range: Range;
    pageContainer: Element;
    pageRect: DOMRect;
    rects: DOMRectList;
  } | null>(null);

  const handleHighlight = useCallback(
    async (color: string, text: string) => {
      if (!pdfId || !currentSelectionData) return;

      const selectionData = currentSelectionData;
      const highlightRects = [];

      for (let i = 0; i < selectionData.rects.length; i++) {
        const rect = selectionData.rects[i];
        if (rect.width > 0 && rect.height > 0) {
          const relativeX =
            ((rect.left - selectionData.pageRect.left) /
              selectionData.pageRect.width) *
            100;
          const relativeY =
            ((rect.top - selectionData.pageRect.top) /
              selectionData.pageRect.height) *
            100;
          const relativeWidth =
            (rect.width / selectionData.pageRect.width) * 100;
          const relativeHeight =
            (rect.height / selectionData.pageRect.height) * 100;

          highlightRects.push({
            x: relativeX,
            y: relativeY,
            width: relativeWidth,
            height: relativeHeight,
          });
        }
      }

      const highlight = {
        id: `highlight_${Date.now()}`,
        pdfId,
        text: selectionData.text,
        color,
        rects: highlightRects,
        pageNumber: currentPage,
      };

      setHighlights((prev) => [...prev, highlight]);

      try {
        await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(highlight),
        });
      } catch (error) {
        console.error('Failed to save highlight:', error);
        setHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
      }
    },
    [pdfId, currentPage, currentSelectionData]
  );

  const getHighlightsForPage = useCallback(
    (pageNumber: number) => {
      return highlights.filter(
        (highlight) => highlight.pageNumber === pageNumber
      );
    },
    [highlights]
  );

  // Handle citation clicks - navigate to specific page
  const handleCitationClick = useCallback(
    (targetPage: number) => {
      if (!numPages || targetPage < 1 || targetPage > numPages) return;

      // Scroll to the target page
      const targetElement = document.querySelector(
        `[data-page-number="${targetPage}"]`
      );

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // If page isn't rendered yet, update visible pages and then scroll
        setVisiblePages((prev) => {
          const newSet = new Set(prev);
          // Add the target page and surrounding pages to render
          for (
            let i = Math.max(1, targetPage - PAGE_BUFFER);
            i <= Math.min(numPages, targetPage + PAGE_BUFFER);
            i++
          ) {
            newSet.add(i);
          }
          return newSet;
        });

        // Wait for render and then scroll
        setTimeout(() => {
          const element = document.querySelector(
            `[data-page-number="${targetPage}"]`
          );
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }

      setCurrentPage(targetPage);
    },
    [numPages]
  );

  // Add global citation click handler
  useEffect(() => {
    const handleGlobalCitationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const citation = target.closest('[data-citation-page]');

      if (citation) {
        e.preventDefault();
        const pageNum = parseInt(
          citation.getAttribute('data-citation-page') || '1'
        );
        handleCitationClick(pageNum);
      }
    };

    document.addEventListener('click', handleGlobalCitationClick);
    return () =>
      document.removeEventListener('click', handleGlobalCitationClick);
  }, [handleCitationClick]);

  const handleLinkClick = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement;

    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    try {
      const currentDomain = window.location.hostname;
      const url = new URL(href, window.location.origin);

      if (url.hostname !== currentDomain) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.log('Link parsing error:', error);
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Optimized PDF loading with caching
  useEffect(() => {
    if (pdfId) {
      const loadPdf = async () => {
        try {
          setError(null);
          setIsInitialLoad(true);

          // Check if PDF is cached
          const cacheKey = `pdf_${pdfId}`;
          const cached = sessionStorage.getItem(cacheKey);

          if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 3600000) {
              // 1 hour cache
              setPdfFile(data.url);
              setCurrentPage(1);
              setIsInitialLoad(false);
              return;
            }
          }

          const response = await fetch(`/api/pdf/${pdfId}`);
          if (!response.ok) throw new Error('Failed to load PDF');

          const pdfData = await response.json();

          // Cache the URL
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              url: pdfData.url,
              timestamp: Date.now(),
            })
          );

          setPdfFile(pdfData.url);
          setCurrentPage(1);
          setIsInitialLoad(false);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setError('Failed to load PDF file');
          setPdfFile('/sample.pdf');
          setIsInitialLoad(false);
        }
      };

      loadPdf();
    } else {
      setPdfFile(null);
      setNumPages(null);
      setCurrentPage(1);
      setVisiblePages(new Set([1]));
    }
  }, [pdfId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSelectionDialog({ x: 0, y: 0, text: '', visible: false });
      setError(null);
      pageRefs.current.clear();
    };
  }, []);

  const [isMousePressed, setIsMousePressed] = useState(false);

  // Optimized intersection observer for page visibility
  useEffect(() => {
    if (!numPages || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const updates = new Map<number, boolean>();

        entries.forEach((entry) => {
          const pageNumber = parseInt(
            entry.target.getAttribute('data-page-number') || '1'
          );

          if (entry.isIntersecting) {
            updates.set(pageNumber, true);

            // Update current page if significantly visible
            if (entry.intersectionRatio >= 0.5) {
              setCurrentPage(pageNumber);
            }
          } else {
            updates.set(pageNumber, false);
          }
        });

        // Batch update visible pages
        setVisiblePages((prev) => {
          const newSet = new Set<number>();

          // Keep pages that are visible
          updates.forEach((isVisible, pageNum) => {
            if (isVisible) {
              // Add visible page and buffer pages
              for (
                let i = Math.max(1, pageNum - PAGE_BUFFER);
                i <= Math.min(numPages, pageNum + PAGE_BUFFER);
                i++
              ) {
                newSet.add(i);
              }
            }
          });

          // Keep existing visible pages not in updates
          prev.forEach((pageNum) => {
            if (!updates.has(pageNum)) {
              newSet.add(pageNum);
            }
          });

          return newSet;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe page placeholders
    const placeholders =
      scrollContainerRef.current.querySelectorAll('[data-page-number]');
    placeholders.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setCurrentPage(1);
      setError(null);
      pdfDocumentRef.current = true;

      // Initialize with first few pages visible
      const initialPages = new Set<number>();
      for (let i = 1; i <= Math.min(5, numPages); i++) {
        initialPages.add(i);
      }
      setVisiblePages(initialPages);
    },
    []
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF document');
    setPdfFile(null);
  }, []);

  const handleAskReadlyFromDialog = useCallback(() => {
    onTextSelect(selectionDialog.text);
    setSelectionDialog({ x: 0, y: 0, text: '', visible: false });
    window.getSelection()?.removeAllRanges();
  }, [selectionDialog.text, onTextSelect]);

  const calculateScale = useCallback(() => {
    return Math.max(scale, 0.5);
  }, [scale]);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(3.0, scale + 0.1);
    onScaleChange ? onScaleChange(newScale) : setInternalScale(newScale);
  }, [scale, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.5, scale - 0.1);
    onScaleChange ? onScaleChange(newScale) : setInternalScale(newScale);
  }, [scale, onScaleChange]);

  const handleZoomReset = useCallback(() => {
    const resetScale = 1.0;
    onScaleChange ? onScaleChange(resetScale) : setInternalScale(resetScale);
  }, [onScaleChange]);

  const handleTextSelect = useCallback(
    (textId: string | null, textElement?: TextElement) => {
      setSelectedTextId(textId);
      setSelectedTextElement(textElement || null);
    },
    []
  );

  const handleTextFormat = useCallback(
    (updates: Partial<TextElement>) => {
      if (!selectedTextId || !selectedTextElement) return;
      const updatedElement = { ...selectedTextElement, ...updates };
      setSelectedTextElement(updatedElement);
      updateText(selectedTextId, updates);
    },
    [selectedTextId, selectedTextElement, updateText]
  );

  // Memoized PDF options
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
      standardFontDataUrl:
        'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
      disableWorker: false,
      httpHeaders: {},
      disableStream: false, // Enable streaming for faster initial load
      disableAutoFetch: false,
      rangeChunkSize: 65536, // 64KB chunks for faster loading
    }),
    []
  );

  // Page height tracking for accurate placeholder sizing
  const handlePageLoad = useCallback((pageNumber: number, height: number) => {
    setPageHeights((prev) => {
      const newMap = new Map(prev);
      newMap.set(pageNumber, height);
      return newMap;
    });
  }, []);

  const getPageHeight = useCallback(
    (pageNumber: number) => {
      return pageHeights.get(pageNumber) || PLACEHOLDER_HEIGHT;
    },
    [pageHeights]
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
      {/* PDF Controls */}
      <div className='flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card-background)] flex-shrink-0 z-10'>
        <div className='flex items-center gap-4'>
          <span className='text-sm text-[var(--text-primary)]'>
            {numPages ? `Page ${currentPage} / ${numPages}` : 'Loading...'}
          </span>
        </div>

        <div className='flex items-center gap-4'>
          {selectedTextElement && (
            <div className='flex items-center gap-2 border-r border-[var(--border)] pr-4'>
              <select
                value={String(selectedTextElement.fontSize || 16)}
                onChange={(e) =>
                  handleTextFormat({ fontSize: parseInt(e.target.value) })
                }
                className='text-sm border border-[var(--border)] rounded px-2 py-1 bg-[var(--card-background)]'
              >
                {[12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>

              <input
                type='color'
                value={String(selectedTextElement.color || '#000000')}
                onChange={(e) => handleTextFormat({ color: e.target.value })}
                className='w-8 h-8 border border-[var(--border)] rounded cursor-pointer'
                title='Text Color'
              />
            </div>
          )}

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

      {/* Optimized PDF Document with virtualization */}
      <div
        ref={scrollContainerRef}
        className='flex-1 overflow-auto bg-[var(--pdf-viewer-bg)] pdf-scroll-container'
      >
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
                options={pdfOptions}
              >
                {numPages &&
                  Array.from(new Array(numPages), (el, index) => {
                    const pageNumber = index + 1;
                    const isPageVisible = visiblePages.has(pageNumber);
                    const pageHeight = getPageHeight(pageNumber);

                    return (
                      <div
                        key={`page_${pageNumber}`}
                        ref={(el) => {
                          if (el) pageRefs.current.set(pageNumber, el);
                        }}
                        data-page-number={pageNumber}
                        className='mb-4 relative'
                        style={{
                          minHeight: `${pageHeight * calculateScale()}px`,
                        }}
                      >
                        {isPageVisible ? (
                          <>
                            <Page
                              key={`page_${pageNumber}_${calculateScale()}`}
                              pageNumber={pageNumber}
                              scale={calculateScale()}
                              renderTextLayer={true}
                              renderAnnotationLayer={true}
                              className='pdf-page shadow-lg border'
                              onLoadSuccess={(page) => {
                                handlePageLoad(pageNumber, page.height);
                              }}
                            />

                            {/* Comment System Overlay */}
                            {pdfId && currentUser && (
                              <CommentSystem
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
                                onToolChange={(tool) =>
                                  setActiveTool(tool as ToolType)
                                }
                                onTextSelect={handleTextSelect}
                              />
                            )}

                            {/* Highlight Overlay */}
                            {getHighlightsForPage(pageNumber).map(
                              (highlight) => (
                                <div key={String(highlight.id)}>
                                  {Array.isArray(highlight.rects) &&
                                    highlight.rects.map(
                                      (rect: any, rectIndex: number) => (
                                        <div
                                          key={`${highlight.id}-${rectIndex}`}
                                          className='absolute pointer-events-none'
                                          style={{
                                            left: `${rect.x}%`,
                                            top: `${rect.y}%`,
                                            width: `${rect.width}%`,
                                            height: `${rect.height}%`,
                                            backgroundColor: String(
                                              highlight.color
                                            ),
                                            opacity: 0.5,
                                            mixBlendMode: 'multiply',
                                            borderRadius: '1px',
                                            zIndex: 0,
                                          }}
                                          title={String(highlight.text)}
                                        />
                                      )
                                    )}
                                </div>
                              )
                            )}
                          </>
                        ) : (
                          <div
                            className='flex items-center justify-center bg-gray-50 border rounded shadow-lg'
                            style={{
                              height: `${pageHeight * calculateScale()}px`,
                            }}
                          >
                            <p className='text-gray-400'>Page {pageNumber}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </Document>
            </div>
          )}
        </div>
      </div>

      <FigmaToolbar activeTool={activeTool} onToolChange={setActiveTool} />

      <HighlightColorPicker
        x={selectionDialog.x}
        y={selectionDialog.y}
        visible={selectionDialog.visible}
        selectedText={selectionDialog.text}
        onHighlight={handleHighlight}
        onAskReadly={handleAskReadlyFromDialog}
        onClose={() => {
          setCurrentSelectionData(null);
          setSelectionDialog({ x: 0, y: 0, text: '', visible: false });
        }}
      />
    </div>
  );
}
