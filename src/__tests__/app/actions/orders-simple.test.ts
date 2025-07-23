import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  validateOrderMinimumsServer,
  createOrderAndGenerateCheckoutUrl,
  createManualPaymentOrder,
  updateOrderPayment,
  getOrderById 
} from '@/app/actions/orders';
import { PaymentMethod, OrderStatus } from '@prisma/client';

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    storeSettings: {
      findFirst: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/delivery-zones', () => ({
  determineDeliveryZone: jest.fn(),
  validateMinimumPurchase: jest.fn(),
}));

jest.mock('@/lib/cart-helpers', () => ({
  validateOrderMinimums: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn().mockReturnValue({ value: 'test-cookie' }),
    set: jest.fn(),
    remove: jest.fn(),
    getAll: () => []
  })),
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

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-123'),
}));

// Mock fetch for Square API calls
global.fetch = jest.fn();

// Import mocked modules
const { prisma } = require('@/lib/db');
const { determineDeliveryZone, validateMinimumPurchase } = require('@/lib/delivery-zones');
const { validateOrderMinimums } = require('@/lib/cart-helpers');

describe('Orders Actions - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.destinosf.com';
    
    // Setup default Prisma mock responses
    prisma.storeSettings.findFirst.mockResolvedValue({
      minOrderAmount: 25.00,
      cateringMinimumAmount: 150.00,
    });
    
    prisma.product.findMany.mockResolvedValue([]);
    
    prisma.order.create.mockResolvedValue({
      id: 'order-123',
      status: OrderStatus.PENDING,
      paymentStatus: 'PENDING',
    });
    
    prisma.order.update.mockResolvedValue({
      id: 'order-123',
      status: OrderStatus.PROCESSING,
      paymentStatus: 'PAID',
    });
    
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-123',
      customerName: 'John Doe',
      status: 'PAID',
    });
    
    // Mock delivery zone functions
    determineDeliveryZone.mockResolvedValue('zone-1');
    validateMinimumPurchase.mockResolvedValue({
      isValid: true,
      message: null,
      minimumRequired: 250,
      currentAmount: 400
    });
    
    // Mock cart validation
    validateOrderMinimums.mockResolvedValue({ isValid: true });
    
    // Mock Square API
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        payment_link: {
          url: 'https://sandbox.square.link/u/abc123',
          order_id: 'square-order-123',
        },
      }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  describe('validateOrderMinimumsServer', () => {
    test('should validate empty cart', async () => {
      const result = await validateOrderMinimumsServer([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Your cart is empty');
    });

    test('should validate cart total below minimum', async () => {
      const smallItems = [
        { id: 'prod-1', name: 'Small Item', price: 10.00, quantity: 1 }
      ];
      
      const result = await validateOrderMinimumsServer(smallItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Orders require a minimum purchase');
      expect(result.currentAmount).toBe(10);
      expect(result.minimumRequired).toBe(25);
    });

    test('should validate catering order with delivery address', async () => {
      const cateringItems = [
        { id: 'catering-1', name: 'Catering Platter', price: 400.00, quantity: 1 }
      ];
      
      // Mock catering product detection
      prisma.product.findMany.mockResolvedValue([
        { 
          id: 'catering-1', 
          name: 'Catering Platter',
          category: { name: 'Catering Platters' }
        }
      ]);
      
      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105'
      };
      
      const result = await validateOrderMinimumsServer(cateringItems, deliveryAddress);
      
      expect(result.isValid).toBe(true);
      expect(result.currentAmount).toBe(400);
    });

    test('should validate catering order below zone minimum', async () => {
      const smallCateringItems = [
        { id: 'catering-1', name: 'Small Catering', price: 100.00, quantity: 1 }
      ];
      
      // Mock catering product detection
      prisma.product.findMany.mockResolvedValue([
        { 
          id: 'catering-1', 
          name: 'Small Catering',
          category: { name: 'Catering Items' }
        }
      ]);
      
      const result = await validateOrderMinimumsServer(smallCateringItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Catering orders require');
      expect(result.currentAmount).toBe(100);
      expect(result.minimumRequired).toBe(150);
    });

    test('should handle missing store settings', async () => {
      prisma.storeSettings.findFirst.mockResolvedValue(null);
      
      const items = [
        { id: 'prod-1', name: 'Item', price: 20.00, quantity: 1 }
      ];
      
      const result = await validateOrderMinimumsServer(items);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      prisma.storeSettings.findFirst.mockRejectedValue(new Error('Database error'));
      
      const items = [
        { id: 'prod-1', name: 'Item', price: 20.00, quantity: 1 }
      ];
      
      // The function catches database errors and assumes non-catering order
      const result = await validateOrderMinimumsServer(items);
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });
  });

  describe('createOrderAndGenerateCheckoutUrl', () => {
    const validFormData = {
      items: [
        {
          id: 'product-1',
          name: 'Dulce de Leche Alfajores',
          price: 25.00,
          quantity: 2,
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
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
      expect(result.checkoutUrl).toContain('checkout');
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
      validateOrderMinimums.mockResolvedValue({
        isValid: false,
        errorMessage: 'Order minimum not met',
      });

      const result = await createOrderAndGenerateCheckoutUrl(validFormData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order minimum not met');
    });
  });

  describe('createManualPaymentOrder', () => {
    const validFormData = {
      items: [
        {
          id: 'product-1',
          name: 'Dulce de Leche Alfajores',
          price: 25.00,
          quantity: 2,
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
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

    test('should reject non-cash payment methods', async () => {
      const squareFormData = {
        ...validFormData,
        paymentMethod: PaymentMethod.SQUARE,
      };

      const result = await createManualPaymentOrder(squareFormData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment method SQUARE is not supported');
    });
  });

  describe('updateOrderPayment', () => {
    test('should update order payment successfully', async () => {
      const result = await updateOrderPayment('order-123', 'square-order-123', 'PAID', 'Payment completed');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          squareOrderId: 'square-order-123',
          paymentStatus: 'PAID',
          status: 'PROCESSING',
          notes: 'Payment completed',
        }),
      });
    });

    test('should handle failed payment', async () => {
      const result = await updateOrderPayment('order-123', 'square-order-123', 'FAILED', 'Payment failed');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          paymentStatus: 'FAILED',
          status: 'CANCELLED',
          notes: 'Payment failed',
        }),
      });
    });
  });

  describe('getOrderById', () => {
    test('should retrieve order successfully', async () => {
      const result = await getOrderById('order-123');

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: {
          items: {
            include: {
              product: {
                select: { name: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      });
      
      expect(result).toEqual({
        id: 'order-123',
        customerName: 'John Doe',
        status: 'PAID',
      });
    });

    test('should handle order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      const result = await getOrderById('nonexistent-order');

      expect(result).toBeNull();
    });
  });
}); 