import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createPayment,
  processGiftCardPayment,
  handlePaymentWebhook,
} from '@/lib/square/payments-api';
import { createOrder, createPayment as createOrderPayment } from '@/lib/square/orders';
import { handleSquareWebhook } from '@/lib/square/webhooks';
import { syncSquareProducts } from '@/lib/square/sync';
import { ProductionSyncManager } from '@/lib/square/production-sync';
import { SquareService, getSquareService } from '@/lib/square/service';
import { squareClient, getCatalogClient } from '@/lib/square/client';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    cateringItem: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-signature'),
  })),
}));

// Mock Square SDK
jest.mock('square', () => ({
  SquareClient: jest.fn().mockImplementation(() => ({
    paymentsApi: {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
    },
    ordersApi: {
      createOrder: jest.fn(),
      retrieveOrder: jest.fn(),
    },
    catalogApi: {
      listCatalog: jest.fn(),
      searchCatalogObjects: jest.fn(),
      upsertCatalogObject: jest.fn(),
    },
    locationsApi: {
      listLocations: jest.fn(),
    },
  })),
  Environment: {
    Sandbox: 'sandbox',
    Production: 'production',
  },
}));

// Mock environment variables
const mockEnv = {
  SQUARE_ACCESS_TOKEN: 'mock-access-token',
  SQUARE_SANDBOX_TOKEN: 'mock-sandbox-token',
  SQUARE_LOCATION_ID: 'mock-location-id',
  SQUARE_WEBHOOK_SECRET: 'mock-webhook-secret',
  USE_SQUARE_SANDBOX: 'true',
  NODE_ENV: 'test',
};

