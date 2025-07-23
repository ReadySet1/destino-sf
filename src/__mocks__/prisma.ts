import type { PrismaClient as PrismaClientType } from '@prisma/client';

// Create a proper mock function that returns consistent data
const createOrderMock = jest.fn().mockImplementation(data => {
  const baseOrder = {
    id: 'order-123',
    customerName: data.data?.customerName || 'John Doe',
    customerEmail: data.data?.email || 'john@example.com',
    customerPhone: data.data?.phone || '+1234567890',
    status: data.data?.status || 'PENDING',
    fulfillmentMethod: data.data?.fulfillmentType || 'pickup',
    fulfillmentType: data.data?.fulfillmentType || 'pickup',
    paymentStatus: data.data?.paymentStatus || 'PENDING',
    paymentMethod: data.data?.paymentMethod || 'SQUARE',
    subtotal:
      typeof data.data?.subtotal === 'string'
        ? parseFloat(data.data.subtotal)
        : data.data?.subtotal || 4197,
    taxAmount:
      typeof data.data?.taxAmount === 'string'
        ? parseFloat(data.data.taxAmount)
        : data.data?.taxAmount || 346,
    total:
      typeof data.data?.total === 'string' ? parseFloat(data.data.total) : data.data?.total || 4543,
    createdAt: new Date('2025-06-19T16:55:08.495Z'),
    updatedAt: new Date('2025-06-19T16:55:08.495Z'),
    userId: data.data?.userId || null,
    notes: data.data?.notes || null,
    squareOrderId: data.data?.squareOrderId || null,
    pickupTime: data.data?.pickupTime
      ? new Date(data.data.pickupTime)
      : new Date('2024-01-15T14:00:00.000Z'),
    deliveryDate: data.data?.deliveryDate || null,
    deliveryTime: data.data?.deliveryTime || null,
    isCateringOrder: data.data?.isCateringOrder || false,
    shippingCarrier: data.data?.shippingCarrier || null,
    shippingCostCents: data.data?.shippingCostCents || null,
    shippingMethodName: data.data?.shippingMethodName || null,
    shippingRateId: data.data?.shippingRateId || null,
    shippingServiceLevelToken: data.data?.shippingServiceLevelToken || null,
  };

  // Return the id if select is specified
  if (data.select?.id) {
    return { id: baseOrder.id };
  }

  return baseOrder;
});

const updateOrderMock = jest.fn().mockImplementation(updateData => {
  return {
    id: updateData.where?.id || 'order-123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    status: updateData.data?.status || 'PROCESSING',
    fulfillmentMethod: 'pickup',
    subtotal: 4197,
    taxAmount: 346,
    total: 4543,
    paymentId: updateData.data?.paymentId,
    squareOrderId: updateData.data?.squareOrderId || 'square-order-456',
    paymentStatus: updateData.data?.paymentStatus,
    notes: updateData.data?.notes,
    createdAt: new Date('2025-06-19T16:55:08.495Z'),
    updatedAt: new Date('2025-06-19T16:55:08.495Z'),
    userId: null,
    paidAt: updateData.data?.paidAt,
    paymentFailedAt: updateData.data?.paymentFailedAt,
    paymentFailureReason: updateData.data?.paymentFailureReason,
  };
});

export const mockPrismaClient = {
  // Core Prisma methods
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn().mockImplementation(fn => {
    if (typeof fn === 'function') {
      return fn(mockPrismaClient);
    }
    return Promise.resolve({ success: true });
  }),
  $queryRaw: jest.fn().mockResolvedValue([{ count: 5 }]),
  $executeRaw: jest.fn().mockResolvedValue(1),

  // Order model methods with realistic TypeScript return values
  order: {
    create: createOrderMock,
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
        },
      ],
    }),
    update: updateOrderMock,
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
      },
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

  // SpotlightPick model methods - MISSING from original mock!
  spotlightPick: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'pick-1',
        position: 1,
        productId: 'product-123',
        customTitle: null,
        customDescription: null,
        customImageUrl: null,
        customPrice: null,
        personalizeText: 'Perfect for your special occasion',
        isCustom: false,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
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
      },
      {
        id: 'pick-2',
        position: 2,
        productId: null,
        customTitle: 'Custom Empanadas Special',
        customDescription: 'Hand-made empanadas with premium fillings',
        customImageUrl: 'https://example.com/custom-empanadas.jpg',
        customPrice: 18.99,
        personalizeText: 'Made fresh daily just for you!',
        isCustom: true,
        isActive: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        product: null,
      },
    ]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'new-spotlight-id',
      position: 1,
      productId: 'product-1',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // Profile model methods (used in authentication)
  profile: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'profile-123',
      email: 'test@example.com',
      name: 'Test User',
      phone: '+1234567890',
      role: 'CUSTOMER',
      created_at: new Date(),
      updated_at: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'new-profile-id',
      email: 'new@example.com',
      name: 'New User',
      role: 'CUSTOMER',
      created_at: new Date(),
      updated_at: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // Variant model methods (renamed from productVariant to match schema)
  variant: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'variant-123',
      name: 'Default Variant',
      price: { toNumber: () => 25.0 },
      squareVariantId: 'square-variant-123',
      productId: 'product-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'new-variant-id',
      name: 'New Variant',
      price: { toNumber: () => 25.0 },
      productId: 'product-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // Keep productVariant for backward compatibility
  productVariant: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'variant-123',
      productId: 'product-123',
      name: 'Default Variant',
      price: 25.0,
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
      price: 25.0,
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

  // Payment model methods
  payment: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'payment-123',
      squarePaymentId: 'square-payment-123',
      orderId: 'order-123',
      amount: { toNumber: () => 45.43 },
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // BusinessHours model methods
  businessHours: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'hours-123',
      day: 1,
      openTime: '09:00',
      closeTime: '18:00',
      isClosed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  // StoreSettings model methods
  storeSettings: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({
      id: 'settings-123',
      name: 'Destino SF',
      taxRate: { toNumber: () => 8.25 },
      minAdvanceHours: 2,
      minOrderAmount: { toNumber: () => 0 },
      maxDaysInAdvance: 7,
      isStoreOpen: true,
      cateringMinimumAmount: { toNumber: () => 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'new-settings-id',
      name: 'Destino SF',
      taxRate: { toNumber: () => 8.25 },
      createdAt: new Date(),
      updatedAt: new Date(),
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
      minimumOrderAmount: 50.0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findFirst: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 50.0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 75.0,
      isActive: true,
      updatedAt: new Date(),
    }),
    upsert: jest.fn().mockResolvedValue({
      id: 'config-1',
      minimumOrderAmount: 50.0,
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
      price: { toNumber: () => 25.0 },
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

  // Catering models
  cateringPackage: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'catering-package-123',
      name: 'Basic Package',
      description: 'Basic catering package',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  cateringItem: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'catering-item-123',
      name: 'Catering Item',
      description: 'Catering item description',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  cateringOrder: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'catering-order-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      status: 'PENDING',
      totalAmount: { toNumber: () => 150.0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  cateringOrderItem: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'catering-order-item-123',
      cateringOrderId: 'catering-order-123',
      cateringItemId: 'catering-item-123',
      quantity: 1,
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

  // Additional models for completeness
  subscriber: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'subscriber-123',
      email: 'subscriber@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  promoCode: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'promo-123',
      code: 'TESTCODE',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },

  refund: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'refund-123',
      squareRefundId: 'square-refund-123',
      paymentId: 'payment-123',
      amount: { toNumber: () => 25.0 },
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
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
