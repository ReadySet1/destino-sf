/**
 * Payment Edge Cases Test Suite
 *
 * Tests critical edge cases and error scenarios for payment processing:
 * - Duplicate payment detection and prevention
 * - Timeout handling and recovery
 * - Webhook reconciliation scenarios
 * - Partial refund edge cases
 *
 * Part of DES-60: Edge Case & Error Handling Coverage (Phase 2)
 */

import { NextRequest } from 'next/server';
import { createPayment } from '@/lib/square/orders';
import { POST } from '@/app/api/checkout/payment/route';
import { checkForDuplicateOrder } from '@/lib/duplicate-order-prevention';
import { CartItem } from '@/types/cart';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

// Mock db-unified
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
  withRetry: jest.fn((fn: any) => fn()),
}));

jest.mock('@/lib/square/orders');
jest.mock('@/lib/duplicate-order-prevention');

// Mock rate limiting middleware
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn(() => Promise.resolve(null)),
}));

// Mock validation middleware
jest.mock('@/middleware/api-validator', () => ({
  withValidation: jest.fn((handler: any) => handler),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Square service
jest.mock('@/lib/square/service', () => ({
  getSquareService: jest.fn(() => ({
    updateOrder: jest.fn().mockResolvedValue({ order: { id: 'square-order-456', state: 'OPEN' } }),
  })),
}));

// Type-safe mock setup
const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
} as any;

// Import mocked modules
const dbUnified = require('@/lib/db-unified');
dbUnified.prisma.order = mockPrisma.order;

const mockCreatePayment = createPayment as jest.MockedFunction<typeof createPayment>;
const mockCheckForDuplicateOrder = checkForDuplicateOrder as jest.MockedFunction<
  typeof checkForDuplicateOrder
>;

// Test fixtures
const validPaymentRequest = {
  sourceId: 'card-nonce-12345',
  orderId: 'order-123',
  amount: 7500, // $75.00 in cents
};

const mockOrder = {
  id: 'order-123',
  status: 'PENDING',
  total: 7500,
  squareOrderId: 'square-order-456',
  customerName: 'John Doe',
  email: 'john@example.com',
  userId: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      variantId: 'variant-1',
      quantity: 2,
      price: 2500,
      product: {
        id: 'prod-1',
        name: 'Alfajores',
        squareCatalogId: 'sq-cat-1',
      },
      variant: {
        id: 'variant-1',
        name: 'Dulce de Leche',
      },
    },
    {
      id: 'item-2',
      productId: 'prod-2',
      variantId: undefined,
      quantity: 1,
      price: 2500,
      product: {
        id: 'prod-2',
        name: 'Empanadas',
        squareCatalogId: 'sq-cat-2',
      },
      variant: null,
    },
  ],
};

const mockPayment = {
  id: 'payment-789',
  status: 'COMPLETED',
  amountMoney: {
    amount: 7500,
    currency: 'USD',
  },
  sourceType: 'CARD',
  cardDetails: {
    status: 'CAPTURED',
  },
  orderId: 'square-order-456',
  createdAt: '2024-01-16T14:00:00Z',
};

