'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import FigmaToolbar, { ToolType } from './FigmaToolbar';
import CommentSystem from './CommentSystem';
import TextSystem, { TextElement } from './TextSystem';
import HighlightColorPicker from './HighlightColorPicker';
import PenTool from './PenTool';
import PenToolbar from './PenToolbar';
import MindMap from './MindMap';
import FlashCards from './FlashCards';
import MCQs from './MCQs';
import ImageAnalyser from './ImageAnalyser';
import ShapeTool from './ShapeTool';
import ShapeToolbar from './ShapeToolbar';
import { usePDFData } from '@/hooks/usePDFData';
import { useShapes } from '@/hooks/useShapes';
import { usePenDrawings } from '@/hooks/usePenDrawings';

// Dynamically import PDF components
const Document = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Document })),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => ({ default: mod.Page })),
  { ssr: false }
);

// Configure PDF.js worker - use the same version as pdfjs-dist package
if (typeof window !== 'undefined') {
  import('react-pdf').then((pdfjs) => {
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.3.31/pdf.worker.min.mjs`;
  });
}

interface PDFViewerProps {
  pdfId: string | null;
  onTextSelect: (text: string) => void;
  onImageAnalyse?: (imageDataUrl: string) => void;
  selectedText: string;
  scale?: number;
  onScaleChange?: (scale: number) => void;
  currentUser?: {
    id: string;
    name: string;
    image?: string;
  };
  onNavigateToPageRef?: React.MutableRefObject<
    ((pageNumber: number) => void) | null
  >;
}

interface TextSelectionDialog {
  x: number;
  y: number;
  text: string;
  visible: boolean;
}

// Virtualization constants
const PAGE_BUFFER = 3; // Number of pages to render before and after visible pages

export default function PDFViewer({
  pdfId,
  onTextSelect,
  onImageAnalyse,
  selectedText, // eslint-disable-line @typescript-eslint/no-unused-vars
  scale: externalScale,
  onScaleChange,
  currentUser,
  onNavigateToPageRef,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [internalScale, setInternalScale] = useState(1.2);
  const scale = externalScale || internalScale;
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
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
  const [pageDimensions, setPageDimensions] = useState<
    Map<number, { width: number; height: number }>
  >(new Map());
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

  // Mind Map state
  const [showMindMap, setShowMindMap] = useState(false);

  // Flash Cards state
  const [showFlashCards, setShowFlashCards] = useState(false);

  // MCQs state
  const [showMCQs, setShowMCQs] = useState(false);

  // Background audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // PDF Search functionality
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{
      pageNumber: number;
      wordIndex: number;
      word: string;
      rect: { x: number; y: number; width: number; height: number };
      globalIndex: number;
    }>
  >([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHighlights, setSearchHighlights] = useState<
    Map<
      number,
      Array<{
        id: string;
        text: string;
        rects: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
          isCurrentResult?: boolean;
        }>;
      }>
    >
  >(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Shapes management
  const { getShapesForPage, addShape, updateShape, deleteShape } =
    useShapes(pdfId);

  // Pen drawings management
  const { getDrawingsForPage, saveDrawingsForPage, updateDrawingsForPage } =
    usePenDrawings(pdfId);

  // Shape tool state
  const [shapeColor, setShapeColor] = useState('#000000');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2);

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

    // console.log(
    //   `  Pre-filtered ${rects.length} rects down to ${filteredRects.length} potentially valid rects`
    // );

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

  const handleImageAnalyse = useCallback(
    (imageDataUrl: string) => {
      if (onImageAnalyse) {
        onImageAnalyse(imageDataUrl);
      }
    },
    [onImageAnalyse]
  );

  const handleImageHighlight = useCallback(
    async (
      color: string,
      area: { x: number; y: number; width: number; height: number },
      pageNumber: number
    ) => {
      if (!pdfId) return;

      // Create a rectangle highlight for the selected area
      const highlight = {
        id: `image_highlight_${Date.now()}_page_${pageNumber}`,
        pdfId,
        text: 'Image selection',
        color,
        rects: [area],
        pageNumber,
      };

      // Add to highlights state
      setHighlights((prev) => [...prev, highlight]);

      // Save to database
      try {
        await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(highlight),
        });
      } catch (error) {
        console.error('Failed to save image highlight:', error);
        setHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
      }
    },
    [pdfId]
  );

  const handleHighlight = useCallback(
    async (color: string, text: string) => {
      // console.log('handleHighlight called with:', {
      //   color,
      //   text,
      //   pdfId,
      //   hasSelectionData: !!currentSelectionData,
      // });

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

  // Pre-calculate all page dimensions using getViewport()
  const preCalculatePageDimensions = useCallback(
    async (
      pdfDocument: {
        getPage: (pageNum: number) => Promise<{
          getViewport: (options: { scale: number }) => {
            width: number;
            height: number;
          };
        }>;
      },
      numPages: number,
      scale: number
    ) => {
      console.log(
        '🔍 Pre-calculating base page dimensions for',
        numPages,
        'pages at scale',
        scale,
        '(base dimensions will be scaled at render time)'
      );
      const dimensionsMap = new Map<
        number,
        { width: number; height: number }
      >();

      try {
        // Calculate dimensions for all pages in parallel for better performance
        const dimensionPromises = [];
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          dimensionPromises.push(
            (async () => {
              try {
                const page = await pdfDocument.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                return {
                  pageNumber: pageNum,
                  width: viewport.width,
                  height: viewport.height,
                };
              } catch (error) {
                console.error(
                  `Error getting viewport for page ${pageNum}:`,
                  error
                );
                // Fallback to reasonable dimensions if page fails
                return {
                  pageNumber: pageNum,
                  width: 595, // A4 width at base scale
                  height: 842, // A4 height at base scale
                };
              }
            })()
          );
        }

        const results = await Promise.all(dimensionPromises);
        results.forEach(({ pageNumber, width, height }) => {
          dimensionsMap.set(pageNumber, { width, height });
        });

        console.log(
          '✅ Pre-calculated dimensions for',
          dimensionsMap.size,
          'pages'
        );
        setPageDimensions(dimensionsMap);

        // Also update pageHeights for backward compatibility
        const heightsMap = new Map<number, number>();
        dimensionsMap.forEach((dims, pageNum) => {
          heightsMap.set(pageNum, dims.height);
        });
        setPageHeights(heightsMap);
      } catch (error) {
        console.error('Error pre-calculating page dimensions:', error);
        // Fallback: use default base dimensions
        const fallbackDimensions = new Map<
          number,
          { width: number; height: number }
        >();
        const fallbackHeights = new Map<number, number>();
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          fallbackDimensions.set(pageNum, { width: 595, height: 842 }); // A4 at base scale
          fallbackHeights.set(pageNum, 842);
        }
        setPageDimensions(fallbackDimensions);
        setPageHeights(fallbackHeights);
      }
    },
    []
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
        const allPages: Array<{ pageNumber: number; content: string }> = [];

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
              allPages.push({
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

        // Check if this needs server-side extraction based on payload size or URL type
        if (allPages.length > 0) {
          // Check if this is an external URL upload (not S3 URLs)
          const isUrlUpload =
            pdfFile &&
            !pdfFile.includes('amazonaws.com') &&
            !pdfFile.includes('s3.');

          // Calculate total payload size for all pages
          const totalPayloadSize = allPages.reduce(
            (size, page) => size + JSON.stringify(page).length,
            0
          );
          const payloadSizeKB = (totalPayloadSize / 1024).toFixed(2);
          const isLargePayload = totalPayloadSize > 100 * 1024; // >100KB

          if (isUrlUpload || isLargePayload) {
            const reason = isUrlUpload
              ? 'External URL upload'
              : `Large payload (${payloadSizeKB} KB)`;
            console.log(
              '🎯 DETECTED LARGE/URL UPLOAD - Using server-side extraction'
            );
            console.log('   📄 PDF ID:', pdfId);
            console.log('   🔗 PDF URL:', pdfFile);
            console.log('   📊 Reason:', reason);
            console.log('   💾 Payload size:', `${payloadSizeKB} KB`);
            console.log('   🚀 Switching to server-side extraction method');

            // Use server-side extraction for URL uploads or large payloads
            const serverResponse = await fetch('/api/pdf/extract-from-url', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pdfId: pdfId,
                pages: allPages,
              }),
            });

            if (!serverResponse.ok) {
              throw new Error(
                `Server-side extraction failed: ${serverResponse.status}`
              );
            }

            const result = await serverResponse.json();
            console.log('✅ SERVER-SIDE TEXT EXTRACTION COMPLETED');
            console.log('   🎯 Method:', result.method);
            console.log('   📊 Pages processed:', result.pagesProcessed);
            console.log('   🔢 Chunks created:', result.chunksCreated);

            return;
          }
        }

        // Fall back to client-side extraction for small direct uploads
        console.log(
          '📁 DETECTED SMALL DIRECT UPLOAD - Using client-side extraction'
        );
        console.log('   📄 PDF ID:', pdfId);
        console.log('   🔗 S3 URL:', pdfFile);

        // Send pages in batches to avoid payload size limits (for small direct uploads only)
        if (allPages.length > 0) {
          // Smart batching: 100 pages for PDFs with 100+ pages, all pages if less than 100
          const BATCH_SIZE = allPages.length <= 100 ? allPages.length : 100;
          const totalBatches = Math.ceil(allPages.length / BATCH_SIZE);

          console.log(
            `Processing ${allPages.length} pages in ${totalBatches} batch(es) (${BATCH_SIZE} pages per batch, client-side)`
          );

          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * BATCH_SIZE;
            const endIndex = Math.min(startIndex + BATCH_SIZE, allPages.length);
            const batchPages = allPages.slice(startIndex, endIndex);

            // Calculate payload size for debugging
            const payload = {
              pages: batchPages,
              batchInfo: {
                batchIndex: batchIndex,
                totalBatches: totalBatches,
                isLastBatch: batchIndex === totalBatches - 1,
              },
            };
            const payloadString = JSON.stringify(payload);
            const payloadSizeKB = (payloadString.length / 1024).toFixed(2);
            const payloadSizeMB = (
              payloadString.length /
              (1024 * 1024)
            ).toFixed(2);

            console.log(`🚀 Sending batch ${batchIndex + 1}/${totalBatches}`);
            console.log(
              `   📄 Pages: ${batchPages[0].pageNumber}-${
                batchPages[batchPages.length - 1].pageNumber
              } (${batchPages.length} pages)`
            );
            console.log(
              `   📊 Payload size: ${payloadSizeKB} KB (${payloadSizeMB} MB)`
            );
            console.log(
              `   📝 Total characters in batch: ${batchPages.reduce(
                (sum, page) => sum + page.content.length,
                0
              )}`
            );

            const response = await fetch(`/api/pdf/${pdfId}/extract`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: payloadString,
            });

            if (!response.ok) {
              console.error(
                `❌ Batch ${batchIndex + 1} failed with status: ${
                  response.status
                } ${response.statusText}`
              );
              console.error(
                `   📊 Failed payload size: ${payloadSizeKB} KB (${payloadSizeMB} MB)`
              );
              const errorData = await response
                .json()
                .catch(() => ({ error: 'Unknown error' }));
              throw new Error(
                `Batch ${batchIndex + 1} failed: ${
                  errorData.error || 'Unknown error'
                }`
              );
            }

            console.log(
              `✅ Batch ${
                batchIndex + 1
              }/${totalBatches} processed successfully`
            );
          }

          console.log('PDF text extracted successfully in background');
        }
      } catch (error) {
        console.error('Background text extraction failed:', error);
      }
    },
    [pdfFile]
  );

  // Create search highlights function with accurate positioning and current result highlighting
  const createSearchHighlights = useCallback(
    async (
      results: Array<{
        pageNumber: number;
        wordIndex: number;
        word: string;
        rect: { x: number; y: number; width: number; height: number };
        globalIndex: number;
      }>,
      currentIndex: number
    ) => {
      const highlightsByPage = new Map<
        number,
        Array<{
          id: string;
          text: string;
          rects: Array<{
            x: number;
            y: number;
            width: number;
            height: number;
            isCurrentResult?: boolean;
          }>;
        }>
      >();

      // Group results by page
      const resultsByPage = new Map<
        number,
        Array<{
          pageNumber: number;
          wordIndex: number;
          word: string;
          rect: { x: number; y: number; width: number; height: number };
          globalIndex: number;
        }>
      >();
      results.forEach((result) => {
        if (!resultsByPage.has(result.pageNumber)) {
          resultsByPage.set(result.pageNumber, []);
        }
        resultsByPage.get(result.pageNumber)!.push(result);
      });

      // Create highlights for each page
      resultsByPage.forEach((pageResults, pageNumber) => {
        const rects = pageResults.map((result) => ({
          ...result.rect,
          isCurrentResult: result.globalIndex === currentIndex,
        }));

        highlightsByPage.set(pageNumber, [
          {
            id: `search_highlights_${pageNumber}`,
            text: pageResults[0].word,
            rects,
          },
        ]);
      });

      setSearchHighlights(highlightsByPage);
    },
    []
  );

  // Enhanced search functionality with word-level precision
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !pdfFile || !numPages) return;

      setIsSearching(true);
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setSearchHighlights(new Map());

      try {
        const reactPdf = await import('react-pdf');
        const pdfjs = reactPdf.pdfjs;
        const loadingTask = pdfjs.getDocument(pdfFile);
        const pdfDocument = await loadingTask.promise;

        const allResults: Array<{
          pageNumber: number;
          wordIndex: number;
          word: string;
          rect: { x: number; y: number; width: number; height: number };
          globalIndex: number;
        }> = [];

        let globalWordIndex = 0;

        // Search through all pages with precise text positioning
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          try {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            const items = textContent.items.filter(
              (item) => 'str' in item
            ) as Array<{
              str: string;
              transform: number[];
              width: number;
              height: number;
              fontName: string;
            }>;

            // First, create a complete text representation of the page with item positions
            const pageTextWithPositions: Array<{
              text: string;
              item: {
                str: string;
                transform: number[];
                width: number;
                height: number;
                fontName: string;
              };
              startIndex: number;
              endIndex: number;
            }> = [];

            let fullPageText = '';
            for (const item of items) {
              const startIndex = fullPageText.length;
              const text = item.str;
              fullPageText += (fullPageText.length > 0 ? ' ' : '') + text;
              const endIndex = fullPageText.length;

              pageTextWithPositions.push({
                text,
                item,
                startIndex,
                endIndex,
              });
            }

            // Search for the query in the full page text
            const lowerPageText = fullPageText.toLowerCase();
            const lowerQuery = query.toLowerCase();
            let searchIndex = 0;
            let matchIndex = 0;

            while (true) {
              const foundIndex = lowerPageText.indexOf(lowerQuery, searchIndex);
              if (foundIndex === -1) break;

              const matchEndIndex = foundIndex + query.length;

              // Find which text items contain this match
              const matchingItems: Array<{
                item: {
                  str: string;
                  transform: number[];
                  width: number;
                  height: number;
                  fontName: string;
                };
                startInItem: number;
                endInItem: number;
                startInMatch: number;
                endInMatch: number;
              }> = [];

              for (const itemWithPos of pageTextWithPositions) {
                const itemStart = itemWithPos.startIndex;
                const itemEnd = itemWithPos.endIndex;

                // Check if this item overlaps with the match
                if (itemStart < matchEndIndex && itemEnd > foundIndex) {
                  const startInItem = Math.max(0, foundIndex - itemStart);
                  const endInItem = Math.min(
                    itemWithPos.text.length,
                    matchEndIndex - itemStart
                  );
                  const startInMatch = Math.max(0, itemStart - foundIndex);
                  const endInMatch = Math.min(
                    query.length,
                    itemEnd - foundIndex
                  );

                  if (endInItem > startInItem) {
                    matchingItems.push({
                      item: itemWithPos.item,
                      startInItem,
                      endInItem,
                      startInMatch,
                      endInMatch,
                    });
                  }
                }
              }

              // Create highlight rectangles for this match
              if (matchingItems.length > 0) {
                // For phrase matches, we'll create one result that spans the entire phrase
                // We'll use the first item for positioning and calculate the span
                const firstItem = matchingItems[0];

                // Calculate position using the first item's transform matrix
                const baseX = firstItem.item.transform[4];
                const baseY = firstItem.item.transform[5];
                const baseWidth = firstItem.item.width;
                const baseHeight = firstItem.item.height;

                // For single items or simple cases, use character-based positioning
                let startRatio = 0;
                let widthRatio = 1;

                if (matchingItems.length === 1) {
                  // Match is within a single text item
                  const item = firstItem;
                  startRatio = item.startInItem / item.item.str.length;
                  widthRatio =
                    (item.endInItem - item.startInItem) / item.item.str.length;
                } else {
                  // Match spans multiple items - use full width of first item as approximation
                  startRatio =
                    firstItem.startInItem / firstItem.item.str.length;
                  // For multi-item matches, we'll approximate the width
                  const totalCharsInMatch = query.length;
                  const avgCharWidth = baseWidth / firstItem.item.str.length;
                  widthRatio = Math.min(
                    1,
                    (totalCharsInMatch * avgCharWidth) / baseWidth
                  );
                }

                // Calculate final position
                const wordX = baseX + baseWidth * startRatio;
                const wordWidth = Math.max(
                  baseWidth * widthRatio,
                  baseWidth * 0.1
                );

                // Convert to percentage coordinates
                const x = (wordX / viewport.width) * 100;
                const y =
                  ((viewport.height - baseY - baseHeight) / viewport.height) *
                  100;
                const width = (wordWidth / viewport.width) * 100;
                const height = (baseHeight / viewport.height) * 100;

                allResults.push({
                  pageNumber: pageNum,
                  wordIndex: matchIndex,
                  word: query, // Use the full query as the "word"
                  rect: {
                    x: Math.max(0, Math.min(95, x)),
                    y: Math.max(0, Math.min(95, y)),
                    width: Math.max(0.5, Math.min(30, width)), // Increased max width for phrases
                    height: Math.max(0.5, Math.min(5, height)),
                  },
                  globalIndex: globalWordIndex,
                });

                globalWordIndex++;
                matchIndex++;
              }

              searchIndex = foundIndex + 1;
            }
          } catch (pageError) {
            console.error(`Error searching page ${pageNum}:`, pageError);
          }
        }

        setSearchResults(allResults);

        if (allResults.length > 0) {
          setCurrentSearchIndex(0);
          // Create highlights with first result as current
          await createSearchHighlights(allResults, 0);
          // Navigate to first result page
          setPendingNavigation(allResults[0].pageNumber);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [pdfFile, numPages, createSearchHighlights]
  );

  const navigateSearchResult = useCallback(
    async (direction: 'prev' | 'next') => {
      if (searchResults.length === 0) return;

      let newIndex;
      if (direction === 'next') {
        newIndex =
          currentSearchIndex < searchResults.length - 1
            ? currentSearchIndex + 1
            : 0;
      } else {
        newIndex =
          currentSearchIndex > 0
            ? currentSearchIndex - 1
            : searchResults.length - 1;
      }

      setCurrentSearchIndex(newIndex);
      // Update highlights to show current result
      await createSearchHighlights(searchResults, newIndex);
      // Navigate to the page containing the current result
      setPendingNavigation(searchResults[newIndex].pageNumber);
    },
    [searchResults, currentSearchIndex, createSearchHighlights]
  );

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) {
      // Auto-focus the input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Clear search when closing
      setSearchQuery('');
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      setSearchHighlights(new Map());
      // Clear any pending search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
  }, [isSearchOpen]);

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim()) {
        // Debounce search - wait for user to stop typing
        searchTimeoutRef.current = setTimeout(() => {
          performSearch(value);
        }, 300); // Reduced to 300ms for better responsiveness
      } else {
        // Clear results immediately when query is empty
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        setSearchHighlights(new Map());
      }
    },
    [performSearch]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Clear any pending debounced search
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
        // Perform search immediately
        if (searchQuery.trim()) {
          performSearch(searchQuery);
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        setSearchHighlights(new Map());
        // Clear any pending search timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
      }
    },
    [searchQuery, performSearch]
  );

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        if (isSearchOpen && searchQuery === '') {
          setIsSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen, searchQuery]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Queue for navigation attempts before PDF is loaded
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(
    null
  );

  // Handle citation clicks - navigate to specific page
  const handleCitationClick = useCallback(
    (targetPage: number) => {
      console.log('🎯 handleCitationClick called for page:', targetPage);

      // Debug: Show current page dimensions state
      const currentDimensions = pageDimensions.get(targetPage);
      const currentHeight = getPageHeight(targetPage);
      console.log('📏 Target page dimensions:', {
        pageNumber: targetPage,
        dimensions: currentDimensions,
        calculatedHeight: currentHeight,
        scale: calculateScale(),
      });

      // If PDF isn't loaded yet or we're in the middle of loading a new PDF, queue the navigation
      if (!numPages || isLoadingPdf) {
        console.log(
          'PDF not ready yet, queuing navigation to page:',
          targetPage,
          { numPages, isLoadingPdf }
        );
        setPendingNavigation(targetPage);
        return;
      }

      // Validate against current PDF's actual page count
      if (targetPage < 1 || targetPage > numPages) {
        console.log('Invalid page range:', { targetPage, numPages, pdfId });
        return;
      }

      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) {
        console.log('No scroll container found');
        return;
      }

      // Scroll to the target page within the container
      const targetElement = scrollContainer.querySelector(
        `[data-page-number="${targetPage}"]`
      );

      console.log('Target element found:', !!targetElement);

      if (targetElement) {
        console.log('Scrolling to existing element for page:', targetPage);
        // Calculate scroll position relative to container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const scrollTop =
          scrollContainer.scrollTop + elementRect.top - containerRect.top - 20; // 20px offset from top

        console.log('Scroll position calculated:', scrollTop);
        scrollContainer.scrollTo({
          top: scrollTop,
          behavior: 'smooth',
        });
      } else {
        console.log('Page not rendered, adding to visible pages:', targetPage);
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
          console.log('Updated visible pages:', Array.from(newSet));
          return newSet;
        });

        // Wait for render and then scroll
        setTimeout(() => {
          const element = scrollContainer.querySelector(
            `[data-page-number="${targetPage}"]`
          );
          console.log('After timeout, element found:', !!element);
          if (element) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const scrollTop =
              scrollContainer.scrollTop +
              elementRect.top -
              containerRect.top -
              20;

            console.log('Delayed scroll position:', scrollTop);
            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth',
            });
          } else {
            console.log('Element still not found after timeout');
          }
        }, 200); // Increased timeout to ensure page renders
      }

      setCurrentPage(targetPage);
      setPageInputValue(targetPage.toString());
    },
    [numPages, isLoadingPdf, pdfId]
  );

  // Expose the navigation function to parent component
  useEffect(() => {
    if (onNavigateToPageRef) {
      onNavigateToPageRef.current = handleCitationClick;
    }
  }, [onNavigateToPageRef, handleCitationClick]);

  // Page input handlers
  const handlePageInputChange = useCallback((value: string) => {
    setPageInputValue(value);
  }, []);

  const handlePageInputSubmit = useCallback(() => {
    const pageNumber = parseInt(pageInputValue);
    if (numPages && pageNumber >= 1 && pageNumber <= numPages) {
      // Valid page number, navigate to it
      handleCitationClick(pageNumber);
      setIsEditingPage(false);
    } else {
      // Invalid page number, reset to current page
      setPageInputValue(currentPage.toString());
      setIsEditingPage(false);
    }
  }, [pageInputValue, numPages, currentPage, handleCitationClick]);

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handlePageInputSubmit();
      } else if (e.key === 'Escape') {
        setPageInputValue(currentPage.toString());
        setIsEditingPage(false);
      }
    },
    [handlePageInputSubmit, currentPage]
  );

  // Handle pending navigation after PDF loads
  useEffect(() => {
    if (numPages && pendingNavigation) {
      console.log('Processing pending navigation to page:', pendingNavigation);
      handleCitationClick(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [numPages, pendingNavigation, handleCitationClick]);

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

  const handleLinkClick = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Completely ignore hash links - let PDF.js handle them
      if (href.startsWith('#')) {
        return;
      }

      // Handle javascript: links for internal navigation
      if (href.startsWith('javascript:')) {
        event.preventDefault();

        // Don't process internal links if PDF is loading or not ready
        if (isLoadingPdf || !numPages) {
          console.log('PDF not ready for internal link navigation');
          return;
        }

        // Extract page number from javascript calls like "javascript:this.print({bUI:true,bSilent:false,bShrinkToFit:true}); gotoPage(12);"
        const pageMatch =
          href.match(/gotoPage\s*\(\s*(\d+)\s*\)/i) ||
          href.match(/page[=\s]*(\d+)/i) ||
          href.match(/(\d+)/);

        if (pageMatch) {
          const pageNumber = parseInt(pageMatch[1]);
          if (pageNumber > 0 && pageNumber <= numPages) {
            handleCitationClick(pageNumber);
          } else {
            console.log('Invalid page number for current PDF:', {
              pageNumber,
              numPages,
              pdfId,
            });
          }
        }
        return;
      }

      // Check if it's an MP3 file
      if (href.toLowerCase().endsWith('.mp3')) {
        event.preventDefault();

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        // Create and play new audio
        const audio = new Audio(href);
        audioRef.current = audio;

        // Play the audio
        audio.play().catch((error) => {
          console.error('Failed to play audio:', error);
        });

        return;
      }

      // Handle external links
      try {
        const currentDomain = window.location.hostname;
        const url = new URL(href, window.location.origin);

        if (url.hostname !== currentDomain) {
          event.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        // If URL parsing fails, it might be an internal link - try to extract page number
        console.log(
          'Link parsing error, attempting internal navigation:',
          error
        );

        // Don't process internal links if PDF is loading or not ready
        if (isLoadingPdf || !numPages) {
          console.log('PDF not ready for internal link navigation (fallback)');
          return;
        }

        const pageMatch = href.match(/(\d+)/);
        if (pageMatch) {
          const pageNumber = parseInt(pageMatch[0]);
          if (pageNumber > 0 && pageNumber <= numPages) {
            event.preventDefault();
            handleCitationClick(pageNumber);
          } else {
            console.log('Invalid page number in fallback navigation:', {
              pageNumber,
              numPages,
              pdfId,
            });
          }
        }
      }
    },
    [handleCitationClick, numPages, isLoadingPdf, pdfId]
  );

  // Add PDF text layer link handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Handle clicks on PDF text layer links
    const handlePDFLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      // Skip hash links entirely - let PDF.js handle them
      if (link && link.getAttribute('href')?.startsWith('#')) {
        return;
      }

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
                x: lastRect.right,
                y: firstRect.top - 100,
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
          setIsLoadingPdf(true);
          setError(null);
          setIsInitialLoad(true);
          // Reset PDF-specific states immediately when switching PDFs
          setNumPages(null);
          setCurrentPage(1);
          setPageInputValue('1');
          setVisiblePages(new Set([1]));
          setPageDimensions(new Map());
          setPendingNavigation(null);

          // Check if PDF is cached
          const cacheKey = `pdf_${pdfId}`;
          const cached = sessionStorage.getItem(cacheKey);

          if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 3600000) {
              // 1 hour cache
              setPdfFile(data.url);
              setCurrentPage(1);
              setIsLoadingPdf(false);
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
          setIsLoadingPdf(false);
          setIsInitialLoad(false);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setError('Failed to load PDF file');
          setPdfFile('/sample.pdf');
          setIsLoadingPdf(false);
          setIsInitialLoad(false);
        }
      };

      loadPdf();
    } else {
      // Clean up all PDF-related state when no PDF is selected
      setPdfFile(null);
      setNumPages(null);
      setCurrentPage(1);
      setPageInputValue('1');
      setVisiblePages(new Set([1]));
      setPageHeights(new Map());
      setPageDimensions(new Map());
      setPendingNavigation(null);
      setIsLoadingPdf(false);
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

      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
    async ({ numPages }: { numPages: number }) => {
      console.log('📄 PDF loaded successfully with', numPages, 'pages');
      setNumPages(numPages);
      setCurrentPage(1);
      setError(null);
      pdfDocumentRef.current = true;

      // Get PDF document instance for dimension calculation
      try {
        const reactPdf = await import('react-pdf');
        const pdfjs = reactPdf.pdfjs;

        if (pdfFile) {
          const loadingTask = pdfjs.getDocument(pdfFile);
          const pdfDocument = await loadingTask.promise;

          // Pre-calculate all page dimensions at base scale (1.0)
          await preCalculatePageDimensions(pdfDocument, numPages, 1.0);
        }
      } catch (error) {
        console.error('Error pre-calculating page dimensions:', error);
      }

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
    [pdfId, autoExtractTextInBackground, preCalculatePageDimensions, pdfFile]
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

  // Force refresh PDF by clearing cache and reloading
  const handleForceRefresh = useCallback(async () => {
    if (!pdfId) return;

    try {
      console.log('🔄 Force refreshing PDF, clearing cache...');
      setIsLoadingPdf(true);
      setError(null);

      // Clear the cache for this PDF
      const cacheKey = `pdf_${pdfId}`;
      sessionStorage.removeItem(cacheKey);

      // Force reload from AWS
      const response = await fetch(`/api/pdf/${pdfId}?bust=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to load PDF from server');

      const pdfData = await response.json();

      // Update cache with fresh data
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          url: pdfData.url,
          timestamp: Date.now(),
        })
      );

      setPdfFile(pdfData.url);
      setCurrentPage(1);
      setIsLoadingPdf(false);
      setIsInitialLoad(false);

      console.log('✅ PDF refreshed successfully');
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      setError('Failed to refresh PDF. Please try again.');
      setIsLoadingPdf(false);
    }
  }, [pdfId]);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(3.0, scale + 0.1);
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
    // No need to recalculate dimensions - we use base dimensions and apply scale in render
  }, [scale, onScaleChange]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.5, scale - 0.1);
    if (onScaleChange) {
      onScaleChange(newScale);
    } else {
      setInternalScale(newScale);
    }
    // No need to recalculate dimensions - we use base dimensions and apply scale in render
  }, [scale, onScaleChange]);

  const handleZoomReset = useCallback(() => {
    const resetScale = 1.0;
    if (onScaleChange) {
      onScaleChange(resetScale);
    } else {
      setInternalScale(resetScale);
    }
    // No need to recalculate dimensions - we use base dimensions and apply scale in render
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
      // First try to get from pre-calculated dimensions
      const dimensions = pageDimensions.get(pageNumber);
      if (dimensions) {
        return dimensions.height;
      }

      // Fallback to pageHeights (for backward compatibility)
      const height = pageHeights.get(pageNumber);
      if (height) {
        return height;
      }

      // Last resort: use a reasonable default for A4 pages
      console.warn(
        `No dimensions found for page ${pageNumber}, using default base height`
      );
      return 842; // A4 height at base scale (1.0)
    },
    [pageDimensions, pageHeights]
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
        <div className='flex flex-col items-center text-center space-y-4'>
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
          <button
            onClick={handleForceRefresh}
            disabled={isLoadingPdf}
            className='px-4 py-2 bg-[var(--accent)] text-[var(--button-primary-text)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
          >
            {isLoadingPdf ? (
              <>
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                Refreshing...
              </>
            ) : (
              <>
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
                Try Again
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className='h-full flex flex-col relative'>
      {/* PDF Controls */}
      <div className='flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card-background)] flex-shrink-0 z-10'>
        <div className='flex items-center gap-4'>
          {numPages ? (
            <div className='flex items-center gap-2 text-sm text-[var(--text-primary)]'>
              <span>Page</span>
              {isEditingPage ? (
                <input
                  type='text'
                  value={pageInputValue}
                  onChange={(e) => handlePageInputChange(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  onBlur={handlePageInputSubmit}
                  className='w-12 px-1 py-0.5 text-center text-sm border border-[var(--border)] rounded bg-[var(--input-background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]'
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => {
                    setIsEditingPage(true);
                    setPageInputValue(currentPage.toString());
                  }}
                  className='px-1 py-0.5 text-[var(--accent)] hover:bg-[var(--faded-white)] rounded transition-colors'
                  title='Click to jump to a specific page'
                >
                  {currentPage}
                </button>
              )}
              <span>/ {numPages}</span>
            </div>
          ) : (
            <span className='text-sm text-[var(--text-primary)]'>
              Loading...
            </span>
          )}
        </div>

        {/* Center section with Mind Map, Flash Cards, MCQs */}
        <div className='flex items-center gap-2'>
          {/* Mind Mapping Button */}
          <div className='relative group'>
            <button
              onClick={() => setShowMindMap(true)}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='3' />
                <path d='M12 1v6m0 6v6' />
                <path d='m21 12-6-3v6z' />
                <path d='m3 12 6-3v6z' />
                <path d='m12 22-3-6h6z' />
                <path d='m12 2-3 6h6z' />
              </svg>
            </button>
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50'>
              Mind Mapping
            </div>
          </div>

          {/* Flash Cards Button */}
          <div className='relative group'>
            <button
              onClick={() => setShowFlashCards(true)}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <rect x='2' y='3' width='20' height='14' rx='2' ry='2' />
                <line x1='8' y1='21' x2='16' y2='21' />
                <line x1='12' y1='17' x2='12' y2='21' />
              </svg>
            </button>
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50'>
              Flash Cards
            </div>
          </div>

          {/* MCQs Button */}
          <div className='relative group'>
            <button
              onClick={() => setShowMCQs(true)}
              className='p-2 rounded-lg bg-[var(--faded-white)] hover:bg-[var(--border)] transition-colors'
            >
              <svg
                className='w-4 h-4'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <circle cx='12' cy='12' r='10' />
                <path d='M9 9h6v6h-6z' />
                <path d='M9 1h6' />
              </svg>
            </button>
            <div className='absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-[var(--card-background)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50'>
              MCQs
            </div>
          </div>
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

            {/* Search functionality */}
            <div className='relative search-container'>
              <button
                onClick={handleSearchToggle}
                className={`p-2 rounded-lg transition-colors ${
                  isSearchOpen || searchResults.length > 0
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--faded-white)] hover:bg-[var(--border)]'
                }`}
                title='Search in PDF'
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
                </svg>
              </button>

              {/* Search dropdown */}
              {isSearchOpen && (
                <div className='absolute top-full right-0 mt-2 bg-[var(--card-background)] border border-[var(--border)] rounded-lg shadow-lg p-3 min-w-[280px] z-50'>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 relative'>
                      <input
                        ref={searchInputRef}
                        type='text'
                        value={searchQuery}
                        onChange={(e) =>
                          handleSearchInputChange(e.target.value)
                        }
                        onKeyDown={handleSearchKeyDown}
                        placeholder='Search in PDF...'
                        className='w-full px-3 py-2 text-sm border border-[var(--border)] rounded bg-[var(--input-background)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-white'
                      />
                      {isSearching && (
                        <div className='absolute right-2 top-1/2 transform -translate-y-1/2'>
                          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]'></div>
                        </div>
                      )}
                    </div>

                    {/* Navigation arrows */}
                    <div className='flex items-center gap-1'>
                      <button
                        onClick={() => navigateSearchResult('prev')}
                        disabled={searchResults.length === 0}
                        className='p-1.5 rounded bg-[var(--faded-white)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        title='Previous result'
                      >
                        <svg
                          className='w-3 h-3'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                        >
                          <path d='M15 18l-6-6 6-6' />
                        </svg>
                      </button>

                      <button
                        onClick={() => navigateSearchResult('next')}
                        disabled={searchResults.length === 0}
                        className='p-1.5 rounded bg-[var(--faded-white)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        title='Next result'
                      >
                        <svg
                          className='w-3 h-3'
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

                  {/* Search results info */}
                  {searchQuery && (
                    <div className='text-xs text-[var(--text-muted)] mt-1'>
                      {isSearching
                        ? 'Searching...'
                        : searchResults.length > 0
                        ? `${currentSearchIndex + 1} of ${
                            searchResults.length
                          } results found`
                        : searchQuery.trim()
                        ? 'No results found'
                        : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Optimized PDF Document with virtualization */}
      <div
        ref={scrollContainerRef}
        className='flex-1 overflow-auto bg-[var(--pdf-viewer-bg)] pdf-scroll-container'
      >
        <div className='p-4 min-w-fit'>
          {isLoadingPdf && (
            <div className='h-full flex items-center justify-center'>
              <div className='text-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4'></div>
                <p className='text-[var(--text-muted)]'>Loading PDF...</p>
              </div>
            </div>
          )}
          {pdfFile && !isLoadingPdf && (
            <div className='flex flex-col items-center space-y-4'>
              <Document
                key={`${pdfFile}-${pdfId}`}
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                onItemClick={({ pageNumber, dest }) => {
                  console.log('PDF onItemClick called:', { pageNumber, dest });

                  // Handle internal page navigation
                  if (pageNumber) {
                    console.log('Navigating to page:', pageNumber);
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
                      console.log('Navigating to dest page:', pageNum);
                      handleCitationClick(pageNum);
                    }
                  }

                  console.log('onItemClick could not determine page number');
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
                        style={{
                          // Set container height immediately using pre-calculated dimensions
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
                                isMoveMode={activeTool === 'move'}
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
                                isMoveMode={activeTool === 'move'}
                                selectedTextId={selectedTextId}
                                texts={getTextsForPage(pageNumber)}
                                onTextCreate={addText}
                                onTextUpdate={updateText}
                                onTextDelete={deleteText}
                                onToolChange={(tool) =>
                                  setActiveTool(tool as ToolType)
                                }
                                onTextSelect={handleTextSelect}
                                scale={calculateScale()}
                              />
                            )}

                            {/* Pen Tool Overlay - Always visible */}
                            <PenTool
                              isActive={activeTool === 'pen'}
                              pdfId={pdfId || ''}
                              pageNumber={pageNumber}
                              showDrawings={true}
                              containerRef={
                                pageRefs.current.get(pageNumber)
                                  ? {
                                      current:
                                        pageRefs.current.get(pageNumber)!,
                                    }
                                  : { current: null }
                              }
                              scale={calculateScale()}
                              strokes={getDrawingsForPage(pageNumber)}
                              onStrokesUpdate={(strokes) =>
                                updateDrawingsForPage(pageNumber, strokes)
                              }
                              onStrokesSave={(strokes) =>
                                saveDrawingsForPage(pageNumber, strokes)
                              }
                            />

                            {/* Image Analyser Overlay */}
                            <ImageAnalyser
                              isActive={activeTool === 'analyseimage'}
                              pageNumber={pageNumber}
                              containerRef={
                                pageRefs.current.get(pageNumber)
                                  ? {
                                      current:
                                        pageRefs.current.get(pageNumber)!,
                                    }
                                  : { current: null }
                              }
                              onImageAnalyse={handleImageAnalyse}
                              onHighlight={(color, area) =>
                                handleImageHighlight(color, area, pageNumber)
                              }
                            />

                            {/* Shape Tool Overlay */}
                            {pdfId && currentUser && (
                              <ShapeTool
                                isActive={[
                                  'rectangle',
                                  'ellipse',
                                  'line',
                                  'arrow',
                                  'move',
                                ].includes(activeTool)}
                                activeTool={activeTool}
                                pdfId={pdfId}
                                pageNumber={pageNumber}
                                userId={currentUser.id}
                                containerRef={
                                  pageRefs.current.get(pageNumber)
                                    ? {
                                        current:
                                          pageRefs.current.get(pageNumber)!,
                                      }
                                    : { current: null as HTMLDivElement | null }
                                }
                                onShapeCreate={addShape}
                                onShapeUpdate={updateShape}
                                onShapeDelete={deleteShape}
                                shapes={getShapesForPage(pageNumber)}
                                shapeColor={shapeColor}
                                shapeStrokeWidth={shapeStrokeWidth}
                                scale={calculateScale()}
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

                            {/* Search Highlights Overlay */}
                            {searchHighlights.has(pageNumber) &&
                              searchHighlights
                                .get(pageNumber)
                                ?.map((searchHighlight) => (
                                  <div key={searchHighlight.id}>
                                    {searchHighlight.rects.map(
                                      (rect, rectIndex) => (
                                        <div
                                          key={`${searchHighlight.id}-${rectIndex}`}
                                          className='absolute pointer-events-none'
                                          style={{
                                            left: `${rect.x}%`,
                                            top: `${rect.y}%`,
                                            width: `${rect.width}%`,
                                            height: `${rect.height}%`,
                                            backgroundColor:
                                              rect.isCurrentResult
                                                ? 'var(--accent)'
                                                : '#ffff00',
                                            opacity: rect.isCurrentResult
                                              ? 0.7
                                              : 0.4,
                                            mixBlendMode: rect.isCurrentResult
                                              ? 'normal'
                                              : 'multiply',
                                            borderRadius: '2px',
                                            zIndex: rect.isCurrentResult
                                              ? 2
                                              : 1,
                                            border: rect.isCurrentResult
                                              ? '1px solid var(--accent)'
                                              : 'none',
                                          }}
                                          title={`Search: ${searchHighlight.text}`}
                                        />
                                      )
                                    )}
                                  </div>
                                ))}
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

      {/* Pen Tool Controls */}
      {activeTool === 'pen' && <PenToolbar />}

      {/* Shape Tool Controls */}
      {['rectangle', 'ellipse', 'line', 'arrow'].includes(activeTool) && (
        <ShapeToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onColorChange={setShapeColor}
          onStrokeWidthChange={setShapeStrokeWidth}
          currentColor={shapeColor}
          currentStrokeWidth={shapeStrokeWidth}
        />
      )}

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

      {/* Mind Map Modal */}
      {showMindMap && pdfId && (
        <MindMap pdfId={pdfId} onClose={() => setShowMindMap(false)} />
      )}

      {/* Flash Cards Modal */}
      {showFlashCards && pdfId && (
        <FlashCards pdfId={pdfId} onClose={() => setShowFlashCards(false)} />
      )}

      {/* MCQs Modal */}
      {showMCQs && pdfId && (
        <MCQs pdfId={pdfId} onClose={() => setShowMCQs(false)} />
      )}
    </div>
  );
}
