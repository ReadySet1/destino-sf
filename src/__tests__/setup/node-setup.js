// Node.js specific setup for API/lib/utils tests

// Database setup for Prisma tests
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/destino_sf_test';

// Mock external Node.js services that don't exist in test environment
// Note: @/lib/db is mocked globally in jest.setup.js to avoid conflicts

// Mock Sanity client for CMS-related tests
jest.mock('@/sanity/lib/client', () => ({
  client: {
    fetch: jest.fn(),
    create: jest.fn(),
    createOrReplace: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock Square API
jest.mock('square', () => ({
  Client: jest.fn(() => ({
    paymentsApi: {
      createPayment: jest.fn(),
    },
    customersApi: {
      createCustomer: jest.fn(),
    },
  })),
}));

// Mock email service
jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Node.js specific test setup
const { TextEncoder, TextDecoder } = require('util');

// Ensure Node.js globals are available
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock fetch for Node.js environment if not available
if (!global.fetch) {
  const fetch = require('node-fetch');
  global.fetch = fetch;
  global.Request = fetch.Request;
  global.Response = fetch.Response;
  global.Headers = fetch.Headers;
}

// Set test environment
process.env.NODE_ENV = 'test';

console.log('Node.js test environment setup complete');
