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
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs`;
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
  selectedText, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  const [isInitialLoad, setIsInitialLoad] = useState(true); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isMousePressed, setIsMousePressed] = useState(false);

  // PDF document reference for programmatic navigation
  const pdfDocumentRef = useRef<boolean>(null);

  // Figma toolbar state
  const [activeTool, setActiveTool] = useState<ToolType>('move');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Helper function to consolidate overlapping rectangles
  const consolidateRects = (rects: DOMRect[]): DOMRect[] => {
    if (rects.length === 0) return [];

    // First pass: Filter out obviously invalid rectangles
    const filteredRects = rects.filter((rect) => {
      // Remove zero/negative size rectangles
      if (rect.width <= 0 || rect.height <= 0) return false;

      // Remove extremely large rectangles (likely invalid)
      if (rect.width > window.innerWidth || rect.height > window.innerHeight)
        return false;

      // Remove rectangles with invalid coordinates
      if (rect.left < -1000 || rect.top < -1000) return false;

      return true;
    });

    console.log(
      `  Pre-filtered ${rects.length} rects down to ${filteredRects.length} potentially valid rects`
    );

    // Sort rects by position (top-left to bottom-right)
    const sortedRects = [...filteredRects].sort((a, b) => {
      if (Math.abs(a.top - b.top) < 5) {
        // Same line
        return a.left - b.left;
      }
      return a.top - b.top;
    });

    const consolidated: DOMRect[] = [];
    let current = sortedRects[0];

    for (let i = 1; i < sortedRects.length; i++) {
      const rect = sortedRects[i];

      // Check if rectangles are close enough to merge (same line, close horizontally)
      const sameLineThreshold = 5; // pixels
      const horizontalGapThreshold = 10; // pixels

      const onSameLine = Math.abs(current.top - rect.top) <= sameLineThreshold;
      const closeHorizontally =
        rect.left - (current.left + current.width) <= horizontalGapThreshold;
      const similarHeight = Math.abs(current.height - rect.height) <= 5;

      if (onSameLine && closeHorizontally && similarHeight) {
        // Merge rectangles
        const newWidth = rect.left + rect.width - current.left;
        current = new DOMRect(
          current.left,
          current.top,
          newWidth,
          current.height
        );
      } else {
        // Start new rectangle
        consolidated.push(current);
        current = rect;
      }
    }

    consolidated.push(current);
    return consolidated;
  };

  const handleHighlight = useCallback(
    async (color: string, text: string) => {
      console.log('handleHighlight called with:', {
        color,
        text,
        pdfId,
        hasSelectionData: !!currentSelectionData,
      });

      if (!pdfId || !currentSelectionData) {
        console.log('Early return: missing pdfId or currentSelectionData', {
          pdfId,
          currentSelectionData,
        });
        return;
      }

      const selectionData = currentSelectionData;

      console.log('Selection data:', {
        text: selectionData.text,
        rectsLength: selectionData.rects.length,
        hasRange: !!selectionData.range,
        hasPageContainer: !!selectionData.pageContainer,
      });

      // Smart cross-page detection: find which page each rectangle belongs to
      const rectsByPage = new Map<
        number,
        { rects: DOMRect[]; pageElement: Element }
      >();

      // Get all page elements currently visible
      const allPageElements = Array.from(
        document.querySelectorAll('[data-page-number]')
      );
      console.log('Found page elements:', allPageElements.length);

      for (let i = 0; i < selectionData.rects.length; i++) {
        const rect = selectionData.rects[i];
        if (rect.width > 0 && rect.height > 0) {
          // Find which page this rect belongs to by checking overlap with page boundaries
          let bestMatch = null;
          let bestOverlap = 0;

          for (const pageElement of allPageElements) {
            const pageRect = pageElement.getBoundingClientRect();

            // Calculate overlap between selection rect and page rect
            const overlapLeft = Math.max(rect.left, pageRect.left);
            const overlapRight = Math.min(rect.right, pageRect.right);
            const overlapTop = Math.max(rect.top, pageRect.top);
            const overlapBottom = Math.min(rect.bottom, pageRect.bottom);

            if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
              const overlapArea =
                (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
              const rectArea = rect.width * rect.height;
              const overlapPercentage = overlapArea / rectArea;

              if (overlapPercentage > bestOverlap) {
                bestOverlap = overlapPercentage;
                bestMatch = pageElement;
              }
            }
          }

          if (bestMatch && bestOverlap > 0.1) {
            // At least 10% overlap
            const pageNumber = parseInt(
              bestMatch.getAttribute('data-page-number') || '1'
            );
            console.log(
              `Rect ${i} assigned to page ${pageNumber} (overlap: ${(
                bestOverlap * 100
              ).toFixed(1)}%)`
            );

            if (!rectsByPage.has(pageNumber)) {
              rectsByPage.set(pageNumber, {
                rects: [],
                pageElement: bestMatch,
              });
            }
            rectsByPage.get(pageNumber)!.rects.push(rect);
          } else {
            console.log(`Rect ${i} could not be assigned to any page`);
          }
        }
      }

      console.log(
        'Rects by page:',
        Array.from(rectsByPage.entries()).map(([pageNum, data]) => ({
          pageNumber: pageNum,
          rectsCount: data.rects.length,
          hasPageElement: !!data.pageElement,
        }))
      );

      // Create highlights for each page
      const highlights: Array<{
        id: string;
        pdfId: string;
        text: string;
        color: string;
        rects: Array<{ x: number; y: number; width: number; height: number }>;
        pageNumber: number;
      }> = [];

      console.log(
        'About to process',
        rectsByPage.size,
        'pages for highlighting'
      );

      for (const [pageNumber, { rects, pageElement }] of rectsByPage) {
        // Try to find the actual PDF canvas within the page element for more accurate coordinates
        const pdfCanvas = pageElement.querySelector('canvas') || pageElement;
        const pageRect = pdfCanvas.getBoundingClientRect();
        const highlightRects = [];

        console.log(`Processing page ${pageNumber}:`, {
          pageElementType: pageElement.tagName,
          usingCanvas: pdfCanvas !== pageElement,
          pageRect: {
            x: pageRect.left,
            y: pageRect.top,
            width: pageRect.width,
            height: pageRect.height,
          },
          rectsCount: rects.length,
        });

        // Consolidate overlapping rectangles to reduce rectangle count and avoid coverage issues
        const consolidatedRects = consolidateRects(rects);
        console.log(
          `  Consolidated ${rects.length} rects into ${consolidatedRects.length} rects`
        );

        // Filter out invalid rectangles that are too large (likely covering entire page)
        const maxReasonableWidth = pageRect.width * 0.8; // Max 80% of page width
        const maxReasonableHeight = pageRect.height * 0.3; // Max 30% of page height
        const minReasonableSize = 5; // Minimum 5px

        const validRects = consolidatedRects.filter((rect) => {
          // Check size limits
          const sizeValid =
            rect.width > minReasonableSize &&
            rect.height > minReasonableSize &&
            rect.width < maxReasonableWidth &&
            rect.height < maxReasonableHeight;

          // Check if rectangle is within page boundaries
          const boundsValid =
            rect.left >= pageRect.left - 10 &&
            rect.top >= pageRect.top - 10 &&
            rect.right <= pageRect.right + 10 &&
            rect.bottom <= pageRect.bottom + 10;

          return sizeValid && boundsValid;
        });

        console.log(
          `  Filtered ${consolidatedRects.length} rects down to ${validRects.length} valid rects`
        );

        for (const rect of validRects) {
          const relativeX =
            ((rect.left - pageRect.left) / pageRect.width) * 100;
          const relativeY = ((rect.top - pageRect.top) / pageRect.height) * 100;
          const relativeWidth = (rect.width / pageRect.width) * 100;
          const relativeHeight = (rect.height / pageRect.height) * 100;

          // Strict validation: reject rectangles with invalid coordinates
          if (
            relativeX < -5 ||
            relativeX > 105 ||
            relativeY < -5 ||
            relativeY > 105 ||
            relativeWidth <= 0 ||
            relativeWidth > 105 ||
            relativeHeight <= 0 ||
            relativeHeight > 105
          ) {
            console.warn(`  Skipping invalid rect:`, {
              relativeX,
              relativeY,
              relativeWidth,
              relativeHeight,
            });
            continue;
          }

          // Also skip tiny rectangles that might be artifacts
          if (relativeWidth < 0.1 || relativeHeight < 0.1) {
            continue;
          }

          highlightRects.push({
            x: relativeX,
            y: relativeY,
            width: relativeWidth,
            height: relativeHeight,
          });
        }

        console.log(`  Final highlight rects: ${highlightRects.length}`);

        const highlight = {
          id: `highlight_${Date.now()}_page_${pageNumber}`,
          pdfId,
          text: selectionData.text,
          color,
          rects: highlightRects,
          pageNumber: pageNumber,
        };

        highlights.push(highlight);
      }

      console.log('Created highlights:', highlights.length, highlights);

      // Add all highlights to state
      setHighlights((prev) => [...prev, ...highlights]);

      // Save all highlights to database
      try {
        console.log('Saving highlights to database...');
        for (const highlight of highlights) {
          console.log('Saving highlight:', highlight);
          const response = await fetch('/api/highlights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(highlight),
          });
          console.log('Highlight save response:', response.status, response.ok);
        }
        console.log('All highlights saved successfully');
      } catch (error) {
        console.error('Failed to save highlight:', error);
        // Remove all highlights if save failed
        const highlightIds = highlights.map((h) => h.id);
        setHighlights((prev) =>
          prev.filter((h) => !highlightIds.includes(String(h.id)))
        );
      }
    },
    [pdfId, currentSelectionData]
  );

  const getHighlightsForPage = useCallback(
    (pageNumber: number) => {
      return highlights.filter(
        (highlight) => highlight.pageNumber === pageNumber
      );
    },
    [highlights]
  );

  // Auto-extract text in background
  const autoExtractTextInBackground = useCallback(
    async (pdfId: string, numPages: number) => {
      try {
        // First check if already extracted
        const checkResponse = await fetch(`/api/pdf/${pdfId}/extract`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.textExtracted) {
            return; // Already extracted
          }
        }

        // Get PDF document for text extraction
        const reactPdf = await import('react-pdf');
        const pdfjs = reactPdf.pdfjs;

        if (!pdfFile) return;

        const loadingTask = pdfjs.getDocument(pdfFile);
        const pdfDocument = await loadingTask.promise;

        // Extract text from all pages
        const pages: Array<{ pageNumber: number; content: string }> = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
              .map((item) => ('str' in item ? item.str : '') || '')
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();

            if (pageText) {
              pages.push({
                pageNumber: pageNum,
                content: pageText,
              });
            }
          } catch (pageError) {
            console.error(
              `Error extracting text from page ${pageNum}:`,
              pageError
            );
          }
        }

        // Send to extraction API
        if (pages.length > 0) {
          const response = await fetch(`/api/pdf/${pdfId}/extract`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pages }),
          });

          if (response.ok) {
            console.log('PDF text extracted successfully in background');
          }
        }
      } catch (error) {
        console.error('Background text extraction failed:', error);
      }
    },
    [pdfFile]
  );

  // Handle citation clicks - navigate to specific page
  const handleCitationClick = useCallback(
    (targetPage: number) => {
      if (!numPages || targetPage < 1 || targetPage > numPages) return;

      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      // Scroll to the target page within the container
      const targetElement = scrollContainer.querySelector(
        `[data-page-number="${targetPage}"]`
      );

      if (targetElement) {
        // Calculate scroll position relative to container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const scrollTop =
          scrollContainer.scrollTop + elementRect.top - containerRect.top - 20; // 20px offset from top

        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
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
          const element = scrollContainer.querySelector(
            `[data-page-number="${targetPage}"]`
          );
          if (element) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop =
              scrollContainer.scrollTop +
              elementRect.top -
              containerRect.top -
              20;

            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth',
            });
          }
        }, 200); // Increased timeout to ensure page renders
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

    // Skip internal PDF citations - let onItemClick handle them
    // Internal citations often have href like "#page=12" or similar
    if (
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.includes('page=')
    ) {
      return; // Let onItemClick handle internal navigation
    }

    try {
      const currentDomain = window.location.hostname;
      const url = new URL(href, window.location.origin);

      if (url.hostname !== currentDomain) {
        event.preventDefault();
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      // If URL parsing fails, it might be an internal link - don't handle it
      console.log('Link parsing error (likely internal link):', error);
    }
  }, []);

  // Add PDF text layer link handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Handle clicks on PDF text layer links
    const handlePDFLinkClick = (e: Event) => {
      handleLinkClick(e);
    };

    // Handle clicks on empty areas to deselect text
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicking on empty page area (not on text elements, comments, etc.)
      if (
        target.closest('.text-element') || // Don't deselect if clicking on text elements
        target.closest('.comment-marker') || // Don't deselect if clicking on comments
        target.closest('a') || // Don't deselect if clicking on links
        target.closest('button') || // Don't deselect if clicking on buttons
        target.closest('select') || // Don't deselect if clicking on selects
        target.closest('input') // Don't deselect if clicking on inputs
      ) {
        return;
      }

      // Deselect text when clicking on empty areas
      if (selectedTextId) {
        setSelectedTextId(null);
        setSelectedTextElement(null);
      }
    };

    // Handle text selection for highlighting and Ask Readly (from old implementation)
    let timeoutId: NodeJS.Timeout;

    const showSelectionDialog = (forceShow = false) => {
      try {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setSelectionDialog((prev) =>
            prev.visible ? { ...prev, visible: false } : prev
          );
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 2) {
          setSelectionDialog((prev) =>
            prev.visible ? { ...prev, visible: false } : prev
          );
          return;
        }

        const range = selection.getRangeAt(0);

        // Check if selection is within PDF text content
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        const startPage =
          startContainer.nodeType === Node.TEXT_NODE
            ? startContainer.parentElement?.closest(
                '.react-pdf__Page__textContent'
              )
            : (startContainer as Element)?.closest(
                '.react-pdf__Page__textContent'
              );

        const endPage =
          endContainer.nodeType === Node.TEXT_NODE
            ? endContainer.parentElement?.closest(
                '.react-pdf__Page__textContent'
              )
            : (endContainer as Element)?.closest(
                '.react-pdf__Page__textContent'
              );

        if (
          startPage &&
          endPage &&
          containerRef.current &&
          containerRef.current.contains(range.commonAncestorContainer)
        ) {
          // Show dialog if mouse is not pressed OR if forced (after mouseup)
          if (!isMousePressed || forceShow) {
            const rects = range.getClientRects();
            if (rects.length > 0) {
              const firstRect = rects[0];
              const lastRect = rects[rects.length - 1];

              // Store selection data for use when highlighting
              // For cross-page selections, use the startPage as primary container
              const primaryPage = startPage;
              setCurrentSelectionData({
                text: selectedText,
                range: range.cloneRange(), // Clone the range to preserve it
                pageContainer: primaryPage,
                pageRect: primaryPage.getBoundingClientRect(),
                rects: range.getClientRects(),
              });

              setSelectionDialog({
                x: firstRect.left + (lastRect.right - firstRect.left) / 2,
                y: firstRect.top - 10,
                text: selectedText,
                visible: true,
              });
            }
          }
        } else {
          setSelectionDialog((prev) =>
            prev.visible ? { ...prev, visible: false } : prev
          );
        }
      } catch (error) {
        console.error('Selection error:', error);
        setSelectionDialog((prev) =>
          prev.visible ? { ...prev, visible: false } : prev
        );
      }
    };

    // Handle mouse events for text selection (from old implementation)
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;

      // Don't interfere with dialog clicks - check for any dialog-related elements
      if (
        target.closest('.highlight-color-picker') ||
        target.closest('button[title*="Highlight"]') ||
        target.closest('button[class*="bg-yellow"]') ||
        target.closest('button[class*="bg-green"]') ||
        target.closest('button[class*="bg-blue"]') ||
        target.closest('button[class*="bg-pink"]') ||
        target.closest('button[class*="bg-purple"]')
      ) {
        return;
      }

      if (containerRef.current && containerRef.current.contains(target)) {
        setIsMousePressed(true);
        setSelectionDialog((prev) =>
          prev.visible ? { ...prev, visible: false } : prev
        );
      }
    };

    const handleMouseUp = () => {
      if (isMousePressed) {
        setIsMousePressed(false);
        // Force show dialog after mouse up regardless of state
        setTimeout(() => {
          showSelectionDialog(true); // Force show
        }, 100);
      }
    };

    const handleSelection = () => {
      clearTimeout(timeoutId);
      // Don't show dialog immediately on selection change, wait for mouse up
      if (!isMousePressed) {
        timeoutId = setTimeout(showSelectionDialog, 100);
      }
    };

    // Add PDF-specific event listeners
    container.addEventListener('click', handlePDFLinkClick);
    container.addEventListener('click', handleContainerClick);

    // Add document-level event listeners for text selection
    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('click', handlePDFLinkClick);
      container.removeEventListener('click', handleContainerClick);
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleLinkClick, pdfFile, isMousePressed, selectedTextId]); // Re-attach when PDF changes

  // Clear selection when clicking elsewhere (from old implementation)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't close dialog if clicking on the dialog itself or color buttons
      if (
        selectionDialog.visible &&
        !target.closest('.highlight-color-picker') &&
        !target.closest('button[title*="Highlight"]')
      ) {
        setSelectionDialog((prev) => ({ ...prev, visible: false }));
        setCurrentSelectionData(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionDialog.visible]);

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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const documentWithFullscreen = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };

      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        documentWithFullscreen.webkitFullscreenElement ||
        documentWithFullscreen.mozFullScreenElement ||
        documentWithFullscreen.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange
      );
      document.removeEventListener(
        'mozfullscreenchange',
        handleFullscreenChange
      );
      document.removeEventListener(
        'MSFullscreenChange',
        handleFullscreenChange
      );
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const pageRefsMap = pageRefs.current;
    return () => {
      setSelectionDialog({ x: 0, y: 0, text: '', visible: false });
      setError(null);
      pageRefsMap.clear();
    };
  }, []);

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

      // Auto-extract text in background if not already done
      if (pdfId) {
        autoExtractTextInBackground(pdfId, numPages);
      }
    },
    [pdfId, autoExtractTextInBackground]
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
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  }, [scale, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.5, scale - 0.1);
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
  }, [scale, onScaleChange]);

  const handleZoomReset = useCallback(() => {
    const resetScale = 1.0;
    if (onScaleChange) {
      onScaleChange(resetScale);
    } else {
      setInternalScale(resetScale);
    }
  }, [onScaleChange]);

  const handleTextSelect = useCallback(
    (textId: string | null, textElement?: TextElement) => {
      setSelectedTextId(textId);
      setSelectedTextElement(textElement || null);
    },
    []
  );

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (!isFullscreen) {
        // Enter fullscreen on the entire document
        const documentElement = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };

        if (documentElement.requestFullscreen) {
          await documentElement.requestFullscreen();
        } else if (documentElement.webkitRequestFullscreen) {
          await documentElement.webkitRequestFullscreen();
        } else if (documentElement.mozRequestFullScreen) {
          await documentElement.mozRequestFullScreen();
        } else if (documentElement.msRequestFullscreen) {
          await documentElement.msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        const documentWithFullscreen = document as Document & {
          webkitExitFullscreen?: () => Promise<void>;
          mozCancelFullScreen?: () => Promise<void>;
          msExitFullscreen?: () => Promise<void>;
        };

        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (documentWithFullscreen.webkitExitFullscreen) {
          await documentWithFullscreen.webkitExitFullscreen();
        } else if (documentWithFullscreen.mozCancelFullScreen) {
          await documentWithFullscreen.mozCancelFullScreen();
        } else if (documentWithFullscreen.msExitFullscreen) {
          await documentWithFullscreen.msExitFullscreen();
        }
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, [isFullscreen]);

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

              {/* Text Alignment Options */}
              <div className='flex gap-1'>
                <button
                  onClick={() => handleTextFormat({ textAlign: 'left' })}
                  className={`p-1 rounded ${
                    selectedTextElement.textAlign === 'left'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--faded-white)] hover:bg-[var(--border)]'
                  } transition-colors`}
                  title='Align Left'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <line x1='17' y1='6' x2='3' y2='6'></line>
                    <line x1='21' y1='12' x2='3' y2='12'></line>
                    <line x1='17' y1='18' x2='3' y2='18'></line>
                  </svg>
                </button>
                <button
                  onClick={() => handleTextFormat({ textAlign: 'center' })}
                  className={`p-1 rounded ${
                    selectedTextElement.textAlign === 'center'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--faded-white)] hover:bg-[var(--border)]'
                  } transition-colors`}
                  title='Align Center'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <line x1='18' y1='6' x2='6' y2='6'></line>
                    <line x1='21' y1='12' x2='3' y2='12'></line>
                    <line x1='18' y1='18' x2='6' y2='18'></line>
                  </svg>
                </button>
                <button
                  onClick={() => handleTextFormat({ textAlign: 'right' })}
                  className={`p-1 rounded ${
                    selectedTextElement.textAlign === 'right'
                      ? 'bg-[var(--accent)] text-white'
                      : 'bg-[var(--faded-white)] hover:bg-[var(--border)]'
                  } transition-colors`}
                  title='Align Right'
                >
                  <svg
                    className='w-4 h-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <line x1='21' y1='6' x2='7' y2='6'></line>
                    <line x1='21' y1='12' x2='3' y2='12'></line>
                    <line x1='21' y1='18' x2='7' y2='18'></line>
                  </svg>
                </button>
              </div>

              {/* Deselect Button */}
              <button
                onClick={() => {
                  setSelectedTextId(null);
                  setSelectedTextElement(null);
                }}
                className='p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors'
                title='Deselect Text'
              >
                <svg
                  className='w-4 h-4'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <line x1='18' y1='6' x2='6' y2='18'></line>
                  <line x1='6' y1='6' x2='18' y2='18'></line>
                </svg>
              </button>
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
                onItemClick={({ pageNumber, dest }) => {
                  // Handle internal page navigation
                  if (pageNumber) {
                    handleCitationClick(pageNumber);
                    return;
                  }

                  // Handle destination-based navigation (some PDFs use destinations instead of page numbers)
                  if (
                    dest &&
                    typeof dest === 'object' &&
                    'pageNumber' in dest
                  ) {
                    const pageNum = dest.pageNumber;
                    if (typeof pageNum === 'number') {
                      handleCitationClick(pageNum);
                    }
                  }
                }}
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
                        className='relative mb-4'
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
                                      (
                                        rect: {
                                          x: number;
                                          y: number;
                                          width: number;
                                          height: number;
                                        },
                                        rectIndex: number
                                      ) => (
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

      <FigmaToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onFullscreenToggle={handleFullscreenToggle}
        isFullscreen={isFullscreen}
      />

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
