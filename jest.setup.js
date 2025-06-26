const { TextEncoder, TextDecoder } = require('util');
const fetch = require('node-fetch');

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Ensure test environment using Object.assign to avoid readonly issues
Object.assign(process.env, {
  NODE_ENV: 'test'
});

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (!global.fetch) {
  global.fetch = fetch;
}
if (!global.Request) {
  global.Request = fetch.Request;
}
if (!global.Response) {
  global.Response = fetch.Response;
}
if (!global.Headers) {
  global.Headers = fetch.Headers;
}

// Import jest-dom for DOM testing extensions
require('@testing-library/jest-dom');

// Setup test environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/destino_sf_test';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

// Mock Prisma for unit tests - THIS MUST BE FIRST
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
    $executeRaw: jest.fn().mockResolvedValue([{ count: 5 }]),
    $queryRaw: jest.fn().mockResolvedValue([{ count: 5 }]),
    // Add all model mocks
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
      createMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    spotlightPick: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    // Add other models as needed
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    cateringOrder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    cateringOrderItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    cateringItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    cateringPackage: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    variant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    businessHours: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    promoCode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    refund: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    shippingConfiguration: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    storeSettings: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
    subscriber: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      TransactionIsolationLevel: {
        ReadCommitted: 'ReadCommitted',
        ReadUncommitted: 'ReadUncommitted',
        RepeatableRead: 'RepeatableRead',
        Serializable: 'Serializable',
      },
    },
  };
});

// Mock @/lib/db to use the same mock
jest.mock('@/lib/db', () => {
  const { PrismaClient } = require('@prisma/client');
  const mockClient = new PrismaClient();
  return {
    prisma: mockClient,
    db: mockClient,
  };
});

// Mock @/app/actions/orders server actions - simplified
jest.mock('@/app/actions/orders', () => ({
  validateOrderMinimumsServer: jest.fn().mockResolvedValue({
    isValid: true,
    errorMessage: null,
    deliveryZone: 'zone-1',
    minimumRequired: 25,
    currentAmount: 65
  }),
  createOrderAndGenerateCheckoutUrl: jest.fn().mockResolvedValue({
    success: true,
    orderId: 'order-123',
    checkoutUrl: 'https://checkout.example.com/order-123',
    error: null
  }),
  updateOrderPayment: jest.fn().mockResolvedValue({
    id: 'order-123',
    status: 'PAID',
    paymentId: 'payment-789',
    squareOrderId: 'square-order-456'
  }),
  getOrderById: jest.fn().mockResolvedValue({
    id: 'order-123',
    customerName: 'John Doe',
    status: 'PAID'
  }),
  createManualPaymentOrder: jest.fn().mockResolvedValue({
    id: 'order-123',
    status: 'PENDING'
  })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Add console mock for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

/*
jest.mock('@/lib/cart-helpers', () => ({
  calculateShippingWeight: jest.fn().mockResolvedValue(2.5),
  validateOrderMinimums: jest.fn().mockResolvedValue({
    isValid: true,
    errorMessage: null,
    deliveryZone: 'zone-1',
    minimumAmount: 50
  }),
}));
*/

// Mock delivery utilities - COMMENTED OUT TO ALLOW REAL FUNCTION TESTING
// ISSUE: These mocks were preventing actual function logic from being tested
/*
jest.mock('@/lib/deliveryUtils', () => ({
  DeliveryZone: {
    NEARBY: 'nearby',
    DISTANT: 'distant',
    UNSUPPORTED: 'unsupported'
  },
  getDeliveryZone: jest.fn().mockReturnValue('nearby'),
  calculateDeliveryFee: jest.fn().mockReturnValue(5.99),
  validateDeliveryAddress: jest.fn().mockReturnValue(true),
}));
*/

// Mock @testing-library/user-event as fallback for resolution issues
jest.mock('@testing-library/user-event', () => {
  const mockUserEventInstance = {
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    selectOptions: jest.fn().mockResolvedValue(undefined),
    upload: jest.fn().mockResolvedValue(undefined),
    hover: jest.fn().mockResolvedValue(undefined),
    unhover: jest.fn().mockResolvedValue(undefined),
    keyboard: jest.fn().mockResolvedValue(undefined),
    pointer: jest.fn().mockResolvedValue(undefined),
    tab: jest.fn().mockResolvedValue(undefined),
    dblClick: jest.fn().mockResolvedValue(undefined),
    tripleClick: jest.fn().mockResolvedValue(undefined),
  };

  // Create the main userEvent object that matches the library's structure
  const userEventObject = {
    ...mockUserEventInstance,
    setup: jest.fn(() => mockUserEventInstance),
  };

  return {
    __esModule: true,
    default: userEventObject,
  };
});

// This extends Jest's expect
expect.extend({
  toHaveClass(received, className) {
    const pass = received.classList.contains(className);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    };
  },
});
