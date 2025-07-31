import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { purchaseShippingLabel, refreshAndRetryLabel, validateShippoConnection } from '@/app/actions/labels';
import { ShippoClientManager } from '@/lib/shippo/client';
import { prisma } from '@/lib/db';
import { getShippingRates } from '@/lib/shipping';
import { OrderStatus } from '@prisma/client';

// Mock dependencies
jest.mock('@/lib/shippo/client');
jest.mock('@/lib/db');
jest.mock('@/lib/shipping');

const mockShippoClientManager = ShippoClientManager as jest.Mocked<typeof ShippoClientManager>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetShippingRates = getShippingRates as jest.MockedFunction<typeof getShippingRates>;

describe('Enhanced Label Creation', () => {
  let mockShippoClient: any;
  let mockOrder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Shippo client
    mockShippoClient = {
      transactions: {
        create: jest.fn(),
      },
    };

    mockShippoClientManager.getInstance.mockReturnValue(mockShippoClient);

    // Setup mock order
    mockOrder = {
      id: 'test-order-id',
      retryCount: 0,
      shippingCarrier: 'USPS',
      customerName: 'Test Customer',
      email: 'test@example.com',
      phone: '555-0123',
      items: [
        {
          quantity: 2,
          product: {
            squareId: 'prod-123',
            name: 'Test Product',
            price: 25.00,
          },
          variant: null,
        },
      ],
      rawData: {
        fulfillment: {
          shipment_details: {
            recipient: {
              display_name: 'Test Customer',
              address: {
                address_line_1: '123 Test St',
                locality: 'San Francisco',
                administrative_district_level_1: 'CA',
                postal_code: '94102',
                country: 'US',
              },
              phone_number: '555-0123',
            },
          },
        },
      },
    };

    // Setup environment
    process.env.SHIPPO_API_KEY = 'test-shippo-key';
  });

  afterEach(() => {
    delete process.env.SHIPPO_API_KEY;
  });

  describe('purchaseShippingLabel', () => {
    it('should successfully create a label on first attempt', async () => {
      // Setup mocks
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update
        .mockResolvedValueOnce(mockOrder) // retry tracking update
        .mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.SHIPPING }); // success update

      const successTransaction = {
        status: 'SUCCESS',
        labelUrl: 'https://shippo.com/label.pdf',
        trackingNumber: '1234567890',
      };

      mockShippoClient.transactions.create.mockResolvedValue(successTransaction);

      // Execute
      const result = await purchaseShippingLabel('test-order-id', 'test-rate-id');

      // Verify
      expect(result.success).toBe(true);
      expect(result.labelUrl).toBe('https://shippo.com/label.pdf');
      expect(result.trackingNumber).toBe('1234567890');
      expect(result.retryAttempt).toBe(1);

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'test-order-id' },
        data: {
          trackingNumber: '1234567890',
          status: OrderStatus.SHIPPING,
          retryCount: 1,
          lastRetryAt: expect.any(Date),
        },
      });
    });

    it('should handle rate expiration and refresh rates', async () => {
      // Setup mocks
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update
        .mockResolvedValueOnce(mockOrder) // retry tracking update
        .mockResolvedValueOnce(mockOrder) // rate update
        .mockResolvedValueOnce(mockOrder) // retry tracking update again
        .mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.SHIPPING }); // final success

      // First attempt fails with rate expired error
      const rateExpiredError = new Error('Rate expired or not found');
      mockShippoClient.transactions.create
        .mockRejectedValueOnce(rateExpiredError)
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          labelUrl: 'https://shippo.com/label-refreshed.pdf',
          trackingNumber: '0987654321',
        });

      // Mock rate refresh
      mockGetShippingRates.mockResolvedValue({
        success: true,
        rates: [
          {
            id: 'new-rate-id',
            carrier: 'USPS',
            name: 'Priority Mail',
            price: 8.50,
          },
        ],
      });

      // Execute
      const result = await purchaseShippingLabel('test-order-id', 'expired-rate-id');

      // Verify
      expect(result.success).toBe(true);
      expect(result.labelUrl).toBe('https://shippo.com/label-refreshed.pdf');
      expect(result.trackingNumber).toBe('0987654321');

      expect(mockGetShippingRates).toHaveBeenCalledWith({
        cartItems: expect.any(Array),
        shippingAddress: expect.any(Object),
      });

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'test-order-id' },
        data: {
          shippingRateId: 'new-rate-id',
        },
      });
    });

    it('should retry with exponential backoff on network errors', async () => {
      // Setup mocks
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update
        .mockResolvedValue(mockOrder) // retry tracking updates
        .mockResolvedValue(mockOrder)
        .mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPING }); // final success

      const networkError = new Error('Network timeout');
      
      mockShippoClient.transactions.create
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          status: 'SUCCESS',
          labelUrl: 'https://shippo.com/label-retry.pdf',
          trackingNumber: '1122334455',
        });

      // Mock timer for delay testing
      jest.useFakeTimers();

      // Execute
      const resultPromise = purchaseShippingLabel('test-order-id', 'test-rate-id');
      
      // Fast-forward through delays
      jest.advanceTimersByTime(1000); // First retry delay
      jest.advanceTimersByTime(2000); // Second retry delay
      
      const result = await resultPromise;

      // Verify
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBe('1122334455');
      expect(mockShippoClient.transactions.create).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should fail after maximum retry attempts', async () => {
      // Setup order with high retry count
      const highRetryOrder = { ...mockOrder, retryCount: 3 };
      mockPrisma.order.findUnique.mockResolvedValue(highRetryOrder);

      // Execute
      const result = await purchaseShippingLabel('test-order-id', 'test-rate-id');

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum retry attempts');
      expect(result.errorCode).toBe('RETRY_EXHAUSTED');
      expect(result.retryAttempt).toBe(3);

      // Should not attempt to create transaction
      expect(mockShippoClient.transactions.create).not.toHaveBeenCalled();
    });

    it('should handle order not found', async () => {
      // Setup mocks
      mockPrisma.order.findUnique.mockResolvedValue(null);

      // Execute
      const result = await purchaseShippingLabel('nonexistent-order-id', 'test-rate-id');

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Order not found');
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });

    it('should handle transaction failed status', async () => {
      // Setup mocks
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const failedTransaction = {
        status: 'ERROR',
        messages: [
          { text: 'Invalid address format' },
          { text: 'Unable to validate recipient' },
        ],
      };

      mockShippoClient.transactions.create.mockResolvedValue(failedTransaction);

      // Execute
      const result = await purchaseShippingLabel('test-order-id', 'test-rate-id');

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid address format, Unable to validate recipient');
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });
  });

  describe('refreshAndRetryLabel', () => {
    it('should reset retry count and attempt fresh label creation', async () => {
      // Setup mocks
      const orderWithRetries = { ...mockOrder, retryCount: 2 };
      mockPrisma.order.findUnique.mockResolvedValue(orderWithRetries);
      mockPrisma.order.update
        .mockResolvedValueOnce({ ...orderWithRetries, retryCount: 0 }) // reset
        .mockResolvedValueOnce(orderWithRetries) // rate update
        .mockResolvedValueOnce(orderWithRetries) // retry tracking
        .mockResolvedValueOnce({ ...orderWithRetries, status: OrderStatus.SHIPPING }); // success

      mockGetShippingRates.mockResolvedValue({
        success: true,
        rates: [
          {
            id: 'fresh-rate-id',
            carrier: 'USPS',
            name: 'Priority Mail',
            price: 8.50,
          },
        ],
      });

      mockShippoClient.transactions.create.mockResolvedValue({
        status: 'SUCCESS',
        labelUrl: 'https://shippo.com/label-fresh.pdf',
        trackingNumber: '5566778899',
      });

      // Execute
      const result = await refreshAndRetryLabel('test-order-id');

      // Verify
      expect(result.success).toBe(true);
      expect(result.trackingNumber).toBe('5566778899');

      // Verify retry count was reset
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'test-order-id' },
        data: {
          retryCount: 0,
          lastRetryAt: expect.any(Date),
        },
      });
    });
  });

  describe('validateShippoConnection', () => {
    it('should validate successful connection', async () => {
      mockShippoClientManager.validateConnection.mockResolvedValue({
        connected: true,
        version: 'v2.15+',
      });

      const result = await validateShippoConnection();

      expect(result.connected).toBe(true);
      expect(result.version).toBe('v2.15+');
    });

    it('should handle connection failure', async () => {
      mockShippoClientManager.validateConnection.mockResolvedValue({
        connected: false,
        version: 'unknown',
        error: 'API key invalid',
      });

      const result = await validateShippoConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('API key invalid');
    });
  });

  describe('Error Type Detection', () => {
    it('should detect various rate expiration error formats', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.order.update.mockResolvedValue(mockOrder);

      const rateErrors = [
        'Rate expired',
        'Rate not found',
        'Invalid rate',
        'RATE_EXPIRED: The provided rate has expired',
        'Rate object is no longer valid',
      ];

      for (const errorMessage of rateErrors) {
        mockShippoClient.transactions.create.mockRejectedValueOnce(new Error(errorMessage));
        mockGetShippingRates.mockResolvedValueOnce({
          success: true,
          rates: [{ id: 'new-rate', carrier: 'USPS', name: 'Ground', price: 5.0 }],
        });
        mockShippoClient.transactions.create.mockResolvedValueOnce({
          status: 'SUCCESS',
          labelUrl: 'https://example.com/label.pdf',
          trackingNumber: '1234567890',
        });

        const result = await purchaseShippingLabel('test-order-id', 'expired-rate');
        expect(result.success).toBe(true);

        jest.clearAllMocks();
        mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
        mockPrisma.order.update.mockResolvedValue(mockOrder);
      }
    });
  });
});