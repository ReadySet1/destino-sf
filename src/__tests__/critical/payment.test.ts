import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { POST as checkoutPaymentHandler } from '@/app/api/checkout/payment/route';
import { createPayment } from '@/lib/square/orders';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/square/orders');
jest.mock('@/lib/db');
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn().mockResolvedValue(null), // No rate limiting for tests
}));

describe('Payment Processing - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process payment successfully', async () => {
    // Mock successful payment response from Square
    const mockPayment = {
      id: 'payment-123',
      status: 'COMPLETED',
      amountMoney: { amount: 2500n, currency: 'USD' },
    };
    
    // Mock successful order lookup
    const mockOrder = {
      id: 'order-123',
      total: 25.00,
      squareOrderId: 'square-order-456',
      status: 'PENDING',
    };

    (createPayment as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
    (prisma.order.update as jest.Mock).mockResolvedValue({
      ...mockOrder,
      status: 'PROCESSING',
    });

    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        orderId: 'order-123',
        amount: 25.00,
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.paymentId).toBe('payment-123');
    
    // Verify Square payment was called with correct parameters
    expect(createPayment).toHaveBeenCalledWith(
      'cnon:card-nonce-123',
      'square-order-456',
      25.00
    );
    
    // Verify order status was updated
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-123' },
      data: { status: 'PROCESSING' },
    });
  });

  it('should handle payment failures gracefully', async () => {
    // Mock order lookup success
    const mockOrder = {
      id: 'order-123',
      total: 25.00,
      squareOrderId: 'square-order-456',
      status: 'PENDING',
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
    (createPayment as jest.Mock).mockRejectedValue(
      new Error('Card declined')
    );

    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:invalid-card',
        orderId: 'order-123',
        amount: 25.00,
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Payment processing failed');
    expect(data.details).toContain('Card declined');
  });

  it('should validate missing required parameters', async () => {
    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        // Missing orderId and amount
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required parameters');
  });

  it('should validate invalid amount', async () => {
    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        orderId: 'order-123',
        amount: -10, // Invalid negative amount
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid amount: must be a positive number');
  });

  it('should handle order not found', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        orderId: 'non-existent-order',
        amount: 25.00,
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });

  it('should handle order without Square order ID', async () => {
    const mockOrder = {
      id: 'order-123',
      total: 25.00,
      squareOrderId: null, // No Square order ID
      status: 'PENDING',
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        orderId: 'order-123',
        amount: 25.00,
      }),
    });

    const response = await checkoutPaymentHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Order not linked to Square');
  });

  it('should prevent overpayment beyond order total', async () => {
    const mockOrder = {
      id: 'order-123',
      total: 25.00,
      squareOrderId: 'square-order-456',
      status: 'PENDING',
    };

    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

    const request = new Request('http://localhost/api/checkout/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'cnon:card-nonce-123',
        orderId: 'order-123',
        amount: 100.00, // Way more than order total
      }),
    });

    const response = await checkoutPaymentHandler(request);
    
    expect(response.status).toBe(400);
  });
});
