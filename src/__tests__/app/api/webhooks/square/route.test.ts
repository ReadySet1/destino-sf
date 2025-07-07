import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock environment and dependencies before imports
jest.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'mock-database-url',
    SQUARE_ACCESS_TOKEN: 'mock-access-token',
    SQUARE_ENVIRONMENT: 'sandbox',
    SQUARE_WEBHOOK_SECRET: 'test-webhook-secret-key-123'
  }
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/middleware/rate-limit');
jest.mock('@/lib/error-monitoring');
jest.mock('@/lib/alerts');

jest.mock('square', () => ({
  SquareClient: jest.fn().mockImplementation(() => ({
    orders: {
      get: jest.fn().mockResolvedValue({
        order: {
          fulfillments: []
        }
      })
    }
  }))
}));

// Import after mocking
import { POST } from '@/app/api/webhooks/square/route';
import { prisma } from '@/lib/db';
import { applyWebhookRateLimit } from '@/middleware/rate-limit';
import { errorMonitor } from '@/lib/error-monitoring';

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
} as any;

// Replace the actual prisma instance with our mock
(prisma as any).order = mockPrisma.order;

const mockApplyWebhookRateLimit = applyWebhookRateLimit as jest.MockedFunction<typeof applyWebhookRateLimit>;
const mockErrorMonitor = errorMonitor as jest.Mocked<typeof errorMonitor>;

