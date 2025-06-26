// Define PaymentMethod enum locally to avoid import issues with mocked Prisma
const PaymentMethod = {
  SQUARE: 'SQUARE' as const,
  CASH: 'CASH' as const,
  VENMO: 'VENMO' as const,
} as const;

type PaymentMethodType = typeof PaymentMethod[keyof typeof PaymentMethod];

import type { MockPrismaClient } from './database-mocks';

// Common test data with proper types
export const TestData = {
  // Payment methods using proper enum
  PaymentMethods: {
    SQUARE: PaymentMethod.SQUARE,
    CASH: PaymentMethod.CASH,
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
};

// Helper to create properly typed form data
export const createFormData = (overrides: {
  fulfillment?: any;
  paymentMethod?: PaymentMethodType;
  items?: any[];
  customerInfo?: any;
} = {}) => ({
  items: overrides.items || TestData.validCartItems,
  customerInfo: overrides.customerInfo || TestData.validCustomerInfo,
  paymentMethod: overrides.paymentMethod || TestData.PaymentMethods.SQUARE,
  fulfillment: overrides.fulfillment || TestData.fulfillment.pickup,
});

// Helper for validation results with proper typing
export const createValidationResult = (overrides: {
  isValid?: boolean;
  errorMessage?: string | null;
  deliveryZone?: string;
  minimumRequired?: number;
  currentAmount?: number;
} = {}) => ({
  isValid: overrides.isValid ?? true,
  errorMessage: overrides.errorMessage ?? null,
  // Only include additional properties if they're provided
  ...(overrides.deliveryZone && { deliveryZone: overrides.deliveryZone }),
  ...(overrides.minimumRequired && { minimumRequired: overrides.minimumRequired }),
  ...(overrides.currentAmount && { currentAmount: overrides.currentAmount }),
});

// Helper for mock order data
export const createMockOrder = (overrides: any = {}) => ({
  id: 'order-123',
  status: 'PENDING',
  total: 4543,
  taxAmount: 346,
  subtotal: 4197,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+1234567890',
  fulfillmentMethod: 'pickup',
  userId: null,
  createdAt: new Date('2025-06-19T16:55:08.495Z'),
  updatedAt: new Date('2025-06-19T16:55:08.495Z'),
  ...overrides,
});

// Type-safe mock setup helpers
export const setupMockPrisma = (mockPrisma: MockPrismaClient) => {
  // Setup default successful responses for available models
  mockPrisma.order.create.mockResolvedValue(createMockOrder());
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.order.findUnique.mockResolvedValue(null);
  mockPrisma.order.findFirst.mockResolvedValue(null);
  mockPrisma.product.findMany.mockResolvedValue([]);
  mockPrisma.product.findFirst.mockResolvedValue(null);
  mockPrisma.product.findUnique.mockResolvedValue(null);
  mockPrisma.shippingConfiguration.findMany.mockResolvedValue([]);
  mockPrisma.shippingConfiguration.findFirst.mockResolvedValue(null);
};

// Console mock helpers
export const mockConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
};

export const restoreConsole = () => {
  jest.restoreAllMocks();
}; 