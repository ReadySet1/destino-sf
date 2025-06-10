// Comprehensive database mocking for business logic tests
import { DeliveryZone } from '@/lib/deliveryUtils';

export interface MockPrismaClient {
  shippingConfiguration: {
    findFirst: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    upsert: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
  order: {
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
  product: {
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
  };
  $disconnect: jest.MockedFunction<any>;
}

// Mock data for tests
export const mockShippingConfigurations = {
  alfajores: {
    productName: 'alfajores',
    baseWeightLb: 0.5,
    weightPerUnitLb: 0.4,
    isActive: true,
    applicableForNationwideOnly: true,
  },
  empanadas: {
    productName: 'empanadas',
    baseWeightLb: 1.0,
    weightPerUnitLb: 0.8,
    isActive: true,
    applicableForNationwideOnly: true,
  },
};

export const mockCartItems = [
  {
    id: 'test-alfajor-1',
    name: 'Traditional Alfajores (6-pack)',
    quantity: 2,
    variantId: 'alfajor-traditional-6',
  },
  {
    id: 'test-empanada-1',
    name: 'Beef Empanadas (4-pack)',
    quantity: 1,
    variantId: 'empanada-beef-4',
  },
];

export const mockAddresses = {
  nearby: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'US',
  },
  distant: {
    street: '456 Oak Ave',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    country: 'US',
  },
  unsupported: {
    street: '789 Pine Rd',
    city: 'Sacramento',
    state: 'CA',
    zipCode: '95814',
    country: 'US',
  },
};

export const mockOrders = [
  {
    id: 'order-1',
    subtotal: 100.00,
    tax: 8.25,
    total: 108.25,
    status: 'pending',
    deliveryMethod: 'local_delivery',
    deliveryZone: DeliveryZone.NEARBY,
  },
  {
    id: 'order-2',
    subtotal: 75.00,
    tax: 6.19,
    total: 81.19,
    status: 'completed',
    deliveryMethod: 'nationwide_shipping',
  },
];

// Create mock Prisma client factory
export function createMockPrismaClient(): MockPrismaClient {
  return {
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
  };
}

// Setup mock responses
export function setupShippingConfigMocks(mockPrisma: MockPrismaClient) {
  // Mock successful shipping config retrieval
  mockPrisma.shippingConfiguration.findFirst.mockImplementation(({ where }) => {
    const productName = where?.productName;
    return Promise.resolve(mockShippingConfigurations[productName as keyof typeof mockShippingConfigurations] || null);
  });

  // Mock get all configurations
  mockPrisma.shippingConfiguration.findMany.mockResolvedValue(
    Object.values(mockShippingConfigurations)
  );

  // Mock upsert operations
  mockPrisma.shippingConfiguration.upsert.mockImplementation(({ where, create, update }) => {
    const productName = where.productName;
    return Promise.resolve({
      productName,
      ...create,
      ...update,
    });
  });
}

export function setupOrderMocks(mockPrisma: MockPrismaClient) {
  mockPrisma.order.findMany.mockResolvedValue(mockOrders);
  mockPrisma.order.findFirst.mockImplementation(({ where }) => {
    return Promise.resolve(mockOrders.find(order => order.id === where?.id) || null);
  });
  
  mockPrisma.order.create.mockImplementation(({ data }) => {
    const newOrder = {
      id: `order-${Date.now()}`,
      ...data,
    };
    return Promise.resolve(newOrder);
  });
}

// Utility to reset all mocks
export function resetAllMocks(mockPrisma: MockPrismaClient) {
  Object.values(mockPrisma).forEach(mockTable => {
    if (typeof mockTable === 'object') {
      Object.values(mockTable).forEach(mockMethod => {
        if (jest.isMockFunction(mockMethod)) {
          mockMethod.mockReset();
        }
      });
    }
  });
}
