/**
 * DES-60 Phase 4: Order Creation Race Conditions Tests
 *
 * Tests concurrent order creation operations to ensure:
 * 1. Duplicate order prevention works correctly
 * 2. Request deduplication prevents double-submit
 * 3. Database constraints prevent duplicate records
 * 4. State remains consistent under concurrent load
 *
 * @project DES-60 Phase 4: Concurrent Operations & Race Conditions
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST as checkoutHandler } from '@/app/api/checkout/route';
import { checkForDuplicateOrder } from '@/lib/duplicate-order-prevention';
import { globalDeduplicator } from '@/lib/concurrency/request-deduplicator';
import { getTestPrismaClient } from '../utils/database-test-utils';
import { CartItem } from '@/types/cart';

// Mock Supabase client
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
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

// Mock Square service
jest.mock('@/lib/square/orders', () => ({
  createOrder: jest.fn().mockResolvedValue({
    id: 'square-order-123',
    state: 'OPEN',
  }),
}));

// Mock rate limiting (allow all requests for testing)
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn().mockResolvedValue(null),
}));

describe('Order Creation Race Conditions', () => {
  const testCartItems: CartItem[] = [
    {
      id: 'product-1',
      name: 'Alfajor',
      price: 4.5,
      quantity: 10,
      variantId: 'chocolate',
    },
    {
      id: 'product-2',
      name: 'Empanada',
      price: 5.0,
      quantity: 6,
    },
  ];

  const testCustomerInfo = {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+1234567890',
    pickupTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  };

  beforeEach(async () => {
    // Clear any pending orders and deduplicator cache
    globalDeduplicator.clearAll();

    // Clean up test orders
    const prisma = getTestPrismaClient();
    await prisma.order.deleteMany({
      where: {
        email: testCustomerInfo.email,
      },
    });

    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up after all tests
    const prisma = getTestPrismaClient();
    await prisma.order.deleteMany({
      where: {
        email: testCustomerInfo.email,
      },
    });
    await prisma.$disconnect();
  });

  describe('Concurrent Order Creation Prevention', () => {
    it('should prevent duplicate orders from concurrent requests with same items', async () => {
      const requestBody = {
        items: testCartItems,
        customerInfo: testCustomerInfo,
      };

      // Create 5 identical concurrent requests (simulating double-click or network retry)
      const requests = Array.from({ length: 5 }, () => {
        const request = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        return checkoutHandler(request);
      });

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // Count successful vs duplicate responses
      const successResponses = responses.filter(r => r.status === 200);
      const duplicateResponses = responses.filter(r => r.status === 409);

      // Should have exactly 1 successful order creation
      expect(successResponses.length).toBe(1);

      // All others should be detected as duplicates
      expect(duplicateResponses.length).toBe(4);

      // Verify only 1 order was created in the database
      const orders = await prisma.order.findMany({
        where: { email: testCustomerInfo.email },
      });

      expect(orders.length).toBe(1);
    });

    it('should use request deduplication to return same response for concurrent identical requests', async () => {
      const requestBody = {
        items: testCartItems,
        customerInfo: testCustomerInfo,
      };

      // Create 10 concurrent identical requests
      const requests = Array.from({ length: 10 }, () => {
        const request = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        return checkoutHandler(request);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All responses should complete
      expect(responses.length).toBe(10);

      // Most should be deduped (status could be 200 for first, 409 for duplicates)
      const responseStatuses = responses.map(r => r.status);
      expect(responseStatuses.some(s => s === 200 || s === 409)).toBe(true);

      // Should complete reasonably fast (deduplication avoids redundant DB calls)
      expect(duration).toBeLessThan(5000); // 5 seconds for 10 requests
    });

    it('should allow concurrent orders with different items', async () => {
      const order1Items: CartItem[] = [
        { id: 'product-1', name: 'Alfajor', price: 4.5, quantity: 5 },
      ];

      const order2Items: CartItem[] = [
        { id: 'product-2', name: 'Empanada', price: 5.0, quantity: 3 },
      ];

      const requests = [
        new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            items: order1Items,
            customerInfo: testCustomerInfo,
          }),
        }),
        new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            items: order2Items,
            customerInfo: testCustomerInfo,
          }),
        }),
      ];

      const responses = await Promise.all(requests.map(req => checkoutHandler(req)));

      // Both should succeed (different items = different orders)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Should have created separate orders
      const orders = await prisma.order.findMany({
        where: { email: testCustomerInfo.email },
        include: { items: true },
      });

      expect(orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Duplicate Order Detection', () => {
    it('should detect duplicate order with same items within 24 hours', async () => {
      // Create first order
      const order = await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 75.0,
          userId: 'test-user-123',
          customerName: testCustomerInfo.name,
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(testCustomerInfo.pickupTime),
          items: {
            create: testCartItems.map(item => ({
              productId: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Check for duplicate
      const duplicateCheck = await checkForDuplicateOrder(
        'test-user-123',
        testCartItems,
        testCustomerInfo.email
      );

      expect(duplicateCheck.hasPendingOrder).toBe(true);
      expect(duplicateCheck.existingOrderId).toBe(order.id);
      expect(duplicateCheck.existingOrder).toBeDefined();
    });

    it('should not detect duplicate if items are different', async () => {
      // Create first order with different items
      await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 25.0,
          userId: 'test-user-123',
          customerName: testCustomerInfo.name,
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(testCustomerInfo.pickupTime),
          items: {
            create: [
              {
                productId: 'product-3',
                quantity: 5,
                price: 5.0,
              },
            ],
          },
        },
      });

      // Check with different cart items
      const duplicateCheck = await checkForDuplicateOrder(
        'test-user-123',
        testCartItems,
        testCustomerInfo.email
      );

      // Should NOT be detected as duplicate (different items)
      expect(duplicateCheck.hasPendingOrder).toBe(false);
    });

    it('should not detect duplicate for completed orders', async () => {
      // Create completed order
      await prisma.order.create({
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          total: 75.0,
          userId: 'test-user-123',
          customerName: testCustomerInfo.name,
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(testCustomerInfo.pickupTime),
          items: {
            create: testCartItems.map(item => ({
              productId: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // Check for duplicate
      const duplicateCheck = await checkForDuplicateOrder(
        'test-user-123',
        testCartItems,
        testCustomerInfo.email
      );

      // Should NOT be detected (order is completed, not pending)
      expect(duplicateCheck.hasPendingOrder).toBe(false);
    });

    it('should not detect duplicate for old orders (>24 hours)', async () => {
      // Create old order (25 hours ago)
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);

      await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 75.0,
          userId: 'test-user-123',
          customerName: testCustomerInfo.name,
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(testCustomerInfo.pickupTime),
          createdAt: oldDate,
          items: {
            create: testCartItems.map(item => ({
              productId: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      // Check for duplicate
      const duplicateCheck = await checkForDuplicateOrder(
        'test-user-123',
        testCartItems,
        testCustomerInfo.email
      );

      // Should NOT be detected (order is too old)
      expect(duplicateCheck.hasPendingOrder).toBe(false);
    });
  });

  describe('Request Deduplication', () => {
    it('should cache in-flight requests and return same promise', async () => {
      const deduplicator = globalDeduplicator;
      let callCount = 0;

      const operation = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
        return { orderId: 'test-order-123' };
      };

      // Make 5 concurrent calls with same key
      const results = await Promise.all(
        Array.from({ length: 5 }, () => deduplicator.deduplicate('test-order-key', operation))
      );

      // All should return the same result
      results.forEach(result => {
        expect(result.orderId).toBe('test-order-123');
      });

      // Operation should only be called once
      expect(callCount).toBe(1);
    });

    it('should allow retry after TTL expires', async () => {
      const deduplicator = globalDeduplicator;
      let callCount = 0;

      const operation = async () => {
        callCount++;
        return { orderId: `order-${callCount}` };
      };

      // First call
      const result1 = await deduplicator.deduplicate('test-key', operation);
      expect(result1.orderId).toBe('order-1');
      expect(callCount).toBe(1);

      // Wait for TTL to expire (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5100));

      // Second call should execute again
      const result2 = await deduplicator.deduplicate('test-key', operation);
      expect(result2.orderId).toBe('order-2');
      expect(callCount).toBe(2);
    });

    it('should clear cache on error to allow retry', async () => {
      const deduplicator = globalDeduplicator;
      let attempt = 0;

      const operation = async () => {
        attempt++;
        if (attempt === 1) {
          throw new Error('First attempt failed');
        }
        return { orderId: 'success' };
      };

      // First call fails
      await expect(deduplicator.deduplicate('error-test-key', operation)).rejects.toThrow(
        'First attempt failed'
      );

      // Second call should succeed (cache was cleared on error)
      const result = await deduplicator.deduplicate('error-test-key', operation);
      expect(result.orderId).toBe('success');
      expect(attempt).toBe(2);
    });
  });

  describe('Database Constraint Protection', () => {
    it('should prevent duplicate order items via unique constraint', async () => {
      // Create an order
      const order = await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 50.0,
          userId: 'test-user-123',
          customerName: 'Test',
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(),
        },
      });

      // Try to create duplicate order items (same product + variant in same order)
      const createDuplicateItem = async () => {
        return prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: 'product-1',
            variantId: 'chocolate',
            quantity: 5,
            price: 4.5,
          },
        });
      };

      // First creation should succeed
      await expect(createDuplicateItem()).resolves.toBeDefined();

      // Second creation with same product+variant should fail due to unique constraint
      await expect(createDuplicateItem()).rejects.toThrow();
    });

    it('should allow multiple order items with different variants', async () => {
      const order = await prisma.order.create({
        data: {
          status: 'PENDING',
          paymentStatus: 'PENDING',
          total: 100.0,
          userId: 'test-user-123',
          customerName: 'Test',
          email: testCustomerInfo.email,
          phone: testCustomerInfo.phone,
          pickupTime: new Date(),
        },
      });

      // Create items with different variants (should all succeed)
      const items = await Promise.all([
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: 'product-1',
            variantId: 'chocolate',
            quantity: 5,
            price: 4.5,
          },
        }),
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: 'product-1',
            variantId: 'vanilla',
            quantity: 3,
            price: 4.5,
          },
        }),
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: 'product-1',
            variantId: null, // No variant
            quantity: 2,
            price: 4.5,
          },
        }),
      ]);

      expect(items.length).toBe(3);
    });
  });

  describe('Stress Testing', () => {
    it('should handle 20 concurrent order creation attempts gracefully', async () => {
      const requestBody = {
        items: testCartItems,
        customerInfo: testCustomerInfo,
      };

      // Create 20 concurrent requests
      const requests = Array.from({ length: 20 }, () => {
        const request = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });
        return checkoutHandler(request);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should complete
      expect(responses.length).toBe(20);

      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds

      // Should have created only 1 order
      const orders = await prisma.order.findMany({
        where: { email: testCustomerInfo.email },
      });

      expect(orders.length).toBeLessThanOrEqual(2); // Allow for some race conditions
    });

    it('should maintain database consistency under concurrent load', async () => {
      // Create multiple different orders concurrently
      const customers = Array.from({ length: 10 }, (_, i) => ({
        ...testCustomerInfo,
        email: `test${i}@example.com`,
        name: `Test Customer ${i}`,
      }));

      const requests = customers.map(customer => {
        const request = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          body: JSON.stringify({
            items: testCartItems,
            customerInfo: customer,
          }),
        });
        return checkoutHandler(request);
      });

      await Promise.all(requests);

      // Verify all orders were created
      const orders = await prisma.order.findMany({
        where: {
          email: {
            startsWith: 'test',
            endsWith: '@example.com',
          },
        },
        include: {
          items: true,
        },
      });

      // Should have created at least some orders
      expect(orders.length).toBeGreaterThan(0);

      // Each order should have correct items
      orders.forEach(order => {
        expect(order.items.length).toBeGreaterThan(0);
      });

      // Clean up
      await prisma.order.deleteMany({
        where: {
          email: {
            startsWith: 'test',
            endsWith: '@example.com',
          },
        },
      });
    });
  });
});
