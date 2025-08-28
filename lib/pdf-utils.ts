async function loadPdfjs() {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  return pdfjs;
}

export interface PDFValidationResult {
  isValid: boolean;
  pageCount: number;
  error?: string;
  requiresUpgrade?: boolean;
  upgradeReason?: string;
}

export async function validatePDFPages(
  file: File,
  maxPagesPerPdf: number
): Promise<PDFValidationResult> {
  const pdfjs = await loadPdfjs();
  
  if (!pdfjs) {
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation only available on client side'
    };
  }

  try {
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdfDocument = await loadingTask.promise;
    
    const pageCount = pdfDocument.numPages;
    
    // Check if page count exceeds limit
    if (maxPagesPerPdf !== -1 && pageCount > maxPagesPerPdf) {
      return {
        isValid: false,
        pageCount,
        requiresUpgrade: true,
        upgradeReason: `PDF has ${pageCount} pages but your plan allows maximum ${maxPagesPerPdf} pages.`
      };
    }
    
    return {
      isValid: true,
      pageCount
    };
    
  } catch (error) {
    console.error('Error validating PDF pages:', error);
    return {
      isValid: false,
      pageCount: 0,
      error: 'Failed to read PDF file. Please ensure it is a valid PDF.'
    };
  }
}

export async function validatePDFFromUrl(
  url: string,
  maxPagesPerPdf: number
): Promise<PDFValidationResult> {
  const pdfjs = await loadPdfjs();
  
  if (!pdfjs) {
    return {
      isValid: false,
      pageCount: 0,
      error: 'PDF validation only available on client side'
    };
  }

  try {
    // Load PDF document from URL
    const loadingTask = pdfjs.getDocument(url);
    const pdfDocument = await loadingTask.promise;
    
    const pageCount = pdfDocument.numPages;
    
    // Check if page count exceeds limit
    if (maxPagesPerPdf !== -1 && pageCount > maxPagesPerPdf) {
      return {
        isValid: false,
        pageCount,
        requiresUpgrade: true,
        upgradeReason: `PDF has ${pageCount} pages but your plan allows maximum ${maxPagesPerPdf} pages.`
      };
    }
    
    return {
      isValid: true,
      pageCount
    };
    
  } catch (error) {
    console.error('Error validating PDF from URL:', error);
    return {
      isValid: false,
      pageCount: 0,
      error: 'Failed to load PDF from URL. Please ensure it is a valid PDF URL.'
    };
  }
}