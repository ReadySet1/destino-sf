import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import type { MockPrismaClient } from './database-mocks';
import { NextRequest, NextResponse } from 'next/server';

// Common test data with proper types
export const TestData = {
  // Payment methods using proper enum
  PaymentMethods: {
    SQUARE: PaymentMethod.SQUARE,
    CASH: PaymentMethod.CASH,
    VENMO: PaymentMethod.VENMO,
  },

  // Common cart items
  validCartItems: [
    {
      id: 'product-1',
      name: 'Dulce de Leche Alfajores',
      price: 12.99,
      quantity: 2,
      variantId: 'variant-1',
    },
    {
      id: 'product-2', 
      name: 'Empanada Beef',
      price: 4.50,
      quantity: 6,
      variantId: undefined, // Explicitly undefined for type safety
    },
  ],

  // Common customer info
  validCustomerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },

  // Common fulfillment data
  fulfillment: {
    pickup: {
      method: 'pickup' as const,
      pickupTime: '2024-01-15T14:00:00.000Z',
    },
    localDelivery: {
      method: 'local_delivery' as const,
      deliveryDate: '2024-01-16',
      deliveryTime: '18:00',
      deliveryAddress: {
        street: '123 Delivery St',
        city: 'San Francisco', 
        state: 'CA',
        postalCode: '94105',
      },
      deliveryInstructions: 'Ring doorbell',
    },
    nationwideShipping: {
      method: 'nationwide_shipping' as const,
      shippingAddress: {
        street: '456 Ship St',
        city: 'Los Angeles',
        state: 'CA', 
        postalCode: '90210',
      },
      shippingMethod: 'ground',
      shippingCarrier: 'USPS',
      shippingCost: 1250,
      rateId: 'rate-123',
    },
  },

  // Common order data
  orders: {
    pending: {
      id: 'order-123',
      status: OrderStatus.PENDING,
      total: new Decimal('50.99'),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: PaymentMethod.SQUARE,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    },
  },

  // Common product data  
  products: {
    active: {
      id: 'product-1',
      name: 'Dulce de Leche Alfajores',
      price: new Decimal('12.99'),
      active: true,
      inventory: 50,
      squareId: 'square-123',
      categoryId: 'category-1',
      featured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    inactive: {
      id: 'product-2',
      name: 'Discontinued Item',
      price: new Decimal('15.99'),
      active: false,
      inventory: 0,
      squareId: 'square-456',
      categoryId: 'category-1',
      featured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
};

// Helper to create properly typed form data
export const createFormData = (overrides: {
  fulfillment?: any;
  paymentMethod?: PaymentMethod;
  items?: any[];
  customerInfo?: any;
} = {}) => ({
  items: overrides.items || TestData.validCartItems,
  customerInfo: overrides.customerInfo || TestData.validCustomerInfo,
  paymentMethod: overrides.paymentMethod || TestData.PaymentMethods.SQUARE,
  fulfillment: overrides.fulfillment || TestData.fulfillment.pickup,
});

// Mock validation results
export const createValidationResult = (isValid: boolean, error?: string) => ({
  isValid,
  errorMessage: error,
  minimumRequired: 25,
  currentAmount: isValid ? 50 : 20,
});

// Mock order creation
export const createMockOrder = (overrides: Partial<typeof TestData.orders.pending> = {}) => ({
  ...TestData.orders.pending,
  ...overrides,
});

// Mock product creation
export const createMockProduct = (overrides: Partial<typeof TestData.products.active> = {}) => ({
  ...TestData.products.active,
  ...overrides,
});

// Setup mock Prisma client
export const setupMockPrisma = (mockPrisma: MockPrismaClient) => {
  // Setup default mock responses
  (mockPrisma.order.create as jest.Mock).mockResolvedValue(TestData.orders.pending);
  (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([TestData.products.active]);
  (mockPrisma.product.update as jest.Mock).mockResolvedValue({
    ...TestData.products.active,
    inventory: 48, // Decremented by 2
  });
  
  return mockPrisma;
};

// Console mocking utilities
export const mockConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

export const restoreConsole = () => {
  jest.restoreAllMocks();
};

// Export standalone variables for backwards compatibility
export const validCartItems = TestData.validCartItems;
export const validCustomerInfo = TestData.validCustomerInfo;
export const validPickupFulfillment = TestData.fulfillment.pickup;
export const validLocalDeliveryFulfillment = TestData.fulfillment.localDelivery;
export const validNationwideShippingFulfillment = TestData.fulfillment.nationwideShipping;

// Mock API route POST function
export const createMockPOST = (mockResponse: any) => {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      return NextResponse.json(mockResponse, { status: 200 });
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
  };
};

// Create mock API responses
export const createMockAPIResponse = (data: any, status = 200) => {
  return {
    json: async () => data,
    status,
  };
};

// Enhanced delivery zone validation
export const createMockDeliveryZone = (zone: 'nearby' | 'distant' | 'extended') => {
  const zones = {
    nearby: {
      zone: 'nearby',
      name: 'Nearby Delivery',
      minimumAmount: new Decimal('25.00'),
      deliveryFee: new Decimal('5.00'),
      active: true,
    },
    distant: {
      zone: 'distant', 
      name: 'Extended Delivery',
      minimumAmount: new Decimal('50.00'),
      deliveryFee: new Decimal('10.00'),
      active: true,
    },
    extended: {
      zone: 'extended',
      name: 'Extended Delivery',
      minimumAmount: new Decimal('75.00'),
      deliveryFee: new Decimal('15.00'),
      active: true,
    },
  };
  
  return zones[zone];
}; 