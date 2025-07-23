/**
 * @jest-environment node
 */

// Set required environment variables for t3-env validation before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test-signature-key';
process.env.SQUARE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.FROM_EMAIL = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/square/route';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      update: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      update: jest.fn(),
    },
    cateringOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock webhook queue to prevent async operations
jest.mock('@/lib/webhook-queue', () => ({
  handleWebhookWithQueue: jest.fn().mockResolvedValue(undefined),
}));

// Mock alert service
jest.mock('@/lib/alerts', () => ({
  AlertService: jest.fn().mockImplementation(() => ({
    sendOrderStatusChangeAlert: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailedAlert: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock error monitoring
jest.mock('@/lib/error-monitoring', () => ({
  errorMonitor: {
    captureWebhookError: jest.fn().mockResolvedValue(undefined),
    captureAPIError: jest.fn().mockResolvedValue(undefined),
    captureDatabaseError: jest.fn().mockResolvedValue(undefined),
    capturePaymentError: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock rate limiting
jest.mock('@/middleware/rate-limit', () => ({
  applyWebhookRateLimit: jest.fn().mockResolvedValue(null),
}));

// Mock webhook validator
jest.mock('@/lib/square/webhook-validator', () => ({
  WebhookValidator: jest.fn().mockImplementation(() => ({
    validateSquareSignature: jest.fn().mockResolvedValue(true),
  })),
}));

// Mock labels action
jest.mock('@/app/actions/labels', () => ({
  purchaseShippingLabel: jest.fn().mockResolvedValue({ success: true, trackingNumber: 'test-tracking' }),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/webhooks/square - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to their default implementations
    (mockPrisma.order.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.order.upsert as jest.Mock).mockResolvedValue({});
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.order.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.payment.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.payment.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.payment.upsert as jest.Mock).mockResolvedValue({});
    (mockPrisma.refund.create as jest.Mock).mockResolvedValue({});
    (mockPrisma.refund.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.cateringOrder.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.cateringOrder.update as jest.Mock).mockResolvedValue({});
  });

  afterEach(async () => {
    // Wait for any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Ensure all async operations are complete before test suite ends
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  const createMockRequest = (body: any, signature?: string) => {
    const requestBody = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (signature) {
      headers['x-square-hmacsha256-signature'] = signature;
      headers['x-square-hmacsha256-timestamp'] = '1234567890';
    }

    return new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers,
      body: requestBody,
    });
  };

  const createValidSignature = (body: string, webhookUrl: string) => {
    const hmac = crypto.createHmac('sha256', process.env.SQUARE_WEBHOOK_SECRET || 'test-secret');
    hmac.update(webhookUrl + body);
    return hmac.digest('base64');
  };

  it('should handle payment.created event successfully', async () => {
    const webhookBody = {
      type: 'payment.created',
      event_id: 'event-123',
      data: {
        id: 'payment-123',
        object: {
          payment: {
            id: 'payment-123',
            order_id: 'order-123',
            amount_money: {
              amount: 2500,
              currency: 'USD',
            },
            status: 'COMPLETED',
            created_at: '2024-01-01T12:00:00Z',
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    // Mock database operations
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-123',
      status: 'PENDING',
      squareOrderId: 'order-123',
    });

    (mockPrisma.payment.upsert as jest.Mock).mockResolvedValue({
      id: 'payment-123',
      orderId: 'order-123',
      amount: 25.00,
      status: 'COMPLETED',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was queued for processing
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
  }, 10000);

  it('should handle order.created event successfully', async () => {
    const webhookBody = {
      type: 'order.created',
      event_id: 'event-456',
      data: {
        id: 'order-123',
        object: {
          order_created: {
            order: {
              id: 'order-123',
              location_id: 'location-123',
              line_items: [
                {
                  name: 'Test Product',
                  quantity: '2',
                  base_price_money: {
                    amount: 1299,
                    currency: 'USD',
                  },
                },
              ],
              total_money: {
                amount: 2598,
                currency: 'USD',
              },
              created_at: '2024-01-01T12:00:00Z',
            },
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was queued for processing
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'order.created');
  }, 10000);

  it('should handle refund.created event successfully', async () => {
    const webhookBody = {
      type: 'refund.created',
      event_id: 'event-789',
      data: {
        id: 'refund-123',
        object: {
          refund: {
            id: 'refund-123',
            payment_id: 'payment-123',
            amount_money: {
              amount: 2500,
              currency: 'USD',
            },
            status: 'COMPLETED',
            created_at: '2024-01-01T12:00:00Z',
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was queued for processing
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'refund.created');
  }, 10000);

  it('should handle unknown event types gracefully', async () => {
    const webhookBody = {
      type: 'unknown.event',
      event_id: 'event-unknown',
      data: {
        id: 'unknown-123',
        object: {
          unknown: {
            id: 'unknown-123',
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was queued for processing (even unknown types)
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'unknown.event');
  }, 10000);

  it('should handle missing signature', async () => {
    const webhookBody = {
      type: 'payment.created',
      event_id: 'event-no-sig',
      data: {
        id: 'payment-123',
        object: {
          payment: {
            id: 'payment-123',
            order_id: 'order-123',
            amount_money: {
              amount: 2500,
              currency: 'USD',
            },
            status: 'COMPLETED',
          },
        },
      },
    };

    const request = createMockRequest(webhookBody); // No signature

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // In test environment, signature validation is skipped, so webhook should still be processed
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
  }, 10000);

  it('should handle invalid signature', async () => {
    const webhookBody = {
      type: 'payment.created',
      event_id: 'event-invalid-sig',
      data: {
        id: 'payment-123',
        object: {
          payment: {
            id: 'payment-123',
            order_id: 'order-123',
            amount_money: {
              amount: 2500,
              currency: 'USD',
            },
            status: 'COMPLETED',
          },
        },
      },
    };

    const request = createMockRequest(webhookBody, 'invalid-signature');

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // In test environment, signature validation is mocked to return true, so webhook should be processed
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
  }, 10000);

  it('should handle invalid JSON payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': 'valid-signature',
        'x-square-hmacsha256-timestamp': '1234567890',
      },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Invalid JSON should still be acknowledged but not processed
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).not.toHaveBeenCalled();
  }, 10000);

  it('should handle empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-hmacsha256-signature': 'valid-signature',
        'x-square-hmacsha256-timestamp': '1234567890',
      },
      body: '',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Empty body should be acknowledged but not processed
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).not.toHaveBeenCalled();
  }, 10000);

  it('should handle database errors gracefully', async () => {
    const webhookBody = {
      type: 'payment.created',
      event_id: 'event-db-error',
      data: {
        id: 'payment-123',
        object: {
          payment: {
            id: 'payment-123',
            order_id: 'order-123',
            amount_money: {
              amount: 2500,
              currency: 'USD',
            },
            status: 'COMPLETED',
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    // Mock database error in the webhook queue
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    (handleWebhookWithQueue as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was attempted to be processed
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
  }, 10000);

  it('should handle payment with different statuses', async () => {
    const statuses = ['PENDING', 'APPROVED', 'FAILED', 'CANCELED'];

    for (const status of statuses) {
      jest.clearAllMocks();

      const webhookBody = {
        type: 'payment.created',
        event_id: `event-${status.toLowerCase()}`,
        data: {
          id: 'payment-123',
          object: {
            payment: {
              id: 'payment-123',
              order_id: 'order-123',
              amount_money: {
                amount: 2500,
                currency: 'USD',
              },
              status: status,
            },
          },
        },
      };

      const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
      const request = createMockRequest(webhookBody, signature);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.processing).toBe('async');

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the webhook was queued for processing
      const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
      expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
    }
  }, 15000);

  it('should handle webhook with missing required fields', async () => {
    const webhookBody = {
      type: 'payment.created',
      event_id: 'event-missing-fields',
      data: {
        id: 'payment-123',
        object: {
          payment: {
            id: 'payment-123',
            // Missing order_id and amount_money
            status: 'COMPLETED',
          },
        },
      },
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');
    const request = createMockRequest(webhookBody, signature);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.processing).toBe('async');

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify the webhook was queued for processing (validation happens in handlers)
    const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
    expect(handleWebhookWithQueue).toHaveBeenCalledWith(webhookBody, 'payment.created');
  }, 10000);

  it('should handle multiple webhook events in sequence', async () => {
    const events = [
      {
        type: 'order.created',
        event_id: 'event-seq-1',
        data: {
          id: 'order-123',
          object: {
            order_created: {
              order: {
                id: 'order-123',
                location_id: 'location-123',
                total_money: { amount: 2500, currency: 'USD' },
              },
            },
          },
        },
      },
      {
        type: 'payment.created',
        event_id: 'event-seq-2',
        data: {
          id: 'payment-123',
          object: {
            payment: {
              id: 'payment-123',
              order_id: 'order-123',
              amount_money: { amount: 2500, currency: 'USD' },
              status: 'COMPLETED',
            },
          },
        },
      },
    ];

    for (const event of events) {
      jest.clearAllMocks();

      const signature = createValidSignature(JSON.stringify(event), 'http://localhost:3000/api/webhooks/square');
      const request = createMockRequest(event, signature);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.processing).toBe('async');

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the webhook was queued for processing
      const { handleWebhookWithQueue } = require('@/lib/webhook-queue');
      expect(handleWebhookWithQueue).toHaveBeenCalledWith(event, event.type);
    }
  }, 15000);
}); 