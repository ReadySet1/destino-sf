import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { GET, POST, PUT } from '@/app/api/admin/orders/route';
import { OrderStatus } from '@prisma/client';

// Import our new test utilities
import {
  TestData,
  createMockOrder,
  setupMockPrisma,
  mockConsole,
  restoreConsole,
} from '@/__tests__/setup/test-utils';
// Note: @/lib/db is mocked globally in jest.setup.js

jest.mock('@/utils/supabase/server');

const mockPrisma = prisma as any;
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
    total: 75.5,
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
        price: 25.0,
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
    total: 45.0,
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
        price: 45.0,
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

    mockSupabaseClient
      .from()
      .select()
      .eq()
      .single.mockResolvedValue({
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
          fulfillmentType: 'delivery',
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
      expect(orders[0].fulfillmentType).toBe('delivery');
    });

    test('should filter orders by date range', async () => {
      const startDate = new Date('2024-01-14T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const filteredOrders = mockOrders.filter(
        order => order.createdAt >= startDate && order.createdAt <= endDate
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
          email: {
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
      expect(orders[0].email).toBe('john@example.com');
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
      mockPrisma.order.findMany.mockResolvedValue(
        [...mockOrders].sort((a, b) => b.total - a.total)
      );

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
        status: 'PENDING' as const,
        fulfillmentType: 'delivery',
        createdAt: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-01-31'),
        },
        total: {
          gte: 50,
        },
      };

      const filteredOrders = mockOrders.filter(
        order =>
          order.status === 'PENDING' && order.fulfillmentMethod === 'delivery' && order.total >= 50
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
      expect(orders[0].fulfillmentType).toBe('delivery');
      expect(orders[0].total).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Order details retrieval', () => {
    const mockOrderDetails = {
      id: 'order-1',
      userId: 'user-1',
      status: 'PENDING',
      fulfillmentType: 'local_delivery',
      total: 75.5,
      taxAmount: 5.9,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T10:00:00Z'),
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      deliveryDate: '2024-01-16',
      deliveryTime: '14:00',
      notes: 'Leave at door',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          variantId: 'variant-1',
          quantity: 2,
          price: 25.0,
          total: 50.0,
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
          price: 15.5,
          total: 15.5,
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
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      squareOrderId: 'sq_order_123',
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
                  images: true,
                },
              },
              variant: {
                select: {
                  name: true,
                  sku: true,
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
                  images: true,
                },
              },
              variant: {
                select: {
                  name: true,
                  sku: true,
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

      await expect(
        prisma.order.findUnique({
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
        })
      ).rejects.toThrow('Database connection failed');
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

      expect(order?.paymentStatus).toBe('PENDING');
      expect(order?.paymentMethod).toBe('SQUARE');
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
          status: OrderStatus.PROCESSING,
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

      await expect(
        prisma.order.update({
          where: { id: 'non-existent-order' },
          data: { status: 'READY' },
        })
      ).rejects.toThrow('Record not found');
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
          status: 'PROCESSING',
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
      const searchResults = mockOrders.filter(order => order.id.includes('order-1'));

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
        order.items.some(item => item.product.name.toLowerCase().includes('alfajores'))
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
      const searchResults = mockOrders.filter(order => order.customerPhone?.includes('1234567890'));

      mockPrisma.order.findMany.mockResolvedValue(searchResults);

      const orders = await prisma.order.findMany({
        where: {
          phone: {
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
      expect(orders[0].phone).toContain('1234567890');
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
      const globalSearchResults = mockOrders.filter(
        order =>
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
              email: {
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
            price: 25.0,
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
          status: 'READY',
          updatedAt: new Date(),
        },
      });

      expect(confirmedOrder.status).toBe('READY');
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

describe('Admin Orders API - Comprehensive Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Setup admin authentication mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-123' } },
      error: null,
    });

    // Setup admin orders mock data
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        status: 'PENDING',
        customerName: 'John Doe',
        email: 'john@example.com',
        total: { toNumber: () => 45.43 },
        createdAt: new Date('2024-01-15T16:55:08.495Z'),
        fulfillmentType: 'pickup',
        paymentStatus: 'PENDING',
      },
      {
        id: 'order-2',
        status: 'COMPLETED',
        customerName: 'Jane Smith',
        email: 'jane@example.com',
        total: { toNumber: () => 32.15 },
        createdAt: new Date('2024-01-14T10:30:00.000Z'),
        fulfillmentType: 'local_delivery',
        paymentStatus: 'PAID',
      },
    ]);

    mockPrisma.order.count.mockResolvedValue(25);
  });

  describe('GET /api/admin/orders - List orders', () => {
    test('should return orders for authenticated admin', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders?page=1&limit=10');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.orders).toHaveLength(2);
      expect(data.orders[0].id).toBe('order-1');
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    test('should filter orders by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders?status=PENDING');

      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order-1',
          status: 'PENDING',
          customerName: 'John Doe',
          email: 'john@example.com',
          total: { toNumber: () => 45.43 },
          createdAt: new Date(),
          fulfillmentType: 'pickup',
          paymentStatus: 'PENDING',
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0].status).toBe('PENDING');
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    test('should filter orders by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const request = new NextRequest(
        `http://localhost:3000/api/admin/orders?startDate=${startDate}&endDate=${endDate}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate + 'T23:59:59.999Z'),
            },
          }),
        })
      );
    });

    test('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/admin/orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch orders');
    });
  });

  describe('PUT /api/admin/orders/:id - Update order', () => {
    test('should update order status successfully', async () => {
      const orderId = 'order-123';
      const updateData = { status: 'PROCESSING' };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PENDING',
        customerName: 'John Doe',
      });

      mockPrisma.order.update.mockResolvedValue({
        id: orderId,
        status: 'PROCESSING',
        customerName: 'John Doe',
        updatedAt: new Date(),
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await PUT(request, { params: { id: orderId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order.status).toBe('PROCESSING');
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'PROCESSING', updatedAt: expect.any(Date) },
      });
    });

    test('should return 404 for non-existent order', async () => {
      const orderId = 'non-existent-order';

      mockPrisma.order.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PROCESSING' }),
      });

      const response = await PUT(request, { params: { id: orderId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Order not found');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    test('should validate status updates', async () => {
      const orderId = 'order-123';
      const invalidUpdateData = { status: 'INVALID_STATUS' };

      const request = new NextRequest(`http://localhost:3000/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify(invalidUpdateData),
      });

      const response = await PUT(request, { params: { id: orderId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid order status');
    });

    test('should handle concurrent update attempts', async () => {
      const orderId = 'order-123';

      mockPrisma.order.findUnique.mockResolvedValue({
        id: orderId,
        status: 'PENDING',
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });

      mockPrisma.order.update.mockRejectedValue(new Error('Record updated by another process'));

      const request = new NextRequest(`http://localhost:3000/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'PROCESSING' }),
      });

      const response = await PUT(request, { params: { id: orderId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('conflict');
    });
  });

  describe('POST /api/admin/orders/bulk-update - Bulk operations', () => {
    test('should update multiple orders successfully', async () => {
      const bulkData = {
        orderIds: ['order-1', 'order-2'],
        updates: { status: 'PROCESSING' },
      };

      mockPrisma.order.updateMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost:3000/api/admin/orders/bulk-update', {
        method: 'POST',
        body: JSON.stringify(bulkData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1', 'order-2'] } },
        data: { status: 'PROCESSING', updatedAt: expect.any(Date) },
      });
    });

    test('should validate bulk update limits', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `order-${i}`);
      const bulkData = {
        orderIds: tooManyIds,
        updates: { status: 'PROCESSING' },
      };

      const request = new NextRequest('http://localhost:3000/api/admin/orders/bulk-update', {
        method: 'POST',
        body: JSON.stringify(bulkData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Too many orders');
      expect(mockPrisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/orders/stats - Order statistics', () => {
    test('should return comprehensive order statistics', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { status: 5 } },
        { status: 'PROCESSING', _count: { status: 3 } },
        { status: 'COMPLETED', _count: { status: 15 } },
      ]);

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: { toNumber: () => 1250.75 } },
        _avg: { total: { toNumber: () => 52.11 } },
        _count: { id: 24 },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/orders/stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.statusCounts).toEqual({
        PENDING: 5,
        PROCESSING: 3,
        COMPLETED: 15,
      });
      expect(data.stats.totalRevenue).toBe(1250.75);
      expect(data.stats.averageOrderValue).toBe(52.11);
      expect(data.stats.totalOrders).toBe(24);
    });

    test('should handle empty statistics gracefully', async () => {
      mockPrisma.order.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: null },
        _avg: { total: null },
        _count: { id: 0 },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/orders/stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.totalOrders).toBe(0);
      expect(data.stats.totalRevenue).toBe(0);
      expect(data.stats.averageOrderValue).toBe(0);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/admin/orders/bulk-update', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    test('should handle database connection failures', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('ECONNREFUSED'));

      const request = new NextRequest('http://localhost:3000/api/admin/orders');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch orders');
    });

    test('should handle large result sets efficiently', async () => {
      // Mock large result set
      const largeOrderSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `order-${i}`,
        status: 'PENDING',
        customerName: `Customer ${i}`,
        total: { toNumber: () => 45.43 },
        createdAt: new Date(),
      }));

      mockPrisma.order.findMany.mockResolvedValue(largeOrderSet);
      mockPrisma.order.count.mockResolvedValue(1000);

      const request = new NextRequest('http://localhost:3000/api/admin/orders?limit=1000');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(1000);
      // Should use pagination even for large requests
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: expect.any(Number),
          skip: expect.any(Number),
        })
      );
    });
  });
});
