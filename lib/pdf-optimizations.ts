// Simple client-side PDF optimizations
export const pdfOptimizations = {
  // Enhanced PDF.js options for better performance
  getOptimizedOptions: () => ({
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
    disableWorker: false,
    httpHeaders: {
      'Cache-Control': 'public, max-age=31536000',
    },
    // Enable streaming for faster loading
    disableStream: false,
    disableAutoFetch: false,
    // Optimize rendering
    useSystemFonts: true,
    // Disable XFA for better performance
    enableXfa: false,
  }),

  // Simple URL caching
  urlCache: new Map<string, string>(),

  // Cache PDF URL
  cachePdfUrl: (pdfId: string, url: string) => {
    if (typeof window !== 'undefined') {
      pdfOptimizations.urlCache.set(pdfId, url);
      // Store in sessionStorage for persistence
      try {
        sessionStorage.setItem(`pdf_url_${pdfId}`, url);
      } catch (e) {
        console.warn('Failed to cache PDF URL in sessionStorage');
      }
    }
  },

  // Get cached PDF URL
  getCachedPdfUrl: (pdfId: string): string | null => {
    if (typeof window === 'undefined') return null;
    
    // Check memory cache first
    if (pdfOptimizations.urlCache.has(pdfId)) {
      return pdfOptimizations.urlCache.get(pdfId)!;
    }

    // Check sessionStorage
    try {
      const cached = sessionStorage.getItem(`pdf_url_${pdfId}`);
      if (cached) {
        pdfOptimizations.urlCache.set(pdfId, cached);
        return cached;
      }
    } catch (e) {
      console.warn('Failed to read PDF URL from sessionStorage');
    }

    return null;
  },

  // Clear cache
  clearCache: () => {
    if (typeof window !== 'undefined') {
      pdfOptimizations.urlCache.clear();
      try {
        // Clear PDF URLs from sessionStorage
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('pdf_url_')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Failed to clear sessionStorage');
      }
    }
  },

  // Prefetch next pages in the background
  prefetchPages: async (pdfUrl: string, currentPage: number, totalPages: number) => {
    if (typeof window === 'undefined') return;

    try {
      // Simple prefetch using link tags
      const prefetchPages = [
        currentPage + 1,
        currentPage + 2,
        currentPage - 1,
      ].filter(page => page > 0 && page <= totalPages);

      prefetchPages.forEach(pageNum => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = `${pdfUrl}#page=${pageNum}`;
        document.head.appendChild(link);
        
        // Remove after a delay to clean up
        setTimeout(() => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        }, 5000);
      });
    } catch (error) {
      console.warn('Failed to prefetch pages:', error);
    }
  },
};