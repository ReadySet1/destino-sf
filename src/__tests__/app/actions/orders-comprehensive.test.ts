import {
  createOrderAndGenerateCheckoutUrl,
  validateOrderMinimumsServer,
  createManualPaymentOrder,
  updateOrderPayment,
  getOrderById,
} from '@/app/actions/orders';
import { prismaMock } from '@/__tests__/setup/prisma';
import { PaymentMethod, OrderStatus } from '@/types/order';

// Mock dependencies - using the global mock setup
jest.mock('@/lib/cart-helpers', () => ({
  validateOrderMinimums: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() =>
    Promise.resolve({
      get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
      set: jest.fn(),
      remove: jest.fn(),
      getAll: () => [],
    })
  ),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/square/tip-settings', () => ({
  createRegularOrderTipSettings: jest.fn(),
}));

// Mock delivery zones
jest.mock('@/lib/delivery-zones', () => ({
  determineDeliveryZone: jest.fn(),
  validateMinimumPurchase: jest.fn(),
}));

const mockPrisma = prismaMock;

// Test fixtures
const validCartItems = [
  {
    id: 'product-1',
    name: 'Dulce de Leche Alfajores',
    price: 25.0,
    quantity: 2,
    variantId: 'variant-1',
  },
  {
    id: 'product-2',
    name: 'Beef Empanadas',
    price: 15.0,
    quantity: 1,
  },
];

const validCustomerInfo = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
};

const validPickupFulfillment = {
  method: 'pickup' as const,
  pickupTime: '2024-01-15T14:00:00.000Z',
};

const validLocalDeliveryFulfillment = {
  method: 'local_delivery' as const,
  deliveryDate: '2024-01-16',
  deliveryTime: '18:00',
  deliveryAddress: {
    street: '123 Delivery St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
  },
  deliveryInstructions: 'Ring doorbell',
};

const validNationwideShippingFulfillment = {
  method: 'nationwide_shipping' as const,
  shippingAddress: {
    street: '456 Ship St',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90210',
  },
  shippingMethod: 'ground',
  shippingCarrier: 'USPS',
  shippingCost: 1250, // $12.50 in cents
  rateId: 'rate-123',
};

const mockCreatedOrder = {
  id: 'order-123',
  status: OrderStatus.PENDING,
  total: 4543,
  taxAmount: 346,
  subtotal: 4197,
  customerName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  fulfillmentType: 'pickup',
  userId: null,
  createdAt: new Date('2025-01-15T16:55:08.495Z'),
  updatedAt: new Date('2025-01-15T16:55:08.495Z'),
  squareOrderId: null,
  paymentMethod: 'SQUARE' as PaymentMethod,
  paymentStatus: 'PENDING',
  isCateringOrder: false,
  pickupTime: new Date('2024-01-15T14:00:00.000Z'),
  deliveryDate: null,
  deliveryTime: null,
  notes: null,
  shippingMethodName: null,
  shippingCarrier: null,
  shippingServiceLevelToken: null,
  shippingCostCents: null,
  shippingRateId: null,
};