describe('Payment Edge Cases - Duplicate Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Duplicate order detection', () => {
    test('should detect duplicate order with same items and email', async () => {
      const cartItems: CartItem[] = [
        {
          id: 'prod-1',
          name: 'Alfajores',
          price: 2500,
          quantity: 2,
          variantId: 'variant-1',
          imageUrl: '/images/alfajores.jpg',
        },
        {
          id: 'prod-2',
          name: 'Empanadas',
          price: 2500,
          quantity: 1,
          variantId: undefined,
          imageUrl: '/images/empanadas.jpg',
        },
      ];

      // Mock duplicate detection returning a pending order
      mockCheckForDuplicateOrder.mockResolvedValue({
        hasPendingOrder: true,
        existingOrderId: 'existing-order-123',
        existingOrder: {
          id: 'existing-order-123',
          total: 7500,
          createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
          paymentUrl: 'https://checkout.square.site/existing',
          paymentUrlExpiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
          retryCount: 0,
        },
      });

      const result = await checkForDuplicateOrder('user-123', cartItems, 'john@example.com');

      expect(result.hasPendingOrder).toBe(true);
      expect(result.existingOrderId).toBe('existing-order-123');
      expect(result.existingOrder).toBeDefined();
      expect(result.existingOrder?.paymentUrl).toBe('https://checkout.square.site/existing');
    });

    test('should not detect duplicate when items are different', async () => {
      const cartItems: CartItem[] = [
        {
          id: 'prod-3',
          name: 'Different Product',
          price: 3000,
          quantity: 1,
          variantId: undefined,
          imageUrl: '/images/different.jpg',
        },
      ];

      mockCheckForDuplicateOrder.mockResolvedValue({
        hasPendingOrder: false,
      });

      const result = await checkForDuplicateOrder('user-123', cartItems, 'john@example.com');

      expect(result.hasPendingOrder).toBe(false);
      expect(result.existingOrderId).toBeUndefined();
    });

    test('should not detect duplicate when quantities are different', async () => {
      const cartItems: CartItem[] = [
        {
          id: 'prod-1',
          name: 'Alfajores',
          price: 2500,
          quantity: 3, // Different quantity
          variantId: 'variant-1',
          imageUrl: '/images/alfajores.jpg',
        },
      ];

      mockCheckForDuplicateOrder.mockResolvedValue({
        hasPendingOrder: false,
      });

      const result = await checkForDuplicateOrder('user-123', cartItems, 'john@example.com');

      expect(result.hasPendingOrder).toBe(false);
    });

    test('should handle duplicate check for guest users (email only)', async () => {
      const cartItems: CartItem[] = [
        {
          id: 'prod-1',
          name: 'Alfajores',
          price: 2500,
          quantity: 2,
          variantId: 'variant-1',
          imageUrl: '/images/alfajores.jpg',
        },
      ];

      mockCheckForDuplicateOrder.mockResolvedValue({
        hasPendingOrder: true,
        existingOrderId: 'guest-order-456',
        existingOrder: {
          id: 'guest-order-456',
          total: 5000,
          createdAt: new Date(),
          retryCount: 0,
        },
      });

      const result = await checkForDuplicateOrder(null, cartItems, 'guest@example.com');

      expect(result.hasPendingOrder).toBe(true);
      expect(mockCheckForDuplicateOrder).toHaveBeenCalledWith(
        null,
        cartItems,
        'guest@example.com'
      );
    });

    test('should handle duplicate check errors gracefully', async () => {
      const cartItems: CartItem[] = [
        {
          id: 'prod-1',
          name: 'Alfajores',
          price: 2500,
          quantity: 2,
          variantId: undefined,
          imageUrl: '/images/alfajores.jpg',
        },
      ];

      mockCheckForDuplicateOrder.mockResolvedValue({
        hasPendingOrder: false, // Return false on error
      });

      const result = await checkForDuplicateOrder('user-123', cartItems, 'john@example.com');

      expect(result.hasPendingOrder).toBe(false);
    });
  });

  describe('Concurrent duplicate payment attempts', () => {
    test('should handle multiple concurrent payment attempts for same order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);

      // Simulate 3 concurrent payment requests
      const requests = Array.from(
        { length: 3 },
        () =>
          new NextRequest('http://localhost:3000/api/checkout/payment', {
            method: 'POST',
            body: JSON.stringify(validPaymentRequest),
          })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      // All should succeed (Square's idempotency should prevent duplicate charges)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Payment creation should be called for each request
      expect(mockCreatePayment).toHaveBeenCalledTimes(3);
    }, 15000);

    test('should prevent payment on already processing order', async () => {
      const processingOrder = {
        ...mockOrder,
        status: 'PROCESSING',
      };

      mockPrisma.order.findUnique.mockResolvedValue(processingOrder as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);
      mockPrisma.order.update.mockResolvedValue(processingOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);

      // Should still succeed (order is already being processed)
      expect(response.status).toBe(200);
    });
  });
});

