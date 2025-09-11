// Set required environment variables for t3-env validation before any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
process.env.SQUARE_WEBHOOK_SECRET_SANDBOX = 'test-signature-key';
process.env.SQUARE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.FROM_EMAIL = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SQUARE_LOCATION_ID = 'test-location-id';
process.env.SQUARE_SANDBOX_TOKEN = 'test-sandbox-token';
process.env.SQUARE_PRODUCTION_TOKEN = 'test-production-token';
process.env.SUPPORT_EMAIL = 'support@test.com';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { validateOrderMinimums } from '@/lib/cart-helpers';
import { AlertService } from '@/lib/alerts';
import { errorMonitor } from '@/lib/error-monitoring';
import { PaymentMethod } from '@prisma/client';

// Mock dependencies
jest.mock('@/utils/supabase/server');
jest.mock('@/lib/db');
jest.mock('@/lib/cart-helpers');
jest.mock('next/cache');
jest.mock('@/lib/alerts');
jest.mock('@/lib/error-monitoring');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

// Import the actual functions to test
import {
  createOrderAndGenerateCheckoutUrl,
  updateOrderPayment,
  getOrderById,
  createManualPaymentOrder,
  validateOrderMinimumsServer,
} from '@/app/actions/orders';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;
const mockValidateOrderMinimums = validateOrderMinimums as jest.MockedFunction<
  typeof validateOrderMinimums
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockAlertService = AlertService as jest.MockedClass<typeof AlertService>;

