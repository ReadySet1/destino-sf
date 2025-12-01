/**
 * Sentry Edge Runtime Configuration
 *
 * This configuration is used for Edge Functions and Middleware.
 * It's a minimal config since Edge runtime has limited capabilities.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Lower sample rate for edge functions
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,

  // Disable debug in edge runtime
  debug: false,

  beforeSend(event, hint) {
    // Filter out sensitive information
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
      delete event.request.headers?.cookie;
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

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

  // Edge-specific scope
  initialScope: {
    tags: {
      component: 'edge',
      runtime: 'edge',
      environment: process.env.NODE_ENV,
    },
  },

  // Error filtering for edge runtime
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'Network Error',
    'AbortError: The operation was aborted',
    'AbortError: signal is aborted without reason',
    /timeout after \d+ms$/i,
    'TimeoutError',
    'Failed to fetch',
  ],
});
