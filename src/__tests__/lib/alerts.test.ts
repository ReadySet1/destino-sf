import { AlertService } from '@/lib/alerts';
import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { 
  AlertType, 
  AlertPriority, 
  AlertStatus,
  OrderStatus,
  PaymentStatus 
} from '@prisma/client';
import { FulfillmentType } from '@/types/order';
import { OrderWithItems } from '@/types/alerts';

// Mock dependencies
jest.mock('resend');
jest.mock('@/lib/db', () => ({
  prisma: {
    emailAlert: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('@/env', () => ({
  env: {
    RESEND_API_KEY: 'test-api-key',
    ADMIN_EMAIL: 'admin@test.com',
    FROM_EMAIL: 'noreply@test.com',
    SHOP_NAME: 'Test Shop',
    NODE_ENV: 'test',
  },
}));

const mockResend = {
  emails: {
    send: jest.fn(),
  },
} as any;

const mockPrisma = prisma as any;

(Resend as jest.MockedClass<typeof Resend>).mockImplementation(() => mockResend);

describe('Alert Service System (Phase 2 - Monitoring Support)', () => {
  let alertService: AlertService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    alertService = new AlertService();
    
    // Setup default mocks
    mockPrisma.emailAlert.create.mockResolvedValue({
      id: 'alert-123',
      type: AlertType.NEW_ORDER,
      priority: AlertPriority.HIGH,
    });
    
    mockPrisma.emailAlert.update.mockResolvedValue({});
    mockResend.emails.send.mockResolvedValue({
      data: { id: 'email-123' },
      error: null,
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('New Order Alerts', () => {
    const mockOrder: OrderWithItems = {
      id: 'order-123',
      total: 45.99,
      userId: 'user-456',
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PAID,
      fulfillmentType: FulfillmentType.PICKUP,
      createdAt: new Date(),
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: 12.99,
          product: {
            id: 'prod-1',
            name: 'Test Product',
            slug: 'test-product',
          },
          variant: {
            id: 'var-1',
            name: 'Medium',
            price: 12.99,
          },
        },
      ],
    } as any;

    it('should send new order alert successfully', async () => {
      mockPrisma.order.count.mockResolvedValue(5); // 5 orders today
      
      const result = await alertService.sendNewOrderAlert(mockOrder);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123');
      
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.NEW_ORDER,
          priority: AlertPriority.HIGH,
          recipientEmail: 'admin@test.com',
          subject: expect.stringContaining('New Order #order-123'),
          relatedOrderId: 'order-123',
          relatedUserId: 'user-456',
        }),
      });

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test Shop Alerts <noreply@test.com>',
        to: 'admin@test.com',
        subject: expect.stringContaining('New Order #order-123 - $45.99'),
        react: expect.any(Object),
      });
    });

    it('should handle email sending failures', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Email service unavailable' },
      });

      const result = await alertService.sendNewOrderAlert(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service unavailable');
      expect(result.retryable).toBe(true);

      expect(mockPrisma.emailAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-123' },
        data: {
          status: AlertStatus.FAILED,
          failedAt: expect.any(Date),
          metadata: { error: 'Email service unavailable' },
          retryCount: { increment: 1 },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.order.count.mockRejectedValue(new Error('Database connection failed'));

      const result = await alertService.sendNewOrderAlert(mockOrder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.retryable).toBe(true);
    });

    it('should include daily order count in alert data', async () => {
      mockPrisma.order.count.mockResolvedValue(15);

      await alertService.sendNewOrderAlert(mockOrder);

      expect(mockPrisma.order.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('Order Status Change Alerts', () => {
    const mockOrderStatusData = {
      order: {
        id: 'order-123',
        status: OrderStatus.READY_FOR_PICKUP,
        customer: {
          email: 'customer@test.com',
          name: 'John Doe',
        },
        total: 29.99,
      },
      previousStatus: OrderStatus.PREPARING,
    } as any;

    it('should send order status change alert to admin', async () => {
      const result = await alertService.sendOrderStatusChangeAlert(mockOrderStatusData);

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.ORDER_STATUS_CHANGE,
          priority: AlertPriority.MEDIUM,
          recipientEmail: 'admin@test.com',
          subject: expect.stringContaining('Order Status Update'),
          relatedOrderId: 'order-123',
        }),
      });
    });

    it('should handle order status change with missing customer data', async () => {
      const dataWithoutCustomer = {
        ...mockOrderStatusData,
        order: {
          ...mockOrderStatusData.order,
          customer: null,
        },
      };

      const result = await alertService.sendOrderStatusChangeAlert(dataWithoutCustomer);

      expect(result.success).toBe(true);
    });

    it('should track status change metadata', async () => {
      await alertService.sendOrderStatusChangeAlert(mockOrderStatusData);

      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            orderId: 'order-123',
            newStatus: OrderStatus.READY_FOR_PICKUP,
            previousStatus: OrderStatus.PREPARING,
          }),
        }),
      });
    });
  });

  describe('Payment Failed Alerts', () => {
    const mockPaymentFailedData = {
      order: {
        id: 'order-123',
        total: 75.50,
        customer: {
          email: 'customer@test.com',
          name: 'Jane Smith',
        },
      },
      error: new Error('Card declined: insufficient funds'),
      paymentDetails: {
        paymentId: 'pay-456',
        amount: 7550,
        last4: '4242',
      },
    } as any;

    it('should send payment failed alert to admin', async () => {
      const result = await alertService.sendPaymentFailedAlert(mockPaymentFailedData);

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.PAYMENT_FAILED,
          priority: AlertPriority.CRITICAL,
          recipientEmail: 'admin@test.com',
          subject: expect.stringContaining('Payment Failed'),
          relatedOrderId: 'order-123',
        }),
      });
    });

    it('should include payment error details in metadata', async () => {
      await alertService.sendPaymentFailedAlert(mockPaymentFailedData);

      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            orderId: 'order-123',
            errorMessage: 'Card declined: insufficient funds',
            paymentId: 'pay-456',
            amount: 7550,
          }),
        }),
      });
    });

    it('should handle payment failures without customer info', async () => {
      const dataWithoutCustomer = {
        ...mockPaymentFailedData,
        order: {
          ...mockPaymentFailedData.order,
          customer: null,
        },
      };

      const result = await alertService.sendPaymentFailedAlert(dataWithoutCustomer);
      expect(result.success).toBe(true);
    });
  });

  describe('System Error Alerts (Sentry Integration Support)', () => {
    it('should send system error alert with proper context', async () => {
      const error = new Error('Database connection timeout');
      const context = {
        component: 'OrderService',
        action: 'createOrder',
        userId: 'user-123',
        requestId: 'req-456',
        severity: 'CRITICAL',
        timestamp: new Date(),
      };

      const result = await alertService.sendSystemErrorAlert(error, context);

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.SYSTEM_ERROR,
          priority: AlertPriority.CRITICAL,
          recipientEmail: 'admin@test.com',
          subject: expect.stringContaining('System Error: Error'),
        }),
      });
    });

    it('should handle errors without names', async () => {
      const error = new Error('Unnamed error');
      delete (error as any).name;

      const result = await alertService.sendSystemErrorAlert(error, {});

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subject: expect.stringContaining('System Error: Unknown Error'),
        }),
      });
    });

    it('should prepare context for Sentry integration', async () => {
      const error = new Error('Payment processing failed');
      const sentryContext = {
        component: 'PaymentProcessor',
        action: 'processPayment',
        userId: 'user-789',
        tags: {
          environment: 'production',
          service: 'destino-sf',
        },
        extra: {
          orderId: 'order-789',
          paymentMethod: 'card',
          amount: 4500,
        },
        fingerprint: ['payment', 'processing', 'failed'],
      };

      const result = await alertService.sendSystemErrorAlert(error, sentryContext);

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            error,
            context: expect.objectContaining(sentryContext),
            timestamp: expect.any(Date),
          }),
        }),
      });
    });
  });

  describe('Daily Summary Alerts', () => {
    const mockSummaryData = {
      date: new Date('2024-01-15'),
      totalOrders: 25,
      totalRevenue: 1250.75,
      ordersByFulfillment: {
        pickup: 15,
        local_delivery: 8,
        nationwide_shipping: 2,
      },
      topProducts: [
        { name: 'Empanada de Carne', count: 45 },
        { name: 'Alfajor de Dulce', count: 32 },
      ],
      averageOrderValue: 50.03,
      failedOrders: 2,
      pendingOrders: 3,
      systemErrors: 1,
      alertsSent: 18,
    };

    beforeEach(() => {
      // Mock the database queries for daily summary
      mockPrisma.order.findMany.mockResolvedValue([
        { 
          id: 'order-1', 
          total: 45.99, 
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.COMPLETED,
          fulfillmentType: FulfillmentType.pickup,
        },
        { 
          id: 'order-2', 
          total: 32.50, 
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.CANCELLED,
          fulfillmentType: FulfillmentType.local_delivery,
        },
      ]);

      mockPrisma.orderItem.groupBy.mockResolvedValue([
        { name: 'Empanada de Carne', _count: 45 },
        { name: 'Alfajor de Dulce', _count: 32 },
      ]);

      mockPrisma.emailAlert.count
        .mockResolvedValueOnce(1) // system errors
        .mockResolvedValueOnce(18); // alerts sent
    });

    it('should send daily summary with comprehensive metrics', async () => {
      const result = await alertService.sendDailySummary(new Date('2024-01-15'));

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.DAILY_SUMMARY,
          priority: AlertPriority.LOW,
          recipientEmail: 'admin@test.com',
          subject: expect.stringContaining('Daily Summary - Mon Jan 15 2024'),
        }),
      });
    });

    it('should handle database errors during summary collection', async () => {
      mockPrisma.order.findMany.mockRejectedValue(new Error('Database unavailable'));

      const result = await alertService.sendDailySummary();

      expect(result.success).toBe(true); // Should still send with default data
    });

    it('should calculate metrics correctly from order data', async () => {
      await alertService.sendDailySummary(new Date('2024-01-15'));

      // Verify the calculations based on mock data
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  });

  describe('Customer Notifications', () => {
    it('should send order confirmation to customer', async () => {
      const orderData = {
        order: {
          id: 'order-123',
          total: 45.99,
          items: [],
          customer: {
            email: 'customer@test.com',
            name: 'John Customer',
          },
        },
      } as any;

      const result = await alertService.sendCustomerOrderConfirmation(orderData);

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test Shop <noreply@test.com>',
        to: 'customer@test.com',
        subject: expect.stringContaining('Order Confirmation'),
        react: expect.any(Object),
      });
    });

    it('should send pickup ready notification', async () => {
      const pickupData = {
        order: {
          id: 'order-123',
          customer: {
            email: 'customer@test.com',
            name: 'Jane Customer',
          },
        },
        estimatedPickupTime: new Date(),
      } as any;

      const result = await alertService.sendCustomerPickupReady(pickupData);

      expect(result.success).toBe(true);
      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.CUSTOMER_PICKUP_READY,
          priority: AlertPriority.HIGH,
          recipientEmail: 'customer@test.com',
        }),
      });
    });

    it('should handle missing customer email gracefully', async () => {
      const orderData = {
        order: {
          id: 'order-123',
          customer: {
            email: null,
            name: 'John Customer',
          },
        },
      } as any;

      const result = await alertService.sendCustomerOrderConfirmation(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No customer email provided');
    });
  });

  describe('Contact Form Processing', () => {
    const contactData = {
      name: 'Contact Person',
      email: 'contact@test.com',
      type: 'general',
      subject: 'Test Inquiry',
      message: 'This is a test message',
      timestamp: new Date(),
    };

    it('should process contact form with auto-reply and admin notification', async () => {
      const result = await alertService.processContactForm(contactData, 'Test Shop');

      expect(result.success).toBe(true);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2); // Customer auto-reply + admin notification

      // Check customer auto-reply
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test Shop <noreply@test.com>',
        to: 'contact@test.com',
        subject: expect.stringContaining('received your message'),
        html: expect.stringContaining('Thank you for contacting us'),
      });

      // Check admin notification
      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test Shop Alerts <noreply@test.com>',
        to: ['admin@test.com'],
        subject: expect.stringContaining('New Contact Form: general'),
        html: expect.stringContaining(contactData.message),
      });
    });

    it('should handle contact form without subject', async () => {
      const dataWithoutSubject = { ...contactData };
      delete dataWithoutSubject.subject;

      const result = await alertService.processContactForm(dataWithoutSubject, 'Test Shop');

      expect(result.success).toBe(true);
    });

    it('should create alert record for contact form', async () => {
      await alertService.processContactForm(contactData, 'Test Shop');

      expect(mockPrisma.emailAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: AlertType.CONTACT_FORM_RECEIVED,
          priority: AlertPriority.MEDIUM,
          recipientEmail: 'contact@test.com',
          subject: expect.stringContaining('Contact form submission'),
          metadata: expect.objectContaining({
            type: 'general',
            subject: 'Test Inquiry',
            message: contactData.message,
          }),
        }),
      });
    });
  });

  describe('Alert Retry Mechanism', () => {
    beforeEach(() => {
      mockPrisma.emailAlert.findMany.mockResolvedValue([
        {
          id: 'failed-alert-1',
          type: AlertType.NEW_ORDER,
          recipientEmail: 'admin@test.com',
          subject: 'Failed Order Alert',
          metadata: { orderId: 'order-123' },
          retryCount: 1,
          relatedOrder: {
            id: 'order-123',
            items: [],
          },
        },
      ]);
    });

    it('should retry failed alerts', async () => {
      await alertService.retryFailedAlerts();

      expect(mockPrisma.emailAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: AlertStatus.FAILED,
          retryCount: { lt: 3 }, // default max retries
        },
        include: expect.any(Object),
      });
    });

    it('should respect custom retry configuration', async () => {
      const customConfig = {
        maxRetries: 5,
        retryDelayMs: 10000,
        exponentialBackoff: true,
      };

      await alertService.retryFailedAlerts(customConfig);

      expect(mockPrisma.emailAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: AlertStatus.FAILED,
          retryCount: { lt: 5 },
        },
        include: expect.any(Object),
      });
    });

    it('should handle retry failures gracefully', async () => {
      mockResend.emails.send.mockRejectedValue(new Error('Still failing'));

      // Should not throw
      await expect(alertService.retryFailedAlerts()).resolves.not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent alert sending', async () => {
      const orders = Array.from({ length: 10 }, (_, i) => ({
        id: `order-${i}`,
        total: 25.99,
        userId: `user-${i}`,
        items: [],
      })) as any[];

      const promises = orders.map(order => alertService.sendNewOrderAlert(order));
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
      
      expect(mockResend.emails.send).toHaveBeenCalledTimes(10);
    });

    it('should efficiently process large daily summaries', async () => {
      // Mock large dataset
      const largeOrderSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `order-${i}`,
        total: Math.random() * 100,
        paymentStatus: PaymentStatus.PAID,
        status: OrderStatus.COMPLETED,
        fulfillmentType: FulfillmentType.pickup,
      }));

      mockPrisma.order.findMany.mockResolvedValue(largeOrderSet);

      const startTime = Date.now();
      await alertService.sendDailySummary();
      const processingTime = Date.now() - startTime;

      // Should process efficiently (under 500ms for large dataset)
      expect(processingTime).toBeLessThan(500);
    });
  });

  describe('Error Resilience', () => {
    it('should not crash when email service is completely unavailable', async () => {
      mockResend.emails.send.mockImplementation(() => {
        throw new Error('Service completely down');
      });

      const mockOrder = {
        id: 'order-test',
        total: 30.00,
        items: [],
      } as any;

      const result = await alertService.sendNewOrderAlert(mockOrder);

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });

    it('should handle malformed order data gracefully', async () => {
      const malformedOrder = {
        id: null,
        total: 'not-a-number',
        items: 'not-an-array',
      } as any;

      const result = await alertService.sendNewOrderAlert(malformedOrder);

      expect(result.success).toBe(false);
    });

    it('should continue processing other alerts when one fails', async () => {
      const orders = [
        { id: 'order-1', total: 25.99, items: [] },
        { id: 'order-2', total: 'invalid', items: [] }, // This will fail
        { id: 'order-3', total: 35.99, items: [] },
      ] as any[];

      let successCount = 0;
      let failureCount = 0;

      for (const order of orders) {
        const result = await alertService.sendNewOrderAlert(order);
        if (result.success) successCount++;
        else failureCount++;
      }

      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });
  });
}); 