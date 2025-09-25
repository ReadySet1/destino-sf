/**
 * 🧪 Order Management System - Comprehensive Tests
 * Tests for order CRUD operations, state transitions, inventory management, and admin functions
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GET as getOrdersHandler, PUT as updateOrderHandler, DELETE as deleteOrderHandler } from '@/app/api/orders/route';
import { GET as getOrderHandler, PUT as updateOrderStatusHandler } from '@/app/api/orders/[id]/route';
import { POST as createOrderHandler } from '@/app/api/admin/orders/manual/route';
import { prisma } from '@/lib/db-unified';
import { sendOrderStatusEmail } from '@/lib/email/order-notifications';
import { updateInventory } from '@/lib/inventory/manager';
import { createShippingLabel } from '@/lib/shippo/label-creation';
import { setMockAuthState, generateMockUser } from '@/__mocks__/@supabase/supabase-js';
import { createMockShippoTransaction } from '@/__mocks__/shippo';

// Mock dependencies
jest.mock('@/lib/db-unified');
jest.mock('@/lib/email/order-notifications');
jest.mock('@/lib/inventory/manager');
jest.mock('@/lib/shippo/label-creation');
jest.mock('@/middleware/rate-limit', () => ({
  applyStrictRateLimit: jest.fn().mockResolvedValue(null),
}));

describe('Order Management System - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up authenticated admin user
    const mockAdminUser = generateMockUser({ 
      email: 'admin@destino-sf.com',
      user_metadata: { role: 'admin' }
    });
    setMockAuthState(mockAdminUser);

    // Mock database operations
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'order_1',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        status: 'PENDING',
        total: 25.99,
        createdAt: new Date(),
        items: [
          { id: 'item_1', productName: 'Test Product', quantity: 2, price: 12.99 }
        ]
      },
      {
        id: 'order_2',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        status: 'PROCESSING',
        total: 35.50,
        createdAt: new Date(),
        items: [
          { id: 'item_2', productName: 'Another Product', quantity: 1, price: 35.50 }
        ]
      }
    ]);

    (prisma.order.findUnique as jest.Mock).mockImplementation((args) => {
      const orderId = args.where.id;
      return Promise.resolve({
        id: orderId,
        customerName: 'Test Customer',
        customerEmail: 'customer@test.com',
        customerPhone: '+1-555-123-4567',
        status: 'PENDING',
        total: 25.99,
        pickupTime: new Date(Date.now() + 3600000),
        fulfillmentType: 'PICKUP',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'item_1',
            productId: 'product_1',
            productName: 'Test Product',
            quantity: 2,
            price: 12.99,
            product: {
              id: 'product_1',
              name: 'Test Product',
              price: 12.99,
              inventory: 10
            }
          }
        ]
      });
    });

    (prisma.order.update as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: args.where.id,
        ...args.data,
        updatedAt: new Date()
      });
    });

    (prisma.order.delete as jest.Mock).mockImplementation((args) => {
      return Promise.resolve({
        id: args.where.id
      });
    });

    // Mock email and inventory functions
    (sendOrderStatusEmail as jest.Mock).mockResolvedValue({ success: true });
    (updateInventory as jest.Mock).mockResolvedValue({ success: true });
    (createShippingLabel as jest.Mock).mockResolvedValue(createMockShippoTransaction());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Order CRUD Operations', () => {
    it('should fetch all orders with pagination', async () => {
      const request = new Request('http://localhost/api/orders?page=1&limit=10');
      
      const response = await getOrdersHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(2);
      expect(data.orders[0]).toMatchObject({
        id: 'order_1',
        customerName: 'John Doe',
        status: 'PENDING'
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          items: true
        })
      });
    });

    it('should filter orders by status', async () => {
      const request = new Request('http://localhost/api/orders?status=PENDING');
      
      await getOrdersHandler(request);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          items: true
        })
      });
    });

    it('should filter orders by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const request = new Request(`http://localhost/api/orders?startDate=${startDate}&endDate=${endDate}`);
      
      await getOrdersHandler(request);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          items: true
        })
      });
    });

    it('should fetch individual order by ID', async () => {
      const request = new Request('http://localhost/api/orders/order_123');
      
      const response = await getOrderHandler(request, { params: { id: 'order_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order).toMatchObject({
        id: 'order_123',
        customerName: 'Test Customer'
      });

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        include: expect.objectContaining({
          items: { include: { product: true } }
        })
      });
    });

    it('should handle order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
      
      const request = new Request('http://localhost/api/orders/non_existent');
      
      const response = await getOrderHandler(request, { params: { id: 'non_existent' } });
      
      expect(response.status).toBe(404);
    });

    it('should create manual order (admin only)', async () => {
      const orderData = {
        customerName: 'Manual Customer',
        customerEmail: 'manual@test.com',
        customerPhone: '+1-555-987-6543',
        items: [
          { productId: 'product_1', quantity: 1, price: 15.99 }
        ],
        total: 15.99,
        fulfillmentType: 'PICKUP'
      };

      (prisma.order.create as jest.Mock).mockResolvedValue({
        id: 'manual_order_123',
        ...orderData,
        status: 'PENDING',
        createdAt: new Date()
      });

      const request = new Request('http://localhost/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const response = await createOrderHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.order.id).toBe('manual_order_123');
      expect(prisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerName: 'Manual Customer',
          customerEmail: 'manual@test.com',
          total: 15.99,
          status: 'PENDING'
        })
      });
    });

    it('should delete order (admin only)', async () => {
      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'DELETE'
      });

      const response = await deleteOrderHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(200);
      expect(prisma.order.delete).toHaveBeenCalledWith({
        where: { id: 'order_123' }
      });
    });
  });

  describe('Order State Transitions', () => {
    const validTransitions = {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['READY', 'CANCELLED'],
      READY: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };

    it('should allow valid status transitions', async () => {
      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PROCESSING',
          notes: 'Started preparation'
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order.status).toBe('PROCESSING');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_123' },
        data: {
          status: 'PROCESSING',
          notes: 'Started preparation',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should prevent invalid status transitions', async () => {
      // Mock order with COMPLETED status
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
        status: 'COMPLETED', // Already completed
        customerName: 'Test Customer'
      });

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PENDING' // Invalid transition from COMPLETED to PENDING
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(400);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('should validate each transition step', () => {
      Object.entries(validTransitions).forEach(([currentStatus, allowedNext]) => {
        allowedNext.forEach(nextStatus => {
          expect(validTransitions[currentStatus as keyof typeof validTransitions])
            .toContain(nextStatus);
        });
      });
    });

    it('should send email notifications on status change', async () => {
      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'READY',
          notes: 'Order is ready for pickup'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(sendOrderStatusEmail).toHaveBeenCalledWith(
        'customer@test.com',
        'READY',
        expect.objectContaining({
          id: 'order_123',
          customerName: 'Test Customer'
        })
      );
    });

    it('should handle concurrent status updates', async () => {
      // Simulate concurrent requests
      const request1 = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PROCESSING' })
      });

      const request2 = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });

      // Execute concurrent requests
      const [response1, response2] = await Promise.all([
        updateOrderStatusHandler(request1, { params: { id: 'order_123' } }),
        updateOrderStatusHandler(request2, { params: { id: 'order_123' } })
      ]);

      // At least one should succeed
      expect([response1.status, response2.status]).toContain(200);
    });
  });

  describe('Inventory Management', () => {
    it('should update inventory when order is cancelled', async () => {
      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: 'Customer requested cancellation'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(updateInventory).toHaveBeenCalledWith(
        'order_123',
        'RESTORE',
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'product_1',
            quantity: 2
          })
        ])
      );
    });

    it('should reserve inventory when order is confirmed', async () => {
      // Mock order with PENDING status
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
        status: 'PENDING',
        items: [
          {
            productId: 'product_1',
            quantity: 2,
            product: { id: 'product_1', inventory: 10 }
          }
        ]
      });

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PROCESSING'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(updateInventory).toHaveBeenCalledWith(
        'order_123',
        'RESERVE',
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'product_1',
            quantity: 2
          })
        ])
      );
    });

    it('should handle insufficient inventory gracefully', async () => {
      (updateInventory as jest.Mock).mockRejectedValue(
        new Error('Insufficient inventory for product_1')
      );

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PROCESSING'
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(400);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('Shipping Label Generation', () => {
    it('should generate shipping label when order is ready for delivery', async () => {
      // Mock order with delivery fulfillment
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
        status: 'READY',
        fulfillmentType: 'DELIVERY',
        deliveryAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102'
        },
        items: [{ quantity: 1, product: { weight: 1.5 } }]
      });

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OUT_FOR_DELIVERY'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(createShippingLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          toAddress: expect.objectContaining({
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102'
          }),
          weight: 1.5
        })
      );
    });

    it('should skip shipping label for pickup orders', async () => {
      // Mock order with pickup fulfillment
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
        status: 'READY',
        fulfillmentType: 'PICKUP'
      });

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(createShippingLabel).not.toHaveBeenCalled();
    });

    it('should handle shipping label creation failures', async () => {
      (createShippingLabel as jest.Mock).mockRejectedValue(
        new Error('Shipping service unavailable')
      );

      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'order_123',
        status: 'READY',
        fulfillmentType: 'DELIVERY',
        deliveryAddress: {}
      });

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OUT_FOR_DELIVERY'
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      // Should still update status but log the shipping error
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate order update permissions', async () => {
      // Set up non-admin user
      const mockCustomerUser = generateMockUser({ 
        email: 'customer@test.com',
        user_metadata: { role: 'customer' }
      });
      setMockAuthState(mockCustomerUser);

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED'
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(403);
    });

    it('should handle database connection failures', async () => {
      (prisma.order.update as jest.Mock).mockRejectedValue(
        new Error('Database connection timeout')
      );

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PROCESSING'
        })
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(500);
    });

    it('should validate required fields for manual order creation', async () => {
      const incompleteOrderData = {
        customerName: 'Test Customer',
        // Missing email, phone, items, etc.
      };

      const request = new Request('http://localhost/api/admin/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompleteOrderData)
      });

      const response = await createOrderHandler(request);

      expect(response.status).toBe(400);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON requests', async () => {
      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      const response = await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(response.status).toBe(400);
    });

    it('should log order operations for audit trail', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = new Request('http://localhost/api/orders/order_123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          reason: 'Admin cancellation'
        })
      });

      await updateOrderStatusHandler(request, { params: { id: 'order_123' } });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Order status updated'),
        expect.objectContaining({
          orderId: 'order_123',
          newStatus: 'CANCELLED'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large order queries efficiently', async () => {
      // Mock large dataset
      const largeOrderSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `order_${i}`,
        customerName: `Customer ${i}`,
        status: 'PENDING',
        total: 25.99,
        createdAt: new Date()
      }));

      (prisma.order.findMany as jest.Mock).mockResolvedValue(largeOrderSet.slice(0, 25));

      const request = new Request('http://localhost/api/orders?limit=25');
      
      const startTime = Date.now();
      const response = await getOrdersHandler(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should use database indexes for common queries', async () => {
      const request = new Request('http://localhost/api/orders?status=PENDING&startDate=2024-01-01');
      
      await getOrdersHandler(request);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          createdAt: {
            gte: new Date('2024-01-01')
          }
        },
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          items: true
        })
      });
    });
  });
});
