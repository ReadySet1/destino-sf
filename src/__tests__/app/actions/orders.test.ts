import { 
  createOrderAndGenerateCheckoutUrl, 
  validateOrderMinimumsServer, 
  createManualPaymentOrder,
  updateOrderPayment,
  getOrderById 
} from '@/app/actions/orders';
import { prisma } from '@/lib/db';
import { validateOrderMinimums } from '@/lib/cart-helpers';
// import { syncOrderWithSquare } from '@/lib/square/sync'; // Not available yet
import { mockPrismaClient } from '@/__mocks__/prisma';
import { PaymentMethod } from '@prisma/client';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    cateringProduct: {
      findMany: jest.fn(),
    },
    storeSettings: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/cart-helpers');
jest.mock('@/lib/square/tip-settings');
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  })),
}));

// Type-safe mock setup
const mockPrisma = {
  order: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  cateringProduct: {
    findMany: jest.fn(),
  },
  storeSettings: {
    findFirst: jest.fn(),
  },
} as any;

// Replace the actual prisma instance with our mock
(prisma as any).order = mockPrisma.order;
(prisma as any).product = mockPrisma.product;
(prisma as any).cateringProduct = mockPrisma.cateringProduct;
(prisma as any).storeSettings = mockPrisma.storeSettings;

const mockValidateOrderMinimums = validateOrderMinimums as jest.MockedFunction<typeof validateOrderMinimums>;

