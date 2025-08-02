// Service Worker for PDF caching and performance optimization
const CACHE_NAME = 'readly-pdf-cache-v1';
const PDF_CACHE = 'readly-pdfs-v1';

// Cache PDF files and assets (compatible with react-pdf version)
const urlsToCache = [
  'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs',
  'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
  'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache PDF files from S3
  if (url.hostname.includes('amazonaws.com') && request.url.includes('.pdf')) {
    event.respondWith(
      caches.open(PDF_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request).then((fetchResponse) => {
            // Only cache successful responses
            if (fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Cache PDF.js assets
  if (url.hostname === 'unpkg.com' && url.pathname.includes('pdfjs-dist')) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Default fetch for other requests
  event.respondWith(fetch(request));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== PDF_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});