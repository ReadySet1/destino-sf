import * as Sentry from '@sentry/nextjs';

Sentry.init({
  // Use server-side DSN (private) with fallback to public DSN
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
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
      delete event.request.headers?.['square-webhook-signature'];
      delete event.request.headers?.['x-square-hmacsha256-signature'];

      // Remove sensitive query parameters
      if (event.request.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = event.request.query_string
          .replace(/access_token=[^&]+/g, 'access_token=[REDACTED]')
          .replace(/api_key=[^&]+/g, 'api_key=[REDACTED]')
          .replace(/secret=[^&]+/g, 'secret=[REDACTED]');
      }
    }

    // Filter out sensitive data from extra context
    if (event.extra) {
      delete event.extra.webhook_signature;
      delete event.extra.api_key;
      delete event.extra.secret;
      delete event.extra.token;
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

  // Server-side integrations
  integrations: [
    // Database monitoring
    Sentry.prismaIntegration(),

    // HTTP request monitoring
    Sentry.httpIntegration(),
  ],

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,

  // User context
  initialScope: {
    tags: {
      component: 'server',
      environment: process.env.NODE_ENV,
    },
  },

  // Error filtering
  ignoreErrors: [
    // Database connection errors that are expected during scaling
    'Connection terminated',
    'Connection timeout',
    'Connection refused',

    // Expected webhook errors
    'Webhook signature validation failed',
    'Duplicate webhook detected',

    // Next.js errors
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',

    // Network errors
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',

    // Prisma errors that are expected
    'Record to update not found',
    'Record to delete does not exist',
  ],

  // Transaction sampling
  tracesSampler: samplingContext => {
    // Never sample health checks
    if (samplingContext.request?.url?.includes('/api/health')) {
      return 0;
    }

    // Higher sampling for API routes
    if (samplingContext.request?.url?.includes('/api/')) {
      return process.env.NODE_ENV === 'production' ? 0.2 : 1.0;
    }

    // Lower sampling for static pages
    return process.env.NODE_ENV === 'production' ? 0.05 : 0.2;
  },

  // Breadcrumbs filtering
  beforeBreadcrumb: (breadcrumb, hint) => {
    // Don't log database queries in production breadcrumbs
    if (breadcrumb.category === 'query' && process.env.NODE_ENV === 'production') {
      return null;
    }

    // Don't log sensitive HTTP headers
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      delete breadcrumb.data.Authorization;
      delete breadcrumb.data.Cookie;
      delete breadcrumb.data['x-square-hmacsha256-signature'];
    }

    return breadcrumb;
  },
});
