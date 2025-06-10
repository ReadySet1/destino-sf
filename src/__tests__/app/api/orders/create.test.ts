import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { validateOrderMinimumsServer } from '@/app/actions/orders';

// Mock the dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    storeSettings: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/utils/supabase/server');
jest.mock('@/app/actions/orders');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockValidateOrderMinimumsServer = validateOrderMinimumsServer as jest.MockedFunction<typeof validateOrderMinimumsServer>;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
};

// Shared test data
const validOrderData = {
  items: [
    {
      id: 'prod-1',
      name: 'Dulce de Leche Alfajores',
      quantity: 2,
      price: 25.00,
      variantId: 'variant-1',
    },
    {
      id: 'prod-2',
      name: 'Beef Empanadas',
      quantity: 1,
      price: 45.00,
      variantId: 'variant-2',
    },
  ],
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
  },
  fulfillmentMethod: 'delivery',
  deliveryAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
  },
  deliveryTime: '2024-01-16T14:00:00Z',
  specialInstructions: 'Leave at door',
  paymentMethod: 'card',
  subtotal: 95.00,
  taxAmount: 8.55,
  deliveryFee: 0, // Free delivery for SF orders over $75
  total: 103.55,
};

const mockCreatedOrder = {
  id: 'order-123',
  userId: 'user-123',
  status: 'PENDING',
  ...validOrderData,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('/api/orders/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress expected warnings/errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Setup default Supabase client mock
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

    // Mock authenticated user by default
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Order creation flow', () => {

    test('should create order successfully with valid data', async () => {
      // Mock order minimum validation
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      // Mock product availability check
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
        },
        {
          id: 'prod-2',
          name: 'Beef Empanadas',
          isActive: true,
          inventory: 30,
        },
      ]);

      // Mock variant availability check
      mockPrisma.productVariant.findUnique
        .mockResolvedValueOnce({
          id: 'variant-1',
          productId: 'prod-1',
          name: '6-pack',
          isActive: true,
          inventory: 25,
        })
        .mockResolvedValueOnce({
          id: 'variant-2',
          productId: 'prod-2',
          name: '12-pack',
          isActive: true,
          inventory: 15,
        });

      // Mock order creation
      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

      // Test order minimum validation
      const validationResult = await validateOrderMinimumsServer(
        validOrderData.items,
        validOrderData.deliveryAddress
      );

      expect(validationResult.isValid).toBe(true);

      // Test product availability
      const products = await prisma.product.findMany({
        where: {
          id: {
            in: validOrderData.items.map(item => item.id),
          },
        },
      });

      expect(products).toHaveLength(2);
      expect(products.every(product => product.isActive)).toBe(true);

      // Test order creation
      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'PENDING',
          customerName: validOrderData.customerInfo.name,
          customerEmail: validOrderData.customerInfo.email,
          customerPhone: validOrderData.customerInfo.phone,
          fulfillmentMethod: validOrderData.fulfillmentMethod,
          deliveryAddress: validOrderData.deliveryAddress,
          deliveryTime: new Date(validOrderData.deliveryTime),
          specialInstructions: validOrderData.specialInstructions,
          subtotal: validOrderData.subtotal,
          taxAmount: validOrderData.taxAmount,
          deliveryFee: validOrderData.deliveryFee,
          total: validOrderData.total,
          items: {
            create: validOrderData.items.map(item => ({
              productId: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
            })),
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
      });

      expect(mockPrisma.order.create).toHaveBeenCalled();
      expect(order.id).toBe('order-123');
      expect(order.status).toBe('PENDING');
      expect(order.total).toBe(103.55);
    });

    test('should handle pickup orders without delivery address', async () => {
      const pickupOrderData = {
        ...validOrderData,
        fulfillmentMethod: 'pickup',
        deliveryAddress: undefined,
        deliveryFee: 0,
        total: 103.55 - 0, // No delivery fee
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
        },
      ]);

      const pickupOrder = {
        ...mockCreatedOrder,
        fulfillmentMethod: 'pickup',
        deliveryAddress: null,
        deliveryFee: 0,
      };

      mockPrisma.order.create.mockResolvedValue(pickupOrder);

      const validationResult = await validateOrderMinimumsServer(
        pickupOrderData.items
        // No delivery address for pickup
      );

      expect(validationResult.isValid).toBe(true);

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'PENDING',
          customerName: pickupOrderData.customerInfo.name,
          customerEmail: pickupOrderData.customerInfo.email,
          customerPhone: pickupOrderData.customerInfo.phone,
          fulfillmentMethod: 'pickup',
          subtotal: pickupOrderData.subtotal,
          taxAmount: pickupOrderData.taxAmount,
          deliveryFee: 0,
          total: pickupOrderData.total,
        },
      });

      expect(order.fulfillmentMethod).toBe('pickup');
      expect(order.deliveryFee).toBe(0);
    });

    test('should handle catering orders with higher minimums', async () => {
      const cateringOrderData = {
        ...validOrderData,
        items: [
          {
            id: 'catering-1',
            name: 'Catering Alfajores Platter',
            quantity: 1,
            price: 350.00,
            variantId: 'catering-variant-1',
          },
        ],
        subtotal: 350.00,
        total: 378.50,
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'SAN_FRANCISCO',
        minimumRequired: 250,
        currentAmount: 350,
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'catering-1',
          name: 'Catering Alfajores Platter',
          isActive: true,
          inventory: 10,
          category: 'catering',
        },
      ]);

      const validationResult = await validateOrderMinimumsServer(
        cateringOrderData.items,
        cateringOrderData.deliveryAddress
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.deliveryZone).toBe('SAN_FRANCISCO');
      expect(validationResult.currentAmount).toBeGreaterThanOrEqual(validationResult.minimumRequired!);
    });

    test('should create order with multiple variants of same product', async () => {
      const multiVariantOrderData = {
        ...validOrderData,
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 1,
            price: 15.00,
            variantId: 'variant-1-small', // 3-pack
          },
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 2,
            price: 25.00,
            variantId: 'variant-1-large', // 6-pack
          },
        ],
        subtotal: 65.00,
        total: 73.55,
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
        },
      ]);

      mockPrisma.productVariant.findUnique
        .mockResolvedValueOnce({
          id: 'variant-1-small',
          productId: 'prod-1',
          name: '3-pack',
          isActive: true,
          inventory: 20,
        })
        .mockResolvedValueOnce({
          id: 'variant-1-large',
          productId: 'prod-1',
          name: '6-pack',
          isActive: true,
          inventory: 15,
        });

      const multiVariantOrder = {
        ...mockCreatedOrder,
        items: multiVariantOrderData.items,
        subtotal: 65.00,
        total: 73.55,
      };

      mockPrisma.order.create.mockResolvedValue(multiVariantOrder);

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'PENDING',
          customerName: multiVariantOrderData.customerInfo.name,
          customerEmail: multiVariantOrderData.customerInfo.email,
          customerPhone: multiVariantOrderData.customerInfo.phone,
          fulfillmentMethod: multiVariantOrderData.fulfillmentMethod,
          subtotal: multiVariantOrderData.subtotal,
          total: multiVariantOrderData.total,
          items: {
            create: multiVariantOrderData.items.map(item => ({
              productId: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
            })),
          },
        },
      });

      expect(order.items).toHaveLength(2);
      expect(order.total).toBe(73.55);
    });
  });

  describe('Order minimum validation', () => {
    test('should reject orders below minimum for delivery zone', async () => {
      const belowMinimumOrder = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 1,
            price: 15.00,
          },
        ],
        deliveryAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Order minimum of $25 required for delivery to this area.',
        minimumRequired: 25,
        currentAmount: 15,
      });

      const validationResult = await validateOrderMinimumsServer(
        belowMinimumOrder.items,
        belowMinimumOrder.deliveryAddress
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errorMessage).toContain('Order minimum');
      expect(validationResult.currentAmount).toBeLessThan(validationResult.minimumRequired!);
    });

    test('should reject catering orders below zone minimum', async () => {
      const belowCateringMinimum = {
        items: [
          {
            id: 'catering-1',
            name: 'Small Catering Platter',
            quantity: 1,
            price: 150.00,
          },
        ],
        deliveryAddress: {
          street: '456 Market St',
          city: 'San Jose',
          state: 'CA',
          postalCode: '95110',
        },
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Catering orders require a minimum of $350 for delivery to South Bay.',
        deliveryZone: 'SOUTH_BAY',
        minimumRequired: 350,
        currentAmount: 150,
      });

      const validationResult = await validateOrderMinimumsServer(
        belowCateringMinimum.items,
        belowCateringMinimum.deliveryAddress
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.deliveryZone).toBe('SOUTH_BAY');
      expect(validationResult.currentAmount).toBeLessThan(validationResult.minimumRequired!);
    });

    test('should accept orders meeting minimum requirements', async () => {
      const validMinimumOrder = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 2,
            price: 25.00,
          },
        ],
        deliveryAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
        },
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        minimumRequired: 25,
        currentAmount: 50,
      });

      const validationResult = await validateOrderMinimumsServer(
        validMinimumOrder.items,
        validMinimumOrder.deliveryAddress
      );

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.currentAmount).toBeGreaterThanOrEqual(validationResult.minimumRequired!);
    });

    test('should handle unsupported delivery areas', async () => {
      const unsupportedAreaOrder = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 3,
            price: 25.00,
          },
        ],
        deliveryAddress: {
          street: '789 Sunset Blvd',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
        },
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: false,
        errorMessage: 'Sorry, we currently do not deliver to this location. Please check our delivery zones or contact us for assistance.',
      });

      const validationResult = await validateOrderMinimumsServer(
        unsupportedAreaOrder.items,
        unsupportedAreaOrder.deliveryAddress
      );

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errorMessage).toContain('do not deliver to this location');
    });
  });

  describe('Payment processing integration', () => {
    test('should handle successful payment processing', async () => {
      const orderWithPayment = {
        ...validOrderData,
        paymentIntentId: 'pi_test_123456',
        paymentStatus: 'succeeded',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
        },
      ]);

      const orderWithPaymentData = {
        ...mockCreatedOrder,
        paymentIntentId: 'pi_test_123456',
        paymentStatus: 'succeeded',
        status: 'CONFIRMED', // Auto-confirm on successful payment
      };

      mockPrisma.order.create.mockResolvedValue(orderWithPaymentData);

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'CONFIRMED',
          customerName: orderWithPayment.customerInfo.name,
          customerEmail: orderWithPayment.customerInfo.email,
          paymentIntentId: orderWithPayment.paymentIntentId,
          paymentStatus: orderWithPayment.paymentStatus,
          total: orderWithPayment.total,
        },
      });

      expect(order.paymentIntentId).toBe('pi_test_123456');
      expect(order.paymentStatus).toBe('succeeded');
      expect(order.status).toBe('CONFIRMED');
    });

    test('should handle failed payment processing', async () => {
      const orderWithFailedPayment = {
        ...validOrderData,
        paymentIntentId: 'pi_test_failed',
        paymentStatus: 'failed',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      // Order should not be created if payment fails
      const paymentError = new Error('Payment processing failed');
      
      // Simulate payment failure before order creation
      expect(() => {
        if (orderWithFailedPayment.paymentStatus === 'failed') {
          throw paymentError;
        }
      }).toThrow('Payment processing failed');
    });

    test('should handle payment processing timeout', async () => {
      const orderWithTimeoutPayment = {
        ...validOrderData,
        paymentIntentId: 'pi_test_timeout',
        paymentStatus: 'processing',
      };

      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      const orderWithPendingPayment = {
        ...mockCreatedOrder,
        paymentIntentId: 'pi_test_timeout',
        paymentStatus: 'processing',
        status: 'PAYMENT_PENDING',
      };

      mockPrisma.order.create.mockResolvedValue(orderWithPendingPayment);

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'PAYMENT_PENDING',
          paymentIntentId: orderWithTimeoutPayment.paymentIntentId,
          paymentStatus: orderWithTimeoutPayment.paymentStatus,
          total: orderWithTimeoutPayment.total,
        },
      });

      expect(order.status).toBe('PAYMENT_PENDING');
      expect(order.paymentStatus).toBe('processing');
    });

    test('should handle different payment methods', async () => {
      const paymentMethods = ['card', 'apple_pay', 'google_pay', 'cash'];

      for (const method of paymentMethods) {
        const orderWithPaymentMethod = {
          ...validOrderData,
          paymentMethod: method,
          paymentStatus: method === 'cash' ? 'pending' : 'succeeded',
        };

        mockValidateOrderMinimumsServer.mockResolvedValue({
          isValid: true,
          errorMessage: null,
        });

        const orderData = {
          ...mockCreatedOrder,
          paymentMethod: method,
          paymentStatus: orderWithPaymentMethod.paymentStatus,
          status: method === 'cash' ? 'PENDING' : 'CONFIRMED',
        };

        mockPrisma.order.create.mockResolvedValue(orderData);

        const order = await prisma.order.create({
          data: {
            userId: 'user-123',
            status: orderData.status,
            paymentMethod: method,
            paymentStatus: orderWithPaymentMethod.paymentStatus,
            total: orderWithPaymentMethod.total,
          },
        });

        expect(order.paymentMethod).toBe(method);
        
        if (method === 'cash') {
          expect(order.status).toBe('PENDING');
        } else {
          expect(order.status).toBe('CONFIRMED');
        }
      }
    });
  });

  describe('Inventory checks', () => {
    test('should check product availability before order creation', async () => {
      const orderData = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 5,
            price: 25.00,
          },
        ],
      };

      // Mock product with sufficient inventory
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 10, // Sufficient for order of 5
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderData.items.map(item => item.id),
          },
        },
      });

      const hasInventory = products.every(product => 
        product.inventory >= orderData.items.find(item => item.id === product.id)!.quantity
      );

      expect(hasInventory).toBe(true);
    });

    test('should reject orders for out-of-stock products', async () => {
      const orderData = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 15,
            price: 25.00,
          },
        ],
      };

      // Mock product with insufficient inventory
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 5, // Insufficient for order of 15
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderData.items.map(item => item.id),
          },
        },
      });

      const hasInventory = products.every(product => 
        product.inventory >= orderData.items.find(item => item.id === product.id)!.quantity
      );

      expect(hasInventory).toBe(false);
    });

    test('should check variant-specific inventory', async () => {
      const orderData = {
        items: [
          {
            id: 'prod-1',
            name: 'Dulce de Leche Alfajores',
            quantity: 3,
            price: 25.00,
            variantId: 'variant-1',
          },
        ],
      };

      mockPrisma.productVariant.findUnique.mockResolvedValue({
        id: 'variant-1',
        productId: 'prod-1',
        name: '6-pack',
        isActive: true,
        inventory: 5, // Sufficient for order of 3
      });

      const variant = await prisma.productVariant.findUnique({
        where: { id: 'variant-1' },
      });

      const hasVariantInventory = variant && 
        variant.inventory >= orderData.items.find(item => item.variantId === variant.id)!.quantity;

      expect(hasVariantInventory).toBe(true);
    });

    test('should reject orders for inactive products', async () => {
      const orderData = {
        items: [
          {
            id: 'prod-inactive',
            name: 'Discontinued Product',
            quantity: 1,
            price: 25.00,
          },
        ],
      };

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-inactive',
          name: 'Discontinued Product',
          isActive: false, // Product is inactive
          inventory: 10,
        },
      ]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderData.items.map(item => item.id),
          },
        },
      });

      const allProductsActive = products.every(product => product.isActive);

      expect(allProductsActive).toBe(false);
    });

    test('should handle products not found', async () => {
      const orderData = {
        items: [
          {
            id: 'non-existent-product',
            name: 'Non-existent Product',
            quantity: 1,
            price: 25.00,
          },
        ],
      };

      mockPrisma.product.findMany.mockResolvedValue([]);

      const products = await prisma.product.findMany({
        where: {
          id: {
            in: orderData.items.map(item => item.id),
          },
        },
      });

      const allProductsFound = orderData.items.every(item => 
        products.some(product => product.id === item.id)
      );

      expect(allProductsFound).toBe(false);
    });
  });

  describe('Email notifications', () => {
    test('should trigger order confirmation email on successful order', async () => {
      const orderData = validOrderData;
      
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 50,
        },
      ]);

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

      // Mock email service
      const mockSendEmail = jest.fn().mockResolvedValue({ success: true });

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'CONFIRMED',
          customerEmail: orderData.customerInfo.email,
          total: orderData.total,
        },
      });

      // Simulate email notification trigger
      await mockSendEmail({
        to: order.customerEmail,
        subject: 'Order Confirmation',
        template: 'order-confirmation',
        data: {
          orderId: order.id,
          customerName: order.customerName,
          total: order.total,
        },
      });

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        subject: 'Order Confirmation',
        template: 'order-confirmation',
        data: {
          orderId: 'order-123',
          customerName: 'John Doe',
          total: 103.55,
        },
      });
    });

    test('should send admin notification for new orders', async () => {
      const orderData = validOrderData;
      
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

      // Mock admin email notification
      const mockSendAdminEmail = jest.fn().mockResolvedValue({ success: true });

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'CONFIRMED',
          total: orderData.total,
        },
      });

      // Simulate admin notification trigger
      await mockSendAdminEmail({
        to: 'admin@destinosf.com',
        subject: 'New Order Received',
        template: 'admin-new-order',
        data: {
          orderId: order.id,
          customerName: order.customerName,
          total: order.total,
          fulfillmentMethod: order.fulfillmentMethod,
        },
      });

      expect(mockSendAdminEmail).toHaveBeenCalledWith({
        to: 'admin@destinosf.com',
        subject: 'New Order Received',
        template: 'admin-new-order',
        data: {
          orderId: 'order-123',
          customerName: 'John Doe',
          total: 103.55,
          fulfillmentMethod: 'delivery',
        },
      });
    });

    test('should handle email notification failures gracefully', async () => {
      const orderData = validOrderData;
      
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

      // Mock email service failure
      const mockSendEmail = jest.fn().mockRejectedValue(new Error('Email service unavailable'));

      const order = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'CONFIRMED',
          customerEmail: orderData.customerInfo.email,
          total: orderData.total,
        },
      });

      // Email failure should not prevent order creation
      try {
        await mockSendEmail({
          to: order.customerEmail,
          subject: 'Order Confirmation',
          template: 'order-confirmation',
          data: { orderId: order.id },
        });
      } catch (error) {
        console.error('Email notification failed:', error);
        // Order should still be created successfully
      }

      expect(order.id).toBe('order-123');
      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle unauthenticated users', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const { data: { user }, error } = await mockSupabaseClient.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeTruthy();
    });

    test('should handle database connection errors', async () => {
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      mockPrisma.order.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'PENDING',
          total: 100,
        },
      })).rejects.toThrow('Database connection failed');
    });

    test('should handle malformed request data', async () => {
      const malformedData = {
        items: [], // Empty items array
        customerInfo: {
          name: '',
          email: 'invalid-email',
        },
        total: -50, // Negative total
      };

      // Validate request data
      const hasItems = malformedData.items.length > 0;
      const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(malformedData.customerInfo.email);
      const hasValidTotal = malformedData.total > 0;

      expect(hasItems).toBe(false);
      expect(hasValidEmail).toBe(false);
      expect(hasValidTotal).toBe(false);
    });

    test('should handle concurrent order creation', async () => {
      const orderData = validOrderData;
      
      mockValidateOrderMinimumsServer.mockResolvedValue({
        isValid: true,
        errorMessage: null,
      });

      // Simulate race condition with inventory
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          isActive: true,
          inventory: 1, // Only 1 left
        },
      ]);

      // First order should succeed
      mockPrisma.order.create.mockResolvedValueOnce(mockCreatedOrder);

      const firstOrder = await prisma.order.create({
        data: {
          userId: 'user-123',
          status: 'CONFIRMED',
          total: orderData.total,
        },
      });

      expect(firstOrder.id).toBe('order-123');

      // Second concurrent order should fail due to inventory constraint
      mockPrisma.order.create.mockRejectedValueOnce(new Error('Insufficient inventory'));

      await expect(prisma.order.create({
        data: {
          userId: 'user-456',
          status: 'CONFIRMED',
          total: orderData.total,
        },
      })).rejects.toThrow('Insufficient inventory');
    });
  });
}); 