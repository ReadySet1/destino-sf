import { NextRequest } from 'next/server';
import { createMockRequest } from '@/utils/test-helpers';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';

// Mock all external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    spotlightPick: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    storeSettings: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    cateringDeliveryZone: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    businessHours: {
      upsert: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/shippingUtils', () => ({
  updateShippingConfiguration: jest.fn(),
  getAllShippingConfigurations: jest.fn(),
}));

jest.mock('@/scripts/init-supabase-storage', () => ({
  initializeStorage: jest.fn(),
}));

jest.mock('@/lib/storage/supabase-storage', () => ({
  uploadCateringImage: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Import the API route handlers
import {
  GET as getOrders,
  PUT as updateOrder,
  POST as postOrders,
} from '@/app/api/admin/orders/route';
import {
  GET as getSpotlightPicks,
  POST as postSpotlightPicks,
  DELETE as deleteSpotlightPick,
} from '@/app/api/admin/spotlight-picks/route';
import { GET as getSettings, POST as postSettings } from '@/app/api/admin/settings/route';
import {
  GET as getDeliveryZones,
  POST as postDeliveryZones,
  PUT as putDeliveryZones,
} from '@/app/api/admin/delivery-zones/route';
import {
  GET as getShippingConfig,
  POST as postShippingConfig,
} from '@/app/api/admin/shipping-configuration/route';
import { POST as postBusinessHours } from '@/app/api/admin/business-hours/route';
import { POST as postPromoteAdmin } from '@/app/api/admin/promote-admin/route';
import { GET as getValidateRoutes } from '@/app/api/admin/validate-routes/route';
import { POST as postInitStorage } from '@/app/api/admin/init-storage/route';
import { POST as postUploadImage } from '@/app/api/admin/upload-image/route';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Admin API Routes - Comprehensive Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default Supabase mock
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  // Helper function to mock admin authentication
  const mockAdminAuth = () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id', email: 'admin@test.com' } },
      error: null,
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: 'ADMIN' },
      error: null,
    });

    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'admin-user-id',
      email: 'admin@test.com',
      role: 'ADMIN',
      name: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  // Helper function to mock non-admin authentication
  const mockUserAuth = () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-id', email: 'user@test.com' } },
      error: null,
    });

    mockSupabase.single.mockResolvedValue({
      data: { role: 'USER' },
      error: null,
    });

    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@test.com',
      role: 'USER',
      name: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  // Helper function to mock unauthenticated state
  const mockNoAuth = () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    });
  };

  describe('Admin Orders API (/api/admin/orders)', () => {
    describe('GET - Fetch Orders', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should fetch orders with pagination and filtering', async () => {
        const mockOrders = [
          {
            id: 'order-1',
            status: 'PENDING',
            total: 50.0,
            email: 'customer@test.com',
            createdAt: new Date(),
            items: [
              {
                id: 'item-1',
                quantity: 2,
                price: 25.0,
                product: { name: 'Test Product', images: [] },
                variant: { name: 'Regular' },
              },
            ],
          },
        ];

        mockPrisma.order.findMany.mockResolvedValue(mockOrders);
        mockPrisma.order.count.mockResolvedValue(1);

        const request = createMockRequest(
          'GET',
          '/api/admin/orders?status=PENDING&page=1&limit=50'
        );
        const response = await getOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.orders).toEqual(mockOrders);
        expect(data.pagination).toEqual({
          page: 1,
          limit: 50,
          totalCount: 1,
          totalPages: 1,
        });

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'PENDING' },
            include: expect.any(Object),
            orderBy: { createdAt: 'desc' },
            skip: 0,
            take: 50,
          })
        );
      });

      it('should filter orders by email and date range', async () => {
        const mockOrders = [];
        mockPrisma.order.findMany.mockResolvedValue(mockOrders);
        mockPrisma.order.count.mockResolvedValue(0);

        const startDate = '2024-01-01';
        const endDate = '2024-01-31';
        const email = 'customer@test.com';

        const request = createMockRequest(
          'GET',
          `/api/admin/orders?email=${email}&startDate=${startDate}&endDate=${endDate}`
        );

        await getOrders(request);

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              email: { contains: email, mode: 'insensitive' },
              createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          })
        );
      });

      it('should require admin authentication', async () => {
        mockUserAuth();

        const request = createMockRequest('GET', '/api/admin/orders');
        const response = await getOrders(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
      });

      it('should handle unauthenticated requests', async () => {
        mockNoAuth();

        const request = createMockRequest('GET', '/api/admin/orders');
        const response = await getOrders(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('PUT - Update Order', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should update order status and notes', async () => {
        const mockOrder = {
          id: 'order-1',
          status: 'PENDING',
          notes: null,
        };

        const updatedOrder = {
          ...mockOrder,
          status: 'PROCESSING',
          notes: 'Updated by admin',
        };

        mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
        mockPrisma.order.update.mockResolvedValue(updatedOrder);

        const request = createMockRequest('PUT', '/api/admin/orders', {
          orderId: 'order-1',
          status: 'PROCESSING',
          notes: 'Updated by admin',
        });

        const response = await updateOrder(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.order).toEqual(updatedOrder);

        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 'order-1' },
          data: {
            status: 'PROCESSING',
            notes: 'Updated by admin',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should validate order ID requirement', async () => {
        const request = createMockRequest('PUT', '/api/admin/orders', {
          status: 'PROCESSING',
        });

        const response = await updateOrder(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Order ID is required');
      });

      it('should handle order not found', async () => {
        mockPrisma.order.findUnique.mockResolvedValue(null);

        const request = createMockRequest('PUT', '/api/admin/orders', {
          orderId: 'non-existent-order',
          status: 'PROCESSING',
        });

        const response = await updateOrder(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Order not found');
      });

      it('should validate order status values', async () => {
        mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1' });

        const request = createMockRequest('PUT', '/api/admin/orders', {
          orderId: 'order-1',
          status: 'INVALID_STATUS',
        });

        const response = await updateOrder(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid order status');
      });
    });

    describe('POST - Bulk Operations and Stats', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should perform bulk order updates', async () => {
        mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

        const request = createMockRequest('POST', '/api/admin/orders', {
          action: 'bulk-update',
          orderIds: ['order-1', 'order-2', 'order-3'],
          status: 'SHIPPED',
        });

        const response = await postOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.updatedCount).toBe(3);

        expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
          where: { id: { in: ['order-1', 'order-2', 'order-3'] } },
          data: {
            status: 'SHIPPED',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should validate bulk update order limit', async () => {
        const tooManyOrderIds = Array.from({ length: 101 }, (_, i) => `order-${i}`);

        const request = createMockRequest('POST', '/api/admin/orders', {
          action: 'bulk-update',
          orderIds: tooManyOrderIds,
          status: 'SHIPPED',
        });

        const response = await postOrders(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Too many orders for bulk update (max 100)');
      });

      it('should return order statistics', async () => {
        const mockStatusCounts = [
          { status: 'PENDING', _count: { _all: 5 } },
          { status: 'PROCESSING', _count: { _all: 3 } },
          { status: 'SHIPPED', _count: { _all: 10 } },
        ];

        mockPrisma.order.groupBy.mockResolvedValue(mockStatusCounts);
        mockPrisma.order.count.mockResolvedValue(18);
        mockPrisma.order.aggregate.mockResolvedValue({
          _sum: { total: { toNumber: () => 1800 } },
        });

        const request = createMockRequest('POST', '/api/admin/orders', {
          action: 'stats',
        });

        const response = await postOrders(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.stats).toEqual({
          statusCounts: {
            PENDING: 5,
            PROCESSING: 3,
            SHIPPED: 10,
          },
          totalOrders: 18,
          totalRevenue: 1800,
          averageOrderValue: 100,
        });
      });

      it('should handle invalid action', async () => {
        const request = createMockRequest('POST', '/api/admin/orders', {
          action: 'invalid-action',
        });

        const response = await postOrders(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid action');
      });
    });
  });

  describe('Admin Spotlight Picks API (/api/admin/spotlight-picks)', () => {
    describe('GET - Fetch Spotlight Picks', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should fetch all spotlight picks with product data', async () => {
        const mockSpotlightPicks = [
          {
            id: 'spotlight-1',
            position: 1,
            productId: 'product-1',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: {
              id: 'product-1',
              name: 'Featured Product',
              description: 'A great product',
              images: ['image1.jpg'],
              price: BigInt(2500), // 25.00
              slug: 'featured-product',
              category: {
                name: 'Main Course',
                slug: 'main-course',
              },
            },
          },
        ];

        mockPrisma.spotlightPick.findMany.mockResolvedValue(mockSpotlightPicks);

        const request = createMockRequest('GET', '/api/admin/spotlight-picks');
        const response = await getSpotlightPicks(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].product.price).toBe(25); // Should be converted from BigInt
      });

      it('should require admin authentication', async () => {
        mockUserAuth();

        const request = createMockRequest('GET', '/api/admin/spotlight-picks');
        const response = await getSpotlightPicks(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('POST - Create/Update Spotlight Pick', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should create or update a spotlight pick', async () => {
        const mockSpotlightPick = {
          id: 'spotlight-1',
          position: 1,
          productId: 'product-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 'product-1',
            name: 'Featured Product',
            description: 'A great product',
            images: ['image1.jpg'],
            price: BigInt(2500),
            slug: 'featured-product',
            category: {
              name: 'Main Course',
              slug: 'main-course',
            },
          },
        };

        mockPrisma.spotlightPick.upsert.mockResolvedValue(mockSpotlightPick);

        const request = createMockRequest('POST', '/api/admin/spotlight-picks', {
          position: 1,
          productId: 'product-1',
          isActive: true,
        });

        const response = await postSpotlightPicks(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.position).toBe(1);
        expect(data.data.productId).toBe('product-1');

        expect(mockPrisma.spotlightPick.upsert).toHaveBeenCalledWith({
          where: { position: 1 },
          update: {
            productId: 'product-1',
            isActive: true,
          },
          create: {
            position: 1,
            productId: 'product-1',
            isActive: true,
          },
          include: expect.any(Object),
        });
      });

      it('should validate input data', async () => {
        const request = createMockRequest('POST', '/api/admin/spotlight-picks', {
          position: 5, // Invalid position (must be 1-4)
          productId: 'not-a-uuid',
          isActive: true,
        });

        const response = await postSpotlightPicks(request);

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE - Remove Spotlight Pick', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should delete a spotlight pick by position', async () => {
        mockPrisma.spotlightPick.delete.mockResolvedValue({
          id: 'spotlight-1',
          position: 1,
          productId: 'product-1',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request = createMockRequest('DELETE', '/api/admin/spotlight-picks?position=1');
        const response = await deleteSpotlightPick(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);

        expect(mockPrisma.spotlightPick.delete).toHaveBeenCalledWith({
          where: { position: 1 },
        });
      });

      it('should validate position parameter', async () => {
        const request = createMockRequest('DELETE', '/api/admin/spotlight-picks?position=invalid');
        const response = await deleteSpotlightPick(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Valid position (1-4) is required');
      });
    });
  });

  describe('Admin Settings API (/api/admin/settings)', () => {
    describe('GET - Fetch Settings', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should fetch store settings and delivery zones', async () => {
        const mockSettings = {
          id: 'settings-1',
          name: 'Destino SF',
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94101',
          phone: '(555) 123-4567',
          email: 'info@destino-sf.com',
          taxRate: BigInt(875), // 8.75%
          minAdvanceHours: 24,
          minOrderAmount: BigInt(2000), // $20.00
          cateringMinimumAmount: BigInt(10000), // $100.00
          maxDaysInAdvance: 30,
          isStoreOpen: true,
          temporaryClosureMsg: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockDeliveryZones = [
          {
            id: 'zone-1',
            zone: 'ZONE_1',
            name: 'Downtown',
            description: 'Downtown San Francisco',
            minimumAmount: BigInt(5000), // $50.00
            deliveryFee: BigInt(500), // $5.00
            estimatedDeliveryTime: '30-45 minutes',
            active: true,
            postalCodes: ['94101', '94102'],
            cities: ['San Francisco'],
            displayOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockPrisma.storeSettings.findFirst.mockResolvedValue(mockSettings);
        mockPrisma.cateringDeliveryZone.findMany.mockResolvedValue(mockDeliveryZones);

        const request = createMockRequest('GET', '/api/admin/settings');
        const response = await getSettings(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.storeSettings.name).toBe('Destino SF');
        expect(data.storeSettings.taxRate).toBe(8.75); // Should be converted from BigInt
        expect(data.deliveryZones).toHaveLength(1);
        expect(data.deliveryZones[0].minimumAmount).toBe(50); // Should be converted from BigInt
      });

      it('should require admin authentication', async () => {
        mockUserAuth();

        const request = createMockRequest('GET', '/api/admin/settings');
        const response = await getSettings(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('POST - Update Settings', () => {
      beforeEach(() => {
        mockAdminAuth();
      });

      it('should update existing store settings', async () => {
        const existingSettings = {
          id: 'settings-1',
          name: 'Old Name',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const updatedSettings = {
          ...existingSettings,
          name: 'Destino SF',
          address: '123 Main St',
          taxRate: 8.75,
        };

        mockPrisma.storeSettings.findFirst.mockResolvedValue(existingSettings);
        mockPrisma.storeSettings.update.mockResolvedValue(updatedSettings);

        const request = createMockRequest('POST', '/api/admin/settings', {
          name: 'Destino SF',
          address: '123 Main St',
          taxRate: 8.75,
          minAdvanceHours: 24,
          minOrderAmount: 20,
          cateringMinimumAmount: 100,
          maxDaysInAdvance: 30,
          isStoreOpen: true,
        });

        const response = await postSettings(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Settings updated successfully');
        expect(data.settings.name).toBe('Destino SF');

        expect(mockPrisma.storeSettings.update).toHaveBeenCalledWith({
          where: { id: 'settings-1' },
          data: expect.objectContaining({
            name: 'Destino SF',
            address: '123 Main St',
            taxRate: 8.75,
          }),
        });
      });

      it('should create new settings if none exist', async () => {
        mockPrisma.storeSettings.findFirst.mockResolvedValue(null);
        mockPrisma.storeSettings.create.mockResolvedValue({
          id: 'new-settings',
          name: 'Destino SF',
          taxRate: 8.75,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const request = createMockRequest('POST', '/api/admin/settings', {
          name: 'Destino SF',
          taxRate: 8.75,
          minAdvanceHours: 24,
          minOrderAmount: 20,
          cateringMinimumAmount: 100,
          maxDaysInAdvance: 30,
          isStoreOpen: true,
        });

        const response = await postSettings(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockPrisma.storeSettings.create).toHaveBeenCalled();
      });

      it('should validate required fields', async () => {
        const request = createMockRequest('POST', '/api/admin/settings', {
          // Missing required name field
          taxRate: 8.75,
          minAdvanceHours: 24,
          minOrderAmount: 20,
          cateringMinimumAmount: 100,
          maxDaysInAdvance: 30,
          isStoreOpen: true,
        });

        const response = await postSettings(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Validation failed');
      });
    });
  });

  describe('Admin Delivery Zones API (/api/admin/delivery-zones)', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should fetch all delivery zones', async () => {
      const mockZones = [
        {
          id: 'zone-1',
          zone: 'ZONE_1',
          name: 'Downtown',
          description: 'Downtown area',
          minimumAmount: BigInt(5000),
          deliveryFee: BigInt(500),
          estimatedDeliveryTime: '30-45 minutes',
          active: true,
          postalCodes: ['94101'],
          cities: ['San Francisco'],
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.cateringDeliveryZone.findMany.mockResolvedValue(mockZones);

      const request = createMockRequest('GET', '/api/admin/delivery-zones');
      const response = await getDeliveryZones(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deliveryZones).toHaveLength(1);
      expect(data.deliveryZones[0].minimumAmount).toBe(50); // Converted from BigInt
    });

    it('should create a new delivery zone', async () => {
      const newZone = {
        id: 'zone-new',
        zone: 'ZONE_2',
        name: 'Mission District',
        description: 'Mission area',
        minimumAmount: BigInt(4000),
        deliveryFee: BigInt(600),
        estimatedDeliveryTime: '35-50 minutes',
        active: true,
        postalCodes: ['94110'],
        cities: ['San Francisco'],
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.cateringDeliveryZone.create.mockResolvedValue(newZone);

      const request = createMockRequest('POST', '/api/admin/delivery-zones', {
        zone: 'ZONE_2',
        name: 'Mission District',
        description: 'Mission area',
        minimumAmount: 40,
        deliveryFee: 6,
        estimatedDeliveryTime: '35-50 minutes',
        isActive: true,
        postalCodes: ['94110'],
        cities: ['San Francisco'],
        displayOrder: 2,
      });

      const response = await postDeliveryZones(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Delivery zone created successfully');
    });

    it('should bulk update delivery zones', async () => {
      const updatedZones = [
        {
          id: 'zone-1',
          zone: 'ZONE_1',
          name: 'Updated Downtown',
          minimumAmount: BigInt(5500),
          deliveryFee: BigInt(550),
        },
      ];

      mockPrisma.$transaction.mockResolvedValue(updatedZones);

      const request = createMockRequest('PUT', '/api/admin/delivery-zones', {
        zones: [
          {
            id: 'zone-1',
            zone: 'ZONE_1',
            name: 'Updated Downtown',
            description: 'Updated description',
            minimumAmount: 55,
            deliveryFee: 5.5,
            estimatedDeliveryTime: '30-45 minutes',
            isActive: true,
            postalCodes: ['94101'],
            cities: ['San Francisco'],
            displayOrder: 1,
          },
        ],
      });

      const response = await putDeliveryZones(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Delivery zones updated successfully');
    });
  });

  describe('Admin Business Hours API (/api/admin/business-hours)', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should update business hours', async () => {
      const mockBusinessHours = [
        {
          id: 'hours-1',
          day: 'MONDAY',
          openTime: '09:00',
          closeTime: '17:00',
          isClosed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.businessHours.upsert.mockResolvedValue(mockBusinessHours[0]);

      const request = createMockRequest('POST', '/api/admin/business-hours', {
        hours: [
          {
            day: 'MONDAY',
            openTime: '09:00',
            closeTime: '17:00',
            isClosed: false,
          },
          {
            day: 'SUNDAY',
            openTime: null,
            closeTime: null,
            isClosed: true,
          },
        ],
      });

      const response = await postBusinessHours(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Business hours updated successfully');
    });

    it('should validate business hours logic', async () => {
      const request = createMockRequest('POST', '/api/admin/business-hours', {
        hours: [
          {
            day: 'MONDAY',
            openTime: '17:00', // Open time after close time
            closeTime: '09:00',
            isClosed: false,
          },
        ],
      });

      const response = await postBusinessHours(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Opening time must be before closing time');
    });
  });

  describe('Admin User Promotion API (/api/admin/promote-admin)', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should promote user to admin with secret key', async () => {
      const updatedProfile = {
        id: 'user-id',
        email: 'user@test.com',
        role: 'ADMIN',
        name: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.profile.findUnique.mockResolvedValue({
        id: 'user-id',
        role: 'USER',
      });
      mockPrisma.profile.update.mockResolvedValue(updatedProfile);

      // Mock environment variable
      process.env.ADMIN_PROMOTION_SECRET = 'test-secret-key';

      const request = createMockRequest('POST', '/api/admin/promote-admin', {
        userId: 'user-id',
        email: 'user@test.com',
        secretKey: 'test-secret-key',
      });

      const response = await postPromoteAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User promoted to admin');
      expect(data.profile.role).toBe('ADMIN');

      expect(mockPrisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { role: 'ADMIN' },
      });
    });

    it('should create new admin profile if user does not exist', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);
      mockPrisma.profile.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@test.com',
        role: 'ADMIN',
        name: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      process.env.ADMIN_PROMOTION_SECRET = 'test-secret-key';

      const request = createMockRequest('POST', '/api/admin/promote-admin', {
        userId: 'new-user-id',
        email: 'newuser@test.com',
        secretKey: 'test-secret-key',
      });

      const response = await postPromoteAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User profile created with admin role');

      expect(mockPrisma.profile.create).toHaveBeenCalledWith({
        data: {
          id: 'new-user-id',
          email: 'newuser@test.com',
          role: 'ADMIN',
        },
      });
    });

    it('should reject invalid secret key', async () => {
      process.env.ADMIN_PROMOTION_SECRET = 'correct-secret';

      const request = createMockRequest('POST', '/api/admin/promote-admin', {
        userId: 'user-id',
        email: 'user@test.com',
        secretKey: 'wrong-secret',
      });

      const response = await postPromoteAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid secret key');
    });
  });

  describe('Admin Route Validation API (/api/admin/validate-routes)', () => {
    it('should return comprehensive route validation report', async () => {
      // Mock environment variables for validation
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'test-anon-key';

      // Mock fetch for route validation
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const request = createMockRequest('GET', '/api/admin/validate-routes');
      const response = await getValidateRoutes();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('routes');
      expect(data).toHaveProperty('criticalIssues');
      expect(data).toHaveProperty('productionReadiness');
      expect(data.summary).toHaveProperty('total');
      expect(data.summary).toHaveProperty('healthy');
      expect(data.summary).toHaveProperty('warnings');
      expect(data.summary).toHaveProperty('errors');
    });
  });

  describe('Admin Storage Initialization API (/api/admin/init-storage)', () => {
    it('should initialize Supabase storage', async () => {
      const { initializeStorage } = require('@/scripts/init-supabase-storage');
      initializeStorage.mockResolvedValue(undefined);

      const request = createMockRequest('POST', '/api/admin/init-storage');
      const response = await postInitStorage(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Storage initialized successfully');
      expect(initializeStorage).toHaveBeenCalled();
    });

    it('should handle storage initialization errors', async () => {
      const { initializeStorage } = require('@/scripts/init-supabase-storage');
      initializeStorage.mockRejectedValue(new Error('Storage initialization failed'));

      const request = createMockRequest('POST', '/api/admin/init-storage');
      const response = await postInitStorage(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Storage initialization failed');
    });
  });

  describe('Admin Image Upload API (/api/admin/upload-image)', () => {
    it('should upload catering image', async () => {
      const { uploadCateringImage } = require('@/lib/storage/supabase-storage');
      uploadCateringImage.mockResolvedValue({
        success: true,
        url: 'https://example.com/image.jpg',
      });

      // Create a mock FormData
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('itemId', 'item-123');

      const request = createMockRequest('POST', '/api/admin/upload-image');
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await postUploadImage(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toBe('https://example.com/image.jpg');
      expect(uploadCateringImage).toHaveBeenCalledWith(mockFile, 'item-123');
    });

    it('should validate file presence', async () => {
      const formData = new FormData();
      formData.append('itemId', 'item-123');
      // No file provided

      const request = createMockRequest('POST', '/api/admin/upload-image');
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await postUploadImage(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No file provided');
    });

    it('should validate item ID presence', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);
      // No itemId provided

      const request = createMockRequest('POST', '/api/admin/upload-image');
      request.formData = jest.fn().mockResolvedValue(formData);

      const response = await postUploadImage(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No item ID provided');
    });
  });

  describe('Admin Shipping Configuration API (/api/admin/shipping-configuration)', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should update shipping configurations', async () => {
      const { updateShippingConfiguration } = require('@/lib/shippingUtils');
      updateShippingConfiguration.mockResolvedValue({
        productName: 'Test Product',
        baseWeightLb: 2.5,
        weightPerUnitLb: 0.5,
        isActive: true,
        applicableForNationwideOnly: false,
      });

      const request = createMockRequest('POST', '/api/admin/shipping-configuration', {
        configurations: [
          {
            productName: 'Test Product',
            baseWeightLb: 2.5,
            weightPerUnitLb: 0.5,
            isActive: true,
            applicableForNationwideOnly: false,
          },
        ],
      });

      const response = await postShippingConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Shipping configurations updated successfully');
      expect(data.configurations).toHaveLength(1);
      expect(updateShippingConfiguration).toHaveBeenCalledWith('Test Product', {
        baseWeightLb: 2.5,
        weightPerUnitLb: 0.5,
        isActive: true,
        applicableForNationwideOnly: false,
      });
    });

    it('should get shipping configurations', async () => {
      const { getAllShippingConfigurations } = require('@/lib/shippingUtils');
      getAllShippingConfigurations.mockResolvedValue([
        {
          productName: 'Test Product',
          baseWeightLb: 2.5,
          weightPerUnitLb: 0.5,
          isActive: true,
          applicableForNationwideOnly: false,
        },
      ]);

      const request = createMockRequest('GET', '/api/admin/shipping-configuration');
      const response = await getShippingConfig(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.configurations).toHaveLength(1);
      expect(getAllShippingConfigurations).toHaveBeenCalled();
    });

    it('should validate shipping configuration data', async () => {
      const request = createMockRequest('POST', '/api/admin/shipping-configuration', {
        configurations: [
          {
            productName: '', // Invalid: empty product name
            baseWeightLb: -1, // Invalid: negative weight
            weightPerUnitLb: 0.5,
            isActive: true,
            applicableForNationwideOnly: false,
          },
        ],
      });

      const response = await postShippingConfig(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('GET', '/api/admin/orders');
      const response = await getOrders(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch orders');
    });

    it('should handle malformed JSON requests', async () => {
      const request = createMockRequest('PUT', '/api/admin/orders', 'invalid-json');

      const response = await updateOrder(request);

      expect(response.status).toBe(500);
    });

    it('should handle Prisma constraint violations', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({ id: 'order-1' });
      mockPrisma.order.update.mockRejectedValue({ code: 'P2002' });

      const request = createMockRequest('PUT', '/api/admin/orders', {
        orderId: 'order-1',
        status: 'PROCESSING',
      });

      const response = await updateOrder(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Order update conflict');
    });
  });

  describe('Performance and Load Testing Scenarios', () => {
    beforeEach(() => {
      mockAdminAuth();
    });

    it('should handle large order lists efficiently', async () => {
      const largeOrderList = Array.from({ length: 1000 }, (_, i) => ({
        id: `order-${i}`,
        status: 'PENDING',
        total: 50.0,
        email: `customer${i}@test.com`,
        createdAt: new Date(),
        items: [],
      }));

      mockPrisma.order.findMany.mockResolvedValue(largeOrderList);
      mockPrisma.order.count.mockResolvedValue(1000);

      const request = createMockRequest('GET', '/api/admin/orders?limit=1000');
      const startTime = Date.now();
      const response = await getOrders(request);
      const endTime = Date.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent bulk operations', async () => {
      mockPrisma.order.updateMany.mockResolvedValue({ count: 50 });

      const requests = Array.from({ length: 10 }, () =>
        createMockRequest('POST', '/api/admin/orders', {
          action: 'bulk-update',
          orderIds: Array.from({ length: 50 }, (_, i) => `order-${i}`),
          status: 'SHIPPED',
        })
      );

      const responses = await Promise.all(requests.map(request => postOrders(request)));

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });
  });
});
