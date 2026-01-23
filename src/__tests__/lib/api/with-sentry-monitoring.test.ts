/**
 * Tests for API Route Wrapper with Sentry Monitoring
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  startSpan: jest.fn((options, callback) => {
    const mockSpan = { setStatus: jest.fn() };
    return callback(mockSpan);
  }),
  setContext: jest.fn(),
  setTag: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock error monitor
jest.mock('@/lib/error-monitoring', () => ({
  errorMonitor: {
    captureAPIError: jest.fn(),
  },
  ErrorSeverity: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  },
}));

// Mock performance monitor
jest.mock('@/lib/monitoring/performance', () => ({
  performanceMonitor: {
    trackAPICall: jest.fn(),
  },
}));

import {
  withSentryMonitoring,
  withChildSpan,
  trackDatabaseQuery,
  trackExternalAPI,
  createErrorResponse,
} from '@/lib/api/with-sentry-monitoring';
import { ErrorSeverity } from '@/lib/error-monitoring';
import { performanceMonitor } from '@/lib/monitoring/performance';

// Helper to create mock NextRequest
function createMockRequest(
  url: string = 'http://localhost/api/test',
  method: string = 'GET'
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'user-agent': 'test-agent',
      'content-type': 'application/json',
    },
  });
}

describe('withSentryMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should wrap a successful handler', async () => {
    const handler = jest.fn().mockResolvedValue(
      NextResponse.json({ success: true }, { status: 200 })
    );

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'test.endpoint',
      operation: 'http.server',
    });

    const request = createMockRequest('http://localhost/api/test', 'POST');
    const response = await wrappedHandler(request);

    expect(handler).toHaveBeenCalledWith(request, undefined);
    expect(response.status).toBe(200);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'POST test.endpoint',
        op: 'http.server',
      }),
      expect.any(Function)
    );
  });

  it('should set Sentry context and tags', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'checkout.create',
      tags: { custom: 'tag' },
    });

    const request = createMockRequest('http://localhost/api/checkout', 'POST');
    await wrappedHandler(request);

    expect(Sentry.setContext).toHaveBeenCalledWith(
      'request',
      expect.objectContaining({
        method: 'POST',
        path: '/api/checkout',
      })
    );
    expect(Sentry.setTag).toHaveBeenCalledWith('route.name', 'checkout.create');
    expect(Sentry.setTag).toHaveBeenCalledWith('http.method', 'POST');
    expect(Sentry.setTag).toHaveBeenCalledWith('custom', 'tag');
  });

  it('should add breadcrumbs for request lifecycle', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'test.endpoint',
    });

    const request = createMockRequest();
    await wrappedHandler(request);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'http',
        category: 'api.request',
      })
    );
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'http',
        category: 'api.response',
      })
    );
  });

  it('should capture exceptions for handler errors', async () => {
    const error = new Error('Handler failed');
    const handler = jest.fn().mockRejectedValue(error);

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'failing.endpoint',
      errorSeverity: ErrorSeverity.HIGH,
    });

    const request = createMockRequest();

    await expect(wrappedHandler(request)).rejects.toThrow('Handler failed');

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'warning', // HIGH maps to warning
        tags: expect.objectContaining({
          route: 'failing.endpoint',
        }),
      })
    );
  });

  it('should track performance metrics', async () => {
    const handler = jest.fn().mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    );

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'test.endpoint',
      trackPerformance: true,
    });

    const request = createMockRequest('http://localhost/api/test', 'GET');
    await wrappedHandler(request);

    expect(performanceMonitor.trackAPICall).toHaveBeenCalledWith(
      'test.endpoint',
      'GET',
      expect.any(Number),
      200
    );
  });

  it('should not track performance when disabled', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'test.endpoint',
      trackPerformance: false,
    });

    await wrappedHandler(createMockRequest());

    expect(performanceMonitor.trackAPICall).not.toHaveBeenCalled();
  });

  it('should sanitize headers', async () => {
    const handler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const wrappedHandler = withSentryMonitoring(handler, {
      name: 'test.endpoint',
    });

    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      headers: {
        authorization: 'Bearer secret-token',
        'x-api-key': 'api-key-value',
        'content-type': 'application/json',
      },
    });

    await wrappedHandler(request);

    expect(Sentry.setContext).toHaveBeenCalledWith(
      'request',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: '[REDACTED]',
          'content-type': 'application/json',
        }),
      })
    );
  });
});

describe('withChildSpan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a child span for operations', async () => {
    const result = await withChildSpan('db.query', 'db', async () => {
      return [{ id: 1 }];
    });

    expect(result).toEqual([{ id: 1 }]);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'db.query',
        op: 'db',
      }),
      expect.any(Function)
    );
  });

  it('should add breadcrumb on success', async () => {
    await withChildSpan('test.operation', 'test', async () => 'result');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        category: 'test',
        message: 'test.operation',
      })
    );
  });

  it('should add error breadcrumb on failure', async () => {
    await expect(
      withChildSpan('failing.operation', 'test', async () => {
        throw new Error('Operation failed');
      })
    ).rejects.toThrow('Operation failed');

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        category: 'test',
        level: 'error',
      })
    );
  });

  it('should include custom attributes', async () => {
    await withChildSpan('custom.op', 'custom', async () => 'result', {
      'custom.attr': 'value',
    });

    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          'custom.attr': 'value',
        }),
      }),
      expect.any(Function)
    );
  });
});

describe('trackDatabaseQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should wrap database queries with span', async () => {
    const result = await trackDatabaseQuery('findOrders', async () => {
      return [{ id: '1' }, { id: '2' }];
    });

    expect(result).toHaveLength(2);
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'db.query',
        attributes: expect.objectContaining({
          'db.system': 'postgresql',
        }),
      }),
      expect.any(Function)
    );
  });
});

describe('trackExternalAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should wrap external API calls with span', async () => {
    const result = await trackExternalAPI('square', 'payments.create', async () => {
      return { paymentId: '123' };
    });

    expect(result).toEqual({ paymentId: '123' });
    expect(Sentry.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'square.payments.create',
        op: 'http.client',
        attributes: expect.objectContaining({
          'http.service': 'square',
          'http.endpoint': 'payments.create',
        }),
      }),
      expect.any(Function)
    );
  });
});

describe('createErrorResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create error response with Sentry tracking', () => {
    const response = createErrorResponse('Something went wrong', 500, {
      route: 'test.endpoint',
    });

    expect(response.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({
          route: 'test.endpoint',
          status: '500',
        }),
      })
    );
  });

  it('should handle Error objects', () => {
    const error = new Error('Custom error');
    const response = createErrorResponse(error, 400);

    expect(response.status).toBe(400);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        level: 'warning',
      })
    );
  });

  it('should include extra context', () => {
    createErrorResponse('Error', 500, {
      extra: { orderId: '123', userId: '456' },
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: expect.objectContaining({
          orderId: '123',
          userId: '456',
        }),
      })
    );
  });
});
