import { jest } from '@jest/globals';

// Enhanced Prisma Mock with productVariant support
export const createEnhancedPrismaMock = () => {
  const mockPrismaInstance = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrismaInstance)),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0),
    
    // Main models
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    
    // Missing productVariant model - this was causing failures
    productVariant: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    
    category: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    
    shippingConfiguration: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    }
  };

  return mockPrismaInstance;
};

// Enhanced validateOrderMinimums mock
export const createValidateOrderMinimumsMock = () => {
  return jest.fn().mockResolvedValue({
    isValid: true,
    errorMessage: null,
    deliveryZone: 'zone-1',
    minimumAmount: 50
  });
};

// Fixed Decimal handling for ProductCard tests
export const createMockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
  toFixed: (digits: number) => value.toFixed(digits),
  valueOf: () => value
});

// Enhanced Product mock with proper price handling
export const createMockProductWithPricing = (overrides: any = {}) => ({
  id: '1',
  name: 'Test Empanada',
  description: 'Delicious test empanada',
  image: '/test-image.jpg',
  price: createMockDecimal(10.99),
  variants: [
    {
      id: 'var-1',
      name: 'Small',
      price: createMockDecimal(8.99)
    },
    {
      id: 'var-2', 
      name: 'Large',
      price: createMockDecimal(12.99)
    }
  ],
  ...overrides
});

// Enhanced order status mapping
export const ORDER_STATUS_MAPPING = {
  PAID: 'PROCESSING',
  FAILED: 'CANCELLED',
  PENDING: 'PENDING'
} as const;

// Mock store creators for React components
export const createMockCartStore = () => ({
  items: [],
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  getTotal: jest.fn().mockReturnValue(0)
});

export const createMockCartAlertStore = () => ({
  isVisible: false,
  message: '',
  showAlert: jest.fn(),
  hideAlert: jest.fn()
}); 