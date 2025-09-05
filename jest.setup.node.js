// Jest setup for Node.js environment (API/Server tests)
const { TextEncoder, TextDecoder } = require('util');

// Fix TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Ensure test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';
process.env.SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'test-token';
process.env.SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

// Mock fetch for tests
global.fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock Prisma for API tests
jest.mock('@prisma/client', () => {
  const { mockDeep } = require('jest-mock-extended');
  const mockPrismaClient = mockDeep();

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    Prisma: {
      PrismaClientKnownRequestError: class extends Error {
        constructor(message, code, clientVersion, meta) {
          super(message);
          this.code = code;
          this.clientVersion = clientVersion;
          this.meta = meta;
          this.name = 'PrismaClientKnownRequestError';
        }
      },
    },
  };
});

// Mock @/lib/db
jest.mock('@/lib/db', () => {
  const { mockDeep } = require('jest-mock-extended');
  const mockPrismaClient = mockDeep();

  return {
    prisma: mockPrismaClient,
    db: mockPrismaClient,
    default: mockPrismaClient,
  };
});

// Mock Square Client for API tests
jest.mock('@/lib/square', () => ({
  squareClient: {
    catalogApi: {
      searchCatalogItems: jest.fn(),
    },
    paymentsApi: {
      createPayment: jest.fn(),
    },
    ordersApi: {
      createOrder: jest.fn(),
    },
  },
}));

// Add console mock for cleaner test output
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};
