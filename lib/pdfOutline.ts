// Note: pdfjs-dist is dynamically imported to avoid SSR issues

export interface PDFOutlineItem {
  title: string;
  dest: string | Array<any> | null;
  url?: string;
  unsafeUrl?: string;
  newWindow?: boolean;
  color?: number[];
  count?: number;
  bold?: boolean;
  italic?: boolean;
  items?: PDFOutlineItem[];
}

export interface ProcessedOutlineItem {
  title: string;
  pageNumber?: number;
  level: number;
  children?: ProcessedOutlineItem[];
}

/**
 * Extract PDF outline/bookmarks from a PDF document
 * This function should be called from client-side components only
 */
export async function extractPDFOutline(pdfUrl: string): Promise<ProcessedOutlineItem[] | null> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Use the same PDF.js setup as your existing PDFViewer
    const pdfjs = await import('react-pdf').then(mod => mod.pdfjs);
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
      disableWorker: false,
    });
    const pdf = await loadingTask.promise;
    
    // Get the outline
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      return null;
    }
    
    // Process the outline items
    const processedOutline = await processOutlineItems(outline, pdf, 0);
    
    return processedOutline;
  } catch (error) {
    console.error('Error extracting PDF outline:', error);
    return null;
  }
}

/**
 * Process outline items recursively and resolve page numbers
 */
async function processOutlineItems(
  items: PDFOutlineItem[], 
  pdf: any, // PDF.js document object 
  level: number
): Promise<ProcessedOutlineItem[]> {
  const processedItems: ProcessedOutlineItem[] = [];
  
  for (const item of items) {
    let pageNumber: number | undefined = undefined;
    
    // Try to resolve the destination to a page number
    if (item.dest) {
      try {
        const dest = await pdf.getDestination(item.dest);
        if (dest && dest[0]) {
          const pageRef = dest[0];
          const pageIndex = await pdf.getPageIndex(pageRef);
          pageNumber = pageIndex + 1; // Convert 0-based to 1-based
        }
      } catch (error) {
        console.warn('Could not resolve destination for outline item:', item.title, error);
      }
    }
    
    const processedItem: ProcessedOutlineItem = {
      title: item.title,
      pageNumber,
      level,
    };
    
    // Process children recursively if they exist
    if (item.items && item.items.length > 0) {
      processedItem.children = await processOutlineItems(item.items, pdf, level + 1);
    }
    
    processedItems.push(processedItem);
  }
  
  return processedItems;
}

/**
 * Extract outline from a PDF file object (for client-side processing)
 */
export async function extractOutlineFromFile(file: File): Promise<ProcessedOutlineItem[] | null> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Use the same PDF.js setup as your existing PDFViewer
    const pdfjs = await import('react-pdf').then(mod => mod.pdfjs);
    
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjs.getDocument({
      data: typedArray,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
      disableWorker: false,
    });
    const pdf = await loadingTask.promise;
    
    const outline = await pdf.getOutline();
    
    if (!outline || outline.length === 0) {
      return null;
    }
    
    const processedOutline = await processOutlineItems(outline, pdf, 0);
    
    return processedOutline;
  } catch (error) {
    console.error('Error extracting outline from file:', error);
    return null;
  }
}