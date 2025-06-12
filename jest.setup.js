const { TextEncoder, TextDecoder } = require('util');
const fetch = require('node-fetch');

// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Ensure test environment
process.env.NODE_ENV = 'test';

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
jest.mock('@/lib/prisma', () => ({
  prisma: require('./__mocks__/prisma').mockPrismaClient,
}));

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