describe('Orders Actions - Comprehensive Coverage', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Set up environment variables
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com';

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    // Mock the createServerClient function
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue(mockSupabaseClient);

    // Mock delivery zone functions
    const { determineDeliveryZone, validateMinimumPurchase } = require('@/lib/delivery-zones');
    determineDeliveryZone.mockResolvedValue('zone-1');
    validateMinimumPurchase.mockResolvedValue({
      isValid: true,
      message: null,
      minimumRequired: 250,
      currentAmount: 400,
    });

    // Setup default Prisma mock responses
    (mockPrisma.storeSettings.findFirst as jest.Mock).mockResolvedValue({
      minOrderAmount: 25.0,
      cateringMinimumAmount: 150.0,
    });

    // Mock product.findMany to return products with categories
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'product-1',
        name: 'Dulce de Leche Alfajores',
        price: 25.0,
        category: { id: 'cat-1', name: 'Alfajores', isTaxExempt: false },
      },
      {
        id: 'product-2',
        name: 'Beef Empanadas',
        price: 15.0,
        category: { id: 'cat-2', name: 'Empanadas', isTaxExempt: false },
      },
    ]);

    (mockPrisma.order.create as jest.Mock).mockResolvedValue(mockCreatedOrder);
    (mockPrisma.order.update as jest.Mock).mockResolvedValue(mockCreatedOrder);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockCreatedOrder);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe.skip('validateOrderMinimumsServer', () => {
    test('should validate empty cart', async () => {
      const result = await validateOrderMinimumsServer([]);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });

    test('should validate cart total below minimum', async () => {
      const smallItems = [{ id: 'prod-1', name: 'Small Item', price: 10.0, quantity: 1 }];

      const result = await validateOrderMinimumsServer(smallItems);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Orders require a minimum purchase');
      expect(result.currentAmount).toBe(10);
      expect(result.minimumRequired).toBe(25);
    });

    test('should validate catering order with delivery address', async () => {
      const cateringItems = [
        { id: 'catering-1', name: 'Catering Platter', price: 400.0, quantity: 1 },
      ];

      // Mock catering product detection - products with catering category
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'catering-1',
          name: 'Catering Platter',
          category: { name: 'Catering Platters' },
        } as any,
      ]);

      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105',
      };

      const result = await validateOrderMinimumsServer(cateringItems, deliveryAddress);

      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBe(400);
    });

    test('should validate catering order below zone minimum', async () => {
      const smallCateringItems = [
        { id: 'catering-1', name: 'Small Catering', price: 100.0, quantity: 1 },
      ];

      // Mock catering product detection - products with catering category
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'catering-1',
          name: 'Small Catering',
          category: { name: 'Catering Items' },
        } as any,
      ]);

      const result = await validateOrderMinimumsServer(smallCateringItems);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Catering orders require');
      expect(result.currentAmount).toBe(100);
      expect(result.minimumRequired).toBe(150);
    });

    test('should handle missing store settings', async () => {
      mockPrisma.storeSettings.findFirst.mockResolvedValue(null);

      const items = [{ id: 'prod-1', name: 'Item', price: 20.0, quantity: 1 }];

      const result = await validateOrderMinimumsServer(items);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      mockPrisma.storeSettings.findFirst.mockRejectedValue(new Error('Database error'));

      const items = [{ id: 'prod-1', name: 'Item', price: 20.0, quantity: 1 }];

      // The function catches database errors and assumes non-catering order
      const result = await validateOrderMinimumsServer(items);

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe.skip('createOrderAndGenerateCheckoutUrl', () => {
    const baseFormData = {
      items: validCartItems,
      customerInfo: validCustomerInfo,
      paymentMethod: 'SQUARE' as const,
    };

    test('should create pickup order successfully', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        ...baseFormData,
        fulfillment: validPickupFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.checkoutUrl).toContain('checkout');
    });

    test('should create local delivery order successfully', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        ...baseFormData,
        fulfillment: validLocalDeliveryFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fulfillmentType: 'local_delivery',
          deliveryDate: '2024-01-16',
          deliveryTime: '18:00',
        }),
      });
    });

    test('should create nationwide shipping order successfully', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        ...baseFormData,
        fulfillment: validNationwideShippingFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fulfillmentType: 'nationwide_shipping',
          shippingMethodName: 'USPS ground',
          shippingCarrier: 'USPS',
          shippingCostCents: 1250,
          shippingRateId: 'rate-123',
        }),
      });
    });

    test('should handle invalid form data', async () => {
      const invalidFormData = {
        items: [],
        customerInfo: { name: '', email: 'invalid-email', phone: '' },
        fulfillment: { method: 'invalid' },
        paymentMethod: PaymentMethod.SQUARE,
      } as any;

      const result = await createOrderAndGenerateCheckoutUrl(invalidFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    test('should handle order minimum validation failure', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({
        isValid: false,
        errorMessage: 'Order minimum not met',
      });

      const formData = {
        ...baseFormData,
        fulfillment: validPickupFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order minimum not met');
    });

    test('should handle database creation errors', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      mockPrisma.order.create.mockRejectedValue(new Error('Database error'));

      const formData = {
        ...baseFormData,
        fulfillment: validPickupFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    test('should handle missing NEXT_PUBLIC_APP_URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;

      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        ...baseFormData,
        fulfillment: validPickupFulfillment,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server configuration error');
    });

    test('should handle invalid date formats', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        ...baseFormData,
        fulfillment: {
          ...validPickupFulfillment,
          pickupTime: 'invalid-date',
        },
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date/time format');
    });
  });

  describe.skip('createManualPaymentOrder', () => {
    test('should create cash order successfully', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.CASH,
      };

      const result = await createManualPaymentOrder(formData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');
      expect(result.checkoutUrl).toContain('/payment/order-123');
      expect(result.checkoutUrl).toContain('method=CASH');
    });

    test('should reject non-cash payment methods', async () => {
      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createManualPaymentOrder(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment method SQUARE is not supported');
    });

    test('should handle order validation failure', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({
        isValid: false,
        errorMessage: 'Minimum not met',
      });

      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.CASH,
      };

      const result = await createManualPaymentOrder(formData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Minimum not met');
    });
  });

  describe.skip('updateOrderPayment', () => {
    test('should update order payment successfully', async () => {
      const result = await updateOrderPayment(
        'order-123',
        'square-order-123',
        'PAID',
        'Payment completed'
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          squareOrderId: 'square-order-123',
          paymentStatus: 'PAID',
          status: OrderStatus.PROCESSING,
        }),
      });
      expect(result).toEqual(mockCreatedOrder);
    });

    test('should handle failed payment', async () => {
      const result = await updateOrderPayment(
        'order-123',
        'square-order-123',
        'FAILED',
        'Payment failed'
      );

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          paymentStatus: 'FAILED',
          status: OrderStatus.CANCELLED,
        }),
      });
    });

    test('should handle database update errors', async () => {
      mockPrisma.order.update.mockRejectedValue(new Error('Update failed'));

      await expect(updateOrderPayment('order-123', 'square-order-123')).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe.skip('getOrderById', () => {
    const mockOrderWithItems = {
      ...mockCreatedOrder,
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 2,
          price: 25.0,
          product: { name: 'Dulce de Leche Alfajores' },
          variant: { name: '6-pack' },
        },
      ],
    };

    test('should retrieve order successfully', async () => {
      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrderWithItems as any);

      const result = await getOrderById('order-123');

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              variant: { select: { name: true } },
            },
          },
        },
      });
      expect(result).toEqual(mockOrderWithItems);
    });

    test('should handle order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await getOrderById('nonexistent-order');

      expect(result).toBeNull();
    });

    test('should handle database query errors', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(getOrderById('order-123')).rejects.toThrow('Database error');
    });

    test('should handle invalid fulfillment data in notes', async () => {
      const orderWithInvalidNotes = {
        ...mockOrderWithItems,
        notes: 'invalid-json',
      };

      (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(orderWithInvalidNotes as any);

      const result = await getOrderById('order-123');

      expect(result).toEqual(orderWithInvalidNotes);
      // Should not throw error, should continue processing
    });
  });

  describe.skip('Edge Cases and Error Handling', () => {
    test('should handle calculation edge cases with zero quantities', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        items: [{ id: 'product-1', name: 'Test', price: 25.0, quantity: 0 }],
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid input');
    });

    test('should handle Supabase authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      });

      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      // Should still work without authenticated user
      expect(result.success).toBe(true);
    });

    test('should handle extremely large order calculations', async () => {
      const { validateOrderMinimums } = require('@/lib/cart-helpers');
      validateOrderMinimums.mockResolvedValue({ isValid: true });

      const formData = {
        items: [{ id: 'product-1', name: 'Expensive Item', price: 999999.99, quantity: 999 }],
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createOrderAndGenerateCheckoutUrl(formData);

      expect(result.success).toBe(true);
      // Should handle large calculations without overflow
    });
  });
});
