/**
 * @jest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutForm } from '@/components/Store/CheckoutForm';
import { useCartStore } from '@/store/cart';
import { useSmartCart } from '@/hooks/useSmartCart';

// Add jest-dom matchers
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/store/cart');
jest.mock('@/hooks/useSmartCart');
jest.mock('@/lib/dateUtils', () => ({
  formatDate: jest.fn((date: Date) => date.toISOString().split('T')[0]),
  formatTime: jest.fn((date: Date) => date.toISOString().split('T')[1].substring(0, 5)),
  isWeekend: jest.fn(() => false),
  addBusinessDays: jest.fn((date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  getEarliestPickupDate: jest.fn(() => new Date()),
  getEarliestDeliveryDate: jest.fn(() => new Date()),
  isBusinessDay: jest.fn(() => true),
  getPickupTimeSlots: jest.fn(() => ['10:00', '11:00', '12:00']),
  getDeliveryTimeSlots: jest.fn(() => ['10:00', '11:00', '12:00']),
  isValidPickupDateTime: jest.fn(() => true),
  isValidDeliveryDateTime: jest.fn(() => true),
}));

jest.mock('@/lib/deliveryUtils', () => ({
  calculateDeliveryFee: jest.fn(() => ({ fee: 5, zone: 'Zone 1' })),
  getDeliveryFeeMessage: jest.fn(() => 'Delivery fee: $5'),
}));

jest.mock('@/lib/cart-helpers', () => ({
  validateOrderMinimums: jest.fn(() => ({ isValid: true })),
}));

jest.mock('@/app/actions', () => ({
  createOrderAndGenerateCheckoutUrl: jest.fn(),
  getShippingRates: jest.fn(),
}));

jest.mock('@/app/actions/createManualOrder', () => ({
  updateOrderWithManualPayment: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

// Mock all the UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div>Calendar</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <div>Select Value</div>,
}));

jest.mock('@/components/Store/FulfillmentSelector', () => ({
  FulfillmentSelector: () => <div>Fulfillment Selector</div>,
}));

jest.mock('@/components/Store/AddressForm', () => ({
  AddressForm: () => <div>Address Form</div>,
}));

jest.mock('@/components/Store/PaymentMethodSelector', () => ({
  PaymentMethodSelector: () => <div>Payment Method Selector</div>,
}));

jest.mock('@/components/Store/CheckoutSummary', () => ({
  CheckoutSummary: () => <div>Checkout Summary</div>,
}));

const mockCartStore = {
  items: [
    { id: '1', name: 'Test Item', price: 10.99, quantity: 1 }
  ],
  totalItems: 1,
  totalPrice: 10.99,
  clearCart: jest.fn(),
};

const mockSmartCart = {
  regularCart: mockCartStore,
  cateringCart: { items: [], totalItems: 0, totalPrice: 0, clearCart: jest.fn() },
  addToCart: jest.fn(),
  removeFromAllCarts: jest.fn(),
  getTotalItemCount: jest.fn(() => 1),
  isInAnyCart: jest.fn(() => false),
};

describe('CheckoutForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCartStore as jest.MockedFunction<typeof useCartStore>).mockReturnValue(mockCartStore);
    (useSmartCart as jest.MockedFunction<typeof useSmartCart>).mockReturnValue(mockSmartCart);
  });

  it('should render checkout form', () => {
    render(<CheckoutForm />);
    
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });

  it('should render checkout form with initial user data', () => {
    const userData = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890'
    };
    
    render(<CheckoutForm initialUserData={userData} />);
    
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });
}); 