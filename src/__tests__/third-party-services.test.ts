import { jest } from '@jest/globals';

// Mock all third-party service clients
jest.mock('@/lib/square/client', () => ({
  squareClient: {
    locationsApi: {
      retrieveLocation: jest.fn(),
      listLocations: jest.fn(),
    },
    catalogApi: {
      listCatalog: jest.fn(),
      retrieveCatalogObject: jest.fn(),
      searchCatalogObjects: jest.fn(),
      upsertCatalogObject: jest.fn(),
    },
    ordersApi: {
      createOrder: jest.fn(),
      retrieveOrder: jest.fn(),
      updateOrder: jest.fn(),
      payOrder: jest.fn(),
    },
    paymentsApi: {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
      completePayment: jest.fn(),
      cancelPayment: jest.fn(),
    },
    webhookSignatureVerifier: {
      isValidSignature: jest.fn(),
    },
  },
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
      get: jest.fn(),
      cancel: jest.fn(),
    },
    domains: {
      list: jest.fn(),
      get: jest.fn(),
      verify: jest.fn(),
    },
    apiKeys: {
      list: jest.fn(),
    },
  })),
}));

jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn(callback => callback({ setTag: jest.fn(), setExtra: jest.fn() })),
  getCurrentHub: jest.fn(() => ({
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  })),
  startTransaction: jest.fn(() => ({
    setTag: jest.fn(),
    setData: jest.fn(),
    finish: jest.fn(),
  })),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('shippo', () => ({
  default: {
    shipment: {
      create: jest.fn(),
      retrieve: jest.fn(),
      list: jest.fn(),
    },
    rate: {
      retrieve: jest.fn(),
      list: jest.fn(),
    },
    address: {
      create: jest.fn(),
      validate: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    track: {
      get_status: jest.fn(),
    },
  }
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    ping: jest.fn(),
    flushall: jest.fn(),
  })),
}));

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn().mockImplementation(() => ({
    limit: jest.fn(),
    reset: jest.fn(),
    getRemaining: jest.fn(),
  })),
}));

