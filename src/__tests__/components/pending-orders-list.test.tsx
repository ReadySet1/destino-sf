/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PendingOrdersList } from '@/components/Orders/PendingOrdersList';

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock global fetch
(global as any).fetch = jest.fn();

describe('PendingOrdersList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ((global as any).fetch as jest.Mock).mockClear();
  });

  const mockSquareOrder = {
    id: 'square-order-id',
    total: 79.55,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'SQUARE',
    createdAt: new Date('2025-01-16T15:30:00Z'),
    retryCount: 1,
    paymentUrlExpiresAt: null,
    items: [
      {
        quantity: 2,
        price: 18.00,
        product: {
          name: 'Empanadas - Lomo Saltado'
        },
        variant: {
          name: 'frozen-4 pack'
        }
      }
    ]
  };

  const mockCashOrder = {
    id: 'cash-order-id',
    total: 45.25,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'CASH',
    createdAt: new Date('2025-01-16T16:00:00Z'),
    retryCount: 0,
    paymentUrlExpiresAt: null,
    items: [
      {
        quantity: 1,
        price: 45.25,
        product: {
          name: 'Catering Package'
        },
        variant: null
      }
    ]
  };

  it('should render empty state when no orders provided', () => {
    render(<PendingOrdersList orders={[]} />);
    
    expect(screen.getByText('No Pending Orders')).toBeInTheDocument();
    expect(screen.getByText('All your orders have been completed or are being processed.')).toBeInTheDocument();
  });

  it('should display retry payment button for SQUARE orders', () => {
    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    expect(screen.getByText('Retry Payment')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    expect(retryButton).not.toHaveAttribute('disabled');
  });

  it('should NOT display retry payment button for CASH orders', () => {
    render(<PendingOrdersList orders={[mockCashOrder]} />);
    
    expect(screen.queryByText('Retry Payment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry payment/i })).not.toBeInTheDocument();
  });

  it('should display cash payment message for CASH orders', () => {
    render(<PendingOrdersList orders={[mockCashOrder]} />);
    
    expect(screen.getByText('Please visit our store to pay with cash')).toBeInTheDocument();
  });

  it('should handle both SQUARE and CASH orders in the same list', () => {
    const mixedOrders = [mockSquareOrder, mockCashOrder];
    render(<PendingOrdersList orders={mixedOrders} />);
    
    // Should show retry button for SQUARE order
    expect(screen.getByText('Retry Payment')).toBeInTheDocument();
    
    // Should show cash message for CASH order
    expect(screen.getByText('Please visit our store to pay with cash')).toBeInTheDocument();
  });

  it('should display retry count information when applicable', () => {
    const orderWithRetries = {
      ...mockSquareOrder,
      retryCount: 2
    };
    
    render(<PendingOrdersList orders={[orderWithRetries]} />);
    
    expect(screen.getByText('Payment retry attempts: 2/3')).toBeInTheDocument();
  });

  it('should disable retry button when max retries reached', () => {
    const maxRetriesOrder = {
      ...mockSquareOrder,
      retryCount: 3
    };
    
    render(<PendingOrdersList orders={[maxRetriesOrder]} />);
    
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    expect(retryButton).toHaveAttribute('disabled');
  });

  it('should call retry payment API when retry button clicked', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        checkoutUrl: 'https://checkout.example.com'
      })
    });
    (global as any).fetch = mockFetch;

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/orders/${mockSquareOrder.id}/retry-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });
  });

  it('should redirect to checkout URL on successful retry', async () => {
    const checkoutUrl = 'https://checkout.example.com';
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        checkoutUrl
      })
    });
    (global as any).fetch = mockFetch;

    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(window.location.href).toBe(checkoutUrl);
    });
  });

  it('should show error toast on failed retry', async () => {
    const { toast } = require('sonner');
    
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        error: 'Payment retry failed'
      })
    });
    (global as any).fetch = mockFetch;

    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Payment retry failed');
    });
  });

  it('should show processing state during retry', async () => {
    const mockFetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, checkoutUrl: 'https://test.com' })
      }), 100))
    );
    (global as any).fetch = mockFetch;

    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    const retryButton = screen.getByRole('button', { name: /retry payment/i });
    fireEvent.click(retryButton);

    // Should show processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(retryButton).toHaveAttribute('disabled');

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  it('should format order information correctly', () => {
    render(<PendingOrdersList orders={[mockSquareOrder]} />);
    
    // Check order details are displayed
    expect(screen.getByText('2x Empanadas - Lomo Saltado (frozen-4 pack) - $36.00')).toBeInTheDocument();
    expect(screen.getByText(/PENDING/)).toBeInTheDocument();
  });

  it('should handle orders without variants', () => {
    const orderWithoutVariant = {
      ...mockSquareOrder,
      items: [
        {
          quantity: 1,
          price: 25.00,
          product: {
            name: 'Simple Product'
          },
          variant: null
        }
      ]
    };

    render(<PendingOrdersList orders={[orderWithoutVariant]} />);
    
    expect(screen.getByText('1x Simple Product - $25.00')).toBeInTheDocument();
  });

  it('should not show retry info for orders with 0 retries', () => {
    const freshOrder = {
      ...mockSquareOrder,
      retryCount: 0
    };
    
    render(<PendingOrdersList orders={[freshOrder]} />);
    
    expect(screen.queryByText(/Payment retry attempts/)).not.toBeInTheDocument();
  });
}); 