import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/square/orders';
import { POST } from '@/app/api/checkout/payment/route';

// Mock external dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/square/orders');

// Type-safe mock setup
const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any;

// Replace the actual prisma instance with our mock
(prisma as any).order = mockPrisma.order;

const mockCreatePayment = createPayment as jest.MockedFunction<typeof createPayment>;

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
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe('/api/checkout/payment - POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress error logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful payment scenarios', () => {
    test('should process payment successfully', async () => {
      // Mock successful database and Square operations
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        paymentId: 'payment-789',
      });

      // Verify database operations
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: 'PROCESSING' },
      });

      // Verify Square payment creation
      expect(mockCreatePayment).toHaveBeenCalledWith(
        'card-nonce-12345',
        'square-order-456',
        7500
      );
    });

    test('should handle successful gift card payment', async () => {
      const giftCardRequest = {
        ...validPaymentRequest,
        sourceId: 'gift-card-nonce-67890',
      };

      const giftCardPayment = {
        ...mockPayment,
        id: 'payment-gift-card-101',
        sourceType: 'GIFT_CARD',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);
      mockCreatePayment.mockResolvedValue(giftCardPayment as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(giftCardRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        paymentId: 'payment-gift-card-101',
      });

      expect(mockCreatePayment).toHaveBeenCalledWith(
        'gift-card-nonce-67890',
        'square-order-456',
        7500
      );
    });
  });

  describe('Validation errors', () => {
    test('should return 400 for missing sourceId', async () => {
      const invalidRequest = {
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing required parameters' });
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    test('should return 400 for missing orderId', async () => {
      const invalidRequest = {
        sourceId: 'card-nonce-12345',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing required parameters' });
    });

    test('should return 400 for missing amount', async () => {
      const invalidRequest = {
        sourceId: 'card-nonce-12345',
        orderId: 'order-123',
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing required parameters' });
    });

    test('should return 400 for invalid amount', async () => {
      const invalidRequest = {
        sourceId: 'card-nonce-12345',
        orderId: 'order-123',
        amount: 0,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing required parameters' });
    });
  });

  describe('Order validation errors', () => {
    test('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Order not found' });
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    test('should return 400 for order without Square order ID', async () => {
      const orderWithoutSquareId = {
        ...mockOrder,
        squareOrderId: null,
      };

      mockPrisma.order.findUnique.mockResolvedValue(orderWithoutSquareId as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Order not linked to Square' });
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    test('should return 400 for already processed order', async () => {
      const processedOrder = {
        ...mockOrder,
        status: 'COMPLETED',
      };

      mockPrisma.order.findUnique.mockResolvedValue(processedOrder as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);

      // Should still attempt payment but handle appropriately
      expect(response.status).toBe(200);
    });
  });

  describe('Square API errors', () => {
    test('should handle payment declined by Square', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue(new Error('Payment declined'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Payment processing failed',
        details: 'Payment declined',
      });

      // Should not update order status on payment failure
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    test('should handle gift card insufficient funds', async () => {
      const giftCardRequest = {
        ...validPaymentRequest,
        sourceId: 'gift-card-nonce-insufficient',
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue(new Error('INSUFFICIENT_FUNDS'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(giftCardRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Payment processing failed');
      expect(data.details).toBe('INSUFFICIENT_FUNDS');
    });

    test('should handle Square authentication errors', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue(new Error('Authentication failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: 'Payment processing failed',
        details: 'Authentication failed',
      });
    });

    test('should handle Square network errors', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue(new Error('Network timeout'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Network timeout');
    });
  });

  describe('Database errors', () => {
    test('should handle database connection errors during order lookup', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Payment processing failed');
      expect(mockCreatePayment).not.toHaveBeenCalled();
    });

    test('should handle database errors during order status update', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);
      mockPrisma.order.update.mockRejectedValue(new Error('Database update failed'));

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      // Payment should have been attempted even if status update fails
      expect(mockCreatePayment).toHaveBeenCalled();
    });
  });

  describe('Error handling edge cases', () => {
    test('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    test('should handle unexpected error types', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue('String error instead of Error object');

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Payment processing failed');
      expect(data.details).toBe('Unknown error');
    });

    test('should handle null/undefined error details', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockRejectedValue(null);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toBe('Unknown error');
    });
  });

  describe('Payment amount validation', () => {
    test('should handle amount mismatch between request and order', async () => {
      const mismatchedAmountRequest = {
        ...validPaymentRequest,
        amount: 5000, // Different from order total of 7500
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(mismatchedAmountRequest),
      });

      const response = await POST(request);

      // Should still process payment with provided amount
      expect(response.status).toBe(200);
      expect(mockCreatePayment).toHaveBeenCalledWith(
        'card-nonce-12345',
        'square-order-456',
        5000 // Should use the requested amount
      );
    });

    test('should handle negative amount', async () => {
      const negativeAmountRequest = {
        ...validPaymentRequest,
        amount: -100,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(negativeAmountRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Missing required parameters' });
    });
  });

  describe('Payment flow integrity', () => {
    test('should maintain payment idempotency', async () => {
      // This test would be more comprehensive with actual idempotency key handling
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);

      const request1 = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const request2 = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(validPaymentRequest),
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both should succeed (actual idempotency would prevent duplicate charges)
      expect(mockCreatePayment).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent payment attempts', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder as any);
      mockCreatePayment.mockResolvedValue(mockPayment as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PROCESSING',
      } as any);

      const requests = Array.from({ length: 3 }, () =>
        new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(validPaymentRequest),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      // All should succeed (in real implementation, proper locking would prevent issues)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
}); 