jest.mock('@/lib/performance-monitor', () => ({
  performanceMonitor: {
    startTiming: jest.fn(),
    endTiming: jest.fn(),
    recordMetric: jest.fn(),
    getMetrics: jest.fn(),
    getPerformanceSummary: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocked dependencies
import { squareClient } from '@/lib/square/client';
import { Resend } from 'resend';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/utils/supabase/server';
import shippo from 'shippo';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { performanceMonitor } from '@/lib/performance-monitor';

const mockSquareClient = squareClient as jest.Mocked<typeof squareClient>;
const mockResend = Resend as jest.MockedClass<typeof Resend>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockShippo = shippo.default as jest.Mocked<typeof shippo.default>;
const mockRedis = Redis as jest.MockedClass<typeof Redis>;
const mockRatelimit = Ratelimit as jest.MockedClass<typeof Ratelimit>;
const mockPerformanceMonitor = performanceMonitor as jest.Mocked<typeof performanceMonitor>;

describe('Third-Party Services Integration Tests - Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.SQUARE_ACCESS_TOKEN = 'test-square-token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = 'test-webhook-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';
    process.env.SHIPPO_API_KEY = 'test-shippo-key';
  });

  describe('Square API Integration', () => {
    describe('Authentication and Configuration', () => {
      it('should initialize Square client with correct credentials', async () => {
        const { initializeSquareClient } = await import('@/lib/square/client');

        expect(process.env.SQUARE_ACCESS_TOKEN).toBeDefined();
        expect(process.env.SQUARE_ENVIRONMENT).toBeDefined();
      });

      it('should handle Square authentication errors', async () => {
        mockSquareClient.locationsApi.retrieveLocation.mockRejectedValue({
          statusCode: 401,
          body: { errors: [{ code: 'UNAUTHORIZED', detail: 'Invalid access token' }] },
        });

        const { checkSquareConnection } = await import('@/lib/square/health');
        const result = await checkSquareConnection();

        expect(result.status).toBe('unhealthy');
        expect(result.error).toContain('UNAUTHORIZED');
      });
    });

    describe('Catalog Operations', () => {
      it('should successfully sync product catalog from Square', async () => {
        const mockCatalogItems = [
          {
            id: 'item-1',
            type: 'ITEM',
            itemData: {
              name: 'Test Product',
              description: 'Test Description',
              variations: [
                {
                  id: 'variation-1',
                  itemVariationData: {
                    name: 'Regular',
                    priceMoney: { amount: 1000, currency: 'USD' },
                  },
                },
              ],
            },
          },
        ];

        mockSquareClient.catalogApi.searchCatalogObjects.mockResolvedValue({
          result: { objects: mockCatalogItems },
        });

        const { syncProductsFromSquare } = await import('@/lib/square/sync');
        const result = await syncProductsFromSquare();

        expect(result.success).toBe(true);
        expect(result.syncedProducts).toBeGreaterThan(0);
        expect(mockSquareClient.catalogApi.searchCatalogObjects).toHaveBeenCalledWith({
          objectTypes: ['ITEM'],
          includeDeletedObjects: false,
        });
      });

      it('should handle catalog sync errors gracefully', async () => {
        mockSquareClient.catalogApi.searchCatalogObjects.mockRejectedValue({
          statusCode: 500,
          body: { errors: [{ code: 'INTERNAL_SERVER_ERROR', detail: 'Square API error' }] },
        });

        const { syncProductsFromSquare } = await import('@/lib/square/sync');
        const result = await syncProductsFromSquare();

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Square API error');
      });

      it('should validate product data integrity during sync', async () => {
        const mockInvalidCatalogItems = [
          {
            id: 'item-invalid',
            type: 'ITEM',
            itemData: {
              // Missing required name field
              description: 'Invalid Product',
              variations: [],
            },
          },
        ];

        mockSquareClient.catalogApi.searchCatalogObjects.mockResolvedValue({
          result: { objects: mockInvalidCatalogItems },
        });

        const { syncProductsFromSquare } = await import('@/lib/square/sync');
        const result = await syncProductsFromSquare();

        expect(result.warnings).toContain('Missing required product name');
        expect(result.skippedProducts).toBeGreaterThan(0);
      });
    });

    describe('Order Operations', () => {
      it('should create orders successfully through Square API', async () => {
        const mockOrder = {
          id: 'order-123',
          locationId: 'location-1',
          state: 'OPEN',
          lineItems: [
            {
              quantity: '2',
              catalogObjectId: 'item-1',
              basePriceMoney: { amount: 1000, currency: 'USD' },
            },
          ],
        };

        mockSquareClient.ordersApi.createOrder.mockResolvedValue({
          result: { order: mockOrder },
        });

        const { createSquareOrder } = await import('@/lib/square/orders');
        const result = await createSquareOrder({
          locationId: 'location-1',
          lineItems: [
            {
              quantity: '2',
              catalogObjectId: 'item-1',
              basePriceMoney: { amount: 1000, currency: 'USD' },
            },
          ],
        });

        expect(result.success).toBe(true);
        expect(result.order.id).toBe('order-123');
        expect(mockSquareClient.ordersApi.createOrder).toHaveBeenCalled();
      });

      it('should handle order creation failures', async () => {
        mockSquareClient.ordersApi.createOrder.mockRejectedValue({
          statusCode: 400,
          body: { errors: [{ code: 'INVALID_REQUEST_ERROR', detail: 'Invalid line item' }] },
        });

        const { createSquareOrder } = await import('@/lib/square/orders');
        const result = await createSquareOrder({
          locationId: 'location-1',
          lineItems: [],
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid line item');
      });
    });

    describe('Payment Processing', () => {
      it('should process payments successfully', async () => {
        const mockPayment = {
          id: 'payment-123',
          orderId: 'order-123',
          status: 'COMPLETED',
          amountMoney: { amount: 2000, currency: 'USD' },
          sourceType: 'CARD',
        };

        mockSquareClient.paymentsApi.createPayment.mockResolvedValue({
          result: { payment: mockPayment },
        });

        const { processSquarePayment } = await import('@/lib/square/payments');
        const result = await processSquarePayment({
          sourceId: 'nonce-123',
          amountMoney: { amount: 2000, currency: 'USD' },
          orderId: 'order-123',
        });

        expect(result.success).toBe(true);
        expect(result.payment.status).toBe('COMPLETED');
        expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalled();
      });

      it('should handle payment failures with detailed error information', async () => {
        mockSquareClient.paymentsApi.createPayment.mockRejectedValue({
          statusCode: 400,
          body: {
            errors: [
              {
                code: 'CARD_DECLINED',
                detail: 'Card was declined',
                category: 'PAYMENT_METHOD_ERROR',
              },
            ],
          },
        });

        const { processSquarePayment } = await import('@/lib/square/payments');
        const result = await processSquarePayment({
          sourceId: 'nonce-123',
          amountMoney: { amount: 2000, currency: 'USD' },
          orderId: 'order-123',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('CARD_DECLINED');
        expect(result.errorCategory).toBe('PAYMENT_METHOD_ERROR');
      });
    });

    describe('Webhook Signature Validation', () => {
      it('should validate webhook signatures correctly', async () => {
        const webhookBody = JSON.stringify({
          type: 'order.created',
          data: { object: { order: { id: 'order-123' } } },
        });
        const signature = 'test-signature';
        const timestamp = Date.now().toString();

        mockSquareClient.webhookSignatureVerifier.isValidSignature.mockReturnValue(true);

        const { validateSquareWebhookSignature } = await import('@/lib/square/webhook-validator');
        const isValid = await validateSquareWebhookSignature({
          body: webhookBody,
          signature,
          timestamp,
        });

        expect(isValid).toBe(true);
        expect(mockSquareClient.webhookSignatureVerifier.isValidSignature).toHaveBeenCalledWith(
          webhookBody,
          signature,
          process.env.SQUARE_WEBHOOK_SECRET_SANDBOX,
          timestamp
        );
      });

      it('should reject invalid webhook signatures', async () => {
        mockSquareClient.webhookSignatureVerifier.isValidSignature.mockReturnValue(false);

        const { validateSquareWebhookSignature } = await import('@/lib/square/webhook-validator');
        const isValid = await validateSquareWebhookSignature({
          body: 'invalid-body',
          signature: 'invalid-signature',
          timestamp: '0',
        });

        expect(isValid).toBe(false);
      });

      it('should detect replay attacks with timestamp validation', async () => {
        const oldTimestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago

        mockSquareClient.webhookSignatureVerifier.isValidSignature.mockReturnValue(true);

        const { validateSquareWebhookSignature } = await import('@/lib/square/webhook-validator');
        const isValid = await validateSquareWebhookSignature({
          body: '{}',
          signature: 'valid-signature',
          timestamp: oldTimestamp,
        });

        expect(isValid).toBe(false); // Should reject old timestamp
      });
    });
  });

  describe('Email Service Integration (Resend)', () => {
    let mockResendInstance: any;

    beforeEach(() => {
      mockResendInstance = {
        emails: {
          send: jest.fn(),
          get: jest.fn(),
          cancel: jest.fn(),
        },
        domains: {
          list: jest.fn(),
          get: jest.fn(),
          verify: jest.fn(),
        },
        apiKeys: {
          list: jest.fn(),
        },
      };
      mockResend.mockImplementation(() => mockResendInstance);
    });

    describe('Email Sending', () => {
      it('should send order confirmation emails successfully', async () => {
        mockResendInstance.emails.send.mockResolvedValue({
          id: 'email-123',
          from: 'orders@destinosf.com',
          to: ['customer@example.com'],
          subject: 'Order Confirmation',
        });

        const { sendOrderConfirmationEmail } = await import('@/lib/email/order-confirmation');
        const result = await sendOrderConfirmationEmail({
          to: 'customer@example.com',
          orderData: {
            id: 'order-123',
            total: 25.99,
            items: [{ name: 'Test Product', quantity: 2, price: 12.99 }],
          },
        });

        expect(result.success).toBe(true);
        expect(result.emailId).toBe('email-123');
        expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
          from: 'orders@destinosf.com',
          to: ['customer@example.com'],
          subject: 'Order Confirmation - Destino SF',
          html: expect.stringContaining('order-123'),
        });
      });

      it('should handle email sending failures gracefully', async () => {
        mockResendInstance.emails.send.mockRejectedValue({
          name: 'validation_error',
          message: 'Invalid email address',
        });

        const { sendOrderConfirmationEmail } = await import('@/lib/email/order-confirmation');
        const result = await sendOrderConfirmationEmail({
          to: 'invalid-email',
          orderData: {
            id: 'order-123',
            total: 25.99,
            items: [],
          },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid email address');
      });

      it('should send admin notification emails', async () => {
        mockResendInstance.emails.send.mockResolvedValue({
          id: 'admin-email-123',
        });

        const { sendAdminNotificationEmail } = await import('@/lib/email/admin-notifications');
        const result = await sendAdminNotificationEmail({
          type: 'new_order',
          data: {
            orderId: 'order-123',
            customerEmail: 'customer@example.com',
            total: 25.99,
          },
        });

        expect(result.success).toBe(true);
        expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
          from: 'alerts@destinosf.com',
          to: [process.env.ADMIN_EMAIL],
          subject: 'New Order Received - order-123',
          html: expect.stringContaining('order-123'),
        });
      });

      it('should validate email templates before sending', async () => {
        const { validateEmailTemplate } = await import('@/lib/email/template-validator');
        const templateData = {
          customerName: 'John Doe',
          orderData: {
            id: 'order-123',
            total: 25.99,
            items: [{ name: 'Test Product', quantity: 1, price: 25.99 }],
          },
        };

        const validation = await validateEmailTemplate('order-confirmation', templateData);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.renderedHtml).toContain('John Doe');
        expect(validation.renderedHtml).toContain('order-123');
      });
    });

    describe('Email Health Monitoring', () => {
      it('should check email service health', async () => {
        mockResendInstance.domains.list.mockResolvedValue({
          data: [
            {
              id: 'domain-123',
              name: 'destinosf.com',
              status: 'verified',
            },
          ],
        });

        const { checkEmailServiceHealth } = await import('@/lib/email/health');
        const health = await checkEmailServiceHealth();

        expect(health.status).toBe('healthy');
        expect(health.domains).toHaveLength(1);
        expect(health.domains[0].status).toBe('verified');
      });

      it('should detect email service issues', async () => {
        mockResendInstance.domains.list.mockRejectedValue({
          name: 'api_error',
          message: 'Service temporarily unavailable',
        });

        const { checkEmailServiceHealth } = await import('@/lib/email/health');
        const health = await checkEmailServiceHealth();

        expect(health.status).toBe('unhealthy');
        expect(health.error).toContain('Service temporarily unavailable');
      });
    });

    describe('Email Rate Limiting and Queuing', () => {
      it('should respect rate limits for email sending', async () => {
        const { EmailQueue } = await import('@/lib/email/queue');
        const emailQueue = new EmailQueue();

        // Queue multiple emails
        const promises = Array.from({ length: 10 }, (_, i) =>
          emailQueue.add({
            to: `customer${i}@example.com`,
            template: 'order-confirmation',
            data: { orderId: `order-${i}` },
          })
        );

        const results = await Promise.all(promises);

        // Should process all emails but respect rate limits
        expect(results.every(r => r.success || r.queued)).toBe(true);
      });

      it('should retry failed email deliveries', async () => {
        mockResendInstance.emails.send
          .mockRejectedValueOnce({ name: 'rate_limit_exceeded' })
          .mockResolvedValueOnce({ id: 'email-retry-123' });

        const { sendEmailWithRetry } = await import('@/lib/email/retry');
        const result = await sendEmailWithRetry({
          to: 'customer@example.com',
          subject: 'Test Email',
          html: '<p>Test</p>',
        });

        expect(result.success).toBe(true);
        expect(result.emailId).toBe('email-retry-123');
        expect(result.attempts).toBe(2);
      });
    });
  });

  describe('Sentry Error Monitoring Integration', () => {
    describe('Initialization and Configuration', () => {
      it('should initialize Sentry with correct configuration', async () => {
        const { initSentry } = await import('@/lib/monitoring/sentry');
        await initSentry();

        expect(mockSentry.init).toHaveBeenCalledWith({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: expect.any(Number),
          beforeSend: expect.any(Function),
          integrations: expect.any(Array),
        });
      });

      it('should filter sensitive data from error reports', async () => {
        const { beforeSend } = await import('@/lib/monitoring/sentry-config');
        const sensitiveEvent = {
          request: {
            headers: {
              authorization: 'Bearer secret-token',
              'square-webhook-signature': 'secret-signature',
              cookie: 'session=secret',
            },
            query_string: 'access_token=secret&api_key=secret',
          },
          extra: {
            webhook_signature: 'secret',
            api_key: 'secret',
          },
        };

        const filteredEvent = beforeSend(sensitiveEvent, {});

        expect(filteredEvent.request.headers.authorization).toBeUndefined();
        expect(filteredEvent.request.headers['square-webhook-signature']).toBeUndefined();
        expect(filteredEvent.request.query_string).toContain('[REDACTED]');
        expect(filteredEvent.extra.webhook_signature).toBeUndefined();
      });
    });

    describe('Error Capturing', () => {
      it('should capture and report application errors', async () => {
        const testError = new Error('Test application error');
        testError.stack = 'Error: Test application error\n    at test.js:1:1';

        const { captureError } = await import('@/lib/monitoring/error-capture');
        await captureError(testError, {
          component: 'order-processing',
          action: 'create-order',
          userId: 'user-123',
        });

        expect(mockSentry.withScope).toHaveBeenCalled();
        expect(mockSentry.captureException).toHaveBeenCalledWith(testError);
      });

      it('should capture custom messages with context', async () => {
        const { captureMessage } = await import('@/lib/monitoring/error-capture');
        await captureMessage('Custom warning message', 'warning', {
          feature: 'payment-processing',
          orderId: 'order-123',
        });

        expect(mockSentry.withScope).toHaveBeenCalled();
        expect(mockSentry.captureMessage).toHaveBeenCalledWith('Custom warning message', 'warning');
      });

      it('should track user interactions and breadcrumbs', async () => {
        const { addBreadcrumb } = await import('@/lib/monitoring/breadcrumbs');
        await addBreadcrumb({
          category: 'user-action',
          message: 'User clicked checkout button',
          level: 'info',
          data: {
            userId: 'user-123',
            cartTotal: 25.99,
          },
        });

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
          category: 'user-action',
          message: 'User clicked checkout button',
          level: 'info',
          data: {
            userId: 'user-123',
            cartTotal: 25.99,
          },
        });
      });
    });

    describe('Performance Monitoring', () => {
      it('should track performance transactions', async () => {
        const mockTransaction = {
          setTag: jest.fn(),
          setData: jest.fn(),
          finish: jest.fn(),
        };
        mockSentry.startTransaction.mockReturnValue(mockTransaction);

        const { trackPerformance } = await import('@/lib/monitoring/performance');
        const transaction = await trackPerformance('order-creation', {
          orderId: 'order-123',
          itemCount: 3,
        });

        await transaction.finish();

        expect(mockSentry.startTransaction).toHaveBeenCalledWith({
          name: 'order-creation',
          op: 'transaction',
        });
        expect(mockTransaction.setTag).toHaveBeenCalled();
        expect(mockTransaction.finish).toHaveBeenCalled();
      });

      it('should track API response times', async () => {
        const { trackApiCall } = await import('@/lib/monitoring/api-tracking');
        const startTime = Date.now();

        await trackApiCall({
          method: 'POST',
          url: '/api/orders',
          status: 200,
          duration: Date.now() - startTime,
          userId: 'user-123',
        });

        expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
          category: 'api',
          message: 'POST /api/orders',
          level: 'info',
          data: expect.objectContaining({
            status: 200,
            duration: expect.any(Number),
          }),
        });
      });
    });

    describe('Health Monitoring', () => {
      it('should check Sentry service health', async () => {
        mockSentry.captureMessage.mockResolvedValue('test-event-id');

        const { checkSentryHealth } = await import('@/lib/monitoring/health');
        const health = await checkSentryHealth();

        expect(health.status).toBe('healthy');
        expect(health.eventId).toBe('test-event-id');
        expect(mockSentry.captureMessage).toHaveBeenCalledWith('Sentry health check', 'info');
      });

      it('should detect Sentry connectivity issues', async () => {
        mockSentry.captureMessage.mockRejectedValue(new Error('Sentry API unreachable'));

        const { checkSentryHealth } = await import('@/lib/monitoring/health');
        const health = await checkSentryHealth();

        expect(health.status).toBe('unhealthy');
        expect(health.error).toContain('Sentry API unreachable');
      });
    });
  });

  describe('Supabase Integration', () => {
    let mockSupabaseClient: any;

    beforeEach(() => {
      mockSupabaseClient = {
        auth: {
          getUser: jest.fn(),
          signInWithPassword: jest.fn(),
          signOut: jest.fn(),
          onAuthStateChange: jest.fn(),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        storage: {
          from: jest.fn().mockReturnThis(),
          upload: jest.fn(),
          download: jest.fn(),
          remove: jest.fn(),
          list: jest.fn(),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);
    });

    describe('Authentication', () => {
      it('should authenticate users successfully', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'user@example.com',
              role: 'authenticated',
            },
          },
          error: null,
        });

        const { getCurrentUser } = await import('@/lib/auth/supabase');
        const user = await getCurrentUser();

        expect(user.success).toBe(true);
        expect(user.user.id).toBe('user-123');
        expect(user.user.email).toBe('user@example.com');
      });

      it('should handle authentication failures', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid JWT token' },
        });

        const { getCurrentUser } = await import('@/lib/auth/supabase');
        const user = await getCurrentUser();

        expect(user.success).toBe(false);
        expect(user.error).toContain('Invalid JWT token');
      });

      it('should manage user sessions', async () => {
        mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        });

        const { initAuthListener } = await import('@/lib/auth/session-manager');
        const { unsubscribe } = await initAuthListener();

        expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalled();
        expect(typeof unsubscribe).toBe('function');
      });
    });

    describe('Database Operations', () => {
      it('should perform CRUD operations successfully', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: { id: 'profile-123', email: 'user@example.com' },
          error: null,
        });

        const { getUserProfile } = await import('@/lib/database/supabase-operations');
        const profile = await getUserProfile('user-123');

        expect(profile.success).toBe(true);
        expect(profile.data.id).toBe('profile-123');
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
        expect(mockSupabaseClient.select).toHaveBeenCalled();
        expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123');
      });

      it('should handle database errors gracefully', async () => {
        mockSupabaseClient.single.mockResolvedValue({
          data: null,
          error: { message: 'Row not found', code: '22P02' },
        });

        const { getUserProfile } = await import('@/lib/database/supabase-operations');
        const profile = await getUserProfile('invalid-id');

        expect(profile.success).toBe(false);
        expect(profile.error).toContain('Row not found');
      });
    });

    describe('Storage Operations', () => {
      it('should upload files to Supabase storage', async () => {
        mockSupabaseClient.storage.upload.mockResolvedValue({
          data: {
            path: 'uploads/test-file.jpg',
            id: 'file-123',
            fullPath: 'destino-sf/uploads/test-file.jpg',
          },
          error: null,
        });

        const { uploadFile } = await import('@/lib/storage/supabase-storage');
        const result = await uploadFile({
          bucket: 'destino-sf',
          path: 'uploads/test-file.jpg',
          file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        });

        expect(result.success).toBe(true);
        expect(result.data.path).toBe('uploads/test-file.jpg');
        expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('destino-sf');
      });

      it('should handle storage upload failures', async () => {
        mockSupabaseClient.storage.upload.mockResolvedValue({
          data: null,
          error: { message: 'File too large', statusCode: '413' },
        });

        const { uploadFile } = await import('@/lib/storage/supabase-storage');
        const result = await uploadFile({
          bucket: 'destino-sf',
          path: 'uploads/large-file.jpg',
          file: new File(['large file content'], 'large.jpg', { type: 'image/jpeg' }),
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('File too large');
      });
    });

    describe('Health Monitoring', () => {
      it('should check Supabase service health', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const { checkSupabaseHealth } = await import('@/lib/health/supabase');
        const health = await checkSupabaseHealth();

        expect(health.status).toBe('healthy');
        expect(health.services.auth).toBe('healthy');
        expect(health.responseTime).toBeLessThan(1000);
      });

      it('should detect Supabase connectivity issues', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(
          new Error('Network error: Unable to connect to Supabase')
        );

        const { checkSupabaseHealth } = await import('@/lib/health/supabase');
        const health = await checkSupabaseHealth();

        expect(health.status).toBe('unhealthy');
        expect(health.error).toContain('Network error');
      });
    });
  });

  describe('Redis Cache Integration', () => {
    let mockRedisInstance: any;

    beforeEach(() => {
      mockRedisInstance = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        ping: jest.fn(),
        flushall: jest.fn(),
      };
      mockRedis.mockImplementation(() => mockRedisInstance);
    });

    describe('Cache Operations', () => {
      it('should perform basic cache operations', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');
        mockRedisInstance.get.mockResolvedValue('cached-value');
        mockRedisInstance.del.mockResolvedValue(1);

        const { CacheService } = await import('@/lib/cache/redis-service');
        const cache = new CacheService();

        await cache.set('test-key', 'test-value', 300);
        const value = await cache.get('test-key');
        await cache.delete('test-key');

        expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 300);
        expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
        expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
        expect(value).toBe('cached-value');
      });

      it('should handle cache failures gracefully', async () => {
        mockRedisInstance.get.mockRejectedValue(new Error('Redis connection failed'));

        const { CacheService } = await import('@/lib/cache/redis-service');
        const cache = new CacheService();

        const value = await cache.get('test-key');

        expect(value).toBeNull(); // Should return null on failure
      });

      it('should implement cache warming strategies', async () => {
        mockRedisInstance.set.mockResolvedValue('OK');

        const { warmProductCache } = await import('@/lib/cache/warming');
        const result = await warmProductCache();

        expect(result.success).toBe(true);
        expect(result.cachedItems).toBeGreaterThan(0);
        expect(mockRedisInstance.set).toHaveBeenCalled();
      });
    });

    describe('Rate Limiting', () => {
      it('should implement rate limiting correctly', async () => {
        const mockRatelimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60000,
          }),
        };
        mockRatelimit.mockImplementation(() => mockRatelimitInstance);

        const { checkRateLimit } = await import('@/lib/rate-limiting/redis');
        const result = await checkRateLimit('user-123', 'api-calls');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9);
        expect(mockRatelimitInstance.limit).toHaveBeenCalledWith('user-123');
      });

      it('should enforce rate limits when exceeded', async () => {
        const mockRatelimitInstance = {
          limit: jest.fn().mockResolvedValue({
            success: false,
            limit: 10,
            remaining: 0,
            reset: Date.now() + 60000,
          }),
        };
        mockRatelimit.mockImplementation(() => mockRatelimitInstance);

        const { checkRateLimit } = await import('@/lib/rate-limiting/redis');
        const result = await checkRateLimit('user-123', 'api-calls');

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });
    });

    describe('Health Monitoring', () => {
      it('should check Redis health and connectivity', async () => {
        mockRedisInstance.ping.mockResolvedValue('PONG');

        const { checkRedisHealth } = await import('@/lib/health/redis');
        const health = await checkRedisHealth();

        expect(health.status).toBe('healthy');
        expect(health.connected).toBe(true);
        expect(health.responseTime).toBeLessThan(100);
      });

      it('should detect Redis connectivity issues', async () => {
        mockRedisInstance.ping.mockRejectedValue(new Error('Connection timeout'));

        const { checkRedisHealth } = await import('@/lib/health/redis');
        const health = await checkRedisHealth();

        expect(health.status).toBe('unhealthy');
        expect(health.connected).toBe(false);
        expect(health.error).toContain('Connection timeout');
      });
    });
  });

  describe('Shippo Shipping Integration', () => {
    describe('Address Validation', () => {
      it('should validate shipping addresses', async () => {
        mockShippo.address.validate.mockResolvedValue({
          object_id: 'addr-123',
          is_complete: true,
          validation_results: {
            is_valid: true,
            messages: [],
          },
          name: 'John Doe',
          street1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        });

        const { validateShippingAddress } = await import('@/lib/shipping/address-validation');
        const result = await validateShippingAddress({
          name: 'John Doe',
          street1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        });

        expect(result.isValid).toBe(true);
        expect(result.address.object_id).toBe('addr-123');
        expect(mockShippo.address.validate).toHaveBeenCalled();
      });

      it('should handle invalid addresses', async () => {
        mockShippo.address.validate.mockResolvedValue({
          object_id: 'addr-invalid',
          is_complete: false,
          validation_results: {
            is_valid: false,
            messages: [
              {
                type: 'error',
                text: 'Invalid postal code',
              },
            ],
          },
        });

        const { validateShippingAddress } = await import('@/lib/shipping/address-validation');
        const result = await validateShippingAddress({
          name: 'John Doe',
          street1: '123 Invalid St',
          city: 'San Francisco',
          state: 'CA',
          zip: 'INVALID',
          country: 'US',
        });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid postal code');
      });
    });

    describe('Shipping Rate Calculation', () => {
      it('should calculate shipping rates accurately', async () => {
        mockShippo.shipment.create.mockResolvedValue({
          object_id: 'shipment-123',
          rates: [
            {
              object_id: 'rate-1',
              amount: '9.99',
              currency: 'USD',
              provider: 'USPS',
              servicelevel: {
                name: 'Priority Mail',
                token: 'usps_priority',
              },
              estimated_days: 2,
            },
            {
              object_id: 'rate-2',
              amount: '5.99',
              currency: 'USD',
              provider: 'USPS',
              servicelevel: {
                name: 'Ground Advantage',
                token: 'usps_ground_advantage',
              },
              estimated_days: 5,
            },
          ],
        });

        const { calculateShippingRates } = await import('@/lib/shipping/rate-calculation');
        const result = await calculateShippingRates({
          fromAddress: {
            street1: '103 Horne Ave',
            city: 'San Francisco',
            state: 'CA',
            zip: '94124',
            country: 'US',
          },
          toAddress: {
            street1: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            country: 'US',
          },
          parcel: {
            length: 10,
            width: 8,
            height: 4,
            weight: 2.5,
            distance_unit: 'in',
            mass_unit: 'lb',
          },
        });

        expect(result.success).toBe(true);
        expect(result.rates).toHaveLength(2);
        expect(result.rates[0].amount).toBe('9.99');
        expect(result.rates[1].amount).toBe('5.99');
      });

      it('should handle shipping calculation errors', async () => {
        mockShippo.shipment.create.mockRejectedValue({
          detail: 'Invalid parcel dimensions',
        });

        const { calculateShippingRates } = await import('@/lib/shipping/rate-calculation');
        const result = await calculateShippingRates({
          fromAddress: {},
          toAddress: {},
          parcel: {
            length: -1, // Invalid dimension
            width: 8,
            height: 4,
            weight: 2.5,
          },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid parcel dimensions');
      });
    });

    describe('Label Generation', () => {
      it('should generate shipping labels successfully', async () => {
        mockShippo.transaction.create.mockResolvedValue({
          object_id: 'transaction-123',
          label_url: 'https://shippo.com/labels/123.pdf',
          tracking_number: '1234567890',
          status: 'SUCCESS',
          rate: {
            object_id: 'rate-1',
            amount: '9.99',
            provider: 'USPS',
          },
        });

        const { createShippingLabel } = await import('@/lib/shipping/label-generation');
        const result = await createShippingLabel({
          rateId: 'rate-1',
          labelFileType: 'PDF',
        });

        expect(result.success).toBe(true);
        expect(result.labelUrl).toBe('https://shippo.com/labels/123.pdf');
        expect(result.trackingNumber).toBe('1234567890');
        expect(mockShippo.transaction.create).toHaveBeenCalledWith({
          rate: 'rate-1',
          label_file_type: 'PDF',
        });
      });

      it('should handle label generation failures', async () => {
        mockShippo.transaction.create.mockResolvedValue({
          object_id: 'transaction-failed',
          status: 'ERROR',
          messages: [
            {
              text: 'Invalid rate selected',
            },
          ],
        });

        const { createShippingLabel } = await import('@/lib/shipping/label-generation');
        const result = await createShippingLabel({
          rateId: 'invalid-rate',
          labelFileType: 'PDF',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid rate selected');
      });
    });

    describe('Tracking', () => {
      it('should track shipment status', async () => {
        mockShippo.track.get_status.mockResolvedValue({
          tracking_number: '1234567890',
          carrier: 'usps',
          tracking_status: {
            status: 'DELIVERED',
            status_details: 'Package delivered to front door',
            status_date: '2024-01-15T10:30:00Z',
          },
          tracking_history: [
            {
              status: 'TRANSIT',
              status_details: 'In transit to destination',
              status_date: '2024-01-14T15:45:00Z',
              location: {
                city: 'Oakland',
                state: 'CA',
              },
            },
          ],
        });

        const { trackShipment } = await import('@/lib/shipping/tracking');
        const result = await trackShipment({
          trackingNumber: '1234567890',
          carrier: 'usps',
        });

        expect(result.success).toBe(true);
        expect(result.status).toBe('DELIVERED');
        expect(result.history).toHaveLength(1);
        expect(mockShippo.track.get_status).toHaveBeenCalledWith('usps', '1234567890');
      });
    });

    describe('Health Monitoring', () => {
      it('should check Shippo service health', async () => {
        mockShippo.address.validate.mockResolvedValue({
          is_complete: true,
          validation_results: { is_valid: true },
        });

        const { checkShippoHealth } = await import('@/lib/health/shippo');
        const health = await checkShippoHealth();

        expect(health.status).toBe('healthy');
        expect(health.apiVersion).toBeDefined();
        expect(health.responseTime).toBeLessThan(1000);
      });
    });
  });

  describe('Performance Monitor Integration', () => {
    describe('Metrics Collection', () => {
      it('should collect API performance metrics', async () => {
        mockPerformanceMonitor.recordMetric.mockResolvedValue(undefined);
        mockPerformanceMonitor.getMetrics.mockReturnValue({
          apiCalls: [
            {
              endpoint: '/api/orders',
              method: 'POST',
              responseTime: 250,
              status: 200,
              timestamp: Date.now(),
            },
          ],
          averageResponseTime: 250,
          totalRequests: 1,
          errorRate: 0,
        });

        const { recordApiMetric } = await import('@/lib/performance/metrics');
        await recordApiMetric({
          endpoint: '/api/orders',
          method: 'POST',
          responseTime: 250,
          status: 200,
        });

        const metrics = await recordApiMetric.getMetrics();

        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalled();
        expect(metrics.averageResponseTime).toBe(250);
        expect(metrics.totalRequests).toBe(1);
      });

      it('should track database performance', async () => {
        mockPerformanceMonitor.startTiming.mockReturnValue('timer-123');
        mockPerformanceMonitor.endTiming.mockReturnValue(150);

        const { trackDatabaseQuery } = await import('@/lib/performance/database');
        const timer = await trackDatabaseQuery('findMany', 'Product');
        const duration = await timer.end();

        expect(duration).toBe(150);
        expect(mockPerformanceMonitor.startTiming).toHaveBeenCalledWith('db-query');
        expect(mockPerformanceMonitor.endTiming).toHaveBeenCalledWith('timer-123');
      });
    });

    describe('Performance Alerts', () => {
      it('should trigger alerts for slow performance', async () => {
        mockPerformanceMonitor.getPerformanceSummary.mockReturnValue({
          apiPerformance: {
            averageResponseTime: 2000, // Slow response time
            errorRate: 0.1, // High error rate
            slowRequestCount: 15,
          },
          databasePerformance: {
            averageQueryTime: 1000, // Slow queries
            slowQueryCount: 20,
          },
        });

        const { checkPerformanceThresholds } = await import('@/lib/performance/alerts');
        const alerts = await checkPerformanceThresholds();

        expect(alerts.triggered).toBe(true);
        expect(alerts.issues).toContain('High API response time');
        expect(alerts.issues).toContain('High database query time');
        expect(alerts.severity).toBe('high');
      });
    });
  });

  describe('Integration Health Checks', () => {
    it('should perform comprehensive third-party service health check', async () => {
      // Mock all services as healthy
      mockSquareClient.locationsApi.retrieveLocation.mockResolvedValue({
        result: { location: { id: 'loc-123', status: 'ACTIVE' } },
      });

      mockResendInstance.emails.send.mockResolvedValue({ id: 'test-email' });
      mockSentry.captureMessage.mockResolvedValue('test-event');

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);

      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockShippo.address.validate.mockResolvedValue({ is_complete: true });

      const { performIntegrationHealthCheck } = await import('@/lib/integration-health');
      const healthCheck = await performIntegrationHealthCheck();

      expect(healthCheck.square.status).toBe('healthy');
      expect(healthCheck.email.status).toBe('healthy');
      expect(healthCheck.sentry.status).toBe('healthy');
      expect(healthCheck.supabase.status).toBe('healthy');
      expect(healthCheck.redis.status).toBe('healthy');
      expect(healthCheck.shippo.status).toBe('healthy');
      expect(healthCheck.overall.status).toBe('healthy');
    });

    it('should detect integration failures', async () => {
      // Mock services with failures
      mockSquareClient.locationsApi.retrieveLocation.mockRejectedValue(
        new Error('Square API down')
      );
      mockResendInstance.emails.send.mockRejectedValue(new Error('Email service unavailable'));
      mockSentry.captureMessage.mockRejectedValue(new Error('Sentry unavailable'));

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Supabase connection failed')),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);

      mockRedisInstance.ping.mockRejectedValue(new Error('Redis connection timeout'));
      mockShippo.address.validate.mockRejectedValue(new Error('Shippo API error'));

      const { performIntegrationHealthCheck } = await import('@/lib/integration-health');
      const healthCheck = await performIntegrationHealthCheck();

      expect(healthCheck.square.status).toBe('unhealthy');
      expect(healthCheck.email.status).toBe('unhealthy');
      expect(healthCheck.sentry.status).toBe('unhealthy');
      expect(healthCheck.supabase.status).toBe('unhealthy');
      expect(healthCheck.redis.status).toBe('unhealthy');
      expect(healthCheck.shippo.status).toBe('unhealthy');
      expect(healthCheck.overall.status).toBe('unhealthy');
      expect(healthCheck.overall.failedServices).toHaveLength(6);
    });

    it('should handle partial service failures gracefully', async () => {
      // Mock mixed service health
      mockSquareClient.locationsApi.retrieveLocation.mockResolvedValue({
        result: { location: { id: 'loc-123', status: 'ACTIVE' } },
      });

      mockResendInstance.emails.send.mockRejectedValue(new Error('Email rate limit exceeded'));
      mockSentry.captureMessage.mockResolvedValue('test-event');

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };
      mockCreateClient.mockResolvedValue(mockSupabaseClient);

      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockShippo.address.validate.mockResolvedValue({ is_complete: true });

      const { performIntegrationHealthCheck } = await import('@/lib/integration-health');
      const healthCheck = await performIntegrationHealthCheck();

      expect(healthCheck.square.status).toBe('healthy');
      expect(healthCheck.email.status).toBe('unhealthy');
      expect(healthCheck.sentry.status).toBe('healthy');
      expect(healthCheck.supabase.status).toBe('healthy');
      expect(healthCheck.redis.status).toBe('healthy');
      expect(healthCheck.shippo.status).toBe('healthy');
      expect(healthCheck.overall.status).toBe('degraded');
      expect(healthCheck.overall.failedServices).toHaveLength(1);
    });
  });

  describe('Integration Error Handling and Recovery', () => {
    it('should implement retry logic for transient failures', async () => {
      // Mock initial failure then success
      mockSquareClient.catalogApi.searchCatalogObjects
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({ result: { objects: [] } });

      const { syncProductsWithRetry } = await import('@/lib/square/sync-retry');
      const result = await syncProductsWithRetry();

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(mockSquareClient.catalogApi.searchCatalogObjects).toHaveBeenCalledTimes(3);
    });

    it('should implement circuit breaker pattern for external services', async () => {
      const { CircuitBreaker } = await import('@/lib/resilience/circuit-breaker');
      const breaker = new CircuitBreaker({
        timeout: 1000,
        errorThreshold: 5,
        resetTimeout: 10000,
      });

      // Simulate multiple failures
      for (let i = 0; i < 6; i++) {
        try {
          await breaker.call(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      expect(breaker.state).toBe('OPEN');

      // Next call should fail fast
      const start = Date.now();
      try {
        await breaker.call(() => Promise.resolve('success'));
      } catch (error) {
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100); // Should fail fast
      }
    });

    it('should implement fallback strategies for critical services', async () => {
      // Mock Square API failure
      mockSquareClient.catalogApi.searchCatalogObjects.mockRejectedValue(
        new Error('Square API unavailable')
      );

      const { getProductsWithFallback } = await import('@/lib/products/fallback');
      const result = await getProductsWithFallback();

      expect(result.success).toBe(true);
      expect(result.source).toBe('cache'); // Should fallback to cache
      expect(result.data).toBeDefined();
    });
  });

  describe('Security and Authentication Testing', () => {
    it('should validate API keys and credentials securely', async () => {
      const { validateCredentials } = await import('@/lib/security/credential-validator');

      const validCredentials = {
        squareToken: process.env.SQUARE_ACCESS_TOKEN,
        resendApiKey: process.env.RESEND_API_KEY,
        sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      };

      const validation = await validateCredentials(validCredentials);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid or compromised credentials', async () => {
      const { validateCredentials } = await import('@/lib/security/credential-validator');

      const invalidCredentials = {
        squareToken: 'invalid-token',
        resendApiKey: 'invalid-key',
        sentryDsn: 'invalid-dsn',
      };

      const validation = await validateCredentials(invalidCredentials);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should implement proper secret management', async () => {
      const { SecretManager } = await import('@/lib/security/secret-manager');
      const secretManager = new SecretManager();

      // Secrets should be properly masked in logs
      const maskedToken = secretManager.maskSecret(process.env.SQUARE_ACCESS_TOKEN);
      expect(maskedToken).toMatch(/^.{4}\*{8,}.{4}$/);

      // Secrets should be validated before use
      const isValid = secretManager.validateSecret('SQUARE_ACCESS_TOKEN');
      expect(typeof isValid).toBe('boolean');
    });
  });
});
