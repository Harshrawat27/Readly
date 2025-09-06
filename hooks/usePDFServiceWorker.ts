// hooks/usePDFServiceWorker.ts
import { useEffect, useRef } from 'react';

export function usePDFServiceWorker() {
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/pdf-sw.js')
        .then((registration) => {
          swRef.current = registration;
          // console.log('PDF Service Worker registered');
        })
        .catch((error) => {
          // console.error('Service Worker registration failed:', error);
        });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // console.log('Service Worker updated, reloading...');
        window.location.reload();
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  const prefetchPDFs = (urls: string[]) => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PREFETCH_PDF',
        urls,
      });
    }
  };

  const clearPDFCache = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE',
      });
    }
    // Also clear session storage
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('pdf_')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  return {
    prefetchPDFs,
    clearPDFCache,
    isReady: !!swRef.current,
  };
}

// Utility to preload next PDFs in the list
export function usePDFPrefetch(
  pdfList: Array<{ id: string; fileUrl?: string }>,
  currentPdfId: string | null
) {
  const { prefetchPDFs } = usePDFServiceWorker();

  useEffect(() => {
    if (!currentPdfId || !pdfList.length) return;

    const currentIndex = pdfList.findIndex((pdf) => pdf.id === currentPdfId);
    if (currentIndex === -1) return;

    // Prefetch next 2 PDFs
    const urlsToPrefetch: string[] = [];

    for (let i = 1; i <= 2; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < pdfList.length) {
        const nextPdf = pdfList[nextIndex];
        if (nextPdf.fileUrl) {
          // Construct the API URL
          urlsToPrefetch.push(`/api/pdf/${nextPdf.id}`);
        }
      }
    }

    if (urlsToPrefetch.length > 0) {
      // Delay prefetch to avoid competing with current PDF load
      const timer = setTimeout(() => {
        prefetchPDFs(urlsToPrefetch);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentPdfId, pdfList, prefetchPDFs]);
}