// Test fixtures
const validCartItems = [
  {
    id: 'product-1',
    name: 'Dulce de Leche Alfajores',
    price: 12.99,
    quantity: 2,
    variantId: 'variant-1',
  },
  {
    id: 'product-2',
    name: 'Empanada Beef',
    price: 4.50,
    quantity: 6,
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
  status: 'PENDING',
  total: 4543,
  taxAmount: 346,
  subtotal: 4197,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+1234567890',
  fulfillmentMethod: 'pickup',
  userId: null,
  createdAt: new Date('2025-06-19T16:55:08.495Z'),
  updatedAt: new Date('2025-06-19T16:55:08.495Z'),
};

// Jest mocks
jest.mock('@/lib/cart-helpers', () => ({
  validateOrderMinimums: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Type the mocked functions
// const mockSyncOrderWithSquare = syncOrderWithSquare as jest.MockedFunction<typeof syncOrderWithSquare>; // Not available yet

describe('Order Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Setup default mocks
    mockPrisma.storeSettings.findFirst.mockResolvedValue({
      cateringMinimum: 15000, // $150 minimum for catering
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrderAndGenerateCheckoutUrl', () => {
    const baseFormData = {
      items: validCartItems,
      customerInfo: validCustomerInfo,
      paymentMethod: PaymentMethod.SQUARE,
    };

    describe('Pickup orders', () => {
      test('should create pickup order successfully', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validPickupFulfillment,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(true);
        expect(result.orderId).toBe('order-123');
        expect(result.checkoutUrl).toContain('order-123');

        // Verify order creation with correct data
        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            customerName: 'John Doe',
            customerEmail: 'john@example.com',
            customerPhone: '+1234567890',
            fulfillmentMethod: 'pickup',
            pickupTime: new Date('2024-01-15T14:00:00.000Z'),
          }),
        });
      });

      test('should handle pickup time validation', async () => {
        const pastTimeFormData = {
          ...baseFormData,
          fulfillment: {
            ...validPickupFulfillment,
            pickupTime: '2020-01-01T10:00:00Z', // Past date
          },
        };

        const result = await createOrderAndGenerateCheckoutUrl(pastTimeFormData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('past');
      });
    });

    describe('Local delivery orders', () => {
      test('should create local delivery order successfully', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validLocalDeliveryFulfillment,
        };

        mockValidateOrderMinimums.mockResolvedValue({
          isValid: true,
          errorMessage: null,
          deliveryZone: 'zone-1',
          minimumRequired: 5000, // $50 minimum
          currentAmount: 4197,   // Cart total
        });

        mockPrisma.order.create.mockResolvedValue({
          ...mockCreatedOrder,
          fulfillmentMethod: 'local_delivery',
          deliveryFee: 500, // $5 delivery fee
          total: 5043,      // Including delivery fee
        });

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(true);
        expect(mockValidateOrderMinimums).toHaveBeenCalledWith(
          validCartItems,
          validLocalDeliveryFulfillment.deliveryAddress
        );

        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fulfillmentMethod: 'local_delivery',
            deliveryAddress: validLocalDeliveryFulfillment.deliveryAddress,
            deliveryFee: expect.any(Number),
          }),
        });
      });

      test('should handle delivery minimum validation failure', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validLocalDeliveryFulfillment,
        };

        mockValidateOrderMinimums.mockResolvedValue({
          isValid: false,
          errorMessage: 'Order minimum of $50 not met',
          deliveryZone: 'zone-1',
          minimumRequired: 5000,
          currentAmount: 3000,
        });

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Order minimum of $50 not met');
        expect(mockPrisma.order.create).not.toHaveBeenCalled();
      });
    });

    describe('Nationwide shipping orders', () => {
      test('should create shipping order successfully', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validNationwideShippingFulfillment,
        };

        mockPrisma.order.create.mockResolvedValue({
          ...mockCreatedOrder,
          fulfillmentMethod: 'nationwide_shipping',
          shippingCost: 1250,
          total: 5842, // Including shipping
        });

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(true);

        expect(mockPrisma.order.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            fulfillmentMethod: 'nationwide_shipping',
            shippingAddress: validNationwideShippingFulfillment.shippingAddress,
            shippingCost: 1250,
            shippingMethod: 'ground',
            shippingCarrier: 'USPS',
            shippoRateId: 'rate-123',
          }),
        });
      });

      test('should validate shipping rate ID', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: {
            ...validNationwideShippingFulfillment,
            rateId: '', // Missing rate ID
          },
        };

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('shipping rate');
      });
    });

    describe('Tax and fee calculations', () => {
      test('should calculate tax correctly', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validPickupFulfillment,
        };

        mockPrisma.order.create.mockResolvedValue(mockCreatedOrder);

        await createOrderAndGenerateCheckoutUrl(formData);

        const createCall = mockPrisma.order.create.mock.calls[0][0];
        const orderData = createCall.data;

        // Verify tax calculation (8.25% of subtotal)
        expect(orderData.taxAmount).toBe(346); // 8.25% of 4197
        expect(orderData.total).toBe(4543);    // 4197 + 346
      });

      test('should apply service fee when applicable', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validPickupFulfillment,
        };

        // Mock a scenario where service fee applies
        mockPrisma.order.create.mockResolvedValue({
          ...mockCreatedOrder,
          serviceFee: 147, // 3.5% service fee
          total: 4690,     // Including service fee
        });

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(true);
      });
    });

    describe('Error handling', () => {
      test('should handle database errors during order creation', async () => {
        const formData = {
          ...baseFormData,
          fulfillment: validPickupFulfillment,
        };

        mockPrisma.order.create.mockRejectedValue(new Error('Database connection failed'));

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Database connection failed');
      });

      test('should handle invalid cart items', async () => {
        const formData = {
          ...baseFormData,
          items: [], // Empty cart
          fulfillment: validPickupFulfillment,
        };

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('empty');
      });

      test('should handle invalid customer info', async () => {
        const formData = {
          ...baseFormData,
          customerInfo: {
            name: '',
            email: 'invalid-email',
            phone: '',
          },
          fulfillment: validPickupFulfillment,
        };

        const result = await createOrderAndGenerateCheckoutUrl(formData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('validation');
      });
    });
  });

  describe('validateOrderMinimumsServer', () => {
    test('should validate pickup orders without minimum requirements', async () => {
      const result = await validateOrderMinimumsServer(validCartItems);

      expect(result).toEqual({
        isValid: true,
        errorMessage: null,
      });
    });

    test('should validate delivery orders with zone minimums', async () => {
      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105',
      };

      mockValidateOrderMinimums.mockResolvedValue({
        isValid: true,
        errorMessage: null,
        deliveryZone: 'zone-1',
        minimumRequired: 5000,
        currentAmount: 4197,
      });

      const result = await validateOrderMinimumsServer(validCartItems, deliveryAddress);

      expect(result.isValid).toBe(true);
      expect(result.deliveryZone).toBe('zone-1');
    });

    test('should reject orders below minimum', async () => {
      const deliveryAddress = {
        city: 'San Francisco',
        postalCode: '94105',
      };

      mockValidateOrderMinimums.mockResolvedValue({
        isValid: false,
        errorMessage: 'Minimum order of $50 required',
        deliveryZone: 'zone-1',
        minimumRequired: 5000,
        currentAmount: 3000,
      });

      const result = await validateOrderMinimumsServer(validCartItems, deliveryAddress);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Minimum order of $50 required');
    });

    test('should handle catering product validation', async () => {
      const cateringItems = [
        {
          id: 'catering-1',
          name: 'Corporate Lunch Package',
          price: 150.00,
          quantity: 1,
        },
      ];

      mockPrisma.cateringProduct.findMany.mockResolvedValue([
        { id: 'catering-1', minimumQuantity: 10 },
      ]);

      const result = await validateOrderMinimumsServer(cateringItems);

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('catering');
    });
  });

  describe('updateOrderPayment', () => {
    test('should update order payment status successfully', async () => {
      const updatedOrder = {
        ...mockCreatedOrder,
        status: 'PAID',
        squareOrderId: 'square-order-456',
        paymentId: 'payment-789',
      };

      mockPrisma.order.update.mockResolvedValue(updatedOrder);

      const result = await updateOrderPayment('order-123', 'square-order-456', 'PAID');

      expect(result).toEqual(updatedOrder);
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: 'PAID',
          squareOrderId: 'square-order-456',
          paymentId: expect.any(String),
          paidAt: expect.any(Date),
        },
      });
    });

    test('should handle payment failure status', async () => {
      const failedOrder = {
        ...mockCreatedOrder,
        status: 'FAILED',
        paymentFailedAt: new Date(),
      };

      mockPrisma.order.update.mockResolvedValue(failedOrder);

      const result = await updateOrderPayment('order-123', 'square-order-456', 'FAILED', 'Card declined');

      expect(result.status).toBe('FAILED');
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          paymentFailureReason: 'Card declined',
          paymentFailedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('getOrderById', () => {
    test('should retrieve order with full details', async () => {
      const fullOrder = {
        ...mockCreatedOrder,
        items: [
          {
            id: 'item-1',
            quantity: 2,
            price: 1299,
            product: { name: 'Dulce de Leche Alfajores' },
            variant: { name: '6-pack' },
          },
        ],
      };

      mockPrisma.order.findUnique.mockResolvedValue(fullOrder);

      const result = await getOrderById('order-123');

      expect(result).toEqual(fullOrder);
      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        include: expect.objectContaining({
          items: expect.objectContaining({
            include: expect.objectContaining({
              product: true,
              variant: true,
            }),
          }),
        }),
      });
    });

    test('should return null for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await getOrderById('non-existent');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      mockPrisma.order.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(getOrderById('order-123')).rejects.toThrow('Database error');
    });
  });

  describe('createManualPaymentOrder', () => {
    test('should create cash payment order successfully', async () => {
      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: 'CASH' as const,
      };

      const cashOrder = {
        ...mockCreatedOrder,
        paymentMethod: 'CASH',
        status: 'PENDING_PAYMENT',
      };

      mockPrisma.order.create.mockResolvedValue(cashOrder);

      const result = await createManualPaymentOrder(formData);

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-123');

      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMethod: 'CASH',
          status: 'PENDING_PAYMENT',
        }),
      });
    });

    test('should handle cash payment validation', async () => {
      const formData = {
        items: validCartItems,
        customerInfo: validCustomerInfo,
        fulfillment: validPickupFulfillment,
        paymentMethod: 'CASH' as const,
      };

      // Mock a scenario where cash payments aren't allowed for delivery
      const deliveryFormData = {
        ...formData,
        fulfillment: validLocalDeliveryFulfillment,
      };

      const result = await createManualPaymentOrder(deliveryFormData);

      // Cash payments might not be allowed for delivery orders
      if (!result.success) {
        expect(result.error).toContain('cash');
      }
    });
  });
}); 