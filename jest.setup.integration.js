/**
 * Jest Setup for Integration Tests
 *
 * This setup file is used for integration tests that require a REAL database.
 * Unlike jest.setup.enhanced.js, this DOES NOT mock @prisma/client.
 *
 * Integration tests will use actual PostgreSQL database operations to test:
 * - Transaction isolation and locking
 * - Database constraints
 * - Complex queries
 * - Concurrent operations
 *
 * Related: DES-76 - Fix Critical Path Test Failures
 */

const { TextEncoder, TextDecoder } = require('util');
const {
  cleanDatabase,
  setupTestDatabase,
  disconnectTestDatabase,
} = require('./src/__tests__/utils/database-test-utils');

// Fix TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set test environment variables
const requiredEnvVars = {
  // Database - Point to TEST database (important!)
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',

  // Square (use sandbox for tests)
  SQUARE_ACCESS_TOKEN: 'test-access-token',
  SQUARE_SANDBOX_TOKEN: 'test-sandbox-token',
  SQUARE_PRODUCTION_TOKEN: 'test-production-token',
  SQUARE_LOCATION_ID: 'test-location-id',
  SQUARE_ENVIRONMENT: 'sandbox',
  SQUARE_WEBHOOK_SECRET: 'test-webhook-secret',
  SQUARE_WEBHOOK_SECRET_SANDBOX: 'test-webhook-secret-sandbox',

  // Email
  RESEND_API_KEY: 'test-resend-key',
  FROM_EMAIL: 'test@example.com',
  ADMIN_EMAIL: 'admin@example.com',
  SUPPORT_EMAIL: 'support@example.com',

  // App
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NODE_ENV: 'test',

  // Shippo
  SHIPPO_API_KEY: 'test-shippo-key',

  // Redis/Upstash
  UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'test-token',
};

// Apply environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

// Mock @t3-oss/env-nextjs
jest.mock('@t3-oss/env-nextjs', () => ({
  createEnv: jest.fn(() => requiredEnvVars),
}));

// Mock the env module
jest.mock('@/env', () => ({
  env: requiredEnvVars,
}));

// IMPORTANT: Do NOT mock @prisma/client for integration tests
// Integration tests will use the real Prisma client

// Mock external services (Square, Supabase, email, etc.)
// These should still be mocked to avoid hitting real APIs

// Mock Supabase SSR client
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-123',
            email: 'test@example.com',
          },
        },
      }),
    },
  })),
}));

// Mock cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    get: jest.fn(name => ({ value: 'test-cookie-value' })),
    set: jest.fn(),
  })),
}));

// Mock Square services (external API - should always be mocked)
jest.mock('@/lib/square/orders', () => ({
  createOrder: jest.fn().mockResolvedValue({
    id: 'square-order-123',
    state: 'OPEN',
  }),
}));

jest.mock('@/lib/square/payments', () => ({
  createPayment: jest.fn().mockResolvedValue({
    id: 'square-payment-123',
    status: 'COMPLETED',
  }),
}));

// Mock Resend (email service)
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
      },
    })),
  };
});

// Mock Upstash Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    headers: new Headers(),
  })
);

// Database setup and cleanup hooks
beforeAll(async () => {
  // Setup test database connection
  await setupTestDatabase();
  console.log('✅ Test database connected');
});

afterAll(async () => {
  // Disconnect from test database
  await disconnectTestDatabase();
  console.log('✅ Test database disconnected');
});

// Clean database before each test to ensure isolation
beforeEach(async () => {
  await cleanDatabase();
});

// Suppress non-critical console output in tests
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Not implemented') ||
      args[0].includes('Warning:') ||
      args[0].includes('Invalid'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global test timeout
jest.setTimeout(30000); // 30 seconds for integration tests

console.log('📋 Integration test setup complete (using REAL database)');
