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
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/webhooks/square - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any, signature?: string) => {
    const requestBody = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (signature) {
      headers['x-square-signature'] = signature;
    }

    return new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers,
      body: requestBody,
    });
  };

  const createValidSignature = (body: string, webhookUrl: string) => {
    const hmac = crypto.createHmac('sha256', process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || 'test-key');
    hmac.update(webhookUrl + body);
    return hmac.digest('base64');
  };

  it('should handle payment.created event successfully', async () => {
    const webhookBody = {
      type: 'payment.created',
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
    (mockPrisma.order.update as jest.Mock).mockResolvedValue({
      id: 'order-123',
      status: 'PAID',
      squareOrderId: 'square-order-123',
    });

    (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
      id: 'payment-123',
      orderId: 'order-123',
      amount: 25.00,
      status: 'COMPLETED',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Verify order was updated
    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { squareOrderId: 'order-123' },
      data: { status: 'PAID' },
    });

    // Verify payment was created
    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: {
        squarePaymentId: 'payment-123',
        orderId: 'order-123',
        amount: 25.00,
        status: 'COMPLETED',
        currency: 'USD',
      },
    });
  });

  it('should handle order.created event successfully', async () => {
    const webhookBody = {
      type: 'order.created',
      data: {
        id: 'order-123',
        object: {
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
    };

    const signature = createValidSignature(JSON.stringify(webhookBody), 'http://localhost:3000/api/webhooks/square');

    const request = createMockRequest(webhookBody, signature);

    // Mock database operations
    (mockPrisma.order.upsert as jest.Mock).mockResolvedValue({
      id: 'order-123',
      squareOrderId: 'order-123',
      status: 'PENDING',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Verify order was upserted
    expect(mockPrisma.order.upsert).toHaveBeenCalledWith({
      where: { squareOrderId: 'order-123' },
      update: {
        status: 'PENDING',
        total: 25.98,
      },
      create: {
        squareOrderId: 'order-123',
        status: 'PENDING',
        total: 25.98,
        locationId: 'location-123',
      },
    });
  });

  it('should handle refund.created event successfully', async () => {
    const webhookBody = {
      type: 'refund.created',
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

    // Mock database operations
    (mockPrisma.payment.update as jest.Mock).mockResolvedValue({
      id: 'payment-123',
      status: 'REFUNDED',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Verify payment was updated
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { squarePaymentId: 'payment-123' },
      data: { status: 'REFUNDED' },
    });
  });

  it('should handle unknown event types gracefully', async () => {
    const webhookBody = {
      type: 'unknown.event',
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
    expect(data.message).toBe('Event type not handled: unknown.event');

    // Verify no database operations were performed
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.order.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(mockPrisma.payment.update).not.toHaveBeenCalled();
  });

  it('should handle missing signature', async () => {
    const webhookBody = {
      type: 'payment.created',
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

    expect(response.status).toBe(401);
    expect(data.error).toBe('Missing signature');

    // Verify no database operations were performed
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should handle invalid signature', async () => {
    const webhookBody = {
      type: 'payment.created',
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

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid signature');

    // Verify no database operations were performed
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-signature': 'valid-signature',
      },
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON payload');

    // Verify no database operations were performed
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should handle empty request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhooks/square', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-square-signature': 'valid-signature',
      },
      body: '',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emptyBody).toBe(true);
    expect(data.received).toBe(true);
  });

  it('should handle database errors gracefully', async () => {
    const webhookBody = {
      type: 'payment.created',
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

    // Mock database error
    (mockPrisma.order.update as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process webhook');
    expect(data.details).toBe('Database connection failed');
  });

  it('should handle payment with different statuses', async () => {
    const statuses = ['PENDING', 'APPROVED', 'FAILED', 'CANCELED'];

    for (const status of statuses) {
      jest.clearAllMocks();

      const webhookBody = {
        type: 'payment.created',
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

      // Mock database operations
      (mockPrisma.order.update as jest.Mock).mockResolvedValue({
        id: 'order-123',
        status: status === 'COMPLETED' ? 'PAID' : status,
      });

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-123',
        status: status,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify order status was updated correctly
      const expectedOrderStatus = status === 'COMPLETED' ? 'PAID' : status;
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { squareOrderId: 'order-123' },
        data: { status: expectedOrderStatus },
      });
    }
  });

  it('should handle webhook with missing required fields', async () => {
    const webhookBody = {
      type: 'payment.created',
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

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid webhook data');
    expect(data.details).toContain('Missing required fields');

    // Verify no database operations were performed
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it('should handle multiple webhook events in sequence', async () => {
    const events = [
      {
        type: 'order.created',
        data: {
          id: 'order-123',
          object: {
            order: {
              id: 'order-123',
              location_id: 'location-123',
              total_money: { amount: 2500, currency: 'USD' },
            },
          },
        },
      },
      {
        type: 'payment.created',
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

      // Mock database operations
      if (event.type === 'order.created') {
        (mockPrisma.order.upsert as jest.Mock).mockResolvedValue({
          id: 'order-123',
          squareOrderId: 'order-123',
        });
      } else {
        (mockPrisma.order.update as jest.Mock).mockResolvedValue({
          id: 'order-123',
          status: 'PAID',
        });
        (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
          id: 'payment-123',
          status: 'COMPLETED',
        });
      }

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    }
  });
}); 