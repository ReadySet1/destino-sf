// Node.js specific setup for API/lib/utils tests

// Database setup for Prisma tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/destino_sf_test';

// Mock external Node.js services that don't exist in test environment
jest.mock('@/lib/prisma', () => ({
  prisma: {
    shippingConfiguration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

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

console.log('Node.js test environment setup complete');