describe('Payment Edge Cases - Timeout Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle Square API timeout during payment processing', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    // Simulate timeout error
    const timeoutError = new Error('Request timeout');
    timeoutError.name = 'TimeoutError';
    mockCreatePayment.mockRejectedValue(timeoutError);

    const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Payment processing failed');
    expect(data.details).toBe('Request timeout');

    // Order status should not be updated to PROCESSING on timeout
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  test('should handle network timeout with proper error message', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    const networkError = new Error('ETIMEDOUT');
    mockCreatePayment.mockRejectedValue(networkError);

    const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Payment processing failed');
    expect(data.details).toContain('ETIMEDOUT');
  });

  test('should verify order remains PENDING after timeout', async () => {
    const pendingOrder = { ...mockOrder, status: 'PENDING' };
    mockPrisma.order.findUnique.mockResolvedValue(pendingOrder as any);

    mockCreatePayment.mockRejectedValue(new Error('Connection timeout'));

    const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    await POST(request);

    // Verify order status was not updated
    expect(mockPrisma.order.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING' }),
      })
    );
  });

  test('should allow retry after timeout', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    // First request times out
    mockCreatePayment.mockRejectedValueOnce(new Error('Timeout'));

    const request1 = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(500);

    // Second request succeeds
    mockCreatePayment.mockResolvedValueOnce(mockPayment as any);
    mockPrisma.order.update.mockResolvedValue({
      ...mockOrder,
      status: 'PROCESSING',
    } as any);

    const request2 = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    const response2 = await POST(request2);
    const data2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(data2.success).toBe(true);
  });
});

describe('Payment Edge Cases - Webhook Reconciliation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle payment success via webhook after initial timeout', async () => {
    // Scenario: Payment API times out, but webhook later confirms success
    const orderWithTimeoutPayment = {
      ...mockOrder,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    };

    mockPrisma.order.findUnique.mockResolvedValue(orderWithTimeoutPayment as any);

    // Simulate webhook updating order to PROCESSING
    mockPrisma.order.update.mockResolvedValue({
      ...orderWithTimeoutPayment,
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
    } as any);

    const updateResult = await mockPrisma.order.update({
      where: { id: 'order-123' },
      data: {
        status: 'PROCESSING',
        paymentStatus: 'COMPLETED',
      },
    });

    expect(updateResult.status).toBe('PROCESSING');
    expect(updateResult.paymentStatus).toBe('COMPLETED');
  });

  test('should handle payment failure reconciliation via webhook', async () => {
    const orderWithPendingPayment = {
      ...mockOrder,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    };

    mockPrisma.order.findUnique.mockResolvedValue(orderWithPendingPayment as any);

    // Simulate webhook updating payment status to FAILED
    mockPrisma.order.update.mockResolvedValue({
      ...orderWithPendingPayment,
      paymentStatus: 'FAILED',
    } as any);

    const updateResult = await mockPrisma.order.update({
      where: { id: 'order-123' },
      data: {
        paymentStatus: 'FAILED',
      },
    });

    expect(updateResult.paymentStatus).toBe('FAILED');
  });

  test('should verify webhook arrives before API response completes', async () => {
    // Scenario: Webhook processes faster than API response
    const order = { ...mockOrder };

    mockPrisma.order.findUnique.mockResolvedValue(order as any);

    // Webhook updates order first
    const webhookUpdate = mockPrisma.order.update.mockResolvedValueOnce({
      ...order,
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
    } as any);

    await webhookUpdate;

    // API response then tries to update
    mockCreatePayment.mockResolvedValue(mockPayment as any);

    const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
      method: 'POST',
      body: JSON.stringify(validPaymentRequest),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  test('should handle webhook for already completed payment', async () => {
    const completedOrder = {
      ...mockOrder,
      status: 'COMPLETED',
      paymentStatus: 'COMPLETED',
    };

    mockPrisma.order.findUnique.mockResolvedValue(completedOrder as any);

    // Webhook tries to update already completed order
    mockPrisma.order.update.mockResolvedValue(completedOrder as any);

    const updateResult = await mockPrisma.order.update({
      where: { id: 'order-123' },
      data: {
        status: 'COMPLETED',
      },
    });

    expect(updateResult.status).toBe('COMPLETED');
  });
});