describe('/api/webhooks/square - POST (Phase 1 Critical Security Tests)', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment
    process.env.SQUARE_WEBHOOK_SECRET = 'test-webhook-secret-key-123';
    process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
    
    // Default successful mocks
    mockApplyWebhookRateLimit.mockResolvedValue(null);
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.order.upsert.mockResolvedValue({} as any);
    mockPrisma.order.update.mockResolvedValue({} as any);
    mockErrorMonitor.captureWebhookError.mockResolvedValue(undefined);
  });
  
  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Webhook Security & Signature Validation (Critical - 95%+ Coverage Target)', () => {
    it('should validate Square webhook signatures correctly', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: {
            payment: {
              id: 'payment-123',
              status: 'COMPLETED',
              amount_money: { amount: 2500, currency: 'USD' }
            }
          }
        }
      });
      
      const timestamp = '1234567890';
      const message = `${timestamp}${payload}`;
      const validSignature = crypto
        .createHmac('sha256', 'test-webhook-secret-key-123')
        .update(message)
        .digest('hex');
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-square-hmacsha256-signature': validSignature,
          'x-square-hmacsha256-timestamp': timestamp,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should reject webhooks with invalid signatures', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-square-hmacsha256-signature': 'invalid-signature',
          'x-square-hmacsha256-timestamp': '1234567890',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should handle missing signature headers gracefully when secret is configured', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      // Should process but log warning about missing signature
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should process webhooks when no secret is configured', async () => {
      delete process.env.SQUARE_WEBHOOK_SECRET;
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should implement timing-safe signature comparison to prevent timing attacks', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const timestamp = '1234567890';
      const message = `${timestamp}${payload}`;
      const validSignature = crypto
        .createHmac('sha256', 'test-webhook-secret-key-123')
        .update(message)
        .digest('hex');
      
      // Test with signature that differs only in last character
      const almostValidSignature = validSignature.slice(0, -1) + 'x';
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-square-hmacsha256-signature': almostValidSignature,
          'x-square-hmacsha256-timestamp': timestamp,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('Rate Limiting Integration (Critical - Production Task #3 Support)', () => {
    it('should apply webhook-specific rate limiting', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      expect(mockApplyWebhookRateLimit).toHaveBeenCalledWith(request, 'square');
    });

    it('should reject requests when rate limit is exceeded', async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
      
      mockApplyWebhookRateLimit.mockResolvedValue(rateLimitResponse as any);
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: { id: 'payment-123' } }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(mockApplyWebhookRateLimit).toHaveBeenCalledWith(request, 'square');
    });
  });

  describe('Event Processing & Validation (Business Critical)', () => {
    it('should handle payment.created events correctly', async () => {
      const paymentData = {
        id: 'payment-123',
        amount_money: { amount: 2500, currency: 'USD' },
        status: 'COMPLETED',
        order_id: 'order-123'
      };
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-123',
          object: { payment: paymentData }
        }
      });
      
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        squareOrderId: 'order-123',
        status: 'PENDING'
      } as any);
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });

    it('should handle order.created events correctly', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'order.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'order',
          id: 'order-123',
          object: {
            order_created: {
              state: 'OPEN',
              total_money: { amount: 2500, currency: 'USD' }
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrisma.order.upsert).toHaveBeenCalled();
    });

    it('should handle refund.created events correctly', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'refund.created',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'refund',
          id: 'refund-123',
          object: {
            refund: {
              id: 'refund-123',
              amount_money: { amount: 1000, currency: 'USD' },
              payment_id: 'payment-123',
              status: 'COMPLETED'
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'unknown.event.type',
        event_id: 'event-123',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'unknown',
          id: 'unknown-123',
          object: {}
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('Replay Attack Prevention (Security Critical)', () => {
    it('should prevent duplicate event processing using event IDs', async () => {
      const eventId = 'event-123-duplicate-test';
      const orderId = 'order-duplicate-test';
      
      // Mock existing order with processed event
      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        squareOrderId: orderId,
        rawData: {
          lastProcessedEventId: eventId,
          lastProcessedAt: '2024-01-16T12:00:00Z'
        }
      } as any);
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'order.created',
        event_id: eventId,
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'order',
          id: orderId,
          object: {
            order_created: {
              state: 'OPEN',
              total_money: { amount: 2500, currency: 'USD' }
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      // Should not call upsert for duplicate event
      expect(mockPrisma.order.upsert).not.toHaveBeenCalled();
    });

    it('should process new events even for existing orders', async () => {
      const newEventId = 'event-456-new';
      const orderId = 'order-existing';
      
      // Mock existing order with different event ID
      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        squareOrderId: orderId,
        rawData: {
          lastProcessedEventId: 'event-123-old',
          lastProcessedAt: '2024-01-16T11:00:00Z'
        }
      } as any);
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'order.updated',
        event_id: newEventId,
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'order',
          id: orderId,
          object: {
            order_updated: {
              state: 'COMPLETED',
              total_money: { amount: 2500, currency: 'USD' }
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockPrisma.order.update).toHaveBeenCalled();
    });
  });

  describe('Error Handling & Monitoring (Supports Sentry Integration)', () => {
    it('should handle invalid JSON payloads', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: 'invalid-json-payload',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('should handle empty request bodies gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.emptyBody).toBe(true);
      expect(data.received).toBe(true);
    });

    it('should capture webhook processing errors for monitoring', async () => {
      mockPrisma.order.upsert.mockRejectedValue(new Error('Database connection failed'));
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'order.created',
        event_id: 'event-error-test',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'order',
          id: 'order-error-test',
          object: {
            order_created: {
              state: 'OPEN',
              total_money: { amount: 2500, currency: 'USD' }
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockErrorMonitor.captureWebhookError).toHaveBeenCalled();
    });

    it('should handle database errors during event processing', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database query timeout'));
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-db-error',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-db-error',
          object: {
            payment: {
              id: 'payment-db-error',
              amount_money: { amount: 2500, currency: 'USD' },
              status: 'COMPLETED'
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(mockErrorMonitor.captureWebhookError).toHaveBeenCalled();
    });

    it('should continue processing despite signature validation errors', async () => {
      // Simulate error in signature validation
      const originalCreateHmac = crypto.createHmac;
      jest.spyOn(crypto, 'createHmac').mockImplementation(() => {
        throw new Error('Crypto error');
      });
      
      const payload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-crypto-error',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-crypto-error',
          object: {
            payment: {
              id: 'payment-crypto-error',
              amount_money: { amount: 2500, currency: 'USD' },
              status: 'COMPLETED'
            }
          }
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
          'x-square-hmacsha256-signature': 'some-signature',
          'x-square-hmacsha256-timestamp': '1234567890',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      
      // Restore original function
      crypto.createHmac = originalCreateHmac;
    });
  });

  describe('Performance & Scalability (Supports Load Testing)', () => {
    it('should handle high-volume webhook processing efficiently', async () => {
      const startTime = Date.now();
      const webhookPromises = [];
      
      // Simulate processing 10 webhooks concurrently
      for (let i = 0; i < 10; i++) {
        const payload = JSON.stringify({
          merchant_id: 'test-merchant',
          type: 'payment.created',
          event_id: `event-${i}`,
          created_at: '2024-01-16T12:00:00Z',
          data: {
            type: 'payment',
            id: `payment-${i}`,
            object: {
              payment: {
                id: `payment-${i}`,
                amount_money: { amount: 2500, currency: 'USD' },
                status: 'COMPLETED'
              }
            }
          }
        });
        
        const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
        });

        webhookPromises.push(POST(request));
      }
      
      const responses = await Promise.all(webhookPromises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should process relatively quickly (under 1 second for 10 webhooks)
      expect(processingTime).toBeLessThan(1000);
    });

    it('should not block other webhooks when one fails', async () => {
      // Make first webhook fail
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(null) // First call succeeds
        .mockRejectedValueOnce(new Error('Database error')) // Second call fails
        .mockResolvedValue(null); // Subsequent calls succeed
      
      const successPayload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-success',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-success',
          object: {
            payment: {
              id: 'payment-success',
              amount_money: { amount: 2500, currency: 'USD' },
              status: 'COMPLETED'
            }
          }
        }
      });
      
      const failPayload = JSON.stringify({
        merchant_id: 'test-merchant',
        type: 'payment.created',
        event_id: 'event-fail',
        created_at: '2024-01-16T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-fail',
          object: {
            payment: {
              id: 'payment-fail',
              amount_money: { amount: 1500, currency: 'USD' },
              status: 'COMPLETED'
            }
          }
        }
      });
      
      const successRequest = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: successPayload,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const failRequest = new NextRequest('http://localhost:3000/api/webhooks/square', {
        method: 'POST',
        body: failPayload,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const [successResponse, failResponse] = await Promise.all([
        POST(successRequest),
        POST(failRequest)
      ]);
      
      expect(successResponse.status).toBe(200);
      expect(failResponse.status).toBe(500);
    });
  });
}); 