describe('Order Actions - Real Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockSupabase.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
      },
    } as any);

    mockValidateOrderMinimums.mockResolvedValue({
      isValid: true,
      errorMessage: null,
    });

    mockRevalidatePath.mockReturnValue(undefined);

    // Mock Prisma operations
    mockPrisma.order.create.mockResolvedValue({
      id: 'order-123',
      squareOrderId: null,
      status: 'PENDING',
      total: { toNumber: () => 41.97 } as any,
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      fulfillmentType: 'pickup',
      pickupTime: new Date(),
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
      taxAmount: { toNumber: () => 3.47 } as any,
      isCateringOrder: false,
      notes: null,
      deliveryDate: null,
      deliveryTime: null,
      shippingMethodName: null,
      shippingCarrier: null,
      shippingServiceLevelToken: null,
      shippingCostCents: null,
      shippingRateId: null,
      trackingNumber: null,
      cancelReason: null,
      rawData: null,
      paymentUrl: null,
      paymentUrlExpiresAt: null,
      retryCount: 0,
      lastRetryAt: null,
      profile: null,
      items: [],
    });

    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-123',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      fulfillmentType: 'pickup',
      total: { toNumber: () => 41.97 } as any,
      taxAmount: { toNumber: () => 3.47 } as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
      isCateringOrder: false,
      items: [
        {
          id: 'item-1',
          quantity: 2,
          price: { toNumber: () => 12.99 } as any,
          productId: 'product-1',
          variantId: 'variant-1',
          orderId: 'order-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            id: 'product-1',
            name: 'Beef Empanadas',
            price: { toNumber: () => 12.99 } as any,
            squareId: 'square-product-1',
            description: null,
            categoryId: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            category: null,
            variants: [],
            orderItems: [],
          },
          variant: {
            id: 'variant-1',
            name: 'Regular Size',
            price: { toNumber: () => 12.99 } as any,
            squareVariantId: 'square-variant-1',
            productId: 'product-1',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            product: null,
            orderItems: [],
          },
        },
      ],
    });

    mockPrisma.order.update.mockResolvedValue({
      id: 'order-123',
      squareOrderId: 'square-123',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      fulfillmentType: 'pickup',
      total: { toNumber: () => 41.97 } as any,
      taxAmount: { toNumber: () => 3.47 } as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'user-123',
      isCateringOrder: false,
      notes: 'Payment processed',
      pickupTime: new Date(),
      deliveryDate: null,
      deliveryTime: null,
      shippingMethodName: null,
      shippingCarrier: null,
      shippingServiceLevelToken: null,
      shippingCostCents: null,
      shippingRateId: null,
      trackingNumber: null,
      cancelReason: null,
      rawData: null,
      paymentUrl: null,
      paymentUrlExpiresAt: null,
      retryCount: 0,
      lastRetryAt: null,
      profile: null,
      items: [],
    });

    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.storeSettings.findFirst.mockResolvedValue({
      id: 'settings-1',
      minOrderAmount: 10,
      cateringMinimumAmount: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock fetch for Square API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        payment_link: {
          url: 'https://checkout.square.com/test',
          order_id: 'square-order-123',
        },
      }),
    });

    // Mock AlertService
    mockAlertService.mockImplementation(() => ({
      sendNewOrderAlert: jest.fn().mockResolvedValue(undefined),
      sendOrderStatusChangeAlert: jest.fn().mockResolvedValue(undefined),
      sendPaymentFailedAlert: jest.fn().mockResolvedValue(undefined),
    }));
  });

  describe('createOrderAndGenerateCheckoutUrl', () => {
    const validFormData = {
      items: [
        {
          id: 'product-1',
          name: 'Beef Empanadas',
          price: 12.99,
          quantity: 2,
          variantId: 'variant-1',
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-15T14:00:00.000Z',
      },
      paymentMethod: PaymentMethod.SQUARE,
    };

    test('should create pickup order successfully', async () => {
      const result = await createOrderAndGenerateCheckoutUrl(validFormData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.checkoutUrl).toBe('https://checkout.square.com/test');

      // Verify database was called
      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalled();

      // Verify revalidation was called
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders/order-123');
    });

    test('should handle validation failures', async () => {
      mockValidateOrderMinimums.mockResolvedValueOnce({
        isValid: false,
        errorMessage: 'Order minimum not met',
      });

      const result = await createOrderAndGenerateCheckoutUrl(validFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('minimum');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBeNull();
    });

    test('should handle invalid form data', async () => {
      const invalidFormData = {
        ...validFormData,
        customerInfo: {
          ...validFormData.customerInfo,
          email: 'invalid-email',
        },
      };

      const result = await createOrderAndGenerateCheckoutUrl(invalidFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPrisma.order.create.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await createOrderAndGenerateCheckoutUrl(validFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save order details');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBeNull();
    });

    test('should handle Square API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          errors: [{ code: 'INVALID_REQUEST', detail: 'Invalid location ID' }],
        }),
      });

      const result = await createOrderAndGenerateCheckoutUrl(validFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment provider error');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBe('order-123'); // Order was created before Square error
    });
  });

  describe('updateOrderPayment', () => {
    test('should update payment status successfully', async () => {
      const result = await updateOrderPayment(
        'order-123',
        'square-123',
        'PAID',
        'Payment processed'
      );

      expect(result.id).toBe('order-123');
      expect(result.paymentStatus).toBe('PAID');
      expect(result.status).toBe('PROCESSING');

      // Verify database was called
      expect(mockPrisma.order.findUnique).toHaveBeenCalled();
      expect(mockPrisma.order.update).toHaveBeenCalled();

      // Verify revalidation was called
      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/orders/order-123');
    });

    test('should handle payment failures', async () => {
      mockPrisma.order.update.mockResolvedValueOnce({
        ...mockPrisma.order.update.mock.results[0].value,
        paymentStatus: 'FAILED',
        status: 'CANCELLED',
      });

      const result = await updateOrderPayment(
        'order-123',
        'square-123',
        'FAILED',
        'Payment failed'
      );

      expect(result.paymentStatus).toBe('FAILED');
      expect(result.status).toBe('CANCELLED');
    });

    test('should handle database errors', async () => {
      mockPrisma.order.update.mockRejectedValueOnce(new Error('Database error'));

      await expect(updateOrderPayment('order-123', 'square-123', 'PAID')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getOrderById', () => {
    test('should retrieve order successfully', async () => {
      const result = await getOrderById('order-123');

      expect(result).toBeDefined();
      if (result && 'id' in result) {
        expect(result.id).toBe('order-123');
        expect(result.customerName).toBe('John Doe');
        expect(result.customerEmail).toBe('john@example.com');
        expect(result.items).toHaveLength(1);
      }
    });

    test('should return null for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValueOnce(null);

      const result = await getOrderById('non-existent');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPrisma.order.findUnique.mockRejectedValueOnce(new Error('Database error'));

      const result = await getOrderById('order-123');

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
    });
  });

  describe('createManualPaymentOrder', () => {
    const validFormData = {
      items: [
        {
          id: 'product-1',
          name: 'Beef Empanadas',
          price: 12.99,
          quantity: 2,
          variantId: 'variant-1',
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-555-0123',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-15T14:00:00.000Z',
      },
      paymentMethod: PaymentMethod.CASH,
    };

    test('should create cash order successfully', async () => {
      const result = await createManualPaymentOrder(validFormData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.checkoutUrl).toContain('/payment/order-123');
      expect(result.checkoutUrl).toContain('method=CASH');
    });

    test('should reject unsupported payment methods', async () => {
      const invalidFormData = {
        ...validFormData,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createManualPaymentOrder(invalidFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported for manual processing');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBeNull();
    });

    test('should handle validation failures', async () => {
      mockValidateOrderMinimums.mockResolvedValueOnce({
        isValid: false,
        errorMessage: 'Order minimum not met',
      });

      const result = await createManualPaymentOrder(validFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('minimum');
      expect(result.checkoutUrl).toBeNull();
      expect(result.orderId).toBeNull();
    });
  });

  describe('validateOrderMinimumsServer', () => {
    const testItems = [
      {
        id: 'product-1',
        name: 'Beef Empanadas',
        price: 12.99,
        quantity: 2,
        variantId: 'variant-1',
      },
    ];

    test('should validate orders successfully', async () => {
      const result = await validateOrderMinimumsServer(testItems);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    test('should reject empty cart', async () => {
      const result = await validateOrderMinimumsServer([]);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });

    test('should validate against store minimums', async () => {
      mockPrisma.storeSettings.findFirst.mockResolvedValueOnce({
        id: 'settings-1',
        minOrderAmount: 50,
        cateringMinimumAmount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await validateOrderMinimumsServer(testItems);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('minimum purchase');
      expect(result.minimumRequired).toBe(50);
      expect(result.currentAmount).toBe(25.98); // 12.99 * 2
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.storeSettings.findFirst.mockRejectedValueOnce(new Error('Database error'));

      const result = await validateOrderMinimumsServer(testItems);

      // Should fall back to basic validation and allow the order
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });
});
