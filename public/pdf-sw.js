// public/pdf-sw.js
const CACHE_NAME = 'pdf-cache-v1';
const PDF_CACHE_NAME = 'pdf-files-v1';
const CACHE_DURATION = 3600000; // 1 hour

// Files to cache on install
const STATIC_ASSETS = [
  '/pdf.worker.min.js',
  'https://unpkg.com/pdfjs-dist@5.3.31/cmaps/',
  'https://unpkg.com/pdfjs-dist@5.3.31/standard_fonts/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== PDF_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // IMPORTANT: Ignore upload requests (PUT, POST) to S3 - these should not be cached
  if (
    (url.hostname.includes('s3.amazonaws.com') || url.hostname.includes('cloudfront.net')) &&
    (event.request.method === 'PUT' || event.request.method === 'POST')
  ) {
    // Let upload requests pass through without interception
    return;
  }

  // Handle PDF files from S3/CloudFront (only GET requests)
  if (
    event.request.method === 'GET' &&
    (url.pathname.includes('.pdf') ||
     url.hostname.includes('s3.amazonaws.com') ||
     url.hostname.includes('cloudfront.net'))
  ) {
    event.respondWith(
      caches.open(PDF_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          // Check if cache is still valid
          const cachedTime = cachedResponse.headers.get('x-cache-time');
          if (
            cachedTime &&
            Date.now() - parseInt(cachedTime) < CACHE_DURATION
          ) {
            return cachedResponse;
          }
        }

        // Fetch with streaming for better performance
        const fetchPromise = fetch(event.request, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
        }).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone response for caching
          const responseToCache = response.clone();
          const headers = new Headers(responseToCache.headers);
          headers.set('x-cache-time', Date.now().toString());

          const modifiedResponse = new Response(responseToCache.body, {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers,
          });

          cache.put(event.request, modifiedResponse);
          return response;
        });

        return fetchPromise;
      })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/pdf/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache GET requests with successful responses
          if (response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails (only for GET requests)
          if (event.request.method === 'GET') {
            return caches.match(event.request);
          }
          // For non-GET requests, let the error propagate
          throw new Error('Network request failed');
        })
    );
    return;
  }

  // Handle PDF.js worker files
  if (url.pathname.includes('pdf.worker') || url.hostname === 'unpkg.com') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return (
          response ||
          fetch(event.request).then((fetchResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            });
          })
        );
      })
    );
    return;
  }
});

// Prefetch PDFs when idle
self.addEventListener('message', (event) => {
  if (event.data.type === 'PREFETCH_PDF') {
    const urls = event.data.urls;

    caches.open(PDF_CACHE_NAME).then((cache) => {
      urls.forEach((url) => {
        fetch(url, {
          mode: 'cors',
          credentials: 'omit',
        })
          .then((response) => {
            if (response.status === 200) {
              cache.put(url, response);
            }
          })
          .catch(console.error);
      });
    });
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(PDF_CACHE_NAME).then(() => {
      console.log('PDF cache cleared');
    });
  }
});
