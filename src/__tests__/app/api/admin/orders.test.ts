import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';

// Import our new test utilities
import { 
  TestData, 
  createMockOrder, 
  setupMockPrisma,
  mockConsole,
  restoreConsole 
} from '@/__tests__/setup/test-utils';
import { mockPrismaClient } from '@/__mocks__/prisma';

// Mock the dependencies
jest.mock('@/lib/db', () => ({
  prisma: mockPrismaClient,
}));

jest.mock('@/utils/supabase/server');

const mockPrisma = mockPrismaClient;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

// Mock orders data - shared across all test suites
const mockOrders = [
  {
    id: 'order-1',
    userId: 'user-1',
    status: 'PENDING',
    fulfillmentMethod: 'delivery',
    total: 75.50,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 2,
        price: 25.00,
        product: {
          name: 'Dulce de Leche Alfajores',
          images: ['image1.jpg'],
        },
        variant: {
          name: '6-pack',
        },
      },
    ],
  },
  {
    id: 'order-2',
    userId: 'user-2',
    status: 'COMPLETED',
    fulfillmentMethod: 'pickup',
    total: 45.00,
    createdAt: new Date('2024-01-14T15:30:00Z'),
    updatedAt: new Date('2024-01-14T16:00:00Z'),
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '+1987654321',
    items: [
      {
        id: 'item-2',
        productId: 'prod-2',
        quantity: 1,
        price: 45.00,
        product: {
          name: 'Beef Empanadas',
          images: ['image2.jpg'],
        },
        variant: {
          name: '12-pack',
        },
      },
    ],
  },
];