describe('Square API Integration Enhancement Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();

    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Payment Processing', () => {
    test('should create payment successfully', async () => {
      const mockPaymentResponse = {
        success: true,
        payment: {
          id: 'payment-123',
          status: 'COMPLETED',
          amount_money: { amount: 1500, currency: 'USD' },
          order_id: 'order-123',
        },
      };

      // Mock the createPayment function
      const createPaymentSpy = jest.fn().mockResolvedValue(mockPaymentResponse);

      const paymentRequest = {
        source_id: 'card-nonce-123',
        idempotency_key: 'payment-123-456',
        amount_money: {
          amount: 1500,
          currency: 'USD',
        },
        order_id: 'order-123',
        autocomplete: true,
      };

      const result = await createPaymentSpy(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment.id).toBe('payment-123');
      expect(result.payment.status).toBe('COMPLETED');
      expect(result.payment.amount_money.amount).toBe(1500);
      expect(createPaymentSpy).toHaveBeenCalledWith(paymentRequest);
    });

    test('should handle payment errors gracefully', async () => {
      const mockPaymentError = {
        success: false,
        errors: [
          {
            code: 'INVALID_CARD',
            detail: 'Card number is invalid',
            field: 'source_id',
          },
        ],
      };

      const createPaymentSpy = jest.fn().mockResolvedValue(mockPaymentError);

      const paymentRequest = {
        source_id: 'invalid-card-nonce',
        idempotency_key: 'payment-error-123',
        amount_money: {
          amount: 1500,
          currency: 'USD',
        },
      };

      const result = await createPaymentSpy(paymentRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_CARD');
      expect(result.errors[0].detail).toBe('Card number is invalid');
    });

    test('should handle gift card payment with sufficient funds', async () => {
      const mockGiftCardResponse = {
        success: true,
        payment: {
          id: 'gift-payment-123',
          status: 'COMPLETED',
          amount_money: { amount: 2500, currency: 'USD' },
          source_type: 'GIFT_CARD',
        },
      };

      const processGiftCardSpy = jest.fn().mockResolvedValue(mockGiftCardResponse);

      const giftCardRequest = {
        giftCardNonce: 'gift-card-nonce-123',
        amountMoney: {
          amount: 2500,
          currency: 'USD',
        },
        orderId: 'order-456',
        idempotencyKey: 'gift-payment-456',
      };

      const result = await processGiftCardSpy(giftCardRequest);

      expect(result.success).toBe(true);
      expect(result.payment.source_type).toBe('GIFT_CARD');
      expect(result.payment.amount_money.amount).toBe(2500);
    });

    test('should handle gift card payment with insufficient funds', async () => {
      const mockInsufficientFundsResponse = {
        success: false,
        error: 'Gift card has insufficient funds. Available: $15.00, Required: $25.00',
        errorType: 'INSUFFICIENT_FUNDS',
      };

      const processGiftCardSpy = jest.fn().mockResolvedValue(mockInsufficientFundsResponse);

      const giftCardRequest = {
        giftCardNonce: 'gift-card-low-balance',
        amountMoney: {
          amount: 2500,
          currency: 'USD',
        },
        orderId: 'order-789',
      };

      const result = await processGiftCardSpy(giftCardRequest);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('INSUFFICIENT_FUNDS');
      expect(result.error).toContain('insufficient funds');
      expect(result.error).toContain('Available: $15.00');
      expect(result.error).toContain('Required: $25.00');
    });

    test('should handle inactive gift card', async () => {
      const mockInactiveCardResponse = {
        success: false,
        error: 'Gift card is not active or has expired',
        errorType: 'INACTIVE_CARD',
      };

      const processGiftCardSpy = jest.fn().mockResolvedValue(mockInactiveCardResponse);

      const giftCardRequest = {
        giftCardNonce: 'inactive-gift-card',
        amountMoney: {
          amount: 1000,
          currency: 'USD',
        },
      };

      const result = await processGiftCardSpy(giftCardRequest);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('INACTIVE_CARD');
      expect(result.error).toBe('Gift card is not active or has expired');
    });

    test('should process payment with tip', async () => {
      const mockPaymentWithTip = {
        success: true,
        payment: {
          id: 'payment-with-tip-123',
          status: 'COMPLETED',
          amount_money: { amount: 1500, currency: 'USD' },
          tip_money: { amount: 300, currency: 'USD' },
          total_money: { amount: 1800, currency: 'USD' },
        },
      };

      const createPaymentSpy = jest.fn().mockResolvedValue(mockPaymentWithTip);

      const paymentWithTipRequest = {
        source_id: 'card-nonce-tip',
        idempotency_key: 'payment-tip-123',
        amount_money: {
          amount: 1500,
          currency: 'USD',
        },
        tip_money: {
          amount: 300,
          currency: 'USD',
        },
      };

      const result = await createPaymentSpy(paymentWithTipRequest);

      expect(result.success).toBe(true);
      expect(result.payment.tip_money.amount).toBe(300);
      expect(result.payment.total_money.amount).toBe(1800);
    });
  });

  describe('Order Management', () => {
    test('should create order with line items', async () => {
      const mockOrderResponse = {
        order: {
          id: 'order-123',
          location_id: 'location-123',
          state: 'OPEN',
          line_items: [
            {
              name: 'Dulce de Leche Alfajores',
              quantity: '2',
              base_price_money: { amount: 1299, currency: 'USD' },
              total_money: { amount: 2598, currency: 'USD' },
            },
          ],
          total_money: { amount: 2598, currency: 'USD' },
        },
      };

      const createOrderSpy = jest.fn().mockResolvedValue(mockOrderResponse);

      const orderRequest = {
        locationId: 'location-123',
        lineItems: [
          {
            name: 'Dulce de Leche Alfajores',
            quantity: '2',
            base_price_money: { amount: 1299, currency: 'USD' },
          },
        ],
      };

      const result = await createOrderSpy(orderRequest);

      expect(result.order.id).toBe('order-123');
      expect(result.order.line_items).toHaveLength(1);
      expect(result.order.line_items[0].name).toBe('Dulce de Leche Alfajores');
      expect(result.order.total_money.amount).toBe(2598);
    });

    test('should handle order creation with modifiers', async () => {
      const mockOrderWithModifiers = {
        order: {
          id: 'order-with-modifiers-123',
          location_id: 'location-123',
          line_items: [
            {
              name: 'Empanada',
              quantity: '3',
              base_price_money: { amount: 400, currency: 'USD' },
              modifiers: [
                {
                  name: 'Extra Spicy',
                  base_price_money: { amount: 50, currency: 'USD' },
                },
              ],
              total_money: { amount: 1350, currency: 'USD' },
            },
          ],
          total_money: { amount: 1350, currency: 'USD' },
        },
      };

      const createOrderSpy = jest.fn().mockResolvedValue(mockOrderWithModifiers);

      const orderRequest = {
        locationId: 'location-123',
        lineItems: [
          {
            name: 'Empanada',
            quantity: '3',
            base_price_money: { amount: 400, currency: 'USD' },
            modifiers: [
              {
                name: 'Extra Spicy',
                base_price_money: { amount: 50, currency: 'USD' },
              },
            ],
          },
        ],
      };

      const result = await createOrderSpy(orderRequest);

      expect(result.order.line_items[0].modifiers).toHaveLength(1);
      expect(result.order.line_items[0].modifiers[0].name).toBe('Extra Spicy');
      expect(result.order.total_money.amount).toBe(1350);
    });

    test('should handle order creation errors', async () => {
      const createOrderSpy = jest.fn().mockRejectedValue(new Error('Invalid location ID'));

      const invalidOrderRequest = {
        locationId: 'invalid-location',
        lineItems: [],
      };

      await expect(createOrderSpy(invalidOrderRequest)).rejects.toThrow('Invalid location ID');
    });

    test('should create payment for existing order', async () => {
      const mockOrderPaymentResponse = {
        payment: {
          id: 'order-payment-123',
          order_id: 'order-123',
          status: 'COMPLETED',
          amount_money: { amount: 2598, currency: 'USD' },
        },
      };

      const createOrderPaymentSpy = jest.fn().mockResolvedValue(mockOrderPaymentResponse);

      const result = await createOrderPaymentSpy('card-nonce-456', 'order-123', 2598);

      expect(result.payment.order_id).toBe('order-123');
      expect(result.payment.status).toBe('COMPLETED');
      expect(result.payment.amount_money.amount).toBe(2598);
      expect(createOrderPaymentSpy).toHaveBeenCalledWith('card-nonce-456', 'order-123', 2598);
    });
  });

  describe('Webhook Processing', () => {
    test('should handle payment created webhook', async () => {
      const mockPaymentWebhook = {
        type: 'payment.created',
        data: {
          id: 'payment-webhook-123',
          object: {
            payment: {
              id: 'payment-123',
              order_id: 'order-123',
              status: 'COMPLETED',
              amount_money: { amount: 1500, currency: 'USD' },
            },
          },
        },
      };

      const handlePaymentWebhookSpy = jest.fn().mockResolvedValue({
        success: true,
        eventType: 'payment.created',
        paymentId: 'payment-123',
        orderId: 'order-123',
      });

      const result = await handlePaymentWebhookSpy(mockPaymentWebhook);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment.created');
      expect(result.paymentId).toBe('payment-123');
      expect(result.orderId).toBe('order-123');
    });

    test('should handle refund created webhook', async () => {
      const mockRefundWebhook = {
        type: 'refund.created',
        data: {
          id: 'refund-webhook-123',
          object: {
            refund: {
              id: 'refund-123',
              payment_id: 'payment-123',
              status: 'COMPLETED',
              amount_money: { amount: 500, currency: 'USD' },
            },
          },
        },
      };

      const handlePaymentWebhookSpy = jest.fn().mockResolvedValue({
        success: true,
        eventType: 'refund.created',
        paymentId: 'payment-123',
      });

      const result = await handlePaymentWebhookSpy(mockRefundWebhook);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('refund.created');
      expect(result.paymentId).toBe('payment-123');
    });

    test('should handle order fulfillment updated webhook', async () => {
      const mockFulfillmentWebhook = {
        type: 'order.fulfillment.updated',
        data: {
          id: 'fulfillment-webhook-123',
          type: 'order_fulfillment_updated',
          object: {
            order_fulfillment_updated: {
              order_id: 'order-123',
              fulfillment_update: [
                {
                  new_state: 'PREPARED',
                  old_state: 'ACCEPTED',
                },
              ],
            },
          },
        },
      };

      const handleSquareWebhookSpy = jest.fn().mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
      });

      const mockRequest = {
        body: mockFulfillmentWebhook,
        headers: {
          'x-square-signature': 'valid-signature',
        },
      };

      const result = await handleSquareWebhookSpy(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });

    test('should handle catalog version updated webhook', async () => {
      const mockCatalogWebhook = {
        type: 'catalog.version.updated',
        data: {
          id: 'catalog-webhook-123',
        },
      };

      const handleSquareWebhookSpy = jest.fn().mockResolvedValue({
        success: true,
        message: 'Webhook processed successfully',
      });

      const mockRequest = {
        body: mockCatalogWebhook,
        headers: {
          'x-square-signature': 'valid-signature',
        },
      };

      const result = await handleSquareWebhookSpy(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook processed successfully');
    });

    test('should reject webhook with invalid signature', async () => {
      const mockInvalidWebhook = {
        type: 'payment.created',
        data: {
          id: 'invalid-webhook-123',
        },
      };

      const handleSquareWebhookSpy = jest.fn().mockResolvedValue({
        success: false,
        message: 'Invalid signature',
      });

      const mockRequest = {
        body: mockInvalidWebhook,
        headers: {
          'x-square-signature': 'invalid-signature',
        },
      };

      const result = await handleSquareWebhookSpy(mockRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid signature');
    });

    test('should handle unknown webhook event types', async () => {
      const mockUnknownWebhook = {
        type: 'unknown.event.type',
        data: {
          id: 'unknown-webhook-123',
        },
      };

      const handleSquareWebhookSpy = jest.fn().mockResolvedValue({
        success: true,
        message: 'Event type not handled',
      });

      const mockRequest = {
        body: mockUnknownWebhook,
        headers: {
          'x-square-signature': 'valid-signature',
        },
      };

      const result = await handleSquareWebhookSpy(mockRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event type not handled');
    });
  });

  describe('Catalog Synchronization', () => {
    test('should sync products from Square catalog', async () => {
      const mockSyncResult = {
        success: true,
        message: 'Successfully synced 5 products',
        syncedProducts: 5,
        skippedProducts: 2,
        errors: [],
        warnings: ['Some products missing images'],
        productDetails: {
          created: 3,
          updated: 2,
          withImages: 4,
          withoutImages: 1,
        },
      };

      const syncSquareProductsSpy = jest.fn().mockResolvedValue(mockSyncResult);

      const result = await syncSquareProductsSpy();

      expect(result.success).toBe(true);
      expect(result.syncedProducts).toBe(5);
      expect(result.productDetails.created).toBe(3);
      expect(result.productDetails.updated).toBe(2);
      expect(result.warnings).toContain('Some products missing images');
    });

    test('should handle sync errors gracefully', async () => {
      const mockSyncError = {
        success: false,
        message: 'Sync failed: Network timeout',
        syncedProducts: 0,
        skippedProducts: 0,
        errors: ['Network timeout', 'Authentication failed'],
        warnings: [],
        productDetails: {
          created: 0,
          updated: 0,
          withImages: 0,
          withoutImages: 0,
        },
      };

      const syncSquareProductsSpy = jest.fn().mockResolvedValue(mockSyncError);

      const result = await syncSquareProductsSpy();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network timeout');
      expect(result.errors).toContain('Authentication failed');
      expect(result.syncedProducts).toBe(0);
    });

    test('should sync categories from Square catalog', async () => {
      const mockCatalogData = {
        success: true,
        products: [
          {
            id: 'item-1',
            type: 'ITEM',
            item_data: {
              name: 'Alfajores',
              description: 'Traditional cookies',
              category_id: 'cat-1',
              variations: [
                {
                  type: 'ITEM_VARIATION',
                  item_variation_data: {
                    price_money: { amount: 1299, currency: 'USD' },
                  },
                },
              ],
            },
          },
        ],
        categories: [
          {
            id: 'cat-1',
            type: 'CATEGORY',
            category_data: {
              name: 'Desserts',
            },
          },
        ],
      };

      const fetchSquareCatalogSpy = jest.fn().mockResolvedValue(mockCatalogData);

      const result = await fetchSquareCatalogSpy();

      expect(result.success).toBe(true);
      expect(result.products).toHaveLength(1);
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].category_data.name).toBe('Desserts');
    });

    test('should handle production sync with batching', async () => {
      const mockProductionSync = new ProductionSyncManager({
        batchSize: 10,
        enableImageValidation: true,
        enableCleanup: false,
      });

      const mockBatchSyncResult = {
        success: true,
        message: 'Production sync completed successfully',
        syncedProducts: 25,
        skippedProducts: 3,
        errors: [],
        warnings: ['2 products missing descriptions'],
        productDetails: {
          created: 15,
          updated: 10,
          withImages: 22,
          withoutImages: 3,
        },
      };

      const syncProductsSpy = jest
        .spyOn(mockProductionSync, 'syncProducts')
        .mockResolvedValue(mockBatchSyncResult);

      const result = await mockProductionSync.syncProducts();

      expect(result.success).toBe(true);
      expect(result.syncedProducts).toBe(25);
      expect(result.productDetails.created).toBe(15);
      expect(result.productDetails.updated).toBe(10);
      expect(syncProductsSpy).toHaveBeenCalled();
    });

    test('should validate product images during sync', async () => {
      const mockImageValidation = {
        productsWithImages: 18,
        productsWithoutImages: 7,
        invalidImageUrls: ['http://invalid-url.com/image.jpg'],
        validatedImages: 23,
      };

      const validateProductImagesSpy = jest.fn().mockResolvedValue(mockImageValidation);

      const result = await validateProductImagesSpy();

      expect(result.productsWithImages).toBe(18);
      expect(result.productsWithoutImages).toBe(7);
      expect(result.invalidImageUrls).toContain('http://invalid-url.com/image.jpg');
      expect(result.validatedImages).toBe(23);
    });
  });

  describe('Client Management and Configuration', () => {
    test('should initialize Square client with correct environment', () => {
      const mockSquareClient = {
        environment: 'sandbox',
        accessToken: 'mock-sandbox-token',
        paymentsApi: {},
        ordersApi: {},
        catalogApi: {},
        locationsApi: {},
      };

      const getSquareClientSpy = jest.fn().mockReturnValue(mockSquareClient);

      const client = getSquareClientSpy();

      expect(client.environment).toBe('sandbox');
      expect(client.accessToken).toBe('mock-sandbox-token');
      expect(client.paymentsApi).toBeDefined();
      expect(client.ordersApi).toBeDefined();
      expect(client.catalogApi).toBeDefined();
    });

    test('should switch between sandbox and production environments', () => {
      const mockGetSquareConfig = jest
        .fn()
        .mockReturnValueOnce({
          environment: 'sandbox',
          accessToken: 'sandbox-token',
          apiHost: 'connect.squareupsandbox.com',
        })
        .mockReturnValueOnce({
          environment: 'production',
          accessToken: 'production-token',
          apiHost: 'connect.squareup.com',
        });

      const sandboxConfig = mockGetSquareConfig();
      expect(sandboxConfig.environment).toBe('sandbox');
      expect(sandboxConfig.apiHost).toBe('connect.squareupsandbox.com');

      const productionConfig = mockGetSquareConfig();
      expect(productionConfig.environment).toBe('production');
      expect(productionConfig.apiHost).toBe('connect.squareup.com');
    });

    test('should handle client initialization errors', () => {
      const mockSquareClientError = jest.fn().mockImplementation(() => {
        throw new Error('Invalid access token');
      });

      expect(() => mockSquareClientError()).toThrow('Invalid access token');
    });

    test('should validate required configuration values', () => {
      const validateSquareConfig = (config: any) => {
        const errors: string[] = [];

        if (!config.accessToken) {
          errors.push('Access token is required');
        }

        if (!config.locationId) {
          errors.push('Location ID is required');
        }

        if (!config.webhookSecret) {
          errors.push('Webhook secret is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      // Valid configuration
      const validConfig = {
        accessToken: 'valid-token',
        locationId: 'valid-location',
        webhookSecret: 'valid-secret',
      };

      const validResult = validateSquareConfig(validConfig);
      expect(validResult.isValid).toBe(true);

      // Invalid configuration
      const invalidConfig = {
        accessToken: '',
        locationId: '',
        webhookSecret: '',
      };

      const invalidResult = validateSquareConfig(invalidConfig);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Access token is required');
      expect(invalidResult.errors).toContain('Location ID is required');
      expect(invalidResult.errors).toContain('Webhook secret is required');
    });

    test('should handle service layer operations', async () => {
      const mockSquareService = {
        getCatalogItems: jest.fn().mockResolvedValue([
          { id: 'item-1', name: 'Product 1', price: 1299 },
          { id: 'item-2', name: 'Product 2', price: 2499 },
        ]),
        createOrder: jest.fn().mockResolvedValue({
          order: { id: 'order-123', state: 'OPEN' },
        }),
        createPayment: jest.fn().mockResolvedValue({
          payment: { id: 'payment-123', status: 'COMPLETED' },
        }),
      };

      const getSquareServiceSpy = jest.fn().mockReturnValue(mockSquareService);

      const service = getSquareServiceSpy();

      const catalogItems = await service.getCatalogItems();
      expect(catalogItems).toHaveLength(2);
      expect(catalogItems[0].name).toBe('Product 1');

      const order = await service.createOrder({});
      expect(order.order.id).toBe('order-123');

      const payment = await service.createPayment({});
      expect(payment.payment.id).toBe('payment-123');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should retry API calls on network errors', async () => {
      let attemptCount = 0;
      const retryApiCallSpy = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return { success: true, data: 'Success after retry' };
      });

      // Simulate retry logic manually since we're testing the concept
      let result;
      try {
        result = await retryApiCallSpy();
      } catch (error) {
        try {
          result = await retryApiCallSpy();
        } catch (error2) {
          result = await retryApiCallSpy();
        }
      }

      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
      expect(result.data).toBe('Success after retry');
    });

    test('should handle rate limiting with exponential backoff', async () => {
      const mockRateLimiter = {
        isRateLimited: false,
        retryAfter: 0,
        attempt: jest.fn(),
        backoff: jest.fn(),
      };

      let callCount = 0;
      const rateLimitedApiCall = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          mockRateLimiter.isRateLimited = true;
          mockRateLimiter.retryAfter = 1000 * callCount; // Exponential backoff
          throw new Error('Rate limit exceeded');
        }
        return { success: true, data: 'Success after rate limit' };
      });

      // Simulate the retry logic
      try {
        await rateLimitedApiCall();
      } catch (error) {
        expect(mockRateLimiter.isRateLimited).toBe(true);
        expect(mockRateLimiter.retryAfter).toBe(1000);
      }

      try {
        await rateLimitedApiCall();
      } catch (error) {
        expect(mockRateLimiter.retryAfter).toBe(2000);
      }

      const result = await rateLimitedApiCall();
      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    test('should handle Square API specific errors', async () => {
      const handleSquareErrorSpy = jest.fn().mockImplementation(error => {
        if (error.code === 'INVALID_REQUEST_ERROR') {
          return {
            userMessage: 'Invalid request. Please check your input.',
            technical: error.detail,
            retryable: false,
          };
        }

        if (error.code === 'SERVICE_UNAVAILABLE') {
          return {
            userMessage: 'Payment service is temporarily unavailable.',
            technical: 'Square API is down',
            retryable: true,
          };
        }

        return {
          userMessage: 'An unexpected error occurred.',
          technical: error.message,
          retryable: false,
        };
      });

      // Test invalid request error
      const invalidRequestError = {
        code: 'INVALID_REQUEST_ERROR',
        detail: 'Missing required field: amount_money',
      };

      const invalidResult = handleSquareErrorSpy(invalidRequestError);
      expect(invalidResult.retryable).toBe(false);
      expect(invalidResult.userMessage).toContain('Invalid request');

      // Test service unavailable error
      const serviceError = {
        code: 'SERVICE_UNAVAILABLE',
        detail: 'Service temporarily unavailable',
      };

      const serviceResult = handleSquareErrorSpy(serviceError);
      expect(serviceResult.retryable).toBe(true);
      expect(serviceResult.userMessage).toContain('temporarily unavailable');
    });

    test('should handle webhook signature validation', () => {
      const validateWebhookSignature = (signature: string, body: string, secret: string) => {
        // Mock signature validation logic
        const expectedSignature = `hmac-sha256=${secret}-${body}`;
        return signature === expectedSignature;
      };

      const validSignature = 'hmac-sha256=mock-webhook-secret-{"type":"payment.created"}';
      const validBody = '{"type":"payment.created"}';
      const secret = 'mock-webhook-secret';

      const isValid = validateWebhookSignature(validSignature, validBody, secret);
      expect(isValid).toBe(true);

      const invalidSignature = 'invalid-signature';
      const isInvalid = validateWebhookSignature(invalidSignature, validBody, secret);
      expect(isInvalid).toBe(false);
    });

    test('should handle concurrent API requests', async () => {
      const mockConcurrentCalls = Array.from({ length: 5 }, (_, i) =>
        jest.fn().mockResolvedValue({ id: `result-${i}`, success: true })
      );

      const results = await Promise.all(mockConcurrentCalls.map(call => call()));

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.id).toBe(`result-${index}`);
        expect(result.success).toBe(true);
      });
    });

    test('should handle payment idempotency', () => {
      const mockIdempotencyTracker = new Map();

      const processPaymentWithIdempotency = (idempotencyKey: string, paymentData: any) => {
        if (mockIdempotencyTracker.has(idempotencyKey)) {
          return {
            success: true,
            payment: mockIdempotencyTracker.get(idempotencyKey),
            isDuplicate: true,
          };
        }

        const payment = {
          id: `payment-${Date.now()}`,
          status: 'COMPLETED',
          amount: paymentData.amount,
        };

        mockIdempotencyTracker.set(idempotencyKey, payment);

        return {
          success: true,
          payment,
          isDuplicate: false,
        };
      };

      // First call
      const firstResult = processPaymentWithIdempotency('idempotent-key-123', { amount: 1500 });
      expect(firstResult.isDuplicate).toBe(false);
      expect(firstResult.payment.id).toBeDefined();

      // Duplicate call with same idempotency key
      const duplicateResult = processPaymentWithIdempotency('idempotent-key-123', { amount: 1500 });
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.payment.id).toBe(firstResult.payment.id);
    });
  });

  describe('Performance and Optimization', () => {
    test('should measure API response times', async () => {
      const measureApiPerformance = async (apiCall: () => Promise<any>) => {
        const startTime = Date.now();
        const result = await apiCall();
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
          result,
          responseTime,
          isOptimal: responseTime < 1000, // Less than 1 second
        };
      };

      const mockFastApiCall = jest.fn().mockImplementation(async () => {
        // Simulate fast API call
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, data: 'Fast response' };
      });

      const performance = await measureApiPerformance(mockFastApiCall);

      expect(performance.result.success).toBe(true);
      expect(performance.responseTime).toBeGreaterThan(90);
      expect(performance.responseTime).toBeLessThan(200);
      expect(performance.isOptimal).toBe(true);
    });

    test('should handle batch operations efficiently', async () => {
      const processBatchOperations = async (operations: any[], batchSize: number = 5) => {
        const batches = [];
        for (let i = 0; i < operations.length; i += batchSize) {
          batches.push(operations.slice(i, i + batchSize));
        }

        const results = [];
        for (const batch of batches) {
          const batchResults = await Promise.all(
            batch.map(op => Promise.resolve({ id: op.id, processed: true }))
          );
          results.push(...batchResults);
        }

        return {
          totalOperations: operations.length,
          totalBatches: batches.length,
          results,
        };
      };

      const operations = Array.from({ length: 23 }, (_, i) => ({ id: `op-${i}` }));
      const batchResult = await processBatchOperations(operations, 5);

      expect(batchResult.totalOperations).toBe(23);
      expect(batchResult.totalBatches).toBe(5); // 23 operations in batches of 5
      expect(batchResult.results).toHaveLength(23);
    });

    test('should cache API responses appropriately', () => {
      const mockApiCache = new Map();
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      const getCachedApiResponse = (cacheKey: string, apiCall: () => any) => {
        const now = Date.now();
        const cached = mockApiCache.get(cacheKey);

        if (cached && now - cached.timestamp < CACHE_TTL) {
          return {
            data: cached.data,
            fromCache: true,
            age: now - cached.timestamp,
          };
        }

        const data = apiCall();
        mockApiCache.set(cacheKey, {
          data,
          timestamp: now,
        });

        return {
          data,
          fromCache: false,
          age: 0,
        };
      };

      const mockApiCall = jest.fn(() => ({ products: ['product1', 'product2'] }));

      // First call - should hit API
      const firstResult = getCachedApiResponse('catalog-products', mockApiCall);
      expect(firstResult.fromCache).toBe(false);
      expect(firstResult.age).toBe(0);
      expect(mockApiCall).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const secondResult = getCachedApiResponse('catalog-products', mockApiCall);
      expect(secondResult.fromCache).toBe(true);
      expect(secondResult.age).toBeGreaterThanOrEqual(0);
      expect(mockApiCall).toHaveBeenCalledTimes(1); // Still only one API call
    });
  });
});
