/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import OrderDetailsPage from '@/app/(store)/account/order/[orderId]/page';

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
      findUnique: jest.fn()
    },
    cateringOrder: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  redirect: jest.fn()
}));

// Mock RetryPaymentButton component
jest.mock('@/components/Orders/RetryPaymentButton', () => ({
  RetryPaymentButton: ({ orderId, retryCount, disabled }: any) => (
    <button data-testid="retry-payment-button" disabled={disabled}>
      Retry Payment
    </button>
  )
}));

describe('Order Details Payment Method Display', () => {
  const mockPrisma = require('@/lib/db').prisma;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display SQUARE payment method for card orders', async () => {
    // Mock a SQUARE payment order
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      total: { toNumber: () => 79.55 },
      createdAt: new Date(),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323',
      pickupTime: new Date(),
      fulfillmentType: 'pickup',
      trackingNumber: null,
      shippingCarrier: null,
      retryCount: 0,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 18.00 },
          product: { name: 'Empanadas - Lomo Saltado', images: [] },
          variant: { name: 'frozen-4 pack' }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ orderId: 'test-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.getByText('SQUARE')).toBeInTheDocument();
    });
  });

  it('should display CASH payment method for cash orders', async () => {
    // Mock a CASH payment order
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      total: { toNumber: () => 79.55 },
      createdAt: new Date(),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323',
      pickupTime: new Date(),
      fulfillmentType: 'pickup',
      trackingNumber: null,
      shippingCarrier: null,
      retryCount: 0,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 18.00 },
          product: { name: 'Empanadas - Lomo Saltado', images: [] },
          variant: { name: 'frozen-4 pack' }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ orderId: 'test-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.getByText('CASH')).toBeInTheDocument();
    });
  });

  it('should show retry payment button only for SQUARE orders with PENDING status', async () => {
    // Mock a SQUARE payment order with PENDING status
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      total: { toNumber: () => 79.55 },
      createdAt: new Date(),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323',
      pickupTime: new Date(),
      fulfillmentType: 'pickup',
      trackingNumber: null,
      shippingCarrier: null,
      retryCount: 1,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 18.00 },
          product: { name: 'Empanadas - Lomo Saltado', images: [] },
          variant: { name: 'frozen-4 pack' }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ orderId: 'test-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.getByTestId('retry-payment-button')).toBeInTheDocument();
    });
  });

  it('should NOT show retry payment button for CASH orders', async () => {
    // Mock a CASH payment order with PENDING status
    const mockOrder = {
      id: 'test-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      total: { toNumber: () => 79.55 },
      createdAt: new Date(),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323',
      pickupTime: new Date(),
      fulfillmentType: 'pickup',
      trackingNumber: null,
      shippingCarrier: null,
      retryCount: 0,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 18.00 },
          product: { name: 'Empanadas - Lomo Saltado', images: [] },
          variant: { name: 'frozen-4 pack' }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ orderId: 'test-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.queryByTestId('retry-payment-button')).not.toBeInTheDocument();
    });
  });

  it('should NOT show retry payment button for COMPLETED SQUARE orders', async () => {
    // Mock a SQUARE payment order with COMPLETED status
    const mockOrder = {
      id: 'test-order-id',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'SQUARE',
      total: { toNumber: () => 79.55 },
      createdAt: new Date(),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-123-2323',
      pickupTime: new Date(),
      fulfillmentType: 'pickup',
      trackingNumber: null,
      shippingCarrier: null,
      retryCount: 0,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 18.00 },
          product: { name: 'Empanadas - Lomo Saltado', images: [] },
          variant: { name: 'frozen-4 pack' }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(null);

    const params = Promise.resolve({ orderId: 'test-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.queryByTestId('retry-payment-button')).not.toBeInTheDocument();
    });
  });

  it('should display payment method for catering orders', async () => {
    // Mock a catering order
    const mockCateringOrder = {
      id: 'test-catering-order-id',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      totalAmount: { toNumber: () => 150.00 },
      createdAt: new Date(),
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '415-555-0123',
      eventDate: new Date(),
      numberOfPeople: 25,
      specialRequests: 'No onions please',
      deliveryAddress: '123 Main St, San Francisco, CA',
      deliveryFee: { toNumber: () => 15.00 },
      items: [
        {
          id: 'catering-item-1',
          quantity: 2,
          pricePerUnit: { toNumber: () => 75.00 },
          name: 'Catering Package A',
          itemType: 'ENTREE',
          totalPrice: { toNumber: () => 150.00 }
        }
      ]
    };

    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.cateringOrder.findUnique.mockResolvedValue(mockCateringOrder);

    const params = Promise.resolve({ orderId: 'test-catering-order-id' });
    
    render(await OrderDetailsPage({ params }));

    await waitFor(() => {
      expect(screen.getByText('SQUARE')).toBeInTheDocument();
      expect(screen.getByText('Catering Order')).toBeInTheDocument();
    });
  });
}); 