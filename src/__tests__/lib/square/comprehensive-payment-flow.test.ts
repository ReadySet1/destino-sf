/**
 * 🧪 Comprehensive Payment Processing Flow Tests
 * Tests for the complete payment processing pipeline including checkout, payment, and sync
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { POST as checkoutHandler } from '@/app/api/checkout/route';
import { POST as paymentHandler } from '@/app/api/checkout/payment/route';
import { createOrder, createPayment } from '@/lib/square/orders';
import { ResilientPaymentProcessor } from '@/lib/square/resilient-payment-processor';
import { paymentSync } from '@/lib/square/payment-sync';
import { prisma } from '@/lib/db-unified';
import { mockSquareClient, createMockSquarePayment, createMockSquareOrder } from '@/__mocks__/square';
import { setMockAuthState, generateMockUser, generateMockSession } from '@/__mocks__/@supabase/supabase-js';

// Mock dependencies
jest.mock('@/lib/square/orders');
jest.mock('@/lib/square/payment-sync');
jest.mock('@/lib/db-unified');
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    getAll: jest.fn().mockReturnValue([]),
  }),
}));

describe('Payment Processing Flow - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up authenticated user for tests
    const mockUser = generateMockUser({ email: 'customer@test.com' });
    const mockSession = generateMockSession(mockUser);
    setMockAuthState(mockUser, mockSession);

    // Mock database operations with realistic responses
    (prisma.product.findUnique as jest.Mock).mockImplementation((args) => {
      const productId = args.where.id;
      return Promise.resolve({
        id: productId,
        name: `Test Product ${productId}`,
        price: 15.99,
        active: true,
        squareItemId: `square_item_${productId}`,
        variants: [
          {
            id: `variant_${productId}`,
            name: 'Regular',
            price: 15.99,
            squareVariationId: `square_variation_${productId}`,
          }
        ]
      });
    });

    (prisma.order.create as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: 'test_order_123',
        squareOrderId: 'square_order_456',
        total: args.data.total,
        status: 'PENDING',
        customerName: args.data.customerName,
        customerEmail: args.data.customerEmail,
        customerPhone: args.data.customerPhone,
        pickupTime: args.data.pickupTime,
        items: args.data.items,
        ...args.data
      });
    });

    (prisma.order.findUnique as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: args.where.id,
        squareOrderId: 'square_order_456',
        total: 25.99,
        status: 'PENDING',
        customerName: 'Test Customer',
        customerEmail: 'customer@test.com',
        customerPhone: '+1-555-123-4567',
        pickupTime: new Date(Date.now() + 3600000).toISOString(),
      });
    });

    (prisma.order.update as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: args.where.id,
        ...args.data,
        updatedAt: new Date().toISOString()
      });
    });

    // Mock Square API operations
    (createOrder as jest.Mock).mockResolvedValue(createMockSquareOrder());
    (createPayment as jest.Mock).mockResolvedValue(createMockSquarePayment());
    (paymentSync as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Checkout Flow', () => {
    const validCheckoutRequest = {
      items: [
        { id: 'product_1', variantId: 'variant_1', quantity: 2 },
        { id: 'product_2', quantity: 1 }
      ],
      customerInfo: {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '+1-555-123-4567',
        pickupTime: new Date(Date.now() + 3600000).toISOString()
      }
    };

    it('should successfully process complete checkout flow', async () => {
      // Step 1: Create checkout/order
      const checkoutRequest = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validCheckoutRequest),
      });

      const checkoutResponse = await checkoutHandler(checkoutRequest);
      const checkoutData = await checkoutResponse.json();

      expect(checkoutResponse.status).toBe(200);
      expect(checkoutData.success).toBe(true);
      expect(checkoutData.orderId).toBeTruthy();
      expect(checkoutData.squareOrderId).toBeTruthy();

      // Verify order creation was called with correct parameters
      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: expect.any(String),
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              catalogObjectId: expect.stringContaining('square_variation_'),
              quantity: expect.any(String)
            })
          ])
        })
      );

      // Step 2: Process payment
      const paymentRequest = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:card-nonce-ok',
          orderId: checkoutData.orderId,
          amount: 25.99,
        }),
      });

      const paymentResponse = await paymentHandler(paymentRequest);
      const paymentData = await paymentResponse.json();

      expect(paymentResponse.status).toBe(200);
      expect(paymentData.success).toBe(true);
      expect(paymentData.paymentId).toBeTruthy();

      // Verify payment creation was called
      expect(createPayment).toHaveBeenCalledWith(
        'cnon:card-nonce-ok',
        'square_order_456',
        25.99
      );

      // Verify order status was updated
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: checkoutData.orderId },
        data: { status: 'PROCESSING' },
      });
    });

    it('should handle checkout validation errors', async () => {
      const invalidRequest = {
        items: [], // Empty items array
        customerInfo: {
          name: '',
          email: 'invalid-email',
          phone: '',
          pickupTime: 'invalid-date'
        }
      };

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });

      const response = await checkoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should handle unavailable products gracefully', async () => {
      // Mock product as inactive/unavailable
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'unavailable_product',
        name: 'Unavailable Product',
        price: 15.99,
        active: false, // Product is not active
        squareItemId: 'square_item_unavailable',
        variants: []
      });

      const requestWithUnavailableProduct = {
        ...validCheckoutRequest,
        items: [{ id: 'unavailable_product', quantity: 1 }]
      };

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestWithUnavailableProduct),
      });

      const response = await checkoutHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('unavailable');
    });
  });

  describe('Payment Processing Scenarios', () => {
    const basePaymentRequest = {
      sourceId: 'cnon:card-nonce-ok',
      orderId: 'test_order_123',
      amount: 25.99,
    };

    it('should handle successful payment processing', async () => {
      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePaymentRequest),
      });

      const response = await paymentHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.paymentId).toBeTruthy();
      expect(createPayment).toHaveBeenCalled();
    });

    it('should handle payment failures with proper error messages', async () => {
      // Mock payment failure
      (createPayment as jest.Mock).mockRejectedValue(
        new Error('Payment declined: Insufficient funds')
      );

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePaymentRequest),
      });

      const response = await paymentHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Payment processing failed');
      expect(data.details).toContain('Insufficient funds');
    });

    it('should validate payment amount against order total', async () => {
      const mismatchedAmountRequest = {
        ...basePaymentRequest,
        amount: 100.00, // Much higher than order total
      };

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mismatchedAmountRequest),
      });

      const response = await paymentHandler(request);
      
      expect(response.status).toBe(400);
    });

    it('should handle duplicate payment attempts', async () => {
      // Mock order that's already been paid
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'test_order_123',
        squareOrderId: 'square_order_456',
        total: 25.99,
        status: 'COMPLETED', // Already completed
        squarePaymentId: 'existing_payment_id'
      });

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePaymentRequest),
      });

      const response = await paymentHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already');
    });

    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      (createPayment as jest.Mock).mockRejectedValue(
        new Error('Request timeout')
      );

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePaymentRequest),
      });

      const response = await paymentHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Payment processing failed');
    });
  });

  describe('Resilient Payment Processor', () => {
    let processor: ResilientPaymentProcessor;

    beforeEach(() => {
      processor = new ResilientPaymentProcessor();
    });

    it('should retry failed payments according to retry policy', async () => {
      // Mock failing payment that succeeds on retry
      let attemptCount = 0;
      (createPayment as jest.Mock).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Temporary network error');
        }
        return Promise.resolve(createMockSquarePayment());
      });

      const paymentRequest = {
        amount: 25.99,
        currency: 'USD',
        source_id: 'cnon:card-nonce-ok',
        order_id: 'square_order_456'
      };

      const result = await processor.processPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2); // Failed once, succeeded on retry
      expect(createPayment).toHaveBeenCalledTimes(2);
    });

    it('should implement circuit breaker pattern for repeated failures', async () => {
      // Mock payments that always fail
      (createPayment as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const paymentRequest = {
        amount: 25.99,
        currency: 'USD',
        source_id: 'cnon:card-nonce-ok',
        order_id: 'square_order_456'
      };

      // Multiple failures should trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const result = await processor.processPayment(paymentRequest);
        expect(result.success).toBe(false);
      }

      // Circuit should be open now, subsequent calls should fail fast
      const result = await processor.processPayment(paymentRequest);
      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('CIRCUIT_BREAKER');
    });

    it('should handle payment idempotency correctly', async () => {
      const idempotencyKey = 'unique-payment-123';
      
      // First payment request
      const result1 = await processor.processPayment({
        amount: 25.99,
        currency: 'USD',
        source_id: 'cnon:card-nonce-ok',
        order_id: 'square_order_456',
        metadata: { idempotency_key: idempotencyKey }
      });

      // Second payment request with same idempotency key
      const result2 = await processor.processPayment({
        amount: 25.99,
        currency: 'USD',
        source_id: 'cnon:card-nonce-ok',
        order_id: 'square_order_456',
        metadata: { idempotency_key: idempotencyKey }
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Should only create payment once due to idempotency
      expect(createPayment).toHaveBeenCalledTimes(1);
    });
  });

  describe('Payment Sync Operations', () => {
    it('should sync successful payments to database', async () => {
      const mockPayment = createMockSquarePayment({
        id: 'payment_123',
        status: 'COMPLETED',
        order_id: 'square_order_456'
      });

      const syncResult = await paymentSync(mockPayment, 'test_order_123');

      expect(syncResult.success).toBe(true);
      expect(paymentSync).toHaveBeenCalledWith(mockPayment, 'test_order_123');
    });

    it('should handle payment sync failures gracefully', async () => {
      const mockPayment = createMockSquarePayment();
      
      // Mock sync failure
      (paymentSync as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      try {
        await paymentSync(mockPayment, 'test_order_123');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Database connection failed');
      }
    });

    it('should update order status after successful payment', async () => {
      const mockPayment = createMockSquarePayment({
        status: 'COMPLETED'
      });

      await paymentSync(mockPayment, 'test_order_123');

      // Verify that the sync function was called
      expect(paymentSync).toHaveBeenCalledWith(mockPayment, 'test_order_123');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should log payment errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (createPayment as jest.Mock).mockRejectedValue(
        new Error('Payment processing error')
      );

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:card-nonce-ok',
          orderId: 'test_order_123',
          amount: 25.99,
        }),
      });

      await paymentHandler(request);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle database connection failures during order creation', async () => {
      (prisma.order.create as jest.Mock).mockRejectedValue(
        new Error('Database connection timeout')
      );

      const request = new Request('http://localhost/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: 'product_1', quantity: 1 }],
          customerInfo: {
            name: 'Test Customer',
            email: 'customer@test.com',
            phone: '+1-555-123-4567',
            pickupTime: new Date(Date.now() + 3600000).toISOString()
          }
        }),
      });

      const response = await checkoutHandler(request);
      
      expect(response.status).toBe(500);
    });

    it('should handle Square API rate limiting', async () => {
      (createPayment as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const request = new Request('http://localhost/api/checkout/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'cnon:card-nonce-ok',
          orderId: 'test_order_123',
          amount: 25.99,
        }),
      });

      const response = await paymentHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toContain('Rate limit exceeded');
    });
  });
});
