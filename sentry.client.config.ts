import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
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