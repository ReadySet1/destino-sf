/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/orders/[orderId]/retry-payment/route';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock external dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } }
      }))
    }
  }))
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn()
    }
  }
}));

jest.mock('@/middleware/rate-limit', () => ({
  applyUserBasedRateLimit: jest.fn(() => Promise.resolve(null))
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid')
}));

describe('API Route: Retry Payment Protection', () => {
  const mockPrisma = require('@/lib/db').prisma;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject retry attempts for CASH orders', async () => {
    // Mock a CASH order
    mockPrisma.order.findUnique.mockResolvedValue(null); // No order found because query filters by paymentMethod: 'SQUARE'

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Order not found, not eligible for retry, or uses cash payment method');
  });

  it('should allow retry attempts for SQUARE orders', async () => {
    // Mock a SQUARE order
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      userId: 'test-user-id',
      retryCount: 1,
      paymentUrl: null,
      paymentUrlExpiresAt: null,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: 18.00,
          product: { name: 'Test Product', images: [] },
          variant: { name: 'Test Variant' }
        }
      ],
      total: 36.00,
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323'
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.order.update.mockResolvedValue({ ...mockOrder, retryCount: 2 });

    // Mock successful Square checkout session creation
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          payment_link: {
            url: 'https://square-checkout-url.com',
            order_id: 'square-order-id'
          }
        }),
      })
    );

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.checkoutUrl).toBe('https://square-checkout-url.com');
  });

  it('should reject requests with additional safety check for non-SQUARE payment methods', async () => {
    // Mock an order that somehow passes the initial query but has CASH payment method
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      userId: 'test-user-id',
      retryCount: 0,
      items: []
    };

    // Temporarily make the query return a CASH order to test the additional safety check
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Payment retry is only available for credit card orders');
  });

  it('should reject retry attempts when maximum retries exceeded', async () => {
    // Mock an order that has reached max retries
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      userId: 'test-user-id',
      retryCount: 3, // Maximum retries
      items: []
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Maximum retry attempts exceeded');
  });

  it('should reject unauthorized requests', async () => {
    // Mock unauthorized user
    const createClient = require('@/utils/supabase/server').createClient;
    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: null }
        }))
      }
    });

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return existing valid checkout URL if available', async () => {
    // Mock an order with a valid existing checkout URL
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2); // 2 hours in the future

    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      userId: 'test-user-id',
      retryCount: 1,
      paymentUrl: 'https://existing-checkout-url.com',
      paymentUrlExpiresAt: futureDate,
      items: []
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

    const request = new NextRequest('http://localhost:3000/api/orders/test-order-id/retry-payment', {
      method: 'POST'
    });

    const params = { orderId: 'test-order-id' };
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.checkoutUrl).toBe('https://existing-checkout-url.com');
    expect(data.expiresAt).toBeDefined();
  });
}); 