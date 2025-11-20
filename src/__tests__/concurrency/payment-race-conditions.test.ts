/**
 * DES-60 Phase 4: Payment Race Conditions Tests
 *
 * Tests concurrent payment processing operations to ensure:
 * 1. Pessimistic locking prevents double payment
 * 2. Lock acquisition errors are handled correctly
 * 3. Payment status validation prevents reprocessing
 * 4. Square API idempotency works correctly
 * 5. Order state remains consistent
 *
 * @project DES-60 Phase 4: Concurrent Operations & Race Conditions
 */

import { NextRequest } from 'next/server';
import { POST as paymentHandler } from '@/app/api/checkout/payment/route';
import { getTestPrismaClient } from '../utils/database-test-utils';
import { withRowLock, LockAcquisitionError } from '@/lib/concurrency/pessimistic-lock';
import { Order } from '@prisma/client';

// Helper to get prisma client - calls getTestPrismaClient() each time
// This ensures we get the properly initialized client after beforeAll runs
const getPrisma = () => getTestPrismaClient();

// Mock Square payment service
const mockCreatePayment = jest.fn();
jest.mock('@/lib/square/orders', () => ({
  createPayment: (...args: any[]) => mockCreatePayment(...args),
}));

// Mock Square service
const mockUpdateOrder = jest.fn();
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

