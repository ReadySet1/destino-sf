/**
 * DES-60 Phase 4: Checkout Flow Concurrency Integration Test
 *
 * Tests the complete checkout flow under concurrent load:
 * 1. Add items to cart
 * 2. Create order via /api/checkout
 * 3. Process payment via /api/checkout/payment
 * 4. Verify order completion
 *
 * Simulates real-world scenarios with multiple concurrent users.
 *
 * @project DES-60 Phase 4: Concurrent Operations & Race Conditions
 */

import { NextRequest } from 'next/server';
import { POST as checkoutHandler } from '@/app/api/checkout/route';
import { POST as paymentHandler } from '@/app/api/checkout/payment/route';
import { getTestPrismaClient } from '../utils/database-test-utils';
import { globalDeduplicator } from '@/lib/concurrency/request-deduplicator';
import { CartItem } from '@/types/cart';

// Helper to get prisma client - calls getTestPrismaClient() each time
// This ensures we get the properly initialized client after beforeAll runs
const getPrisma = () => getTestPrismaClient();

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((url, key, options) => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-concurrent',
            email: 'concurrent@example.com',
          },
        },
      }),
    },
  })),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
  })),
}));

// Mock Square services
const mockCreateOrder = jest.fn();
const mockCreatePayment = jest.fn();
const mockUpdateOrder = jest.fn();

jest.mock('@/lib/square/orders', () => ({
  createOrder: (...args: any[]) => mockCreateOrder(...args),
  createPayment: (...args: any[]) => mockCreatePayment(...args),
}));

jest.mock('@/lib/square/service', () => ({
  getSquareService: jest.fn(() => ({
    updateOrder: (...args: any[]) => mockUpdateOrder(...args),
  })),
}));

// Mock rate limiting
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn().mockResolvedValue(null),
}));

// Mock validation middleware
jest.mock('@/middleware/api-validator', () => ({
  withValidation: (handler: any) => handler,
}));

// Mock profile sync
jest.mock('@/lib/profile-sync', () => ({
  syncCustomerToProfile: jest.fn().mockResolvedValue(undefined),
}));

