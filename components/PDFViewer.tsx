'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

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

  // Import CSS files
  import('react-pdf/dist/Page/AnnotationLayer.css');
  import('react-pdf/dist/Page/TextLayer.css');
}

interface PDFViewerProps {
  pdfId: string | null;
  onTextSelect: (text: string) => void;
  selectedText: string;
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
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
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

  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF file based on pdfId
  useEffect(() => {
    if (pdfId) {
      try {
        // Try to load from localStorage first
        const storedPdf = localStorage.getItem(`pdf_${pdfId}`);
        if (storedPdf) {
          setPdfFile(storedPdf);
          setCurrentPage(1);
          setError(null);
        } else {
          // Fallback to sample PDF for demo
          setPdfFile('/sample.pdf');
          setCurrentPage(1);
          setError(null);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError('Failed to load PDF file');
      }
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
            return;
          }

          const selectedText = selection.toString().trim();
          if (!selectedText || selectedText.length < 3) {
            setSelectionDialog((prev) => ({ ...prev, visible: false }));
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
          }
        } catch (error) {
          console.error('Selection error:', error);
          setSelectionDialog((prev) => ({ ...prev, visible: false }));
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

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setCurrentPage(1);
      setIsLoading(false);
      setError(null);
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

    // Clear the current selection
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }
  }, [selectionDialog.text, onTextSelect]);

  const calculateScale = useCallback(() => {
    const maxWidth = containerWidth - 64; // Account for padding
    const baseScale = Math.min(scale, maxWidth / 600); // Assume 600px base width
    return Math.max(baseScale, 0.5); // Minimum scale
  }, [scale, containerWidth]);

  const changePage = useCallback(
    (offset: number) => {
      setCurrentPage((prevPage) => {
        const newPage = prevPage + offset;
        return Math.max(1, Math.min(newPage, numPages || 1));
      });
    },
    [numPages]
  );

  // Debounced zoom functions to prevent crashes
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(3, prev + 0.1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(0.5, prev - 0.1));
  }, []);

  // Memoize options to prevent unnecessary reloads
  const pdfOptions = useMemo(
    () => ({
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
      standardFontDataUrl:
        'https://unpkg.com/pdfjs-dist@4.0.379/standard_fonts/',
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
      {/* PDF Controls */}
      <div className='flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card-background)]'>
        <div className='flex items-center gap-4'>
          {/* Page Navigation */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => changePage(-1)}
              disabled={currentPage <= 1}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M15 18l-6-6 6-6' />
              </svg>
            </button>

            <span className='text-sm text-[var(--text-primary)] min-w-[80px] text-center'>
              {numPages ? `${currentPage} / ${numPages}` : 'Loading...'}
            </span>

            <button
              onClick={() => changePage(1)}
              disabled={currentPage >= (numPages || 1)}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>
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

          <span className='text-sm text-[var(--text-primary)] min-w-[50px] text-center'>
            {Math.round(calculateScale() * 100)}%
          </span>

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

      {/* PDF Document */}
      <div className='flex-1 overflow-auto p-4'>
        {pdfFile && (
          <div className='flex justify-center'>
            <Document
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
                  <p className='text-[var(--text-muted)]'>Failed to load PDF</p>
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
              {numPages && (
                <Page
                  key={`page_${currentPage}_${calculateScale()}`}
                  pageNumber={currentPage}
                  scale={calculateScale()}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className='pdf-page shadow-lg border mx-auto'
                  loading={
                    <div className='text-center py-4'>
                      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)] mx-auto'></div>
                    </div>
                  }
                  error={
                    <div className='text-center py-4'>
                      <p className='text-[var(--text-muted)] text-sm'>
                        Failed to load page
                      </p>
                    </div>
                  }
                />
              )}
            </Document>
          </div>
        )}
      </div>

      {/* Text Selection Dialog */}
      {selectionDialog.visible && (
        <div
          className='fixed z-50 transform -translate-x-1/2 -translate-y-full'
          style={{
            left: selectionDialog.x,
            top: selectionDialog.y,
          }}
        >
          <div className='bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg p-2'>
            <button
              onClick={handleAskReadly}
              className='bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2'
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
              Ask Readly
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
