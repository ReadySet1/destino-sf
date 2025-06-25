import type { PrismaClient as PrismaClientType } from '@prisma/client';

export const mockPrismaClient = {
  // Core Prisma methods
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((fn: (tx: typeof mockPrismaClient) => Promise<any>) => fn(mockPrismaClient)),
  $queryRaw: jest.fn().mockResolvedValue([]),
  $executeRaw: jest.fn().mockResolvedValue(0),

  // Order model methods with realistic TypeScript return values
  order: {
    create: jest.fn().mockResolvedValue({
      id: 'order-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      status: 'PENDING',
      fulfillmentMethod: 'pickup',
      fulfillmentType: 'pickup',
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      subtotal: { toNumber: () => 41.97 },
      taxAmount: { toNumber: () => 3.46 },
      total: { toNumber: () => 45.43 },
      createdAt: new Date('2025-06-19T16:55:08.495Z'),
      updatedAt: new Date('2025-06-19T16:55:08.495Z'),
      userId: null,
      notes: null,
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'order-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      status: 'PENDING',
      fulfillmentMethod: 'pickup',
      subtotal: { toNumber: () => 41.97 },
      taxAmount: { toNumber: () => 3.46 },
      total: { toNumber: () => 45.43 },
      createdAt: new Date('2025-06-19T16:55:08.495Z'),
      updatedAt: new Date('2025-06-19T16:55:08.495Z'),
      userId: null,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 12.99 },
          product: { name: 'Dulce de Leche Alfajores' },
          variant: { name: '6-pack' },
        }
      ],
    }),
    update: jest.fn().mockResolvedValue({
      id: 'order-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      status: 'PAID',
      fulfillmentMethod: 'pickup',
      subtotal: 4197,
      taxAmount: 346,
      total: 4543,
      paymentId: 'payment-789',
      squareOrderId: 'square-order-456',
      createdAt: new Date('2025-06-19T16:55:08.495Z'),
      updatedAt: new Date('2025-06-19T16:55:08.495Z'),
      userId: null,
    }),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // Product model methods
  product: {
    findFirst: jest.fn().mockResolvedValue({
      id: 'product-1',
      name: 'Test Product',
      description: 'Test Description',
      category: { name: 'Test Category' },
      isCateringProduct: false,
    }),
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test Description',
        category: { name: 'Test Category' },
        isCateringProduct: false,
      }
    ]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'product-1',
      name: 'Test Product',
      category: { name: 'Test Category' },
      isCateringProduct: false,
    }),
    create: jest.fn().mockResolvedValue({
      id: 'new-product-id',
      name: 'New Product',
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // ShippingConfiguration model methods
  shippingConfiguration: {
    create: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 50.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 50.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 75.00,
      isActive: true,
      updatedAt: new Date(),
    }),
    upsert: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 50.00,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    delete: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // Category model methods
  category: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'mock-category-id',
      name: 'Mock Category',
      slug: 'mock-category',
      description: 'Mock category description',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // User model methods
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // ProductVariant model methods - missing from original mock
  productVariant: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'variant-123',
      productId: 'product-123',
      name: 'Default Variant',
      price: 25.00,
      isActive: true,
      inventory: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'new-variant-id',
      productId: 'product-123',
      name: 'New Variant',
      price: 25.00,
      isActive: true,
      inventory: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // OrderItem model methods - often needed for order-related tests
  orderItem: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'order-item-123',
      orderId: 'order-123',
      productId: 'product-123',
      variantId: 'variant-123',
      quantity: 1,
      price: { toNumber: () => 25.00 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },
} as unknown as PrismaClientType;

// Support for both named export and default export patterns
export default mockPrismaClient;

// Additional exports for different import patterns
export const prisma = mockPrismaClient;
export const db = mockPrismaClient;
export const PrismaClient = jest.fn(() => mockPrismaClient); 