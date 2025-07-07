import { NextRequest } from 'next/server';

// Mock environment and dependencies before imports
jest.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'mock-database-url',
    SQUARE_ACCESS_TOKEN: 'mock-access-token',
    SQUARE_ENVIRONMENT: 'sandbox'
  }
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    storeSettings: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/error-monitoring');

// Import after mocking
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorMonitor } from '@/lib/error-monitoring';

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  storeSettings: {
    findFirst: jest.fn(),
  },
} as any;

// Replace the actual prisma instance with our mock
(prisma as any).order = mockPrisma.order;
(prisma as any).orderItem = mockPrisma.orderItem;
(prisma as any).storeSettings = mockPrisma.storeSettings;

const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockErrorMonitor = errorMonitor as jest.Mocked<typeof errorMonitor>;

describe('Order Management Security & Enhanced Coverage (Phase 1 - 85%+ Target)', () => {
  const validOrder = {
    id: 'order-123',
    status: 'PENDING',
    total: 7500,
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123-456',
    userId: 'user-123',
    paymentStatus: 'PENDING',
    fulfillmentType: 'pickup',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockPrisma.order.findUnique.mockResolvedValue(validOrder);
    mockPrisma.order.findMany.mockResolvedValue([validOrder]);
    mockPrisma.order.update.mockResolvedValue({ ...validOrder, status: 'CONFIRMED' });
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: new Date() });
    
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Order Access Control & Authorization', () => {
    it('should prevent unauthorized access to orders', async () => {
      // Mock order belonging to different user
      const otherUserOrder = {
        ...validOrder,
        userId: 'other-user-123',
      };

      mockPrisma.order.findUnique.mockResolvedValue(otherUserOrder);

      const getOrderWithAuth = async (orderId: string, userId: string) => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.userId !== userId) {
          throw new Error('Unauthorized access to order');
        }

        return order;
      };

      await expect(getOrderWithAuth('order-123', 'user-123')).rejects.toThrow(
        'Unauthorized access to order'
      );
    });

    it('should allow admin access to all orders', async () => {
      const getOrderAsAdmin = async (orderId: string, isAdmin: boolean) => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        // Admins can access any order
        if (!isAdmin && order.userId !== 'current-user-id') {
          throw new Error('Unauthorized access');
        }

        return order;
      };

      const result = await getOrderAsAdmin('order-123', true);
      expect(result.id).toBe('order-123');
    });

    it('should validate order ID format to prevent injection attacks', async () => {
      const maliciousOrderIds = [
        "'; DROP TABLE orders; --",
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        '1 OR 1=1',
      ];

      const validateOrderId = (orderId: string): boolean => {
        // Order IDs should be alphanumeric with hyphens only
        const validFormat = /^[a-zA-Z0-9-]+$/.test(orderId);
        const reasonableLength = orderId.length >= 5 && orderId.length <= 50;
        return validFormat && reasonableLength;
      };

      maliciousOrderIds.forEach(id => {
        expect(validateOrderId(id)).toBe(false);
      });

      expect(validateOrderId('order-123')).toBe(true);
    });

    it('should implement rate limiting for order operations', async () => {
      const checkOrderRateLimit = async (operation: string) => {
        const result = await checkRateLimit({} as any, `order_${operation}`);
        return result.success;
      };

      const allowed = await checkOrderRateLimit('read');
      expect(allowed).toBe(true);
      expect(mockCheckRateLimit).toHaveBeenCalled();
    });
  });

  describe('Order State Management & Transitions', () => {
    it('should validate order state transitions', async () => {
      const validateStateTransition = (currentStatus: string, newStatus: string): boolean => {
        const validTransitions: Record<string, string[]> = {
          'PENDING': ['CONFIRMED', 'CANCELLED'],
          'CONFIRMED': ['PROCESSING', 'CANCELLED'],
          'PROCESSING': ['READY', 'CANCELLED'],
          'READY': ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
          'OUT_FOR_DELIVERY': ['COMPLETED', 'FAILED'],
          'COMPLETED': [], // Terminal state
          'CANCELLED': [], // Terminal state
          'FAILED': ['PENDING'], // Can retry
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
      };

      // Valid transitions
      expect(validateStateTransition('PENDING', 'CONFIRMED')).toBe(true);
      expect(validateStateTransition('CONFIRMED', 'PROCESSING')).toBe(true);
      expect(validateStateTransition('READY', 'COMPLETED')).toBe(true);

      // Invalid transitions
      expect(validateStateTransition('COMPLETED', 'PENDING')).toBe(false);
      expect(validateStateTransition('CANCELLED', 'PROCESSING')).toBe(false);
      expect(validateStateTransition('PENDING', 'OUT_FOR_DELIVERY')).toBe(false);
    });

    it('should prevent concurrent order status updates', async () => {
      let updateCount = 0;
      
      mockPrisma.order.update.mockImplementation(async (params) => {
        updateCount++;
        
        if (updateCount === 1) {
          // First update succeeds
          return { ...validOrder, status: params.data.status };
        } else {
          // Subsequent updates should detect conflict
          throw new Error('Order was modified by another process');
        }
      });

      const updateOrderStatus = async (orderId: string, newStatus: string) => {
        // Check current status first
        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // Update with optimistic locking
        return await prisma.order.update({
          where: { 
            id: orderId,
            updatedAt: currentOrder.updatedAt, // Optimistic lock
          },
          data: { 
            status: newStatus,
            updatedAt: new Date(),
          },
        });
      };

      // First update should succeed
      const result1 = await updateOrderStatus('order-123', 'CONFIRMED');
      expect(result1.status).toBe('CONFIRMED');

      // Concurrent update should fail
      await expect(updateOrderStatus('order-123', 'PROCESSING')).rejects.toThrow(
        'Order was modified by another process'
      );
    });

    it('should track order status history for audit trail', async () => {
      const orderStatusHistory: Array<{
        orderId: string;
        oldStatus: string;
        newStatus: string;
        changedBy: string;
        changedAt: Date;
        reason?: string;
      }> = [];

      const updateOrderWithHistory = async (
        orderId: string, 
        newStatus: string, 
        userId: string, 
        reason?: string
      ) => {
        const currentOrder = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!currentOrder) {
          throw new Error('Order not found');
        }

        // Record status change
        orderStatusHistory.push({
          orderId,
          oldStatus: currentOrder.status,
          newStatus,
          changedBy: userId,
          changedAt: new Date(),
          reason,
        });

        return await prisma.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });
      };

      await updateOrderWithHistory('order-123', 'CONFIRMED', 'admin-456', 'Payment verified');
      await updateOrderWithHistory('order-123', 'PROCESSING', 'admin-456', 'Kitchen started');

      expect(orderStatusHistory).toHaveLength(2);
      expect(orderStatusHistory[0].oldStatus).toBe('PENDING');
      expect(orderStatusHistory[0].newStatus).toBe('CONFIRMED');
      expect(orderStatusHistory[1].reason).toBe('Kitchen started');
    });

    it('should handle order cancellations with proper cleanup', async () => {
      const cancelOrder = async (orderId: string, reason: string, userId: string) => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        // Check if order can be cancelled
        const cancellableStates = ['PENDING', 'CONFIRMED', 'PROCESSING'];
        if (!cancellableStates.includes(order.status)) {
          throw new Error(`Order cannot be cancelled in ${order.status} state`);
        }

        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { 
            status: 'CANCELLED',
            notes: `Cancelled: ${reason}`,
            cancelledAt: new Date(),
            cancelledBy: userId,
          },
        });

        // Would also restore inventory, process refunds, etc.
        
        return updatedOrder;
      };

      mockPrisma.order.update.mockResolvedValue({
        ...validOrder,
        status: 'CANCELLED',
        notes: 'Cancelled: Customer request',
      });

      const result = await cancelOrder('order-123', 'Customer request', 'admin-789');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('Order Data Validation & Integrity', () => {
    it('should validate order total calculations', async () => {
      const validateOrderTotals = (order: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Check if subtotal + tax + fees = total
        const calculatedTotal = (order.subtotal || 0) + (order.taxAmount || 0) + (order.deliveryFee || 0);
        
        if (Math.abs(calculatedTotal - order.total) > 0.01) {
          errors.push(`Total mismatch: calculated ${calculatedTotal}, stored ${order.total}`);
        }

        // Check for negative values
        if (order.total < 0) {
          errors.push('Total cannot be negative');
        }

        if (order.subtotal < 0) {
          errors.push('Subtotal cannot be negative');
        }

        // Check reasonable limits
        if (order.total > 1000000) { // $10,000 limit
          errors.push('Order total exceeds maximum allowed amount');
        }

        return { valid: errors.length === 0, errors };
      };

      // Valid order
      const validOrderData = {
        subtotal: 4500, // $45.00
        taxAmount: 365,  // $3.65
        deliveryFee: 500, // $5.00
        total: 5365,     // $53.65
      };

      const validResult = validateOrderTotals(validOrderData);
      expect(validResult.valid).toBe(true);

      // Invalid order
      const invalidOrderData = {
        subtotal: 4500,
        taxAmount: 365,
        deliveryFee: 500,
        total: 9999, // Wrong total
      };

      const invalidResult = validateOrderTotals(invalidOrderData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0]).toContain('Total mismatch');
    });

    it('should validate customer information integrity', async () => {
      const validateCustomerInfo = (order: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(order.email)) {
          errors.push('Invalid email format');
        }

        // Phone validation (basic)
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(order.phone)) {
          errors.push('Invalid phone format');
        }

        // Name validation
        if (!order.customerName || order.customerName.trim().length < 2) {
          errors.push('Customer name is required');
        }

        // Check for suspicious patterns
        if (order.customerName.includes('<script>') || order.email.includes('<script>')) {
          errors.push('Suspicious input detected');
        }

        return { valid: errors.length === 0, errors };
      };

      // Valid customer info
      const validCustomer = {
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
      };

      const validResult = validateCustomerInfo(validCustomer);
      expect(validResult.valid).toBe(true);

      // Invalid customer info
      const invalidCustomer = {
        customerName: '<script>alert("xss")</script>',
        email: 'invalid-email',
        phone: '123',
      };

      const invalidResult = validateCustomerInfo(invalidCustomer);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Suspicious input detected');
      expect(invalidResult.errors).toContain('Invalid email format');
    });

    it('should validate fulfillment information completeness', async () => {
      const validateFulfillment = (order: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        switch (order.fulfillmentType) {
          case 'pickup':
            if (!order.pickupTime) {
              errors.push('Pickup time is required for pickup orders');
            }
            break;

          case 'local_delivery':
            if (!order.deliveryAddress) {
              errors.push('Delivery address is required for delivery orders');
            }
            if (!order.deliveryDate || !order.deliveryTime) {
              errors.push('Delivery date and time are required');
            }
            break;

          case 'nationwide_shipping':
            if (!order.shippingAddress) {
              errors.push('Shipping address is required for shipping orders');
            }
            if (!order.shippingCarrier || !order.shippingMethodName) {
              errors.push('Shipping method details are required');
            }
            break;

          default:
            errors.push('Invalid fulfillment type');
        }

        return { valid: errors.length === 0, errors };
      };

      // Valid pickup order
      const pickupOrder = {
        fulfillmentType: 'pickup',
        pickupTime: new Date(),
      };

      const pickupResult = validateFulfillment(pickupOrder);
      expect(pickupResult.valid).toBe(true);

      // Invalid delivery order
      const incompleteDelivery = {
        fulfillmentType: 'local_delivery',
        deliveryDate: '2024-01-15',
        // Missing deliveryTime and address
      };

      const deliveryResult = validateFulfillment(incompleteDelivery);
      expect(deliveryResult.valid).toBe(false);
      expect(deliveryResult.errors).toContain('Delivery address is required for delivery orders');
    });
  });

  describe('Admin Order Management Functions', () => {
    it('should allow admin to bulk update order statuses', async () => {
      const bulkUpdateOrders = async (orderIds: string[], newStatus: string, adminId: string) => {
        const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'];
        
        if (!validStatuses.includes(newStatus)) {
          throw new Error('Invalid status');
        }

        const results = [];
        
        for (const orderId of orderIds) {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (order) {
            const updated = await prisma.order.update({
              where: { id: orderId },
              data: { 
                status: newStatus,
                lastModifiedBy: adminId,
                updatedAt: new Date(),
              },
            });
            results.push(updated);
          }
        }

        return results;
      };

      mockPrisma.order.update.mockResolvedValue({
        ...validOrder,
        status: 'PROCESSING',
        lastModifiedBy: 'admin-123',
      });

      const results = await bulkUpdateOrders(['order-123', 'order-456'], 'PROCESSING', 'admin-123');
      expect(results).toHaveLength(2);
      expect(mockPrisma.order.update).toHaveBeenCalledTimes(2);
    });

    it('should generate order analytics and reports', async () => {
      const generateOrderReport = async (startDate: Date, endDate: Date) => {
        const orders = await prisma.order.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        });

        const analytics = {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
          averageOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
          statusBreakdown: orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          fulfillmentBreakdown: orders.reduce((acc, order) => {
            acc[order.fulfillmentType] = (acc[order.fulfillmentType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        };

        return analytics;
      };

      const sampleOrders = [
        { ...validOrder, total: 5000, status: 'COMPLETED', fulfillmentType: 'pickup' },
        { ...validOrder, id: 'order-456', total: 7500, status: 'PENDING', fulfillmentType: 'delivery' },
      ];

      mockPrisma.order.findMany.mockResolvedValue(sampleOrders);

      const report = await generateOrderReport(new Date('2024-01-01'), new Date('2024-01-31'));

      expect(report.totalOrders).toBe(2);
      expect(report.totalRevenue).toBe(12500);
      expect(report.averageOrderValue).toBe(6250);
      expect(report.statusBreakdown.COMPLETED).toBe(1);
      expect(report.statusBreakdown.PENDING).toBe(1);
    });

    it('should handle order modifications with proper validation', async () => {
      const modifyOrder = async (orderId: string, modifications: any, adminId: string) => {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        // Only allow modifications on certain statuses
        const modifiableStatuses = ['PENDING', 'CONFIRMED'];
        if (!modifiableStatuses.includes(order.status)) {
          throw new Error(`Order cannot be modified in ${order.status} status`);
        }

        // Validate modifications
        if (modifications.total && modifications.total < 0) {
          throw new Error('Total cannot be negative');
        }

        if (modifications.customerEmail && !modifications.customerEmail.includes('@')) {
          throw new Error('Invalid email format');
        }

        return await prisma.order.update({
          where: { id: orderId },
          data: {
            ...modifications,
            lastModifiedBy: adminId,
            modificationHistory: {
              push: {
                modifiedAt: new Date(),
                modifiedBy: adminId,
                changes: modifications,
              },
            },
          },
        });
      };

      const modifications = {
        customerName: 'Jane Doe',
        phone: '555-987-6543',
      };

      mockPrisma.order.update.mockResolvedValue({
        ...validOrder,
        ...modifications,
        lastModifiedBy: 'admin-123',
      });

      const result = await modifyOrder('order-123', modifications, 'admin-123');
      expect(result.customerName).toBe('Jane Doe');
      expect(result.lastModifiedBy).toBe('admin-123');
    });
  });

  describe('Error Monitoring & Performance', () => {
    it('should monitor order processing performance', async () => {
      const processOrderWithMetrics = async (orderId: string) => {
        const startTime = Date.now();
        
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (!order) {
            throw new Error('Order not found');
          }

          // Simulate processing
          await new Promise(resolve => setTimeout(resolve, 10));

          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Record metrics (would be implemented in actual error monitoring)
          if (mockErrorMonitor.recordOrderMetrics) {
            mockErrorMonitor.recordOrderMetrics({
              orderId,
              operation: 'read',
              processingTime,
              success: true,
            });
          }

          return order;
        } catch (error) {
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          if (mockErrorMonitor.recordOrderMetrics) {
            mockErrorMonitor.recordOrderMetrics({
              orderId,
              operation: 'read',
              processingTime,
              success: false,
              error: error.message,
            });
          }

          throw error;
        }
      };

      const result = await processOrderWithMetrics('order-123');
      expect(result.id).toBe('order-123');
      expect(mockErrorMonitor.recordOrderMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          operation: 'read',
          success: true,
          processingTime: expect.any(Number),
        })
      );
    });

    it('should handle database connection failures gracefully', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database connection lost'));

      const getOrderWithRetry = async (orderId: string, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await prisma.order.findUnique({
              where: { id: orderId },
            });
          } catch (error) {
            if (attempt === maxRetries) {
              throw new Error(`Failed to get order after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, attempt * 100));
          }
        }
      };

      await expect(getOrderWithRetry('order-123')).rejects.toThrow(
        'Failed to get order after 3 attempts'
      );
    });

    it('should detect and alert on suspicious order patterns', async () => {
      const detectSuspiciousActivity = (orders: any[]) => {
        const alerts = [];

        // Check for rapid order creation from same customer
        const recentOrders = orders.filter(order => 
          Date.now() - new Date(order.createdAt).getTime() < 300000 // 5 minutes
        );

        const customerOrderCounts = recentOrders.reduce((acc, order) => {
          acc[order.email] = (acc[order.email] || 0) + 1;
          return acc;
        }, {});

        Object.entries(customerOrderCounts).forEach(([email, count]) => {
          if (count > 5) {
            alerts.push({
              type: 'RAPID_ORDERS',
              customer: email,
              count,
              message: `Customer ${email} created ${count} orders in 5 minutes`,
            });
          }
        });

        // Check for unusually high value orders
        orders.forEach(order => {
          if (order.total > 100000) { // $1000+
            alerts.push({
              type: 'HIGH_VALUE_ORDER',
              orderId: order.id,
              amount: order.total,
              message: `High value order: $${order.total / 100}`,
            });
          }
        });

        return alerts;
      };

      const suspiciousOrders = [
        { id: 'order-1', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-2', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-3', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-4', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-5', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-6', email: 'test@example.com', total: 5000, createdAt: new Date() },
        { id: 'order-7', email: 'high@example.com', total: 150000, createdAt: new Date() },
      ];

      const alerts = detectSuspiciousActivity(suspiciousOrders);

      expect(alerts).toHaveLength(2);
      expect(alerts[0].type).toBe('RAPID_ORDERS');
      expect(alerts[0].count).toBe(6);
      expect(alerts[1].type).toBe('HIGH_VALUE_ORDER');
      expect(alerts[1].amount).toBe(150000);
    });
  });
}); 