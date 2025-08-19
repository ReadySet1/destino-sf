// Simple service worker to prevent 404 errors
// This is a minimal service worker that prevents the browser from requesting
// a non-existent service worker file.

const CACHE_NAME = 'destino-sf-v1';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    clients.claim()
  );
});

// Handle fetch events (optional - for basic caching)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for now
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching API routes and dynamic content
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/_next/static/chunks/')) {
    return;
  }

  // For now, just let the browser handle all requests normally
  // This prevents any caching issues during development
  return;
});