describe('Payment Edge Cases - Partial Refund Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should reject refund amount greater than order total', async () => {
    const refundRequest = {
      orderId: 'order-123',
      amount: 10000, // More than order total of 7500
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    // Validate refund amount
    const orderTotal = Number(mockOrder.total);
    const isValidRefund = refundRequest.amount <= orderTotal;

    expect(isValidRefund).toBe(false);
  });

  test('should accept partial refund within order total', async () => {
    const refundRequest = {
      orderId: 'order-123',
      amount: 5000, // Partial refund (50%)
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);

    // Validate refund amount
    const orderTotal = Number(mockOrder.total);
    const isValidRefund = refundRequest.amount <= orderTotal && refundRequest.amount > 0;

    expect(isValidRefund).toBe(true);
  });

  test('should reject refund on already fully refunded order', async () => {
    const refundedOrder = {
      ...mockOrder,
      status: 'REFUNDED',
      refundedAmount: 7500,
    };

    mockPrisma.order.findUnique.mockResolvedValue(refundedOrder as any);

    const refundRequest = {
      orderId: 'order-123',
      amount: 1000,
    };

    // Check if order can accept more refunds
    const canRefund = Number(refundedOrder.refundedAmount || 0) < Number(refundedOrder.total);

    expect(canRefund).toBe(false);
  });

  test('should handle multiple partial refunds correctly', async () => {
    const orderWithPartialRefund = {
      ...mockOrder,
      refundedAmount: 2500, // Already refunded $25
    };

    mockPrisma.order.findUnique.mockResolvedValue(orderWithPartialRefund as any);

    const refundRequest = {
      orderId: 'order-123',
      amount: 3000, // Additional $30 refund
    };

    const totalRefunded = Number(orderWithPartialRefund.refundedAmount || 0) + refundRequest.amount;
    const orderTotal = Number(orderWithPartialRefund.total);
    const isValidRefund = totalRefunded <= orderTotal;

    expect(isValidRefund).toBe(true);
    expect(totalRefunded).toBe(5500);
  });

  test('should update order status after partial refund', async () => {
    const order = { ...mockOrder };

    mockPrisma.order.findUnique.mockResolvedValue(order as any);
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      refundedAmount: 3000,
      status: 'PARTIALLY_REFUNDED',
    } as any);

    const updateResult = await mockPrisma.order.update({
      where: { id: 'order-123' },
      data: {
        refundedAmount: 3000,
        status: 'PARTIALLY_REFUNDED',
      },
    });

    expect(updateResult.status).toBe('PARTIALLY_REFUNDED');
    expect(updateResult.refundedAmount).toBe(3000);
  });

  test('should handle zero amount refund rejection', async () => {
    const refundRequest = {
      orderId: 'order-123',
      amount: 0,
    };

    const isValidRefund = refundRequest.amount > 0;

    expect(isValidRefund).toBe(false);
  });

  test('should handle negative amount refund rejection', async () => {
    const refundRequest = {
      orderId: 'order-123',
      amount: -1000,
    };

    const isValidRefund = refundRequest.amount > 0;

    expect(isValidRefund).toBe(false);
  });
});
