/**
 * API Route Wrapper with Sentry Transaction Tracing
 *
 * Provides automatic Sentry transaction creation, error capturing,
 * and performance monitoring for Next.js API routes.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { performanceMonitor } from '@/lib/monitoring/performance';
import { errorMonitor, ErrorSeverity } from '@/lib/error-monitoring';

export interface SentryMonitoringOptions {
  /** Transaction name for Sentry (e.g., 'checkout.create') */
  name: string;
  /** Operation type (default: 'http.server') */
  operation?: string;
  /** Tags to add to the transaction */
  tags?: Record<string, string>;
  /** Whether to track performance metrics (default: true) */
  trackPerformance?: boolean;
  /** Custom error severity for this endpoint */
  errorSeverity?: ErrorSeverity;
}

export type RouteHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with Sentry monitoring
 *
 * @example
 * ```typescript
 * // In your route.ts file:
 * export const POST = withSentryMonitoring(
 *   async (request) => {
 *     const body = await request.json();
 *     // ... handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   { name: 'checkout.create', operation: 'http.server' }
 * );
 * ```
 */
export function withSentryMonitoring(
  handler: RouteHandler,
  options: SentryMonitoringOptions
): RouteHandler {
  const {
    name,
    operation = 'http.server',
    tags = {},
    trackPerformance = true,
    errorSeverity = ErrorSeverity.MEDIUM,
  } = options;

  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    const startTime = Date.now();
    const transactionName = `${request.method} ${name}`;

    // Create a manual span for this operation
    return Sentry.startSpan(
      {
        name: transactionName,
        op: operation,
        attributes: {
          'http.method': request.method,
          'http.url': request.url,
          ...tags,
        },
      },
      async span => {
        let status = 200;
        let response: NextResponse;

        try {
          // Add request context
          Sentry.setContext('request', {
            method: request.method,
            url: request.url,
            path: new URL(request.url).pathname,
            headers: sanitizeHeaders(request.headers),
          });

          // Set tags for filtering
          Sentry.setTag('route.name', name);
          Sentry.setTag('http.method', request.method);
          Object.entries(tags).forEach(([key, value]) => {
            Sentry.setTag(key, value);
          });

          // Add breadcrumb for request start
          Sentry.addBreadcrumb({
            type: 'http',
            category: 'api.request',
            message: `${request.method} ${name}`,
            level: 'info',
            data: {
              url: request.url,
              method: request.method,
            },
          });

          // Execute the handler
          response = await handler(request, context);
          status = response.status;

          // Add success breadcrumb
          Sentry.addBreadcrumb({
            type: 'http',
            category: 'api.response',
            message: `${request.method} ${name} -> ${status}`,
            level: status >= 400 ? 'warning' : 'info',
            data: {
              status,
              duration: Date.now() - startTime,
            },
          });
        } catch (error) {
          status = 500;
          const errorObj = error instanceof Error ? error : new Error(String(error));

          // Capture the error with full context
          Sentry.captureException(errorObj, {
            level: mapSeverityToLevel(errorSeverity),
            tags: {
              route: name,
              method: request.method,
              ...tags,
            },
            extra: {
              requestUrl: request.url,
              requestMethod: request.method,
              duration: Date.now() - startTime,
            },
          });

          // Also log to our error monitor
          await errorMonitor.captureAPIError(
            errorObj,
            request.method,
            request.url,
            request.headers.get('user-agent') || undefined
          );

          // Add error breadcrumb
          Sentry.addBreadcrumb({
            type: 'error',
            category: 'api.error',
            message: errorObj.message,
            level: 'error',
            data: {
              route: name,
              status: 500,
              duration: Date.now() - startTime,
            },
          });

          // Re-throw to let Next.js handle the error response
          throw error;
        } finally {
          const duration = Date.now() - startTime;

          // Set span status
          if (span) {
            span.setStatus({
              code: status >= 400 ? 2 : 1, // 2 = error, 1 = ok
              message: status >= 400 ? 'Error' : 'OK',
            });
          }

          // Track performance metrics
          if (trackPerformance) {
            await performanceMonitor.trackAPICall(
              name,
              request.method,
              duration,
              status
            );
          }
        }

        return response!;
      }
    );
  };
}

/**
 * Create a child span for a sub-operation within an API route
 *
 * @example
 * ```typescript
 * const result = await withChildSpan('db.query', 'db', async () => {
 *   return await prisma.order.findMany();
 * });
 * ```
 */
export async function withChildSpan<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: operation,
      attributes,
    },
    async span => {
      const startTime = Date.now();

      try {
        const result = await fn();

        Sentry.addBreadcrumb({
          type: 'info',
          category: operation,
          message: name,
          level: 'info',
          data: {
            duration: Date.now() - startTime,
          },
        });

        return result;
      } catch (error) {
        if (span) {
          span.setStatus({
            code: 2,
            message: error instanceof Error ? error.message : 'Error',
          });
        }

        Sentry.addBreadcrumb({
          type: 'error',
          category: operation,
          message: `${name} failed`,
          level: 'error',
          data: {
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
          },
        });

        throw error;
      }
    }
  );
}

/**
 * Track a database query with Sentry span
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  return withChildSpan(queryName, 'db.query', fn, {
    'db.system': 'postgresql',
  });
}

/**
 * Track an external API call with Sentry span
 */
export async function trackExternalAPI<T>(
  serviceName: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  return withChildSpan(`${serviceName}.${endpoint}`, 'http.client', fn, {
    'http.service': serviceName,
    'http.endpoint': endpoint,
  });
}

/**
 * Sanitize headers for safe logging (remove sensitive values)
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

  headers.forEach((value, key) => {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });

  return sanitized;
}

/**
 * Map our error severity to Sentry severity level
 */
function mapSeverityToLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'debug';
    case ErrorSeverity.MEDIUM:
      return 'info';
    case ErrorSeverity.HIGH:
      return 'warning';
    case ErrorSeverity.CRITICAL:
      return 'error';
    default:
      return 'error';
  }
}

/**
 * Helper to create error responses with Sentry tracking
 */
export function createErrorResponse(
  error: Error | string,
  status: number = 500,
  options?: {
    route?: string;
    extra?: Record<string, unknown>;
  }
): NextResponse {
  const errorObj = error instanceof Error ? error : new Error(error);

  // Capture in Sentry
  Sentry.captureException(errorObj, {
    level: status >= 500 ? 'error' : 'warning',
    tags: {
      route: options?.route || 'unknown',
      status: status.toString(),
    },
    extra: options?.extra,
  });

  return NextResponse.json(
    {
      error: errorObj.message,
      status,
    },
    { status }
  );
}
