import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createOrderAndGenerateCheckoutUrl, validateOrderMinimumsServer } from '@/app/actions/orders';
import { CartItemSchema, CustomerInfoSchema, FulfillmentSchema } from '@/types/checkout';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/square/checkout-links', () => ({
  createCheckoutLink: jest.fn(),
}));
jest.mock('@/lib/store-settings', () => ({
  isStoreOpen: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/cart-helpers', () => ({
  validateOrderMinimums: jest.fn().mockResolvedValue({
    isValid: true,
    errorMessage: null,
  }),
}));
jest.mock('@/lib/delivery-zones', () => ({
  determineDeliveryZone: jest.fn(),
  validateMinimumPurchase: jest.fn(),
}));

describe('Order Creation - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create order with proper validation', async () => {
    // Mock successful database operations
    const mockOrder = {
      id: 'order-123',
      status: 'PENDING',
      total: 25.98,
      customerName: 'John Doe',
      email: 'john@example.com',
      phone: '415-555-0100',
    };

    (prisma.order.create as jest.Mock).mockResolvedValue(mockOrder);
    (prisma.orderItem.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    // Mock checkout link creation
    const { createCheckoutLink } = require('@/lib/square/checkout-links');
    createCheckoutLink.mockResolvedValue({
      checkoutId: 'checkout-123',
      orderId: 'square-order-456',
    });

    const orderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 2, 
          price: 12.99,
          variantId: 'variant-1'
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '415-555-0100',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-01T12:00:00Z',
      },
      paymentMethod: 'SQUARE' as const,
    };

    const result = await createOrderAndGenerateCheckoutUrl(orderData);

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('order-123');
    expect(result.checkoutUrl).toBeTruthy();
    expect(result.error).toBeNull();

    // Verify order was created with correct data
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerName: 'John Doe',
          email: 'john@example.com',
          phone: '415-555-0100',
          fulfillmentType: 'pickup',
          paymentMethod: 'SQUARE',
        }),
      })
    );
  });

  it('should validate minimum order requirements', async () => {
    // Mock store settings with minimum order amount
    (prisma.storeSettings.findFirst as jest.Mock).mockResolvedValue({
      id: 'settings-1',
      minOrderAmount: 50.00,
      cateringMinimumAmount: 100.00,
    });

    const testItems = [
      { 
        id: 'prod-1', 
        name: 'Small Item',
        quantity: 1, 
        price: 5.00,
        variantId: 'variant-1'
      },
    ];

    const result = await validateOrderMinimumsServer(testItems);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('minimum purchase');
    expect(result.minimumRequired).toBe(50.00);
    expect(result.currentAmount).toBe(5.00);
  });

  it('should handle invalid form data', async () => {
    const invalidOrderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 2, 
          price: 12.99,
          // Missing variantId
        },
      ],
      customerInfo: {
        name: 'John Doe',
        // Missing required email and phone
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-01T12:00:00Z',
      },
      paymentMethod: 'SQUARE' as const,
    };

    const result = await createOrderAndGenerateCheckoutUrl(invalidOrderData as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid input');
    expect(result.checkoutUrl).toBeNull();
    expect(result.orderId).toBeNull();
  });

  it('should handle empty cart validation', async () => {
    const result = await validateOrderMinimumsServer([]);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBe('Your cart is empty');
  });

  it('should handle store closed scenario', async () => {
    // Mock store being closed
    const { isStoreOpen } = require('@/lib/store-settings');
    isStoreOpen.mockResolvedValue(false);

    const orderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 2, 
          price: 12.99,
          variantId: 'variant-1'
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '415-555-0100',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-01T12:00:00Z',
      },
      paymentMethod: 'SQUARE' as const,
    };

    const result = await createOrderAndGenerateCheckoutUrl(orderData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Store is currently closed');
    expect(result.checkoutUrl).toBeNull();
    expect(result.orderId).toBeNull();
  });

  it('should handle delivery order with address validation', async () => {
    const deliveryOrderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 4, 
          price: 15.99,
          variantId: 'variant-1'
        },
      ],
      customerInfo: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '415-555-0200',
      },
      fulfillment: {
        method: 'local_delivery' as const,
        deliveryDate: '2024-01-02',
        deliveryTime: '18:00',
        deliveryAddress: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
        },
        deliveryInstructions: 'Ring doorbell',
      },
      paymentMethod: 'SQUARE' as const,
    };

    // Mock successful validation and creation
    (prisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-456',
      status: 'PENDING',
      total: 63.96,
    });

    const { createCheckoutLink } = require('@/lib/square/checkout-links');
    createCheckoutLink.mockResolvedValue({
      checkoutId: 'checkout-456',
      orderId: 'square-order-789',
    });

    const result = await createOrderAndGenerateCheckoutUrl(deliveryOrderData);

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('order-456');
    expect(result.checkoutUrl).toBeTruthy();

    // Verify delivery-specific data was stored
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fulfillmentType: 'local_delivery',
          deliveryDate: expect.any(Date),
          deliveryTime: '18:00',
        }),
      })
    );
  });

  it('should handle catering orders with minimum validation', async () => {
    // Mock catering product detection
    const { hasCateringProducts } = require('@/app/actions/orders');
    jest.doMock('@/app/actions/orders', () => ({
      ...jest.requireActual('@/app/actions/orders'),
      hasCateringProducts: jest.fn().mockResolvedValue(true),
    }));

    // Mock store settings for catering minimum
    (prisma.storeSettings.findFirst as jest.Mock).mockResolvedValue({
      id: 'settings-1',
      minOrderAmount: 25.00,
      cateringMinimumAmount: 100.00,
    });

    const cateringItems = [
      { 
        id: 'catering-1', 
        name: 'Catering Tray',
        quantity: 1, 
        price: 75.00,
        variantId: 'catering-variant-1'
      },
    ];

    const result = await validateOrderMinimumsServer(cateringItems);

    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Catering orders require');
    expect(result.minimumRequired).toBe(100.00);
    expect(result.currentAmount).toBe(75.00);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    (prisma.order.create as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const orderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 2, 
          price: 12.99,
          variantId: 'variant-1'
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '415-555-0100',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-01T12:00:00Z',
      },
      paymentMethod: 'SQUARE' as const,
    };

    const result = await createOrderAndGenerateCheckoutUrl(orderData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Database connection failed');
    expect(result.checkoutUrl).toBeNull();
  });

  it('should handle Square API errors during checkout link creation', async () => {
    // Mock successful order creation but failed checkout link
    (prisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-789',
      status: 'PENDING',
    });

    const { createCheckoutLink } = require('@/lib/square/checkout-links');
    createCheckoutLink.mockRejectedValue(
      new Error('Square API unavailable')
    );

    const orderData = {
      items: [
        { 
          id: 'prod-1', 
          name: 'Test Product',
          quantity: 2, 
          price: 12.99,
          variantId: 'variant-1'
        },
      ],
      customerInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '415-555-0100',
      },
      fulfillment: {
        method: 'pickup' as const,
        pickupTime: '2024-01-01T12:00:00Z',
      },
      paymentMethod: 'SQUARE' as const,
    };

    const result = await createOrderAndGenerateCheckoutUrl(orderData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Square API unavailable');
    
    // Verify order was marked as cancelled due to checkout failure
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-789' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
        }),
      })
    );
  });
});