describe('Checkout Flow Concurrency Integration Test', () => {
  const testCartItems: CartItem[] = [
    {
      id: 'product-alfajor',
      name: 'Alfajor de Dulce de Leche',
      price: 4.5,
      quantity: 12,
      variantId: 'chocolate',
    },
    {
      id: 'product-empanada',
      name: 'Empanada de Carne',
      price: 5.0,
      quantity: 6,
    },
  ];

  const testCustomerInfo = {
    name: 'Concurrent Test User',
    email: 'concurrent-flow@example.com',
    phone: '+1555123456',
    pickupTime: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    globalDeduplicator.clearAll();

    // Reset mocks to success
    mockCreateOrder.mockImplementation(async config => ({
      id: `square-order-${Date.now()}-${Math.random()}`,
      state: 'OPEN',
      lineItems: config.lineItems,
    }));

    mockCreatePayment.mockImplementation(async (sourceId, orderId, amount) => ({
      id: `payment-${Date.now()}-${Math.random()}`,
      status: 'COMPLETED',
      orderId,
      amount,
    }));

    mockUpdateOrder.mockResolvedValue({
      state: 'OPEN',
    });

    // Clean up test data
    await getPrisma().order.deleteMany({
      where: {
        email: testCustomerInfo.email,
      },
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await getPrisma().order.deleteMany({
      where: {
        email: testCustomerInfo.email,
      },
    });
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  describe('Complete Checkout Flow', () => {
    it('should complete full checkout flow: cart → order → payment', async () => {
      // Step 1: Create order via checkout API
      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: testCartItems,
          customerInfo: testCustomerInfo,
        }),
      });

      const checkoutResponse = await checkoutHandler(checkoutRequest);
      expect(checkoutResponse.status).toBe(200);

      const checkoutData = await checkoutResponse.json();
      expect(checkoutData.orderId).toBeDefined();

      const orderId = checkoutData.orderId;

      // Step 2: Verify order was created
      const order = await getPrisma().order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      expect(order).toBeDefined();
      expect(order?.status).toBe('PENDING');
      expect(order?.paymentStatus).toBe('PENDING');
      expect(order?.squareOrderId).toBeDefined();

      // Step 3: Process payment
      const paymentRequest = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'card-token-test',
          orderId: orderId,
          amount: Math.round(Number(order?.total) * 100),
        }),
      });

      const paymentResponse = await paymentHandler(paymentRequest);
      expect(paymentResponse.status).toBe(200);

      const paymentData = await paymentResponse.json();
      expect(paymentData.success).toBe(true);
      expect(paymentData.paymentId).toBeDefined();

      // Step 4: Verify order was updated
      const completedOrder = await getPrisma().order.findUnique({
        where: { id: orderId },
      });

      expect(completedOrder?.status).toBe('PROCESSING');
      expect(completedOrder?.paymentStatus).toBe('PAID');
    });

    it('should prevent double-submit during checkout', async () => {
      // Create 5 identical concurrent checkout requests
      const requests = Array.from(
        { length: 5 },
        () =>
          new NextRequest('http://localhost:3000/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: testCartItems,
              customerInfo: testCustomerInfo,
            }),
          })
      );

      const responses = await Promise.all(requests.map(req => checkoutHandler(req)));

      // Should have 1 success and 4 duplicate detections
      const successCount = responses.filter(r => r.status === 200).length;
      const duplicateCount = responses.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(duplicateCount).toBe(4);

      // Verify only 1 order was created
      const orders = await getPrisma().order.findMany({
        where: { email: testCustomerInfo.email },
      });

      expect(orders.length).toBe(1);
    });

    it('should prevent double-payment on same order', async () => {
      // First create an order
      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: testCartItems,
          customerInfo: testCustomerInfo,
        }),
      });

      const checkoutResponse = await checkoutHandler(checkoutRequest);
      const { orderId } = await checkoutResponse.json();

      const order = await getPrisma().order.findUnique({ where: { id: orderId } });

      // Create 5 concurrent payment requests
      const paymentRequests = Array.from(
        { length: 5 },
        () =>
          new NextRequest('http://localhost:3000/api/checkout/payment', {
            method: 'POST',
            body: JSON.stringify({
              sourceId: 'card-token-test',
              orderId: orderId,
              amount: Math.round(Number(order?.total) * 100),
            }),
          })
      );

      const paymentResponses = await Promise.all(paymentRequests.map(req => paymentHandler(req)));

      // Should have 1 success and 4 conflicts
      const successCount = paymentResponses.filter(r => r.status === 200).length;
      const conflictCount = paymentResponses.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);

      // Verify payment only processed once
      expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Concurrent Users', () => {
    it('should handle 10 concurrent users checking out different orders', async () => {
      // Create 10 different users
      const users = Array.from({ length: 10 }, (_, i) => ({
        customerInfo: {
          ...testCustomerInfo,
          email: `concurrent-user-${i}@example.com`,
          name: `User ${i}`,
        },
        items: [
          {
            id: 'product-alfajor',
            name: 'Alfajor',
            price: 4.5,
            quantity: Math.floor(Math.random() * 10) + 1,
          },
        ],
      }));

      // All users checkout concurrently
      const checkoutRequests = users.map(
        user =>
          new NextRequest('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({
              items: user.items,
              customerInfo: user.customerInfo,
            }),
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(checkoutRequests.map(req => checkoutHandler(req)));
      const duration = Date.now() - startTime;

      // All should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Extract order IDs
      const orderIds = await Promise.all(
        responses.map(async r => {
          const data = await r.json();
          return data.orderId;
        })
      );

      // Verify all orders were created
      const orders = await getPrisma().order.findMany({
        where: { id: { in: orderIds } },
      });

      expect(orders.length).toBe(10);

      // Clean up
      await getPrisma().order.deleteMany({
        where: {
          email: { startsWith: 'concurrent-user-', endsWith: '@example.com' },
        },
      });
    });

    it('should handle 10 concurrent users paying for their orders', async () => {
      // First, create 10 orders
      const users = Array.from({ length: 10 }, (_, i) => ({
        customerInfo: {
          ...testCustomerInfo,
          email: `payment-user-${i}@example.com`,
          name: `Payment User ${i}`,
        },
        items: [
          {
            id: 'product-empanada',
            name: 'Empanada',
            price: 5.0,
            quantity: 5,
          },
        ],
      }));

      const orders = await Promise.all(
        users.map(user =>
          prisma.order.create({
            data: {
              status: 'PENDING',
              paymentStatus: 'PENDING',
              total: 25.0,
              squareOrderId: `square-${Date.now()}-${Math.random()}`,
              customerName: user.customerInfo.name,
              email: user.customerInfo.email,
              phone: user.customerInfo.phone,
              pickupTime: new Date(user.customerInfo.pickupTime),
              version: 1,
            },
          })
        )
      );

      // All users pay concurrently
      const paymentRequests = orders.map(
        order =>
          new NextRequest('http://localhost:3000/api/checkout/payment', {
            method: 'POST',
            body: JSON.stringify({
              sourceId: 'card-token-test',
              orderId: order.id,
              amount: 2500, // $25.00
            }),
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(paymentRequests.map(req => paymentHandler(req)));
      const duration = Date.now() - startTime;

      // All should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000);

      // Verify all payments were processed
      expect(mockCreatePayment).toHaveBeenCalledTimes(10);

      // Verify all orders were updated
      const updatedOrders = await getPrisma().order.findMany({
        where: { id: { in: orders.map(o => o.id) } },
      });

      updatedOrders.forEach(order => {
        expect(order.paymentStatus).toBe('PAID');
        expect(order.status).toBe('PROCESSING');
      });

      // Clean up
      await getPrisma().order.deleteMany({
        where: {
          email: { startsWith: 'payment-user-', endsWith: '@example.com' },
        },
      });
    });
  });

  describe('Race Conditions and Edge Cases', () => {
    it('should handle user abandoning payment and retrying', async () => {
      // Create order
      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: testCartItems,
          customerInfo: testCustomerInfo,
        }),
      });

      const checkoutResponse = await checkoutHandler(checkoutRequest);
      const { orderId } = await checkoutResponse.json();

      const order = await getPrisma().order.findUnique({ where: { id: orderId } });

      // First payment attempt (will fail)
      mockCreatePayment.mockRejectedValueOnce(new Error('Payment declined'));

      const payment1Request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify({
          sourceId: 'bad-card-token',
          orderId: orderId,
          amount: Math.round(Number(order?.total) * 100),
        }),
      });

      const payment1Response = await paymentHandler(payment1Request);
      expect(payment1Response.status).toBe(500);

      // Order should still be PENDING
      let updatedOrder = await getPrisma().order.findUnique({ where: { id: orderId } });
      expect(updatedOrder?.status).toBe('PENDING');
      expect(updatedOrder?.paymentStatus).toBe('PENDING');

      // Second payment attempt (will succeed)
      mockCreatePayment.mockResolvedValueOnce({
        id: 'payment-success',
        status: 'COMPLETED',
        amount: Math.round(Number(order?.total) * 100),
      });

      const payment2Request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify({
          sourceId: 'good-card-token',
          orderId: orderId,
          amount: Math.round(Number(order?.total) * 100),
        }),
      });

      const payment2Response = await paymentHandler(payment2Request);
      expect(payment2Response.status).toBe(200);

      // Order should now be PAID
      updatedOrder = await getPrisma().order.findUnique({ where: { id: orderId } });
      expect(updatedOrder?.status).toBe('PROCESSING');
      expect(updatedOrder?.paymentStatus).toBe('PAID');
    });

    it('should handle concurrent checkout with same cart + payment requests', async () => {
      // Simulate: User clicks checkout, then immediately clicks pay before checkout completes

      const checkoutRequest = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: testCartItems,
          customerInfo: testCustomerInfo,
        }),
      });

      // Start checkout (don't await yet)
      const checkoutPromise = checkoutHandler(checkoutRequest);

      // Wait a tiny bit to let checkout start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to get the order ID before checkout completes
      // (In real scenario, user might have cached order ID from previous attempt)

      const checkoutResponse = await checkoutPromise;
      const { orderId } = await checkoutResponse.json();

      // Now try concurrent payments
      const order = await getPrisma().order.findUnique({ where: { id: orderId } });

      const paymentRequests = Array.from(
        { length: 3 },
        () =>
          new NextRequest('http://localhost:3000/api/checkout/payment', {
            method: 'POST',
            body: JSON.stringify({
              sourceId: 'card-token',
              orderId: orderId,
              amount: Math.round(Number(order?.total) * 100),
            }),
          })
      );

      const paymentResponses = await Promise.all(paymentRequests.map(req => paymentHandler(req)));

      // Only 1 should succeed
      const successCount = paymentResponses.filter(r => r.status === 200).length;
      expect(successCount).toBe(1);

      // Verify single payment
      expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with 20 concurrent checkout operations', async () => {
      const users = Array.from({ length: 20 }, (_, i) => ({
        customerInfo: {
          ...testCustomerInfo,
          email: `perf-test-${i}@example.com`,
          name: `Perf User ${i}`,
        },
        items: testCartItems,
      }));

      const requests = users.map(
        user =>
          new NextRequest('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({
              items: user.items,
              customerInfo: user.customerInfo,
            }),
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests.map(req => checkoutHandler(req)));
      const duration = Date.now() - startTime;

      // Count successes
      const successCount = responses.filter(r => r.status === 200).length;

      // Most should succeed
      expect(successCount).toBeGreaterThan(15);

      // Should complete in reasonable time (< 8 seconds for 20 users)
      expect(duration).toBeLessThan(8000);

      console.log(`20 concurrent checkouts completed in ${duration}ms`);
      console.log(`Success rate: ${(successCount / 20) * 100}%`);

      // Clean up
      await getPrisma().order.deleteMany({
        where: {
          email: { startsWith: 'perf-test-', endsWith: '@example.com' },
        },
      });
    });

    it('should maintain data integrity under heavy concurrent load', async () => {
      // Create 50 concurrent users
      const users = Array.from({ length: 50 }, (_, i) => ({
        customerInfo: {
          ...testCustomerInfo,
          email: `integrity-test-${i}@example.com`,
          name: `Integrity User ${i}`,
        },
        items: [
          {
            id: 'product-test',
            name: 'Test Product',
            price: 10.0,
            quantity: i + 1, // Different quantities to ensure unique orders
          },
        ],
      }));

      const requests = users.map(
        user =>
          new NextRequest('http://localhost:3000/api/checkout', {
            method: 'POST',
            body: JSON.stringify({
              items: user.items,
              customerInfo: user.customerInfo,
            }),
          })
      );

      await Promise.all(requests.map(req => checkoutHandler(req)));

      // Verify all orders have correct data
      const orders = await getPrisma().order.findMany({
        where: {
          email: { startsWith: 'integrity-test-', endsWith: '@example.com' },
        },
        include: { items: true },
      });

      // Each order should have correct total
      orders.forEach((order, i) => {
        const expectedQuantity = i + 1;
        const expectedTotal = expectedQuantity * 10.0;

        expect(Number(order.total)).toBeCloseTo(expectedTotal, 2);
        expect(order.status).toBe('PENDING');
      });

      // Clean up
      await getPrisma().order.deleteMany({
        where: {
          email: { startsWith: 'integrity-test-', endsWith: '@example.com' },
        },
      });
    });
  });
});
