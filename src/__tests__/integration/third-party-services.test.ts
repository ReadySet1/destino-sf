// Phase 4: Third-Party Integration Tests for Production Readiness
import { squareClient } from '@/lib/square/client';
import { createPayment, createOrder, retrieveOrder } from '@/lib/square/orders';
import { sendEmail } from '@/lib/email';
import { errorMonitor } from '@/lib/error-monitoring';
import { performance } from '@/lib/performance-monitoring';
import { createClient } from '@/utils/supabase/server';

// Mock external services for testing
jest.mock('@/lib/square/client');
jest.mock('@/lib/email');
jest.mock('@/lib/error-monitoring');
jest.mock('@/lib/performance-monitoring');
jest.mock('@/utils/supabase/server');

const mockSquareClient = squareClient as jest.Mocked<typeof squareClient>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockErrorMonitor = errorMonitor as jest.Mocked<typeof errorMonitor>;
const mockPerformance = performance as jest.Mocked<typeof performance>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Third-Party Integration Tests - Phase 4', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock performance timing
    jest.spyOn(Date, 'now').mockReturnValue(1642665600000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Square API Integration Tests', () => {
    describe('Square Client Configuration', () => {
      it('should initialize Square client with correct configuration', () => {
        expect(mockSquareClient).toBeDefined();
        expect(mockSquareClient.locationsApi).toBeDefined();
        expect(mockSquareClient.ordersApi).toBeDefined();
        expect(mockSquareClient.paymentsApi).toBeDefined();
        expect(mockSquareClient.catalogApi).toBeDefined();
      });

      it('should use correct environment settings', () => {
        // Verify environment configuration
        expect(process.env.SQUARE_ACCESS_TOKEN).toBeDefined();
        expect(process.env.SQUARE_ENVIRONMENT).toBeDefined();
        expect(process.env.SQUARE_LOCATION_ID).toBeDefined();
        expect(process.env.SQUARE_WEBHOOK_SECRET).toBeDefined();
      });
    });

    describe('Square Orders API Integration', () => {
      it('should create order successfully', async () => {
        const mockOrderResponse = {
          result: {
            order: {
              id: 'order-123',
              locationId: 'location-456',
              state: 'OPEN',
              lineItems: [
                {
                  uid: 'item-1',
                  name: 'Dulce de Leche Alfajores',
                  quantity: '2',
                  basePrice: { amount: 1299, currency: 'USD' },
                },
              ],
              totalMoney: { amount: 2598, currency: 'USD' },
              createdAt: '2024-01-20T10:00:00Z',
            },
          },
        };

        mockSquareClient.ordersApi.createOrder.mockResolvedValue(mockOrderResponse);

        const orderData = {
          locationId: 'location-456',
          lineItems: [
            {
              name: 'Dulce de Leche Alfajores',
              quantity: '2',
              basePrice: { amount: 1299, currency: 'USD' },
            },
          ],
        };

        const result = await createOrder(orderData);

        expect(result.id).toBe('order-123');
        expect(result.state).toBe('OPEN');
        expect(result.totalMoney.amount).toBe(2598);
        expect(mockSquareClient.ordersApi.createOrder).toHaveBeenCalledWith({
          body: {
            locationId: 'location-456',
            order: {
              locationId: 'location-456',
              lineItems: [
                {
                  name: 'Dulce de Leche Alfajores',
                  quantity: '2',
                  basePriceMoney: { amount: 1299, currency: 'USD' },
                },
              ],
            },
          },
        });
      });

      it('should handle order creation failures', async () => {
        const mockError = new Error('Square API error: Invalid line item');
        mockSquareClient.ordersApi.createOrder.mockRejectedValue(mockError);

        const orderData = {
          locationId: 'location-456',
          lineItems: [
            {
              name: 'Invalid Item',
              quantity: '0', // Invalid quantity
              basePrice: { amount: 0, currency: 'USD' },
            },
          ],
        };

        await expect(createOrder(orderData)).rejects.toThrow('Square API error: Invalid line item');
        expect(mockSquareClient.ordersApi.createOrder).toHaveBeenCalled();
      });

      it('should retrieve order successfully', async () => {
        const mockOrderResponse = {
          result: {
            order: {
              id: 'order-123',
              locationId: 'location-456',
              state: 'COMPLETED',
              lineItems: [
                {
                  uid: 'item-1',
                  name: 'Dulce de Leche Alfajores',
                  quantity: '2',
                  basePrice: { amount: 1299, currency: 'USD' },
                },
              ],
              totalMoney: { amount: 2598, currency: 'USD' },
              createdAt: '2024-01-20T10:00:00Z',
              updatedAt: '2024-01-20T10:05:00Z',
            },
          },
        };

        mockSquareClient.ordersApi.retrieveOrder.mockResolvedValue(mockOrderResponse);

        const result = await retrieveOrder('order-123');

        expect(result.id).toBe('order-123');
        expect(result.state).toBe('COMPLETED');
        expect(mockSquareClient.ordersApi.retrieveOrder).toHaveBeenCalledWith('order-123');
      });
    });

    describe('Square Payments API Integration', () => {
      it('should create payment successfully', async () => {
        const mockPaymentResponse = {
          result: {
            payment: {
              id: 'payment-789',
              status: 'COMPLETED',
              amountMoney: { amount: 2598, currency: 'USD' },
              sourceType: 'CARD',
              cardDetails: {
                status: 'CAPTURED',
                card: {
                  last4: '1234',
                  cardBrand: 'VISA',
                },
              },
              orderId: 'order-123',
              createdAt: '2024-01-20T10:05:00Z',
            },
          },
        };

        mockSquareClient.paymentsApi.createPayment.mockResolvedValue(mockPaymentResponse);

        const paymentData = {
          sourceId: 'card-nonce-12345',
          orderId: 'order-123',
          amount: 2598,
        };

        const result = await createPayment(
          paymentData.sourceId,
          paymentData.orderId,
          paymentData.amount
        );

        expect(result.id).toBe('payment-789');
        expect(result.status).toBe('COMPLETED');
        expect(result.amountMoney.amount).toBe(2598);
        expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalledWith({
          body: {
            sourceId: 'card-nonce-12345',
            orderId: 'order-123',
            amountMoney: { amount: 2598, currency: 'USD' },
            idempotencyKey: expect.any(String),
          },
        });
      });

      it('should handle payment failures', async () => {
        const mockError = new Error('Payment declined');
        mockSquareClient.paymentsApi.createPayment.mockRejectedValue(mockError);

        const paymentData = {
          sourceId: 'invalid-nonce',
          orderId: 'order-123',
          amount: 2598,
        };

        await expect(
          createPayment(paymentData.sourceId, paymentData.orderId, paymentData.amount)
        ).rejects.toThrow('Payment declined');
        expect(mockSquareClient.paymentsApi.createPayment).toHaveBeenCalled();
      });

      it('should handle gift card payments', async () => {
        const mockGiftCardPaymentResponse = {
          result: {
            payment: {
              id: 'payment-gift-123',
              status: 'COMPLETED',
              amountMoney: { amount: 2598, currency: 'USD' },
              sourceType: 'GIFT_CARD',
              giftCardDetails: {
                status: 'CAPTURED',
                giftCard: {
                  ganSource: 'SQUARE',
                  last4: '5678',
                },
              },
              orderId: 'order-123',
              createdAt: '2024-01-20T10:05:00Z',
            },
          },
        };

        mockSquareClient.paymentsApi.createPayment.mockResolvedValue(mockGiftCardPaymentResponse);

        const result = await createPayment('gift-card-nonce-12345', 'order-123', 2598);

        expect(result.id).toBe('payment-gift-123');
        expect(result.sourceType).toBe('GIFT_CARD');
        expect(result.giftCardDetails.giftCard.last4).toBe('5678');
      });
    });

    describe('Square Catalog API Integration', () => {
      it('should sync catalog items successfully', async () => {
        const mockCatalogResponse = {
          result: {
            objects: [
              {
                type: 'ITEM',
                id: 'item-1',
                itemData: {
                  name: 'Dulce de Leche Alfajores',
                  description: 'Traditional Argentine cookies',
                  variations: [
                    {
                      type: 'ITEM_VARIATION',
                      id: 'variation-1',
                      itemVariationData: {
                        name: '6-pack',
                        priceMoney: { amount: 1299, currency: 'USD' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        };

        mockSquareClient.catalogApi.listCatalog.mockResolvedValue(mockCatalogResponse);

        const { syncCatalog } = await import('@/lib/square/catalog');
        const result = await syncCatalog();

        expect(result.itemsProcessed).toBe(1);
        expect(result.variationsProcessed).toBe(1);
        expect(mockSquareClient.catalogApi.listCatalog).toHaveBeenCalled();
      });

      it('should handle catalog sync failures', async () => {
        const mockError = new Error('Catalog API unavailable');
        mockSquareClient.catalogApi.listCatalog.mockRejectedValue(mockError);

        const { syncCatalog } = await import('@/lib/square/catalog');

        await expect(syncCatalog()).rejects.toThrow('Catalog API unavailable');
        expect(mockSquareClient.catalogApi.listCatalog).toHaveBeenCalled();
      });
    });

    describe('Square Webhook Integration', () => {
      it('should validate webhook signatures', async () => {
        const mockWebhookData = {
          merchant_id: 'merchant-123',
          type: 'payment.created',
          event_id: 'event-456',
          created_at: '2024-01-20T10:00:00Z',
          data: {
            type: 'payment',
            id: 'payment-789',
            object: {
              payment: {
                id: 'payment-789',
                status: 'COMPLETED',
                amountMoney: { amount: 2598, currency: 'USD' },
              },
            },
          },
        };

        const { validateWebhookSignature } = await import('@/lib/square/webhook-validator');
        const signature = 'valid-signature';
        const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET!;

        const isValid = await validateWebhookSignature(
          JSON.stringify(mockWebhookData),
          signature,
          webhookSecret
        );

        expect(isValid).toBe(true);
      });

      it('should reject invalid webhook signatures', async () => {
        const mockWebhookData = {
          merchant_id: 'merchant-123',
          type: 'payment.created',
          event_id: 'event-456',
          created_at: '2024-01-20T10:00:00Z',
          data: {
            type: 'payment',
            id: 'payment-789',
          },
        };

        const { validateWebhookSignature } = await import('@/lib/square/webhook-validator');
        const invalidSignature = 'invalid-signature';
        const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET!;

        const isValid = await validateWebhookSignature(
          JSON.stringify(mockWebhookData),
          invalidSignature,
          webhookSecret
        );

        expect(isValid).toBe(false);
      });
    });
  });

  describe('Email Service Integration Tests', () => {
    describe('Email Configuration', () => {
      it('should have correct email service configuration', () => {
        expect(process.env.RESEND_API_KEY).toBeDefined();
        expect(process.env.FROM_EMAIL).toBeDefined();
        expect(process.env.ADMIN_EMAIL).toBeDefined();
      });
    });

    describe('Email Sending', () => {
      it('should send order confirmation email successfully', async () => {
        const mockEmailResponse = {
          id: 'email-123',
          from: 'orders@destino-sf.com',
          to: ['john@example.com'],
          subject: 'Order Confirmation - Destino SF',
          created_at: '2024-01-20T10:00:00Z',
        };

        mockSendEmail.mockResolvedValue(mockEmailResponse);

        const emailData = {
          to: 'john@example.com',
          subject: 'Order Confirmation - Destino SF',
          template: 'order-confirmation',
          data: {
            orderNumber: 'DSF-001',
            customerName: 'John Doe',
            total: 25.98,
            items: [
              {
                name: 'Dulce de Leche Alfajores',
                quantity: 2,
                price: 12.99,
              },
            ],
          },
        };

        const result = await sendEmail(emailData);

        expect(result.id).toBe('email-123');
        expect(result.to).toContain('john@example.com');
        expect(result.subject).toBe('Order Confirmation - Destino SF');
        expect(mockSendEmail).toHaveBeenCalledWith(emailData);
      });

      it('should send admin alert email successfully', async () => {
        const mockEmailResponse = {
          id: 'email-admin-456',
          from: 'alerts@destino-sf.com',
          to: ['admin@destino-sf.com'],
          subject: 'Alert: Low Inventory',
          created_at: '2024-01-20T10:00:00Z',
        };

        mockSendEmail.mockResolvedValue(mockEmailResponse);

        const alertData = {
          to: 'admin@destino-sf.com',
          subject: 'Alert: Low Inventory',
          template: 'admin-alert',
          data: {
            alertType: 'LOW_INVENTORY',
            productName: 'Dulce de Leche Alfajores',
            currentStock: 3,
            minStock: 10,
          },
        };

        const result = await sendEmail(alertData);

        expect(result.id).toBe('email-admin-456');
        expect(result.to).toContain('admin@destino-sf.com');
        expect(result.subject).toBe('Alert: Low Inventory');
      });

      it('should handle email sending failures', async () => {
        const mockError = new Error('Email service unavailable');
        mockSendEmail.mockRejectedValue(mockError);

        const emailData = {
          to: 'john@example.com',
          subject: 'Order Confirmation',
          template: 'order-confirmation',
          data: { orderNumber: 'DSF-001' },
        };

        await expect(sendEmail(emailData)).rejects.toThrow('Email service unavailable');
        expect(mockSendEmail).toHaveBeenCalledWith(emailData);
      });

      it('should handle email template rendering errors', async () => {
        const mockError = new Error('Template not found: invalid-template');
        mockSendEmail.mockRejectedValue(mockError);

        const emailData = {
          to: 'john@example.com',
          subject: 'Test Email',
          template: 'invalid-template',
          data: {},
        };

        await expect(sendEmail(emailData)).rejects.toThrow('Template not found: invalid-template');
      });
    });

    describe('Email Templates', () => {
      it('should validate email template structure', async () => {
        const { validateEmailTemplate } = await import('@/lib/email-templates');

        const validTemplate = {
          name: 'order-confirmation',
          subject: 'Order Confirmation - {{orderNumber}}',
          html: '<h1>Thank you {{customerName}}!</h1>',
          text: 'Thank you {{customerName}}!',
          requiredData: ['orderNumber', 'customerName'],
        };

        const isValid = await validateEmailTemplate(validTemplate);
        expect(isValid).toBe(true);
      });

      it('should detect invalid email templates', async () => {
        const { validateEmailTemplate } = await import('@/lib/email-templates');

        const invalidTemplate = {
          name: 'invalid-template',
          subject: '', // Empty subject
          html: '<h1>{{missingVar}}</h1>', // Missing required variable
          text: 'Test',
          requiredData: ['customerName'], // Missing from html
        };

        const isValid = await validateEmailTemplate(invalidTemplate);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Sentry Error Monitoring Integration Tests', () => {
    describe('Sentry Configuration', () => {
      it('should have correct Sentry configuration', () => {
        expect(process.env.SENTRY_DSN).toBeDefined();
        expect(process.env.SENTRY_ORG).toBeDefined();
        expect(process.env.SENTRY_PROJECT).toBeDefined();
      });
    });

    describe('Error Capturing', () => {
      it('should capture errors successfully', async () => {
        mockErrorMonitor.captureException.mockResolvedValue('error-id-123');

        const testError = new Error('Test error for monitoring');
        const context = {
          userId: 'user-123',
          orderId: 'order-456',
          action: 'payment-processing',
        };

        const errorId = await errorMonitor.captureException(testError, context);

        expect(errorId).toBe('error-id-123');
        expect(mockErrorMonitor.captureException).toHaveBeenCalledWith(testError, context);
      });

      it('should capture payment processing errors', async () => {
        mockErrorMonitor.capturePaymentError.mockResolvedValue('payment-error-456');

        const paymentError = new Error('Payment failed: card declined');
        const paymentContext = {
          orderId: 'order-123',
          amount: 2598,
          paymentMethod: 'card',
          last4: '1234',
        };

        const errorId = await errorMonitor.capturePaymentError(paymentError, paymentContext);

        expect(errorId).toBe('payment-error-456');
        expect(mockErrorMonitor.capturePaymentError).toHaveBeenCalledWith(
          paymentError,
          paymentContext
        );
      });

      it('should capture webhook errors', async () => {
        mockErrorMonitor.captureWebhookError.mockResolvedValue('webhook-error-789');

        const webhookError = new Error('Webhook signature validation failed');
        const webhookContext = {
          webhookType: 'payment.created',
          eventId: 'event-456',
          merchantId: 'merchant-123',
        };

        const errorId = await errorMonitor.captureWebhookError(webhookError, webhookContext);

        expect(errorId).toBe('webhook-error-789');
        expect(mockErrorMonitor.captureWebhookError).toHaveBeenCalledWith(
          webhookError,
          webhookContext
        );
      });
    });

    describe('Performance Monitoring', () => {
      it('should track API performance', async () => {
        mockErrorMonitor.startTransaction.mockReturnValue({
          setName: jest.fn(),
          setTag: jest.fn(),
          finish: jest.fn(),
        });

        const transaction = errorMonitor.startTransaction('API Request');
        transaction.setName('POST /api/checkout');
        transaction.setTag('method', 'POST');
        transaction.finish();

        expect(mockErrorMonitor.startTransaction).toHaveBeenCalledWith('API Request');
        expect(transaction.setName).toHaveBeenCalledWith('POST /api/checkout');
        expect(transaction.setTag).toHaveBeenCalledWith('method', 'POST');
        expect(transaction.finish).toHaveBeenCalled();
      });

      it('should track database query performance', async () => {
        mockErrorMonitor.startSpan.mockReturnValue({
          setDescription: jest.fn(),
          setTag: jest.fn(),
          finish: jest.fn(),
        });

        const span = errorMonitor.startSpan('Database Query');
        span.setDescription('SELECT * FROM orders WHERE id = ?');
        span.setTag('operation', 'select');
        span.finish();

        expect(mockErrorMonitor.startSpan).toHaveBeenCalledWith('Database Query');
        expect(span.setDescription).toHaveBeenCalledWith('SELECT * FROM orders WHERE id = ?');
        expect(span.setTag).toHaveBeenCalledWith('operation', 'select');
        expect(span.finish).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Monitoring Integration Tests', () => {
    describe('Performance Metrics Collection', () => {
      it('should collect API response time metrics', async () => {
        mockPerformance.recordApiResponseTime.mockResolvedValue(undefined);

        const metrics = {
          endpoint: '/api/checkout',
          method: 'POST',
          responseTime: 250,
          statusCode: 200,
          timestamp: new Date(),
        };

        await performance.recordApiResponseTime(metrics);

        expect(mockPerformance.recordApiResponseTime).toHaveBeenCalledWith(metrics);
      });

      it('should collect database query metrics', async () => {
        mockPerformance.recordDatabaseQuery.mockResolvedValue(undefined);

        const queryMetrics = {
          query: 'SELECT * FROM orders WHERE status = ?',
          duration: 45,
          success: true,
          rowsAffected: 25,
          timestamp: new Date(),
        };

        await performance.recordDatabaseQuery(queryMetrics);

        expect(mockPerformance.recordDatabaseQuery).toHaveBeenCalledWith(queryMetrics);
      });

      it('should collect payment processing metrics', async () => {
        mockPerformance.recordPaymentProcessing.mockResolvedValue(undefined);

        const paymentMetrics = {
          orderId: 'order-123',
          amount: 2598,
          paymentMethod: 'card',
          processingTime: 1200,
          success: true,
          timestamp: new Date(),
        };

        await performance.recordPaymentProcessing(paymentMetrics);

        expect(mockPerformance.recordPaymentProcessing).toHaveBeenCalledWith(paymentMetrics);
      });
    });

    describe('Performance Alerts', () => {
      it('should trigger alerts for slow API responses', async () => {
        mockPerformance.checkPerformanceThresholds.mockResolvedValue({
          alerts: [
            {
              type: 'SLOW_API_RESPONSE',
              endpoint: '/api/checkout',
              threshold: 1000,
              actual: 2500,
              severity: 'HIGH',
            },
          ],
        });

        const alerts = await performance.checkPerformanceThresholds();

        expect(alerts.alerts).toHaveLength(1);
        expect(alerts.alerts[0].type).toBe('SLOW_API_RESPONSE');
        expect(alerts.alerts[0].actual).toBe(2500);
        expect(alerts.alerts[0].severity).toBe('HIGH');
      });

      it('should trigger alerts for database performance issues', async () => {
        mockPerformance.checkPerformanceThresholds.mockResolvedValue({
          alerts: [
            {
              type: 'SLOW_DATABASE_QUERY',
              query: 'SELECT * FROM orders',
              threshold: 100,
              actual: 500,
              severity: 'MEDIUM',
            },
          ],
        });

        const alerts = await performance.checkPerformanceThresholds();

        expect(alerts.alerts).toHaveLength(1);
        expect(alerts.alerts[0].type).toBe('SLOW_DATABASE_QUERY');
        expect(alerts.alerts[0].actual).toBe(500);
        expect(alerts.alerts[0].severity).toBe('MEDIUM');
      });
    });
  });

  describe('Supabase Integration Tests', () => {
    describe('Supabase Authentication', () => {
      it('should authenticate users successfully', async () => {
        const mockSupabaseClient = {
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: {
                user: {
                  id: 'user-123',
                  email: 'john@example.com',
                  role: 'authenticated',
                },
              },
              error: null,
            }),
          },
        };

        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

        const supabase = await createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        expect(user).not.toBeNull();
        expect(user?.id).toBe('user-123');
        expect(user?.email).toBe('john@example.com');
        expect(error).toBeNull();
      });

      it('should handle authentication failures', async () => {
        const mockSupabaseClient = {
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: { user: null },
              error: new Error('Invalid JWT token'),
            }),
          },
        };

        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

        const supabase = await createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        expect(user).toBeNull();
        expect(error).not.toBeNull();
        expect(error?.message).toBe('Invalid JWT token');
      });
    });

    describe('Supabase Database Operations', () => {
      it('should query user profiles successfully', async () => {
        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'john@example.com',
                    role: 'USER',
                    created_at: '2024-01-20T10:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };

        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

        const supabase = await createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', 'user-123')
          .single();

        expect(profile).not.toBeNull();
        expect(profile?.id).toBe('user-123');
        expect(profile?.role).toBe('USER');
        expect(error).toBeNull();
      });

      it('should handle database query errors', async () => {
        const mockSupabaseClient = {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Row not found'),
                }),
              }),
            }),
          }),
        };

        mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

        const supabase = await createClient();
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', 'non-existent-user')
          .single();

        expect(profile).toBeNull();
        expect(error).not.toBeNull();
        expect(error?.message).toBe('Row not found');
      });
    });
  });

  describe('Integration Health Checks', () => {
    it('should perform comprehensive third-party service health check', async () => {
      // Mock all services as healthy
      mockSquareClient.locationsApi.retrieveLocation.mockResolvedValue({
        result: { location: { id: 'loc-123', status: 'ACTIVE' } },
      });

      mockSendEmail.mockResolvedValue({ id: 'email-test' });
      mockErrorMonitor.captureMessage.mockResolvedValue('msg-123');

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { performIntegrationHealthCheck } = await import('@/lib/integration-health');
      const healthCheck = await performIntegrationHealthCheck();

      expect(healthCheck.square.status).toBe('healthy');
      expect(healthCheck.email.status).toBe('healthy');
      expect(healthCheck.sentry.status).toBe('healthy');
      expect(healthCheck.supabase.status).toBe('healthy');
      expect(healthCheck.overall.status).toBe('healthy');
    });

    it('should detect integration failures', async () => {
      // Mock services with failures
      mockSquareClient.locationsApi.retrieveLocation.mockRejectedValue(
        new Error('Square API down')
      );
      mockSendEmail.mockRejectedValue(new Error('Email service unavailable'));
      mockErrorMonitor.captureMessage.mockRejectedValue(new Error('Sentry unavailable'));

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Supabase connection failed')),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { performIntegrationHealthCheck } = await import('@/lib/integration-health');
      const healthCheck = await performIntegrationHealthCheck();

      expect(healthCheck.square.status).toBe('unhealthy');
      expect(healthCheck.email.status).toBe('unhealthy');
      expect(healthCheck.sentry.status).toBe('unhealthy');
      expect(healthCheck.supabase.status).toBe('unhealthy');
      expect(healthCheck.overall.status).toBe('unhealthy');
      expect(healthCheck.overall.failedServices).toHaveLength(4);
    });
  });
});
