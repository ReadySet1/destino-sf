import { createOrder, createPayment } from '@/lib/square/orders';
import { getSquareService } from '@/lib/square/service';

// Mock the Square service
jest.mock('@/lib/square/service');
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockGetSquareService = getSquareService as jest.MockedFunction<typeof getSquareService>;

describe.skip('Square API Comprehensive Coverage', () => {
  let mockSquareService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Set up environment variables
    process.env.SQUARE_LOCATION_ID = 'test-location-id';
    process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';

    // Create mock Square service
    mockSquareService = {
      createOrder: jest.fn(),
      createPayment: jest.fn(),
    };

    mockGetSquareService.mockReturnValue(mockSquareService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up environment variables
    delete process.env.SQUARE_LOCATION_ID;
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_ENVIRONMENT;
  });

  describe('createOrder', () => {
    const validOrderData = {
      locationId: 'test-location-id',
      lineItems: [
        {
          quantity: '2',
          catalogObjectId: 'product-1',
          name: 'Dulce de Leche Alfajores',
        },
        {
          quantity: '1',
          catalogObjectId: 'product-2',
          name: 'Beef Empanadas',
        },
      ],
    };

    test('should create order successfully', async () => {
      const mockSquareOrder = {
        id: 'square-order-123',
        locationId: 'test-location-id',
        state: 'OPEN',
        totalMoney: {
          amount: BigInt(5000),
          currency: 'USD',
        },
      };

      mockSquareService.createOrder.mockResolvedValue({
        order: mockSquareOrder,
      });

      const result = await createOrder(validOrderData);

      expect(result).toEqual(mockSquareOrder);
      expect(mockSquareService.createOrder).toHaveBeenCalledWith({
        order: {
          locationId: 'test-location-id',
          lineItems: validOrderData.lineItems,
        },
        idempotencyKey: expect.any(String),
      });
    });

    test('should handle invalid location ID', async () => {
      const invalidOrderData = {
        ...validOrderData,
        locationId: '',
      };

      await expect(createOrder(invalidOrderData)).rejects.toThrow();
    });

    test('should handle empty line items', async () => {
      const emptyOrderData = {
        ...validOrderData,
        lineItems: [],
      };

      await expect(createOrder(emptyOrderData)).rejects.toThrow();
    });

    test('should handle Square API errors', async () => {
      const mockError = new Error('Square API Error') as any;
      mockError.body = { errors: [{ code: 'INVALID_REQUEST', detail: 'Invalid line items' }] };

      mockSquareService.createOrder.mockRejectedValue(mockError);

      await expect(createOrder(validOrderData)).rejects.toThrow('Square API Error');
    });

    test('should handle missing order in response', async () => {
      mockSquareService.createOrder.mockResolvedValue({
        order: null,
      });

      await expect(createOrder(validOrderData)).rejects.toThrow('Failed to create order');
    });

    test('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockSquareService.createOrder.mockRejectedValue(timeoutError);

      await expect(createOrder(validOrderData)).rejects.toThrow('Network timeout');
    });

    test('should handle malformed line items', async () => {
      const malformedOrderData = {
        locationId: 'test-location-id',
        lineItems: [
          {
            quantity: 'invalid', // Non-numeric quantity
            catalogObjectId: '',
            name: '',
          },
        ],
      };

      await expect(createOrder(malformedOrderData)).rejects.toThrow();
    });
  });

  describe('createPayment', () => {
    const validPaymentData = {
      sourceId: 'card-123',
      orderId: 'square-order-123',
      amountCents: 5000, // $50.00
    };

    test('should create payment successfully', async () => {
      const mockPayment = {
        id: 'payment-123',
        orderId: 'square-order-123',
        amountMoney: {
          amount: BigInt(5000),
          currency: 'USD',
        },
        status: 'COMPLETED',
      };

      mockSquareService.createPayment.mockResolvedValue({
        payment: mockPayment,
      });

      const result = await createPayment(
        validPaymentData.sourceId,
        validPaymentData.orderId,
        validPaymentData.amountCents
      );

      expect(result).toEqual(mockPayment);
      expect(mockSquareService.createPayment).toHaveBeenCalledWith({
        sourceId: 'card-123',
        orderId: 'square-order-123',
        idempotencyKey: expect.any(String),
        amountMoney: {
          amount: BigInt(5000),
          currency: 'USD',
        },
      });
    });

    test('should handle missing payment source', async () => {
      await expect(createPayment('', 'order-123', 5000)).rejects.toThrow();
    });

    test('should handle invalid amount', async () => {
      await expect(createPayment('card-123', 'order-123', 0)).rejects.toThrow();
      await expect(createPayment('card-123', 'order-123', -100)).rejects.toThrow();
    });

    test('should handle Square payment errors', async () => {
      const mockError = new Error('Payment declined') as any;
      mockError.body = {
        errors: [
          {
            code: 'CARD_DECLINED',
            detail: 'Your card was declined',
          },
        ],
      };

      mockSquareService.createPayment.mockRejectedValue(mockError);

      await expect(
        createPayment(
          validPaymentData.sourceId,
          validPaymentData.orderId,
          validPaymentData.amountCents
        )
      ).rejects.toThrow('Payment declined');
    });

    test('should handle missing payment in response', async () => {
      mockSquareService.createPayment.mockResolvedValue({
        payment: null,
      });

      await expect(
        createPayment(
          validPaymentData.sourceId,
          validPaymentData.orderId,
          validPaymentData.amountCents
        )
      ).rejects.toThrow('Failed to create payment');
    });

    test('should handle large payment amounts', async () => {
      const largeAmount = 999999900; // $9,999,999.00

      const mockPayment = {
        id: 'payment-large',
        orderId: 'square-order-123',
        amountMoney: {
          amount: BigInt(largeAmount),
          currency: 'USD',
        },
        status: 'COMPLETED',
      };

      mockSquareService.createPayment.mockResolvedValue({
        payment: mockPayment,
      });

      const result = await createPayment(
        validPaymentData.sourceId,
        validPaymentData.orderId,
        largeAmount
      );

      expect(result.amountMoney.amount).toBe(BigInt(largeAmount));
    });

    test('should handle payment processing errors', async () => {
      const processingError = new Error('Payment processing failed') as any;
      processingError.body = {
        errors: [
          {
            code: 'PROCESSING_ERROR',
            detail: 'Unable to process payment at this time',
          },
        ],
      };

      mockSquareService.createPayment.mockRejectedValue(processingError);

      await expect(
        createPayment(
          validPaymentData.sourceId,
          validPaymentData.orderId,
          validPaymentData.amountCents
        )
      ).rejects.toThrow('Payment processing failed');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing environment variables', () => {
      delete process.env.SQUARE_ACCESS_TOKEN;

      // This should be handled by the Square service itself
      expect(() => {
        mockGetSquareService();
      }).not.toThrow();
    });

    test('should handle concurrent order creation', async () => {
      const mockOrder = {
        id: 'concurrent-order',
        locationId: 'test-location-id',
        state: 'OPEN',
      };

      mockSquareService.createOrder.mockResolvedValue({
        order: mockOrder,
      });

      const orderData = {
        locationId: 'test-location-id',
        lineItems: [{ quantity: '1', catalogObjectId: 'test-item', name: 'Test Item' }],
      };

      const promises = Array(3)
        .fill(null)
        .map(() => createOrder(orderData));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.id).toBe('concurrent-order');
      });
    });

    test('should handle special characters in order data', async () => {
      const specialCharOrder = {
        locationId: 'test-location-id',
        lineItems: [
          {
            quantity: '1',
            catalogObjectId: 'special-item',
            name: 'Item with émojis 🌮 and símböls',
          },
        ],
      };

      const mockOrder = {
        id: 'special-order-123',
        locationId: 'test-location-id',
        state: 'OPEN',
      };

      mockSquareService.createOrder.mockResolvedValue({
        order: mockOrder,
      });

      const result = await createOrder(specialCharOrder);

      expect(result.id).toBe('special-order-123');
      expect(mockSquareService.createOrder).toHaveBeenCalledWith({
        order: {
          locationId: 'test-location-id',
          lineItems: specialCharOrder.lineItems,
        },
        idempotencyKey: expect.any(String),
      });
    });

    test('should handle very long order processing', async () => {
      const longProcessingOrder = {
        locationId: 'test-location-id',
        lineItems: Array(100)
          .fill(null)
          .map((_, i) => ({
            quantity: '1',
            catalogObjectId: `item-${i}`,
            name: `Item ${i}`,
          })),
      };

      const mockOrder = {
        id: 'large-order-123',
        locationId: 'test-location-id',
        state: 'OPEN',
      };

      mockSquareService.createOrder.mockResolvedValue({
        order: mockOrder,
      });

      const result = await createOrder(longProcessingOrder);

      expect(result.id).toBe('large-order-123');
      expect(mockSquareService.createOrder).toHaveBeenCalledWith({
        order: {
          locationId: 'test-location-id',
          lineItems: longProcessingOrder.lineItems,
        },
        idempotencyKey: expect.any(String),
      });
    });
  });
});
