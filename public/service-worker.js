// Enhanced Service Worker for Destino SF
// Version 1.3 - Production Ready

// Cache Names
const CACHE_VERSION = 'v1.3';
const STATIC_CACHE = `destino-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `destino-dynamic-${CACHE_VERSION}`;
const API_CACHE = `destino-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `destino-images-${CACHE_VERSION}`;

// Cache Configuration
const CACHE_CONFIG = {
  static: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 100,
  },
  dynamic: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    maxEntries: 50,
  },
  api: {
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 30,
  },
  images: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 200,
  },
};

// Essential URLs to cache immediately
const ESSENTIAL_URLS = ['/', '/menu', '/cart', '/catering', '/offline', '/manifest.json'];

// Install Event
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);

        // Cache essential resources
        await cache.addAll(
          ESSENTIAL_URLS.map(
            url =>
              new Request(url, {
                cache: 'reload', // Bypass browser cache during install
              })
          )
        );

        console.log('[SW] Essential resources cached');

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Installation failed:', error);
      }
    })()
  );
});

// Activate Event
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletionPromises = cacheNames
          .filter(name => name.includes('destino') && !name.includes(CACHE_VERSION))
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          });

        await Promise.all(deletionPromises);

        // Enable navigation preload if available
        if (self.registration.navigationPreload) {
          await self.registration.navigationPreload.enable();
        }

        // Claim all clients
        await self.clients.claim();

        console.log('[SW] Service worker activated');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

// Fetch Event Handler
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extensions and external URLs
  if (url.protocol === 'chrome-extension:' || url.origin !== self.location.origin) {
    return;
  }

  // Skip admin routes, account routes, and sensitive APIs
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/checkout') ||
    url.pathname.startsWith('/api/orders')
  ) {
    return;
  }

  // Route requests to appropriate strategies
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, CACHE_CONFIG.images));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, CACHE_CONFIG.static));
  } else if (isAPIRequest(request)) {
    event.respondWith(staleWhileRevalidateStrategy(request, API_CACHE, CACHE_CONFIG.api));
  } else if (isPageRequest(request)) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic));
  } else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, CACHE_CONFIG.dynamic));
  }
});

// Cache First Strategy (for static assets and images)
async function cacheFirstStrategy(request, cacheName, config) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cache entry is still fresh
      const cacheDate = new Date(
        cachedResponse.headers.get('sw-cached-date') || cachedResponse.headers.get('date') || 0
      );
      const isExpired = Date.now() - cacheDate.getTime() > config.maxAge;

      if (!isExpired) {
        return cachedResponse;
      }
    }

    // Fetch from network
    const response = await fetch(request);

    if (response.ok) {
      await putInCache(cache, request, response.clone(), config);
    }

    return response;
  } catch (error) {
    // Return cached version if network fails
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Stale While Revalidate Strategy (for API calls)
async function staleWhileRevalidateStrategy(request, cacheName, config) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Start fetch in background
  const fetchPromise = fetch(request)
    .then(async response => {
      if (response.ok) {
        await putInCache(cache, request, response.clone(), config);
      }
      return response;
    })
    .catch(() => null);

  // Return cached response immediately if available
  if (cachedResponse) {
    // Don't await the fetch promise to return immediately
    return cachedResponse;
  }

  // If no cache, wait for network
  return (await fetchPromise) || new Response('Offline', { status: 503 });
}

// Network First Strategy (for pages)
async function networkFirstStrategy(request, cacheName, config) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      await putInCache(cache, request, response.clone(), config);
    }

    return response;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (isPageRequest(request)) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Destino SF - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #D4AF37; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .emoji { font-size: 3em; margin-bottom: 20px; }
            button { background: #D4AF37; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #B8941F; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">🥟</div>
            <h1>You're Offline</h1>
            <p>It looks like you're not connected to the internet. Don't worry, our delicious empanadas will be here when you're back online!</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
        </html>
      `,
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Helper function to put items in cache with size management
async function putInCache(cache, request, response, config) {
  try {
    // Add timestamp header for cache expiration
    const responseWithTimestamp = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'sw-cached-date': new Date().toISOString(),
      },
    });

    await cache.put(request, responseWithTimestamp);

    // Manage cache size
    await manageCacheSize(cache, config.maxEntries);
  } catch (error) {
    console.error('[SW] Failed to cache:', error);
  }
}

// Cache size management
async function manageCacheSize(cache, maxEntries) {
  try {
    const keys = await cache.keys();

    if (keys.length > maxEntries) {
      // Remove oldest entries (FIFO)
      const entriesToDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(entriesToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error('[SW] Cache size management failed:', error);
  }
}

// Helper functions for request classification
function isImageRequest(request) {
  return (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/i.test(new URL(request.url).pathname)
  );
}

function isStaticAsset(request) {
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    /\.(js|css|woff|woff2|ttf|eot|map)$/i.test(new URL(request.url).pathname) ||
    new URL(request.url).pathname.startsWith('/_next/static/')
  );
}

function isAPIRequest(request) {
  const pathname = new URL(request.url).pathname;
  return (
    pathname.startsWith('/api/') &&
    (pathname.includes('/products') ||
      pathname.includes('/categories') ||
      pathname.includes('/health') ||
      pathname.includes('/spotlight-picks'))
  );
}

function isPageRequest(request) {
  return request.destination === 'document' || request.headers.get('accept')?.includes('text/html');
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  // Implement background sync logic for offline actions
  // e.g., send failed form submissions, sync cart state, etc.
}

console.log('[SW] Service worker script loaded');