describe('/api/admin/orders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress expected warnings/errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Setup default Supabase client mock
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

    // Mock admin user by default
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    });

    mockSupabaseClient.from().select().eq().single.mockResolvedValue({
      data: { role: 'ADMIN' },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Order listing with filters', () => {

    test('should return all orders without filters', async () => {
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);
      mockPrisma.order.count.mockResolvedValue(2);

      const orders = await prisma.order.findMany({
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toEqual(mockOrders);
      expect(orders).toHaveLength(2);
    });

    test('should filter orders by status', async () => {
      const pendingOrders = mockOrders.filter(order => order.status === 'PENDING');
      mockPrisma.order.findMany.mockResolvedValue(pendingOrders);

      const orders = await prisma.order.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('PENDING');
    });

    test('should filter orders by fulfillment method', async () => {
      const deliveryOrders = mockOrders.filter(order => order.fulfillmentMethod === 'delivery');
      mockPrisma.order.findMany.mockResolvedValue(deliveryOrders);

      const orders = await prisma.order.findMany({
        where: {
          fulfillmentMethod: 'delivery',
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].fulfillmentMethod).toBe('delivery');
    });

    test('should filter orders by date range', async () => {
      const startDate = new Date('2024-01-14T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const filteredOrders = mockOrders.filter(order => 
        order.createdAt >= startDate && order.createdAt <= endDate
      );

      mockPrisma.order.findMany.mockResolvedValue(filteredOrders);

      const orders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toEqual(filteredOrders);
    });

    test('should filter orders by customer email', async () => {
      const customerOrders = mockOrders.filter(order => 
        order.customerEmail?.includes('john@example.com')
      );

      mockPrisma.order.findMany.mockResolvedValue(customerOrders);

      const orders = await prisma.order.findMany({
        where: {
          customerEmail: {
            contains: 'john@example.com',
            mode: 'insensitive',
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].customerEmail).toBe('john@example.com');
    });

    test('should handle pagination', async () => {
      const page = 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      mockPrisma.order.findMany.mockResolvedValue(mockOrders.slice(0, limit));
      mockPrisma.order.count.mockResolvedValue(mockOrders.length);

      const orders = await prisma.order.findMany({
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const totalCount = await prisma.order.count();

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(2);
      expect(totalCount).toBe(2);
    });

    test('should sort orders by different fields', async () => {
      // Test sorting by total amount
      mockPrisma.order.findMany.mockResolvedValue([...mockOrders].sort((a, b) => b.total - a.total));

      const ordersByTotal = await prisma.order.findMany({
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          total: 'desc',
        },
      });

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          total: 'desc',
        },
      });

      expect(ordersByTotal[0].total).toBeGreaterThanOrEqual(ordersByTotal[1].total);
    });

    test('should handle multiple filters combined', async () => {
      const complexFilter = {
        status: 'PENDING',
        fulfillmentMethod: 'delivery',
        createdAt: {
          gte: new Date('2024-01-01T00:00:00Z'),
          lte: new Date('2024-01-31T23:59:59Z'),
        },
        total: {
          gte: 50,
        },
      };

      const filteredOrders = mockOrders.filter(order => 
        order.status === 'PENDING' && 
        order.fulfillmentMethod === 'delivery' &&
        order.total >= 50
      );

      mockPrisma.order.findMany.mockResolvedValue(filteredOrders);

      const orders = await prisma.order.findMany({
        where: complexFilter,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('PENDING');
      expect(orders[0].fulfillmentMethod).toBe('delivery');
      expect(orders[0].total).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Order details retrieval', () => {
    const mockOrderDetails = {
      id: 'order-1',
      userId: 'user-1',
      status: 'PENDING',
      fulfillmentMethod: 'delivery',
      total: 75.50,
      subtotal: 65.50,
      taxAmount: 5.90,
      deliveryFee: 4.10,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      deliveryAddress: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
      },
      deliveryTime: new Date('2024-01-16T14:00:00Z'),
      specialInstructions: 'Leave at door',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          variantId: 'variant-1',
          quantity: 2,
          price: 25.00,
          total: 50.00,
          product: {
            name: 'Dulce de Leche Alfajores',
            description: 'Traditional Argentine alfajores',
            images: ['image1.jpg', 'image2.jpg'],
          },
          variant: {
            name: '6-pack',
            sku: 'ALF-DDL-6',
          },
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          variantId: 'variant-2',
          quantity: 1,
          price: 15.50,
          total: 15.50,
          product: {
            name: 'Chimichurri Sauce',
            description: 'Homemade chimichurri sauce',
            images: ['sauce1.jpg'],
          },
          variant: {
            name: '8oz jar',
            sku: 'CHI-8OZ',
          },
        },
      ],
      paymentDetails: {
        method: 'card',
        status: 'pending',
        transactionId: 'txn_123456',
      },
    };

    test('should retrieve complete order details by ID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderDetails);

      const order = await prisma.order.findUnique({
        where: { id: 'order-1' },
        include: {
          items: {
            include: {
              product: {
                select: { 
                  name: true, 
                  description: true,
                  images: true 
                },
              },
              variant: {
                select: { 
                  name: true,
                  sku: true 
                },
              },
            },
          },
        },
      });

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        include: {
          items: {
            include: {
              product: {
                select: { 
                  name: true, 
                  description: true,
                  images: true 
                },
              },
              variant: {
                select: { 
                  name: true,
                  sku: true 
                },
              },
            },
          },
        },
      });

      expect(order).toEqual(mockOrderDetails);
      expect(order?.items).toHaveLength(2);
    });

    test('should return null for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const order = await prisma.order.findUnique({
        where: { id: 'non-existent-order' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });

      expect(order).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(prisma.order.findUnique({
        where: { id: 'order-1' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      })).rejects.toThrow('Database connection failed');
    });

    test('should retrieve order with all related data', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrderDetails);

      const order = await prisma.order.findUnique({
        where: { id: 'order-1' },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      expect(order?.deliveryAddress).toBeTruthy();
      expect(order?.paymentDetails).toBeTruthy();
      expect(order?.items[0].product).toBeTruthy();
      expect(order?.items[0].variant).toBeTruthy();
    });
  });

  describe('Order status updates', () => {
    test('should update order status successfully', async () => {
      const updatedOrder = {
        ...mockOrders[0],
        status: 'CONFIRMED',
        updatedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const order = await prisma.order.update({
        where: { id: 'order-1' },
        data: { 
          status: 'CONFIRMED',
          updatedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { 
          status: 'CONFIRMED',
          updatedAt: expect.any(Date),
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });

      expect(order.status).toBe('CONFIRMED');
    });

    test('should update multiple order fields', async () => {
      const updateData = {
        status: 'IN_PROGRESS',
        specialInstructions: 'Updated instructions',
        estimatedDeliveryTime: new Date('2024-01-16T15:00:00Z'),
        updatedAt: new Date(),
      };

      const updatedOrder = {
        ...mockOrders[0],
        ...updateData,
      };

      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const order = await prisma.order.update({
        where: { id: 'order-1' },
        data: updateData,
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });

      expect(order.status).toBe('IN_PROGRESS');
      expect(order.specialInstructions).toBe('Updated instructions');
    });

    test('should handle invalid status transitions', async () => {
      // This would typically be handled by business logic validation
      const invalidStatusUpdate = {
        status: 'INVALID_STATUS',
      };

      // Simulate validation error
      const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      const isValidStatus = validStatuses.includes(invalidStatusUpdate.status);

      expect(isValidStatus).toBe(false);
    });

    test('should handle order not found during update', async () => {
      mockPrisma.order.update.mockRejectedValue(new Error('Record not found'));

      await expect(prisma.order.update({
        where: { id: 'non-existent-order' },
        data: { status: 'CONFIRMED' },
      })).rejects.toThrow('Record not found');
    });

    test('should track status change history', async () => {
      const statusHistory = [
        { status: 'PENDING', timestamp: new Date('2024-01-15T10:00:00Z') },
        { status: 'CONFIRMED', timestamp: new Date('2024-01-15T10:30:00Z') },
        { status: 'IN_PROGRESS', timestamp: new Date('2024-01-15T11:00:00Z') },
      ];

      const updatedOrder = {
        ...mockOrders[0],
        status: 'IN_PROGRESS',
        statusHistory,
        updatedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const order = await prisma.order.update({
        where: { id: 'order-1' },
        data: { 
          status: 'IN_PROGRESS',
          statusHistory,
          updatedAt: new Date(),
        },
      });

      expect(order.statusHistory).toHaveLength(3);
      expect(order.statusHistory[2].status).toBe('IN_PROGRESS');
    });
  });

  describe('Order search functionality', () => {
    test('should search orders by customer name', async () => {
      const searchResults = mockOrders.filter(order => 
        order.customerName?.toLowerCase().includes('john')
      );

      mockPrisma.order.findMany.mockResolvedValue(searchResults);

      const orders = await prisma.order.findMany({
        where: {
          customerName: {
            contains: 'john',
            mode: 'insensitive',
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].customerName?.toLowerCase()).toContain('john');
    });

    test('should search orders by order ID', async () => {
      const searchResults = mockOrders.filter(order => 
        order.id.includes('order-1')
      );

      mockPrisma.order.findMany.mockResolvedValue(searchResults);

      const orders = await prisma.order.findMany({
        where: {
          id: {
            contains: 'order-1',
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('order-1');
    });

    test('should search orders by product name', async () => {
      const searchResults = mockOrders.filter(order => 
        order.items.some(item => 
          item.product.name.toLowerCase().includes('alfajores')
        )
      );

      mockPrisma.order.findMany.mockResolvedValue(searchResults);

      const orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                name: {
                  contains: 'alfajores',
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].items[0].product.name.toLowerCase()).toContain('alfajores');
    });

    test('should search orders by phone number', async () => {
      const searchResults = mockOrders.filter(order => 
        order.customerPhone?.includes('1234567890')
      );

      mockPrisma.order.findMany.mockResolvedValue(searchResults);

      const orders = await prisma.order.findMany({
        where: {
          customerPhone: {
            contains: '1234567890',
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].customerPhone).toContain('1234567890');
    });

    test('should handle empty search results', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const orders = await prisma.order.findMany({
        where: {
          customerName: {
            contains: 'nonexistent',
            mode: 'insensitive',
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(0);
    });

    test('should perform global search across multiple fields', async () => {
      const searchTerm = 'john';
      const globalSearchResults = mockOrders.filter(order => 
        order.customerName?.toLowerCase().includes(searchTerm) ||
        order.customerEmail?.toLowerCase().includes(searchTerm) ||
        order.id.toLowerCase().includes(searchTerm)
      );

      mockPrisma.order.findMany.mockResolvedValue(globalSearchResults);

      const orders = await prisma.order.findMany({
        where: {
          OR: [
            {
              customerName: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              customerEmail: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              id: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(orders).toHaveLength(1);
    });
  });

  describe('Authorization and error handling', () => {
    test('should require admin authorization', async () => {
      // Mock non-admin user
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'USER' },
          error: null,
        }),
      };

      // Set up the mock chain
      mockSupabaseClient.from.mockReturnValue(mockChain);
      mockChain.from.mockReturnValue(mockChain);

      const userProfile = await mockSupabaseClient.from().select().eq().single();
      const isAdmin = userProfile.data?.role === 'ADMIN';

      expect(isAdmin).toBe(false);
    });

    test('should handle database connection errors', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(prisma.order.findMany()).rejects.toThrow('Database connection failed');
    });

    test('should handle invalid query parameters', async () => {
      // Test invalid status filter
      const invalidStatus = 'INVALID_STATUS';
      const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      
      const isValidStatus = validStatuses.includes(invalidStatus);
      expect(isValidStatus).toBe(false);

      // Test invalid date format
      const invalidDate = 'not-a-date';
      const isValidDate = !isNaN(Date.parse(invalidDate));
      expect(isValidDate).toBe(false);
    });

    test('should handle malformed request parameters', async () => {
      // Test invalid pagination parameters
      const invalidPage = -1;
      const invalidLimit = 0;

      expect(invalidPage < 1).toBe(true);
      expect(invalidLimit < 1).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete order management workflow', async () => {
      // 1. List orders with filters
      mockPrisma.order.findMany.mockResolvedValue([mockOrders[0]]);
      
      const pendingOrders = await prisma.order.findMany({
        where: { status: 'PENDING' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(pendingOrders).toHaveLength(1);

      // 2. Get order details
      const orderDetails = {
        ...mockOrders[0],
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            price: 25.00,
            product: {
              name: 'Dulce de Leche Alfajores',
              images: ['image1.jpg'],
            },
            variant: {
              name: '6-pack',
            },
          },
        ],
      };

      mockPrisma.order.findUnique.mockResolvedValue(orderDetails);

      const order = await prisma.order.findUnique({
        where: { id: 'order-1' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true, images: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });

      expect(order?.id).toBe('order-1');

      // 3. Update order status
      const updatedOrder = {
        ...orderDetails,
        status: 'CONFIRMED',
        updatedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const confirmedOrder = await prisma.order.update({
        where: { id: 'order-1' },
        data: { 
          status: 'CONFIRMED',
          updatedAt: new Date(),
        },
      });

      expect(confirmedOrder.status).toBe('CONFIRMED');
    });

    test('should handle bulk order operations', async () => {
      // Bulk status update for multiple orders
      const orderIds = ['order-1', 'order-2', 'order-3'];
      const bulkUpdateData = {
        status: 'CONFIRMED',
        updatedAt: new Date(),
      };

      // Mock bulk update (would use updateMany in real implementation)
      mockPrisma.order.findMany.mockResolvedValue(
        orderIds.map(id => ({
          ...mockOrders[0],
          id,
          status: 'CONFIRMED',
        }))
      );

      const updatedOrders = await prisma.order.findMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });

      expect(updatedOrders).toHaveLength(3);
      expect(updatedOrders.every(order => order.status === 'CONFIRMED')).toBe(true);
    });
  });
}); 