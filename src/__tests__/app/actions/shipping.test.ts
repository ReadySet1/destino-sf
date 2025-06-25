import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getShippingRates, createShippingLabel } from '@/app/actions/shipping';
import { Shippo } from 'shippo';
import * as shippingUtils from '@/lib/shippingUtils';

// Mock dependencies
jest.mock('shippo');
jest.mock('@/lib/shippingUtils');

const mockShippo = {
  shipments: {
    create: jest.fn(),
  },
  transactions: {
    create: jest.fn(),
  },
};

const mockCalculateShippingWeight = shippingUtils.calculateShippingWeight as jest.MockedFunction<typeof shippingUtils.calculateShippingWeight>;

describe('Shipping Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.SHIPPO_API_KEY = 'test-api-key';
    process.env.SHIPPING_ORIGIN_NAME = 'Destino SF';
    process.env.SHIPPING_ORIGIN_COMPANY = 'Destino SF';
    process.env.SHIPPING_ORIGIN_STREET1 = '123 Test St';
    process.env.SHIPPING_ORIGIN_CITY = 'San Francisco';
    process.env.SHIPPING_ORIGIN_STATE = 'CA';
    process.env.SHIPPING_ORIGIN_ZIP = '94102';
    process.env.SHIPPING_ORIGIN_COUNTRY = 'US';
    process.env.SHIPPING_ORIGIN_PHONE = '555-0123';
    process.env.SHIPPING_ORIGIN_EMAIL = 'test@example.com';
    
    // Mock Shippo constructor
    (Shippo as jest.MockedClass<typeof Shippo>).mockImplementation(() => mockShippo as any);
    
    // Mock calculateShippingWeight
    mockCalculateShippingWeight.mockResolvedValue(2.5);
  });

  describe('getShippingRates', () => {
    const mockShippingAddress = {
      recipientName: 'John Doe',
      street: '456 Delivery St',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
    };

    const mockCartItems = [
      {
        id: '1',
        name: 'Beef Empanada',
        quantity: 6,
        price: 10.99,
      },
      {
        id: '2',
        name: 'Chicken Empanada',
        quantity: 4,
        price: 9.99,
      },
    ];

    const mockShipmentInput = {
      shippingAddress: mockShippingAddress,
      cartItems: mockCartItems,
      estimatedLengthIn: 10,
      estimatedWidthIn: 8,
      estimatedHeightIn: 4,
    };

    it('should return error when Shippo API key is not configured', async () => {
      delete process.env.SHIPPO_API_KEY;
      
      const result = await getShippingRates(mockShipmentInput);
      
      expect(result).toEqual({
        success: false,
        error: 'Shipping provider configuration error.',
      });
    });

    it('should return error when origin address is incomplete', async () => {
      delete process.env.SHIPPING_ORIGIN_STREET1;
      
      const result = await getShippingRates(mockShipmentInput);
      
      expect(result).toEqual({
        success: false,
        error: 'Shipping origin configuration error.',
      });
    });

    it('should calculate shipping weight correctly', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      expect(mockCalculateShippingWeight).toHaveBeenCalledWith(
        mockCartItems,
        'nationwide_shipping'
      );
    });

    it('should create shipment with correct parameters', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      expect(mockShippo.shipments.create).toHaveBeenCalledWith({
        addressFrom: {
          name: 'Destino SF',
          company: 'Destino SF',
          street1: '123 Test St',
          street2: undefined,
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
          phone: '555-0123',
          email: 'test@example.com',
          validate: true,
        },
        addressTo: {
          name: 'John Doe',
          company: '',
          street1: '456 Delivery St',
          street2: '',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90210',
          country: 'US',
          phone: '',
          email: '',
          validate: true,
        },
        parcels: [
          {
            length: '10',
            width: '8',
            height: '4',
            distance_unit: 'in',
            weight: '2.5',
            mass_unit: 'lb',
            template: '',
            metadata: expect.stringContaining('empanadas'),
          },
        ],
        async: false,
        metadata: expect.stringContaining('destino_sf_website'),
      });
    });

    it('should return successful response with shipping rates', async () => {
      const mockRates = [
        {
          object_id: 'rate-1',
          provider: 'USPS',
          servicelevel: { name: 'Priority Mail', token: 'usps_priority' },
          amount: '12.45',
          currency: 'USD',
          estimated_days: 3,
          provider_image_75: 'https://shippo.com/usps-75.png',
          provider_image_200: 'https://shippo.com/usps-200.png',
          attributes: ['CHEAPEST'],
          zone: '4',
          arrives_by: '2023-12-15T18:00:00Z',
        },
        {
          object_id: 'rate-2',
          provider: 'FedEx',
          servicelevel: { name: 'Ground', token: 'fedex_ground' },
          amount: '15.99',
          currency: 'USD',
          estimated_days: 5,
          provider_image_75: 'https://shippo.com/fedex-75.png',
          provider_image_200: 'https://shippo.com/fedex-200.png',
          attributes: ['FASTEST'],
          zone: '4',
          arrives_by: '2023-12-13T18:00:00Z',
        },
      ];

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: mockRates,
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(2);
      expect(result.rates![0]).toEqual({
        id: 'rate-2',
        name: 'FedEx Ground (Est. 5 days)',
        amount: 1599,
        carrier: 'FedEx',
        serviceLevelToken: 'fedex_ground',
        estimatedDays: 5,
        currency: 'USD',
        providerImage75: 'https://shippo.com/fedex-75.png',
        providerImage200: 'https://shippo.com/fedex-200.png',
        attributes: ['FASTEST'],
        zone: '4',
        arrives_by: '2023-12-13T18:00:00Z',
      });
      expect(result.shipmentId).toBe('shipment-123');
    });

    it('should handle address validation errors', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: {
            isValid: false,
            messages: [
              { type: 'address_error', text: 'Invalid address provided' },
            ],
          },
        },
      });

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation Error: Invalid address provided');
    });

    it('should handle address validation warnings', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: {
            isValid: true,
            messages: [
              { type: 'address_warning', text: 'Address may be incomplete' },
            ],
          },
        },
      });

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Address Warning: Address may be incomplete');
    });

    it('should handle shipment creation errors', async () => {
      mockShippo.shipments.create.mockRejectedValue(new Error('Shippo API error'));

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shippo API error');
    });

    it('should handle custom parcel dimensions', async () => {
      const customInput = {
        ...mockShipmentInput,
        estimatedLengthIn: 12,
        estimatedWidthIn: 10,
        estimatedHeightIn: 6,
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(customInput);

      expect(mockShippo.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parcels: [
            expect.objectContaining({
              length: '12',
              width: '10',
              height: '6',
            }),
          ],
        })
      );
    });

    it('should handle insurance amount', async () => {
      const customInput = {
        ...mockShipmentInput,
        insuranceAmount: 100.00,
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(customInput);

      // Insurance amount should be included in metadata
      expect(mockShippo.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining('100'),
        })
      );
    });

    it('should calculate estimated value correctly', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      // Should calculate: (10.99 * 6) + (9.99 * 4) = 65.94 + 39.96 = 105.90
      expect(mockShippo.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining('105.9'),
        })
      );
    });

    it('should use default price when item price is not provided', async () => {
      const itemsWithoutPrice = [
        {
          id: '1',
          name: 'Mystery Item',
          quantity: 2,
        },
      ];

      const customInput = {
        ...mockShipmentInput,
        cartItems: itemsWithoutPrice,
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(customInput);

      // Should use default price of $25 per item: 25 * 2 = 50
      expect(mockShippo.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining('50'),
        })
      );
    });

    it('should categorize product types correctly', async () => {
      const mixedItems = [
        { id: '1', name: 'Beef Alfajor', quantity: 2, price: 5.99 },
        { id: '2', name: 'Chicken Empanada', quantity: 3, price: 9.99 },
        { id: '3', name: 'Chocolate Cake', quantity: 1, price: 15.99 },
      ];

      const customInput = {
        ...mockShipmentInput,
        cartItems: mixedItems,
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(customInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);
      
      expect(metadata.productTypes).toContain('alfajores');
      expect(metadata.productTypes).toContain('empanadas');
      expect(metadata.productTypes).toContain('other');
    });
  });

  describe('createShippingLabel', () => {
    it('should return error when Shippo API key is not configured', async () => {
      delete process.env.SHIPPO_API_KEY;
      
      const result = await createShippingLabel('rate-123');
      
      expect(result).toEqual({
        success: false,
        error: 'Shipping provider configuration error.',
      });
    });

    it('should create shipping label successfully', async () => {
      const mockTransaction = {
        object_id: 'transaction-123',
        status: 'SUCCESS',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        tracking_number: '9405511899564540000000',
        eta: '2023-12-15T18:00:00Z',
      };

      mockShippo.transactions.create.mockResolvedValue(mockTransaction);

      const result = await createShippingLabel('rate-123');

      expect(result.success).toBe(true);
      expect(result.label).toMatchObject({
        transactionId: 'transaction-123',
        labelUrl: '',
        trackingNumber: '',
        eta: '2023-12-15T18:00:00Z',
      });
    });

    it('should create label with order metadata', async () => {
      const mockTransaction = {
        object_id: 'transaction-123',
        status: 'SUCCESS',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        tracking_number: '9405511899564540000000',
      };

      mockShippo.transactions.create.mockResolvedValue(mockTransaction);

      const orderMetadata = {
        orderId: 'order-456',
        customerEmail: 'customer@example.com',
      };

      await createShippingLabel('rate-123', orderMetadata);

      expect(mockShippo.transactions.create).toHaveBeenCalledWith({
        rate: 'rate-123',
        labelFileType: 'PDF',
        async: false,
        metadata: JSON.stringify({
          source: 'destino_sf_website',
          orderId: 'order-456',
          customerEmail: 'customer@example.com',
          created_at: expect.any(String),
        }),
      });
    });

    it('should handle transaction creation errors', async () => {
      mockShippo.transactions.create.mockRejectedValue(new Error('Transaction failed'));

      const result = await createShippingLabel('rate-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');
    });

    it('should handle failed transaction status', async () => {
      const mockTransaction = {
        object_id: 'transaction-123',
        status: 'ERROR',
        messages: [
          { text: 'Insufficient funds' },
        ],
      };

      mockShippo.transactions.create.mockResolvedValue(mockTransaction);

      const result = await createShippingLabel('rate-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
    });

    it('should handle transaction without messages', async () => {
      const mockTransaction = {
        object_id: 'transaction-123',
        status: 'ERROR',
      };

      mockShippo.transactions.create.mockResolvedValue(mockTransaction);

      const result = await createShippingLabel('rate-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create shipping label');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle weight calculation errors', async () => {
      mockCalculateShippingWeight.mockRejectedValue(new Error('Weight calculation failed'));

      const result = await getShippingRates({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        },
        cartItems: [{ id: '1', name: 'Test Item', quantity: 1 }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Weight calculation failed');
    });

    it('should handle empty cart items', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      const result = await getShippingRates({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        },
        cartItems: [],
      });

      expect(result.success).toBe(true);
      expect(mockCalculateShippingWeight).toHaveBeenCalledWith([], 'nationwide_shipping');
    });

    it('should handle missing optional environment variables', async () => {
      delete process.env.SHIPPING_ORIGIN_STREET2;
      delete process.env.SHIPPING_ORIGIN_PHONE;
      delete process.env.SHIPPING_ORIGIN_EMAIL;

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      const result = await getShippingRates({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          postalCode: '12345',
        },
        cartItems: [{ id: '1', name: 'Test Item', quantity: 1 }],
      });

      expect(result.success).toBe(true);
      expect(mockShippo.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          addressFrom: expect.objectContaining({
            street2: undefined,
            phone: undefined,
            email: undefined,
          }),
        })
      );
    });
  });
}); 