describe('Payment Race Conditions', () => {
  let testOrder: Order;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mocks to success by default
    mockCreatePayment.mockResolvedValue({
      id: 'payment-123',
      status: 'COMPLETED',
      amount: 5000,
    });

    mockUpdateOrder.mockResolvedValue({
      id: 'square-order-123',
      state: 'OPEN',
    });

    // Create a test order
    testOrder = await getPrisma().order.create({
      data: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        total: 50.0,
        squareOrderId: 'square-order-123',
        customerName: 'Test Customer',
        email: 'payment-test@example.com',
        phone: '+1234567890',
        pickupTime: new Date(Date.now() + 86400000),
        version: 1,
      },
    });
  });

  afterEach(async () => {
    // Clean up test orders
    if (prisma) {
      await prisma.order.deleteMany({
        where: {
          email: 'payment-test@example.com',
        },
      });
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('Concurrent Payment Prevention with Pessimistic Locking', () => {
    it('should prevent concurrent payment processing on same order', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000, // $50.00 in cents
      };

      // Create 5 concurrent payment requests for the same order
      const requests = Array.from({ length: 5 }, () => {
        return new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      });

      // Execute all payment requests concurrently
      const responses = await Promise.all(requests.map(req => paymentHandler(req)));

      // Count successful vs conflict responses
      const successResponses = responses.filter(r => r.status === 200);
      const conflictResponses = responses.filter(r => r.status === 409);

      // Should have exactly 1 successful payment
      expect(successResponses.length).toBe(1);

      // All others should be rejected due to concurrent processing
      expect(conflictResponses.length).toBe(4);

      // Verify order was only charged once
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(updatedOrder?.paymentStatus).toBe('PAID');
      expect(updatedOrder?.status).toBe('PROCESSING');

      // Square payment should only be called once
      expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    });

    it('should handle lock timeout gracefully', async () => {
      // Simulate a long-running payment process
      mockCreatePayment.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return {
          id: 'payment-123',
          status: 'COMPLETED',
          amount: 5000,
        };
      });

      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      // First request starts processing (will take 2 seconds)
      const firstRequest = paymentHandler(
        new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );

      // Second request tries immediately (should fail with lock timeout)
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      const secondRequest = paymentHandler(
        new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );

      const [response1, response2] = await Promise.all([firstRequest, secondRequest]);

      // One should succeed, one should get conflict
      const statuses = [response1.status, response2.status].sort();
      expect(statuses).toContain(200); // One success
      expect(statuses).toContain(409); // One conflict
    });
  });

  describe('Payment Status Validation', () => {
    it('should reject payment for already paid order', async () => {
      // Update order to PAID status
      await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'PAID',
        },
      });

      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return 409 Conflict
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.error).toContain('already');

      // Square payment should not be called
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    it('should reject payment for completed order', async () => {
      // Update order to COMPLETED status
      await prisma.order.update({
        where: { id: testOrder.id },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'COMPLETED',
        },
      });

      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return 409 Conflict or 400 Bad Request
      expect([400, 409]).toContain(response.status);

      // Square payment should not be called
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    it('should reject payment for non-existent order', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: 'non-existent-order-id',
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return 404 Not Found
      expect(response.status).toBe(404);

      // Square payment should not be called
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    it('should reject payment with invalid amount', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: -100, // Negative amount
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return 400 Bad Request
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('amount');
    });

    it('should reject payment exceeding order total', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 100000, // $1000 - way more than order total
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return error
      expect([400, 500]).toContain(response.status);

      // Square payment may or may not be called depending on when validation happens
    });
  });

  describe('Lock Acquisition Error Handling', () => {
    it('should handle LockAcquisitionError with timeout reason', async () => {
      // We can't easily test this directly since the lock is internal to the handler
      // But we can test the withRowLock function directly

      const operation = jest.fn().mockResolvedValue({ success: true });

      // Create a lock on the order
      const lock1Promise = withRowLock<Order, any>(
        'orders',
        testOrder.id,
        async order => {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Hold lock for 1 second
          return operation(order);
        },
        { timeout: 5000, noWait: true }
      );

      // Try to acquire lock immediately (should fail with NOWAIT)
      await new Promise(resolve => setTimeout(resolve, 50));

      const lock2Promise = withRowLock<Order, any>(
        'orders',
        testOrder.id,
        async order => operation(order),
        { timeout: 100, noWait: true }
      );

      // Wait for both to complete
      const results = await Promise.allSettled([lock1Promise, lock2Promise]);

      // First should succeed
      expect(results[0].status).toBe('fulfilled');

      // Second should fail with lock error
      expect(results[1].status).toBe('rejected');
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(LockAcquisitionError);
        expect(results[1].reason.reason).toBe('timeout');
      }
    });

    it('should handle LockAcquisitionError with not_found reason', async () => {
      const operation = jest.fn();

      // Try to lock non-existent order
      await expect(
        withRowLock<Order, any>('orders', 'non-existent-id', operation, { noWait: true })
      ).rejects.toThrow(LockAcquisitionError);

      // Operation should not be called
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('Square API Idempotency', () => {
    it('should use idempotent payment creation', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await paymentHandler(request);

      // Verify Square payment was called with correct parameters
      expect(mockCreatePayment).toHaveBeenCalledWith('card-token-123', 'square-order-123', 5000);

      // Square's createPayment should handle idempotency internally
      // via idempotency keys
    });

    it('should handle Square API failure without corrupting order state', async () => {
      // Make Square API fail
      mockCreatePayment.mockRejectedValueOnce(new Error('Square API Error'));

      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Should return error
      expect(response.status).toBe(500);

      // Order should still be in PENDING state (transaction rolled back)
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(order?.status).toBe('PENDING');
      expect(order?.paymentStatus).toBe('PENDING');
    });
  });

  describe('Order State Consistency', () => {
    it('should update order status atomically within transaction', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(200);

      // Verify order was updated correctly
      const updatedOrder = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(updatedOrder?.status).toBe('PROCESSING');
      expect(updatedOrder?.paymentStatus).toBe('PAID');
    });

    it('should maintain order consistency on partial failure', async () => {
      // Make Square finalization fail (but payment succeeds)
      mockUpdateOrder.mockRejectedValueOnce(new Error('Finalization failed'));

      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      // Payment should still succeed (finalization is non-critical)
      expect(response.status).toBe(200);

      // Order should be marked as paid
      const order = await prisma.order.findUnique({
        where: { id: testOrder.id },
      });

      expect(order?.paymentStatus).toBe('PAID');
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid sequential payment attempts', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 5000,
      };

      // Make 10 rapid sequential payment attempts
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        responses.push(await paymentHandler(request));
      }

      // First should succeed, all others should fail
      const successCount = responses.filter(r => r.status === 200).length;
      const failureCount = responses.filter(r => r.status >= 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(9);

      // Verify only one payment was processed
      expect(mockCreatePayment).toHaveBeenCalledTimes(1);
    });

    it('should handle payment attempts on multiple orders concurrently', async () => {
      // Create 5 additional test orders
      const orders = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          return prisma.order.create({
            data: {
              status: 'PENDING',
              paymentStatus: 'PENDING',
              total: 50.0 + i * 10,
              squareOrderId: `square-order-${i}`,
              customerName: `Customer ${i}`,
              email: `payment-test@example.com`,
              phone: '+1234567890',
              pickupTime: new Date(Date.now() + 86400000),
              version: 1,
            },
          });
        })
      );

      // Process all payments concurrently
      const requests = orders.map(order => {
        return new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify({
            sourceId: 'card-token-123',
            orderId: order.id,
            amount: Math.round(Number(order.total) * 100),
          }),
        });
      });

      const responses = await Promise.all(requests.map(req => paymentHandler(req)));

      // All should succeed (different orders, no conflicts)
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(5);

      // Verify all orders were updated
      const updatedOrders = await prisma.order.findMany({
        where: {
          id: { in: orders.map(o => o.id) },
        },
      });

      updatedOrders.forEach(order => {
        expect(order.paymentStatus).toBe('PAID');
        expect(order.status).toBe('PROCESSING');
      });
    });
  });

  describe('Input Validation', () => {
    it('should reject missing sourceId', async () => {
      const requestBody = {
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it('should reject missing orderId', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(400);
    });

    it('should reject missing amount', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty sourceId', async () => {
      const requestBody = {
        sourceId: '',
        orderId: testOrder.id,
        amount: 5000,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('payment source');
    });

    it('should reject zero amount', async () => {
      const requestBody = {
        sourceId: 'card-token-123',
        orderId: testOrder.id,
        amount: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await paymentHandler(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('amount');
    });
  });
});
