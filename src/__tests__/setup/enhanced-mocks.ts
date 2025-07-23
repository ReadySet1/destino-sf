import { jest } from '@jest/globals';

// Enhanced Prisma Mock with productVariant support
export const createEnhancedPrismaMock = () => {
  const mockPrismaInstance = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation(callback => callback(mockPrismaInstance)),
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

    profile: {
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
    },

    // SpotlightPick model for testing spotlight picks functionality
    spotlightPick: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  return mockPrismaInstance;
};

// Enhanced validateOrderMinimums mock
export const createValidateOrderMinimumsMock = () => {
  return jest.fn().mockResolvedValue({
    isValid: true,
    errorMessage: null,
    deliveryZone: 'zone-1',
    minimumAmount: 50,
  });
};

// Fixed Decimal handling for ProductCard tests
export const createMockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
  toFixed: (digits: number) => value.toFixed(digits),
  valueOf: () => value,
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
      price: createMockDecimal(8.99),
    },
    {
      id: 'var-2',
      name: 'Large',
      price: createMockDecimal(12.99),
    },
  ],
  ...overrides,
});

// Spotlight Pick Mock Factories
export const createMockSpotlightPick = (overrides: any = {}) => ({
  id: 'pick-123',
  position: 1,
  productId: 'product-123',
  customTitle: null,
  customDescription: null,
  customImageUrl: null,
  customPrice: null,
  personalizeText: null,
  isCustom: false,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  product: null,
  ...overrides,
});

export const createMockProductBasedSpotlightPick = (overrides: any = {}) => ({
  ...createMockSpotlightPick(),
  productId: 'product-123',
  personalizeText: 'Perfect for your special occasion',
  isCustom: false,
  product: {
    id: 'product-123',
    name: 'Dulce de Leche Alfajores',
    description: 'Traditional Argentine cookies',
    images: ['https://example.com/alfajor.jpg'],
    price: 12.99,
    slug: 'alfajores-dulce-de-leche',
    category: {
      name: 'ALFAJORES',
      slug: 'alfajores',
    },
  },
  ...overrides,
});

export const createMockCustomSpotlightPick = (overrides: any = {}) => ({
  ...createMockSpotlightPick(),
  position: 2,
  productId: null,
  customTitle: 'Custom Empanadas Special',
  customDescription: 'Hand-made empanadas with premium fillings',
  customImageUrl: 'https://example.com/custom-empanadas.jpg',
  customPrice: 18.99,
  personalizeText: 'Made fresh daily just for you!',
  isCustom: true,
  product: null,
  ...overrides,
});

export const createMockEmptySpotlightPick = (position: 1 | 2 | 3 | 4 = 1) => ({
  id: `empty-pick-${position}`,
  position,
  productId: null,
  customTitle: null,
  customDescription: null,
  customImageUrl: null,
  customPrice: null,
  personalizeText: null,
  isCustom: false,
  isActive: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  product: null,
});

// Mock Categories for testing
export const createMockCategories = () => [
  { id: 'cat-1', name: 'Alfajores', slug: 'alfajores' },
  { id: 'cat-2', name: 'Empanadas', slug: 'empanadas' },
  { id: 'cat-3', name: 'Beverages', slug: 'beverages' },
];

// Enhanced order status mapping
export const ORDER_STATUS_MAPPING = {
  PAID: 'PROCESSING',
  FAILED: 'CANCELLED',
  PENDING: 'PENDING',
} as const;

// Mock store creators for React components
export const createMockCartStore = () => ({
  items: [],
  addItem: jest.fn(),
  removeItem: jest.fn(),
  updateQuantity: jest.fn(),
  clearCart: jest.fn(),
  getTotal: jest.fn().mockReturnValue(0),
});

export const createMockCartAlertStore = () => ({
  isVisible: false,
  message: '',
  showAlert: jest.fn(),
  hideAlert: jest.fn(),
});

// Mock Supabase client for authentication testing
export const createMockSupabaseClient = (user: any = null, profile: any = null) => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user },
      error: null,
    }),
  },
  // Add other Supabase methods as needed for testing
});

// Mock admin profile
export const createMockAdminProfile = () => ({
  id: 'admin-123',
  role: 'ADMIN',
  email: 'admin@example.com',
});

// Mock customer profile
export const createMockCustomerProfile = () => ({
  id: 'customer-123',
  role: 'CUSTOMER',
  email: 'customer@example.com',
});
