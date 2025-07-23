// Comprehensive database mocking for business logic tests
import { DeliveryZone } from '@/lib/deliveryUtils';
import { jest } from '@jest/globals';

// Updated interface to match current Prisma client structure
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
    findUnique: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  orderItem: {
    create: jest.MockedFunction<any>;
    createMany: jest.MockedFunction<any>;
    deleteMany: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  product: {
    findMany: jest.MockedFunction<any>;
    findFirst: jest.MockedFunction<any>;
    findUnique: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  category: {
    findMany: jest.MockedFunction<any>;
    findUnique: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  profile: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  user: {
    findUnique: jest.MockedFunction<any>;
    findMany: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  $connect: jest.MockedFunction<any>;
  $disconnect: jest.MockedFunction<any>;
  $transaction: jest.MockedFunction<any>;
  $executeRaw: jest.MockedFunction<any>;
  $queryRaw: jest.MockedFunction<any>;
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
    subtotal: 100.0,
    tax: 8.25,
    total: 108.25,
    status: 'pending',
    deliveryMethod: 'local_delivery',
    deliveryZone: DeliveryZone.NEARBY,
  },
  {
    id: 'order-2',
    subtotal: 75.0,
    tax: 6.19,
    total: 81.19,
    status: 'completed',
    deliveryMethod: 'nationwide_shipping',
  },
];

// Create mock Prisma client factory with proper Jest mock functions
export function createMockPrismaClient(): MockPrismaClient {
  const mockPrisma: MockPrismaClient = {
    shippingConfiguration: {
      findFirst: jest.fn() as jest.MockedFunction<any>,
      findMany: jest.fn() as jest.MockedFunction<any>,
      upsert: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
    },
    order: {
      findMany: jest.fn() as jest.MockedFunction<any>,
      findFirst: jest.fn() as jest.MockedFunction<any>,
      findUnique: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    orderItem: {
      create: jest.fn() as jest.MockedFunction<any>,
      createMany: jest.fn() as jest.MockedFunction<any>,
      deleteMany: jest.fn() as jest.MockedFunction<any>,
      findMany: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    product: {
      findMany: jest.fn() as jest.MockedFunction<any>,
      findFirst: jest.fn() as jest.MockedFunction<any>,
      findUnique: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    category: {
      findMany: jest.fn() as jest.MockedFunction<any>,
      findUnique: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    profile: {
      findUnique: jest.fn() as jest.MockedFunction<any>,
      findMany: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    user: {
      findUnique: jest.fn() as jest.MockedFunction<any>,
      findMany: jest.fn() as jest.MockedFunction<any>,
      create: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      delete: jest.fn() as jest.MockedFunction<any>,
    },
    $connect: jest.fn() as jest.MockedFunction<any>,
    $disconnect: jest.fn() as jest.MockedFunction<any>,
    $transaction: jest.fn((callback: any): any => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.resolve();
    }) as jest.MockedFunction<any>,
    $executeRaw: jest.fn() as jest.MockedFunction<any>,
    $queryRaw: jest.fn() as jest.MockedFunction<any>,
  };

  return mockPrisma;
}

// Setup mock responses
export function setupShippingConfigMocks(mockPrisma: MockPrismaClient) {
  // Mock successful shipping config retrieval
  mockPrisma.shippingConfiguration.findFirst.mockImplementation(({ where }: any) => {
    const productName = where?.productName;
    return Promise.resolve(
      mockShippingConfigurations[productName as keyof typeof mockShippingConfigurations] || null
    );
  });

  // Mock get all configurations
  mockPrisma.shippingConfiguration.findMany.mockResolvedValue(
    Object.values(mockShippingConfigurations)
  );

  // Mock upsert operations
  mockPrisma.shippingConfiguration.upsert.mockImplementation(({ where, create, update }: any) => {
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
  mockPrisma.order.findFirst.mockImplementation(({ where }: any) => {
    return Promise.resolve(mockOrders.find(order => order.id === where?.id) || null);
  });
  mockPrisma.order.findUnique.mockImplementation(({ where }: any) => {
    return Promise.resolve(mockOrders.find(order => order.id === where?.id) || null);
  });

  mockPrisma.order.create.mockImplementation(({ data }: any) => {
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
    } else if (jest.isMockFunction(mockTable)) {
      mockTable.mockReset();
    }
  });
}
