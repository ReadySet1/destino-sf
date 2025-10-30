/**
 * Order Management Helpers for E2E Tests
 *
 * Utilities for creating, managing, and cleaning up test orders
 */

import { PrismaClient, OrderStatus, PaymentStatus, FulfillmentType } from '@prisma/client';
import { Page } from '@playwright/test';

export interface TestOrderOptions {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentType?: FulfillmentType;
  paymentMethod?: 'SQUARE' | 'CASH';
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subtotal?: number;
  taxAmount?: number;
  shippingCost?: number;
  totalAmount?: number;
  items?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  squareOrderId?: string;
  squarePaymentId?: string;
  notes?: string;
  isArchived?: boolean;
  archiveReason?: string;
}

/**
 * Order Helper Class for Playwright Tests
 */
export class OrderHelpers {
  private static prisma: PrismaClient;

  /**
   * Initialize with Prisma client
   */
  static initialize(prisma: PrismaClient): void {
    this.prisma = prisma;
  }

  /**
   * Get Prisma client (create if not exists)
   */
  private static getPrisma(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient();
    }
    return this.prisma;
  }

  /**
   * Create a test order with specified options
   */
  static async createTestOrder(options: TestOrderOptions = {}): Promise<any> {
    const prisma = this.getPrisma();

    // Get test user if not provided
    let userId = options.userId;
    if (!userId) {
      const testUser = await prisma.profile.findUnique({
        where: { email: 'test.user@example.com' },
      });
      userId = testUser?.id;
    }

    if (!userId) {
      throw new Error('Test user not found. Run database seeder first.');
    }

    // Default order data
    const testIdentifier = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const orderData = {
      userId: userId,
      squareOrderId: options.squareOrderId || testIdentifier,
      status: options.status || 'PENDING',
      paymentStatus: options.paymentStatus || 'PENDING',
      fulfillmentType: options.fulfillmentType || 'PICKUP',
      paymentMethod: options.paymentMethod || 'SQUARE',
      customerName: options.customerName || 'Test Customer',
      email: options.customerEmail || 'test.user@example.com',
      phone: options.customerPhone || '(555) 123-4567',
      total: (options.totalAmount || 3356) / 100, // Convert cents to dollars
      taxAmount: (options.taxAmount || 256) / 100, // Convert to Decimal
      shippingCostCents: options.shippingCost || 0,
      notes: options.notes || '',
      isArchived: options.isArchived || false,
      archiveReason: options.archiveReason,
    };

    // Create order
    const order = await prisma.order.create({
      data: orderData,
    });

    // Add order items if provided
    if (options.items && options.items.length > 0) {
      for (const item of options.items) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.unitPrice,
          },
        });
      }
    } else {
      // Create default items if none provided
      const products = await prisma.product.findMany({ take: 2 });
      if (products.length > 0) {
        for (const product of products) {
          await prisma.orderItem.create({
            data: {
              orderId: order.id,
              productId: product.id,
              quantity: 1,
              price: product.price,
            },
          });
        }
      }
    }

    // Fetch complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        profile: true,
      },
    });

    console.log(`✅ Created test order: ${order.squareOrderId} (${order.status}/${order.paymentStatus})`);
    return completeOrder;
  }

  /**
   * Create an order with a specific status
   */
  static async createOrderInStatus(
    status: OrderStatus,
    options: Omit<TestOrderOptions, 'status'> = {}
  ): Promise<any> {
    return this.createTestOrder({ ...options, status });
  }

  /**
   * Create an order with a specific payment status
   */
  static async createOrderWithPaymentStatus(
    paymentStatus: PaymentStatus,
    options: Omit<TestOrderOptions, 'paymentStatus'> = {}
  ): Promise<any> {
    return this.createTestOrder({ ...options, paymentStatus });
  }

  /**
   * Create multiple orders in different states for comprehensive testing
   */
  static async createTestOrderSet(): Promise<{
    pending: any;
    processing: any;
    ready: any;
    completed: any;
    cancelled: any;
    failedPayment: any;
    nationwideShipping: any;
    archived: any;
  }> {
    const [pending, processing, ready, completed, cancelled, failedPayment, nationwideShipping, archived] =
      await Promise.all([
        // PENDING order with PENDING payment
        this.createTestOrder({
          status: 'PENDING',
          paymentStatus: 'PENDING',
          customerName: 'Pending Customer',
          customerEmail: 'pending@test.com',
        }),

        // PROCESSING order with PAID payment
        this.createTestOrder({
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          customerName: 'Processing Customer',
          customerEmail: 'processing@test.com',
          squareOrderId: 'sq-order-processing-123',
          squarePaymentId: 'sq-payment-processing-123',
        }),

        // READY order with PAID payment
        this.createTestOrder({
          status: 'READY',
          paymentStatus: 'PAID',
          customerName: 'Ready Customer',
          customerEmail: 'ready@test.com',
          squareOrderId: 'sq-order-ready-456',
          squarePaymentId: 'sq-payment-ready-456',
        }),

        // COMPLETED order
        this.createTestOrder({
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          customerName: 'Completed Customer',
          customerEmail: 'completed@test.com',
          squareOrderId: 'sq-order-completed-789',
          squarePaymentId: 'sq-payment-completed-789',
        }),

        // CANCELLED order
        this.createTestOrder({
          status: 'CANCELLED',
          paymentStatus: 'PENDING',
          customerName: 'Cancelled Customer',
          customerEmail: 'cancelled@test.com',
          notes: 'Order cancelled by customer',
        }),

        // Failed payment order
        this.createTestOrder({
          status: 'PENDING',
          paymentStatus: 'FAILED',
          customerName: 'Failed Payment Customer',
          customerEmail: 'failed@test.com',
          notes: 'Payment failed - awaiting retry',
        }),

        // Nationwide shipping order
        this.createTestOrder({
          status: 'PENDING',
          paymentStatus: 'PAID',
          fulfillmentType: 'NATIONWIDE_SHIPPING',
          customerName: 'Nationwide Customer',
          customerEmail: 'nationwide@test.com',
          shippingCost: 1595, // $15.95
          totalAmount: 4951, // Adjusted total
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
          },
          squareOrderId: 'sq-order-shipping-111',
          squarePaymentId: 'sq-payment-shipping-111',
        }),

        // Archived order
        this.createTestOrder({
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          customerName: 'Archived Customer',
          customerEmail: 'archived@test.com',
          isArchived: true,
          archiveReason: 'Order completed and archived for testing',
          squareOrderId: 'sq-order-archived-999',
          squarePaymentId: 'sq-payment-archived-999',
        }),
      ]);

    console.log('✅ Created complete test order set (8 orders)');
    return {
      pending,
      processing,
      ready,
      completed,
      cancelled,
      failedPayment,
      nationwideShipping,
      archived,
    };
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<any> {
    const prisma = this.getPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        profile: true,
      },
    });

    return order;
  }

  /**
   * Get order by square order ID
   */
  static async getOrderBySquareId(squareOrderId: string): Promise<any> {
    const prisma = this.getPrisma();

    const order = await prisma.order.findUnique({
      where: { squareOrderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        profile: true,
      },
    });

    return order;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<any> {
    const prisma = this.getPrisma();

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    console.log(`✅ Updated order ${orderId} status to ${status}`);
    return order;
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<any> {
    const prisma = this.getPrisma();

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    console.log(`✅ Updated order ${orderId} payment status to ${paymentStatus}`);
    return order;
  }

  /**
   * Archive an order
   */
  static async archiveOrder(orderId: string, reason: string): Promise<any> {
    const prisma = this.getPrisma();

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        isArchived: true,
        archiveReason: reason,
      },
    });

    console.log(`✅ Archived order ${orderId}`);
    return order;
  }

  /**
   * Clean up all test orders
   */
  static async cleanupTestOrders(): Promise<void> {
    const prisma = this.getPrisma();

    try {
      // First, find all test orders by squareOrderId pattern
      const testOrders = await prisma.order.findMany({
        where: {
          OR: [
            {
              squareOrderId: {
                startsWith: 'TEST-',
              },
            },
            {
              squareOrderId: {
                startsWith: 'ADMIN-TEST-',
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      const orderIds = testOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        // Delete test order items
        await prisma.orderItem.deleteMany({
          where: {
            orderId: {
              in: orderIds,
            },
          },
        });

        // Delete test orders
        const result = await prisma.order.deleteMany({
          where: {
            id: {
              in: orderIds,
            },
          },
        });

        console.log(`✅ Cleaned up ${result.count} test orders`);
      } else {
        console.log('✅ No test orders to clean up');
      }
    } catch (error) {
      console.error('❌ Failed to clean up test orders:', error);
      throw error;
    }
  }

  /**
   * Clean up specific order by ID
   */
  static async cleanupOrder(orderId: string): Promise<void> {
    const prisma = this.getPrisma();

    try {
      // Delete order items
      await prisma.orderItem.deleteMany({
        where: { orderId },
      });

      // Delete order
      await prisma.order.delete({
        where: { id: orderId },
      });

      console.log(`✅ Cleaned up order ${orderId}`);
    } catch (error) {
      console.error(`❌ Failed to clean up order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Navigate to order details page
   */
  static async navigateToOrderPage(page: Page, orderNumber: string): Promise<void> {
    await page.goto(`/orders/${orderNumber}`);
    console.log(`✅ Navigated to order page: ${orderNumber}`);
  }

  /**
   * Get all test orders
   */
  static async getAllTestOrders(): Promise<any[]> {
    const prisma = this.getPrisma();

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          {
            squareOrderId: {
              startsWith: 'TEST-',
            },
          },
          {
            squareOrderId: {
              startsWith: 'ADMIN-TEST-',
            },
          },
        ],
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  /**
   * Close Prisma connection
   */
  static async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      console.log('✅ Disconnected from database');
    }
  }
}
