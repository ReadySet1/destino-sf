/**
 * Next.js Client Instrumentation File
 *
 * This file replaces the deprecated sentry.client.config.ts approach.
 * It's automatically loaded by Next.js for client-side instrumentation.
 *
 * Enhanced with Web Vitals integration and user behavior tracking (DES-59)
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Note: debug option removed - it doesn't work with bundled Sentry builds
  // and causes "[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle"

  beforeSend(event, hint) {
    // Filter out sensitive information
    if (event.request) {
      // Remove cookies and sensitive headers
      delete event.request.cookies;
      delete event.request.headers?.authorization;
      delete event.request.headers?.cookie;

      // Remove sensitive query parameters
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string
          .replace(/access_token=[^&]+/g, 'access_token=[REDACTED]')
          .replace(/api_key=[^&]+/g, 'api_key=[REDACTED]')
          .replace(/secret=[^&]+/g, 'secret=[REDACTED]');
      }
    }

    // Filter out sensitive tags
    if (event.tags) {
      delete event.tags.api_key;
      delete event.tags.secret;
      delete event.tags.token;
    }

    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_CAPTURE_DEV_ERRORS) {
      return null;
    }

    return event;
  },

  integrations: [
    // Browser tracing for performance monitoring
    Sentry.browserTracingIntegration({
      // Enable automatic instrumentation for routing
      enableInp: true,
    }),

    // Session replay for error debugging
    Sentry.replayIntegration({
      // Privacy settings
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

  // User context
  initialScope: {
    tags: {
      component: 'client',
      environment: process.env.NODE_ENV,
    },
  },

  // Error filtering
  ignoreErrors: [
    // Browser extension errors
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'Script error.',
    'Network Error',

    // React hydration errors (common in development)
    'Hydration failed because the initial UI does not match what was rendered on the server',

    // Abort controller errors (user navigation)
    'AbortError: The operation was aborted',
    'AbortError: signal is aborted without reason',

    // Timeout errors from database and API operations
    /timeout after \d+ms$/i,
    'TimeoutError',

    // Network errors that shouldn't be tracked
    'NetworkError when attempting to fetch resource',
    'Load failed',
    'Failed to fetch',
  ],

  // URL filtering
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,

    // Development tools
    /webpack-internal:/,
    /_next\/static/,
    /node_modules/,
  ],
});

/**
 * Initialize client error tracker after Sentry is ready
 * This import is dynamic to avoid issues with SSR
 */
if (typeof window !== 'undefined') {
  // Defer initialization to avoid blocking the main thread
  setTimeout(() => {
    import('@/lib/monitoring/client-error-tracker').then(({ clientErrorTracker }) => {
      clientErrorTracker.initialize();
    });
  }, 0);
}

/**
 * Export the router transition hook for navigation instrumentation.
 * This enables Sentry to track client-side page navigations.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
