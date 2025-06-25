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

// Mock Prisma for unit tests
jest.mock('@/lib/db', () => {
  const mockClient = require('./__mocks__/prisma').mockPrismaClient;
  return {
    prisma: mockClient,
    db: mockClient,
  };
});

// Add enhanced mocks for additional utilities - ONLY USE WHEN NEEDED FOR INTEGRATION TESTS
// COMMENTED OUT TO ALLOW REAL FUNCTION TESTING WHEN NEEDED
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
