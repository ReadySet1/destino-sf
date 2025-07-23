// Phase 4: Comprehensive Admin API Route Tests
import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT, POST } from '@/app/api/admin/orders/route';
import { GET as SettingsGET, POST as SettingsPOST } from '@/app/api/admin/settings/route';
import {
  GET as DeliveryZonesGET,
  POST as DeliveryZonesPOST,
  PUT as DeliveryZonesPUT,
} from '@/app/api/admin/delivery-zones/route';
import { GET as SpotlightGET, POST as SpotlightPOST } from '@/app/api/admin/spotlight-picks/route';
import { prisma } from '@/lib/db';
import { createClient } from '@/utils/supabase/server';
import { OrderStatus } from '@prisma/client';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    storeSettings: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    cateringDeliveryZone: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      $transaction: jest.fn(),
    },
    spotlightPick: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    profile: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Admin API Routes - Phase 4 Comprehensive Tests', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };

  const mockAdminUser = {
    id: 'admin-user-123',
    email: 'admin@destino-sf.com',
  };

  const mockAdminProfile = {
    id: 'admin-user-123',
    role: 'ADMIN',
  };

  const mockNonAdminProfile = {
    id: 'user-123',
    role: 'USER',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Admin Orders API (/api/admin/orders)', () => {
    describe('GET - List Orders', () => {
      it('should fetch orders with proper admin authentication', async () => {
        // Mock authenticated admin user
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);

        const mockOrders = [
          {
            id: 'order-1',
            status: OrderStatus.PENDING,
            customerName: 'John Doe',
            email: 'john@example.com',
            total: 45.99,
            createdAt: new Date(),
            items: [
              {
                id: 'item-1',
                quantity: 2,
                price: 12.99,
                product: { name: 'Dulce de Leche Alfajores', images: ['image1.jpg'] },
                variant: { name: '6-pack' },
              },
            ],
          },
        ];

        mockPrisma.order.findMany.mockResolvedValue(mockOrders as any);
        mockPrisma.order.count.mockResolvedValue(1);

        const request = new NextRequest('http://localhost:3000/api/admin/orders');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.orders).toHaveLength(1);
        expect(data.orders[0].id).toBe('order-1');
        expect(data.pagination.totalCount).toBe(1);
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
          where: {},
          include: {
            items: {
              include: {
                product: { select: { name: true, images: true } },
                variant: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 50,
        });
      });

      it('should filter orders by status', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);
        mockPrisma.order.findMany.mockResolvedValue([]);
        mockPrisma.order.count.mockResolvedValue(0);

        const request = new NextRequest('http://localhost:3000/api/admin/orders?status=PENDING');
        await GET(request);

        expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
          where: { status: 'PENDING' },
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 50,
        });
      });

      it('should return 401 for unauthenticated users', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/orders');
        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });

      it('should return 403 for non-admin users', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockNonAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);

        const request = new NextRequest('http://localhost:3000/api/admin/orders');
        const response = await GET(request);

        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({ error: 'Forbidden' });
      });
    });

    describe('PUT - Update Order', () => {
      it('should update order status successfully', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);

        const existingOrder = {
          id: 'order-1',
          status: OrderStatus.PENDING,
          customerName: 'John Doe',
        };

        const updatedOrder = {
          ...existingOrder,
          status: OrderStatus.CONFIRMED,
          updatedAt: new Date(),
        };

        mockPrisma.order.findUnique.mockResolvedValue(existingOrder as any);
        mockPrisma.order.update.mockResolvedValue(updatedOrder as any);

        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'PUT',
          body: JSON.stringify({
            orderId: 'order-1',
            status: OrderStatus.CONFIRMED,
            notes: 'Order confirmed by admin',
          }),
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.order.status).toBe(OrderStatus.CONFIRMED);
        expect(mockPrisma.order.update).toHaveBeenCalledWith({
          where: { id: 'order-1' },
          data: {
            status: OrderStatus.CONFIRMED,
            notes: 'Order confirmed by admin',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should return 404 for non-existent order', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);

        mockPrisma.order.findUnique.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'PUT',
          body: JSON.stringify({
            orderId: 'non-existent-order',
            status: OrderStatus.CONFIRMED,
          }),
        });

        const response = await PUT(request);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'Order not found' });
      });

      it('should validate order status', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        const mockProfileChain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockProfileChain);

        const existingOrder = {
          id: 'order-1',
          status: OrderStatus.PENDING,
        };

        mockPrisma.order.findUnique.mockResolvedValue(existingOrder as any);

        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'PUT',
          body: JSON.stringify({
            orderId: 'order-1',
            status: 'INVALID_STATUS',
          }),
        });

        const response = await PUT(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Invalid order status' });
      });
    });

    describe('POST - Bulk Operations and Statistics', () => {
      it('should perform bulk order status updates', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.order.updateMany.mockResolvedValue({ count: 3 });

        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'POST',
          body: JSON.stringify({
            action: 'bulk-update',
            orderIds: ['order-1', 'order-2', 'order-3'],
            status: OrderStatus.CONFIRMED,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.updatedCount).toBe(3);
        expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
          where: { id: { in: ['order-1', 'order-2', 'order-3'] } },
          data: {
            status: OrderStatus.CONFIRMED,
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should return order statistics', async () => {
        const mockStatusCounts = [
          { status: OrderStatus.PENDING, _count: { _all: 5 } },
          { status: OrderStatus.CONFIRMED, _count: { _all: 10 } },
          { status: OrderStatus.COMPLETED, _count: { _all: 15 } },
        ];

        mockPrisma.order.groupBy.mockResolvedValue(mockStatusCounts as any);
        mockPrisma.order.count.mockResolvedValue(30);
        mockPrisma.order.aggregate.mockResolvedValue({
          _sum: { total: { toNumber: () => 1500 } },
        });

        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'POST',
          body: JSON.stringify({ action: 'stats' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.stats.totalOrders).toBe(30);
        expect(data.stats.totalRevenue).toBe(1500);
        expect(data.stats.averageOrderValue).toBe(50);
        expect(data.stats.statusCounts).toEqual({
          [OrderStatus.PENDING]: 5,
          [OrderStatus.CONFIRMED]: 10,
          [OrderStatus.COMPLETED]: 15,
        });
      });

      it('should validate bulk update request', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        // Test with too many orders
        const request = new NextRequest('http://localhost:3000/api/admin/orders', {
          method: 'POST',
          body: JSON.stringify({
            action: 'bulk-update',
            orderIds: Array.from({ length: 101 }, (_, i) => `order-${i}`),
            status: OrderStatus.CONFIRMED,
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          error: 'Too many orders for bulk update (max 100)',
        });
      });
    });
  });

  describe('Admin Settings API (/api/admin/settings)', () => {
    describe('GET - Fetch Settings', () => {
      it('should fetch store settings and delivery zones', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const mockStoreSettings = {
          id: 'settings-1',
          taxRate: 0.08,
          minOrderAmount: 25.0,
          cateringMinimumAmount: 150.0,
          storeName: 'Destino SF',
          createdAt: new Date(),
        };

        const mockDeliveryZones = [
          {
            id: 'zone-1',
            zone: 'nearby',
            name: 'Nearby Delivery',
            minimumAmount: 50.0,
            deliveryFee: 5.0,
            displayOrder: 1,
          },
        ];

        mockPrisma.storeSettings.findFirst.mockResolvedValue(mockStoreSettings as any);
        mockPrisma.cateringDeliveryZone.findMany.mockResolvedValue(mockDeliveryZones as any);

        const request = new NextRequest('http://localhost:3000/api/admin/settings');
        const response = await SettingsGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.storeSettings.taxRate).toBe(0.08);
        expect(data.storeSettings.minOrderAmount).toBe(25.0);
        expect(data.deliveryZones).toHaveLength(1);
        expect(data.deliveryZones[0].minimumAmount).toBe(50.0);
      });

      it('should require admin authentication', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        });

        const request = new NextRequest('http://localhost:3000/api/admin/settings');
        const response = await SettingsGET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });
    });

    describe('POST - Update Settings', () => {
      it('should update store settings successfully', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const existingSettings = {
          id: 'settings-1',
          taxRate: 0.08,
          minOrderAmount: 25.0,
        };

        const updatedSettings = {
          ...existingSettings,
          taxRate: 0.09,
          minOrderAmount: 30.0,
        };

        mockPrisma.storeSettings.findFirst.mockResolvedValue(existingSettings as any);
        mockPrisma.storeSettings.upsert.mockResolvedValue(updatedSettings as any);

        const request = new NextRequest('http://localhost:3000/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({
            taxRate: 0.09,
            minOrderAmount: 30.0,
            cateringMinimumAmount: 150.0,
          }),
        });

        const response = await SettingsPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.storeSettings.taxRate).toBe(0.09);
        expect(data.storeSettings.minOrderAmount).toBe(30.0);
        expect(mockPrisma.storeSettings.upsert).toHaveBeenCalled();
      });

      it('should validate settings data', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const request = new NextRequest('http://localhost:3000/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({
            taxRate: -0.1, // Invalid negative tax rate
            minOrderAmount: -10, // Invalid negative minimum
          }),
        });

        const response = await SettingsPOST(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
          error: 'Validation failed',
          details: expect.any(Array),
        });
      });
    });
  });

  describe('Admin Delivery Zones API (/api/admin/delivery-zones)', () => {
    describe('GET - List Delivery Zones', () => {
      it('should fetch all delivery zones', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const mockDeliveryZones = [
          {
            id: 'zone-1',
            zone: 'nearby',
            name: 'Nearby Delivery',
            description: 'Close to the store',
            minimumAmount: 50.0,
            deliveryFee: 5.0,
            estimatedDeliveryTime: '30-45 minutes',
            active: true,
            postalCodes: ['94110', '94103'],
            cities: ['San Francisco'],
            displayOrder: 1,
          },
        ];

        mockPrisma.cateringDeliveryZone.findMany.mockResolvedValue(mockDeliveryZones as any);

        const request = new NextRequest('http://localhost:3000/api/admin/delivery-zones');
        const response = await DeliveryZonesGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.deliveryZones).toHaveLength(1);
        expect(data.deliveryZones[0].zone).toBe('nearby');
        expect(data.deliveryZones[0].minimumAmount).toBe(50.0);
      });
    });

    describe('POST - Create/Update Delivery Zone', () => {
      it('should create new delivery zone', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const newZone = {
          zone: 'extended',
          name: 'Extended Delivery',
          description: 'Further delivery zone',
          minimumAmount: 75.0,
          deliveryFee: 10.0,
          estimatedDeliveryTime: '45-60 minutes',
          isActive: true,
          postalCodes: ['94107', '94108'],
          cities: ['San Francisco'],
          displayOrder: 2,
        };

        const createdZone = {
          id: 'zone-2',
          ...newZone,
          active: newZone.isActive,
        };

        mockPrisma.cateringDeliveryZone.create.mockResolvedValue(createdZone as any);

        const request = new NextRequest('http://localhost:3000/api/admin/delivery-zones', {
          method: 'POST',
          body: JSON.stringify(newZone),
        });

        const response = await DeliveryZonesPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.deliveryZone.zone).toBe('extended');
        expect(data.deliveryZone.minimumAmount).toBe(75.0);
        expect(mockPrisma.cateringDeliveryZone.create).toHaveBeenCalledWith({
          data: {
            zone: 'extended',
            name: 'Extended Delivery',
            description: 'Further delivery zone',
            minimumAmount: 75.0,
            deliveryFee: 10.0,
            estimatedDeliveryTime: '45-60 minutes',
            active: true,
            postalCodes: ['94107', '94108'],
            cities: ['San Francisco'],
            displayOrder: 2,
          },
        });
      });

      it('should update existing delivery zone', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const updateData = {
          id: 'zone-1',
          zone: 'nearby',
          name: 'Updated Nearby Delivery',
          description: 'Updated description',
          minimumAmount: 60.0,
          deliveryFee: 7.0,
          estimatedDeliveryTime: '30-40 minutes',
          isActive: true,
          postalCodes: ['94110', '94103', '94102'],
          cities: ['San Francisco'],
          displayOrder: 1,
        };

        const updatedZone = {
          ...updateData,
          active: updateData.isActive,
        };

        mockPrisma.cateringDeliveryZone.update.mockResolvedValue(updatedZone as any);

        const request = new NextRequest('http://localhost:3000/api/admin/delivery-zones', {
          method: 'POST',
          body: JSON.stringify(updateData),
        });

        const response = await DeliveryZonesPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.deliveryZone.minimumAmount).toBe(60.0);
        expect(mockPrisma.cateringDeliveryZone.update).toHaveBeenCalledWith({
          where: { id: 'zone-1' },
          data: {
            zone: 'nearby',
            name: 'Updated Nearby Delivery',
            description: 'Updated description',
            minimumAmount: 60.0,
            deliveryFee: 7.0,
            estimatedDeliveryTime: '30-40 minutes',
            active: true,
            postalCodes: ['94110', '94103', '94102'],
            cities: ['San Francisco'],
            displayOrder: 1,
          },
        });
      });
    });

    describe('PUT - Bulk Update Delivery Zones', () => {
      it('should update multiple delivery zones', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const zonesData = [
          {
            id: 'zone-1',
            zone: 'nearby',
            name: 'Nearby Delivery',
            description: 'Close to the store',
            minimumAmount: 50.0,
            deliveryFee: 5.0,
            estimatedDeliveryTime: '30-45 minutes',
            isActive: true,
            postalCodes: ['94110', '94103'],
            cities: ['San Francisco'],
            displayOrder: 1,
          },
          {
            id: 'zone-2',
            zone: 'extended',
            name: 'Extended Delivery',
            description: 'Further delivery zone',
            minimumAmount: 75.0,
            deliveryFee: 10.0,
            estimatedDeliveryTime: '45-60 minutes',
            isActive: true,
            postalCodes: ['94107', '94108'],
            cities: ['San Francisco'],
            displayOrder: 2,
          },
        ];

        const updatedZones = zonesData.map(zone => ({
          ...zone,
          active: zone.isActive,
        }));

        mockPrisma.$transaction.mockResolvedValue(updatedZones as any);

        const request = new NextRequest('http://localhost:3000/api/admin/delivery-zones', {
          method: 'PUT',
          body: JSON.stringify({ zones: zonesData }),
        });

        const response = await DeliveryZonesPUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Delivery zones updated successfully');
        expect(data.zones).toHaveLength(2);
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });
    });
  });

  describe('Admin Spotlight Picks API (/api/admin/spotlight-picks)', () => {
    describe('GET - List Spotlight Picks', () => {
      it('should fetch all spotlight picks with product data', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const mockSpotlightPicks = [
          {
            id: 'pick-1',
            position: 1,
            productId: 'product-1',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: {
              id: 'product-1',
              name: 'Dulce de Leche Alfajores',
              description: 'Traditional Argentine cookies',
              images: ['alfajores.jpg'],
              price: 12.99,
              slug: 'dulce-leche-alfajores',
              category: {
                name: 'Alfajores',
                slug: 'alfajores',
              },
            },
          },
        ];

        mockPrisma.spotlightPick.findMany.mockResolvedValue(mockSpotlightPicks as any);

        const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks');
        const response = await SpotlightGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].position).toBe(1);
        expect(data.data[0].product.name).toBe('Dulce de Leche Alfajores');
      });
    });

    describe('POST - Create/Update Spotlight Pick', () => {
      it('should create or update spotlight pick', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const spotlightData = {
          position: 2,
          productId: 'product-2',
          isActive: true,
        };

        const createdPick = {
          id: 'pick-2',
          position: 2,
          productId: 'product-2',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 'product-2',
            name: 'Peruvian Coffee',
            description: 'Rich and aromatic coffee',
            images: ['coffee.jpg'],
            price: 18.5,
            slug: 'peruvian-coffee',
            category: {
              name: 'Coffee',
              slug: 'coffee',
            },
          },
        };

        mockPrisma.spotlightPick.upsert.mockResolvedValue(createdPick as any);

        const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
          method: 'POST',
          body: JSON.stringify(spotlightData),
        });

        const response = await SpotlightPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.position).toBe(2);
        expect(data.data.product.name).toBe('Peruvian Coffee');
        expect(mockPrisma.spotlightPick.upsert).toHaveBeenCalledWith({
          where: { position: 2 },
          update: {
            productId: 'product-2',
            isActive: true,
          },
          create: {
            position: 2,
            productId: 'product-2',
            isActive: true,
          },
          include: {
            product: {
              include: {
                category: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        });
      });

      it('should validate spotlight pick data', async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        });

        mockPrisma.profile.findUnique.mockResolvedValue(mockAdminProfile as any);

        const invalidData = {
          position: 5, // Invalid position (must be 1-4)
          productId: 'invalid-id', // Invalid UUID
          isActive: true,
        };

        const request = new NextRequest('http://localhost:3000/api/admin/spotlight-picks', {
          method: 'POST',
          body: JSON.stringify(invalidData),
        });

        const response = await SpotlightPOST(request);

        expect(response.status).toBe(400);
        // Should contain validation error details
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null,
      });

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAdminProfile,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockProfileChain);

      mockPrisma.order.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/orders');
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        success: false,
        error: 'Failed to fetch orders',
      });
    });

    it('should handle malformed JSON requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null,
      });

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAdminProfile,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockProfileChain);

      // Create a request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'PUT',
        body: 'invalid-json',
      });

      const response = await PUT(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Internal server error',
      });
    });

    it('should handle missing required fields', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockAdminUser },
        error: null,
      });

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockAdminProfile,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockProfileChain);

      const request = new NextRequest('http://localhost:3000/api/admin/orders', {
        method: 'PUT',
        body: JSON.stringify({}), // Missing required orderId
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Order ID is required',
      });
    });
  });
});
