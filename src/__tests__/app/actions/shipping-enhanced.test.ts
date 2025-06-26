import { getShippingRates, createShippingLabel } from '@/app/actions/shipping';
import { calculateShippingWeight } from '@/lib/shippingUtils';

// Mock dependencies
jest.mock('@/lib/shippingUtils');
jest.mock('shippo', () => ({
  Shippo: jest.fn().mockImplementation(() => ({
    shipments: {
      create: jest.fn(),
    },
    transactions: {
      create: jest.fn(),
    },
  })),
}));

const mockCalculateShippingWeight = calculateShippingWeight as jest.MockedFunction<typeof calculateShippingWeight>;

describe('Shipping Actions - Enhanced Testing', () => {
  const mockShipmentInput = {
    shippingAddress: {
      recipientName: 'John Doe',
      street: '456 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '555-0123',
      email: 'john@example.com',
    },
    cartItems: [
      { id: '1', name: 'Dulce de Leche Alfajores', quantity: 3, price: 12.99 },
      { id: '2', name: 'Beef Empanadas', quantity: 2, price: 9.99 },
    ],
    estimatedLengthIn: 10,
    estimatedWidthIn: 8,
    estimatedHeightIn: 4,
  };

  let mockShippo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateShippingWeight.mockResolvedValue(2.5);
    
    // Set up environment variables
    process.env.SHIPPO_API_KEY = 'test-shippo-key';
    process.env.SHIPPING_ORIGIN_STREET1 = '123 Test St';
    process.env.SHIPPING_ORIGIN_CITY = 'San Francisco';
    process.env.SHIPPING_ORIGIN_STATE = 'CA';
    process.env.SHIPPING_ORIGIN_ZIP = '94102';
    process.env.SHIPPING_ORIGIN_PHONE = '555-0123';
    process.env.SHIPPING_ORIGIN_EMAIL = 'test@example.com';

    const { Shippo } = require('shippo');
    mockShippo = new Shippo();
  });

  afterEach(() => {
    delete process.env.SHIPPO_API_KEY;
    delete process.env.SHIPPING_ORIGIN_STREET1;
    delete process.env.SHIPPING_ORIGIN_CITY;
    delete process.env.SHIPPING_ORIGIN_STATE;
    delete process.env.SHIPPING_ORIGIN_ZIP;
    delete process.env.SHIPPING_ORIGIN_PHONE;
    delete process.env.SHIPPING_ORIGIN_EMAIL;
  });

  describe('Insurance Handling', () => {
    it('should include insurance amount in metadata when specified', async () => {
      const inputWithInsurance = {
        ...mockShipmentInput,
        insuranceAmount: 150.00,
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [{
          object_id: 'rate-123',
          provider: 'USPS',
          servicelevel: { name: 'Priority Mail' },
          amount: '12.50',
          currency: 'USD',
          estimated_days: 2,
        }],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(inputWithInsurance);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);
      
      expect(metadata).toHaveProperty('insurance_amount', 150.00);
      expect(metadata).toHaveProperty('estimated_value');
    });

    it('should calculate insurance based on estimated value when not specified', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [{
          object_id: 'rate-123',
          provider: 'USPS',
          servicelevel: { name: 'Priority Mail' },
          amount: '12.50',
          currency: 'USD',
        }],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const parcelMetadata = JSON.parse(createCall.parcels[0].metadata);
      
      // Expected: (12.99 * 3) + (9.99 * 2) = 38.97 + 19.98 = 58.95
      expect(parcelMetadata.estimated_value).toBe(58.95);
      expect(parcelMetadata.insurance_amount).toBe(58.95);
    });

    it('should handle high-value items requiring special insurance', async () => {
      const highValueInput = {
        ...mockShipmentInput,
        cartItems: [
          { id: '1', name: 'Premium Alfajores Gift Box', quantity: 1, price: 500.00 },
        ],
        insuranceAmount: 750.00, // Higher than item value for extra protection
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [{
          object_id: 'rate-123',
          provider: 'UPS',
          servicelevel: { name: 'UPS Ground' },
          amount: '25.00',
          currency: 'USD',
        }],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      const result = await getShippingRates(highValueInput);

      expect(result.success).toBe(true);
      
      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);
      
      expect(metadata.insurance_amount).toBe(750.00);
      expect(metadata.estimated_value).toBe(500.00);
    });
  });

  describe('Metadata Validation and Enhancement', () => {
    it('should include comprehensive product categorization', async () => {
      const mixedProductInput = {
        ...mockShipmentInput,
        cartItems: [
          { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2, price: 12.99 },
          { id: '2', name: 'Chicken Empanadas', quantity: 3, price: 9.99 },
          { id: '3', name: 'Chimichurri Sauce', quantity: 1, price: 8.99 },
          { id: '4', name: 'Custom Gift Box', quantity: 1, price: 25.00 },
        ],
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mixedProductInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);
      
      expect(metadata.productTypes).toContain('alfajores');
      expect(metadata.productTypes).toContain('empanadas');
      expect(metadata.productTypes).toContain('other');
      expect(metadata.itemCount).toBe(7); // 2+3+1+1
    });

    it('should validate metadata structure and required fields', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      
      // Validate shipment-level metadata
      const shipmentMetadata = JSON.parse(createCall.metadata);
      expect(shipmentMetadata).toHaveProperty('source', 'destino_sf_website');
      expect(shipmentMetadata).toHaveProperty('order_type', 'food_delivery');
      expect(shipmentMetadata).toHaveProperty('timestamp');
      expect(shipmentMetadata).toHaveProperty('productTypes');
      expect(shipmentMetadata).toHaveProperty('totalWeight', 2.5);
      expect(shipmentMetadata).toHaveProperty('itemCount');
      expect(shipmentMetadata).toHaveProperty('estimatedValue');

      // Validate parcel-level metadata
      const parcelMetadata = JSON.parse(createCall.parcels[0].metadata);
      expect(parcelMetadata).toHaveProperty('product_types');
      expect(parcelMetadata).toHaveProperty('item_count');
      expect(parcelMetadata).toHaveProperty('estimated_value');
    });

    it('should handle edge cases in product categorization', async () => {
      const edgeCaseInput = {
        ...mockShipmentInput,
        cartItems: [
          { id: '1', name: 'ALFAJOR de dulce', quantity: 1, price: 5.99 }, // Mixed case
          { id: '2', name: 'Mini Empanada Bites', quantity: 1, price: 8.99 }, // Partial match
          { id: '3', name: '', quantity: 1, price: 10.00 }, // Empty name
          { id: '4', name: '   ', quantity: 1, price: 15.00 }, // Whitespace name
        ],
      };

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(edgeCaseInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);
      
      expect(metadata.productTypes).toContain('alfajores');
      expect(metadata.productTypes).toContain('empanadas');
      expect(metadata.productTypes).toContain('other');
    });
  });

  describe('Advanced Error Scenarios', () => {
    it('should handle Shippo API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockShippo.shipments.create.mockRejectedValue(rateLimitError);

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rate limit exceeded');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockShippo.shipments.create.mockRejectedValue(timeoutError);

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle malformed Shippo API responses', async () => {
      mockShippo.shipments.create.mockResolvedValue({
        // Missing required fields
        status: 'SUCCESS',
        // objectId missing
        // rates missing
        // addressTo missing
      });

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No shipping rates found');
    });

    it('should handle origin address configuration errors', async () => {
      delete process.env.SHIPPING_ORIGIN_STREET1;

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shipping origin configuration error.');
    });

    it('should handle corrupted weight calculation data', async () => {
      mockCalculateShippingWeight.mockRejectedValue(new Error('Weight calculation failed'));

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Weight calculation failed');
    });
  });

  describe('Label Creation with Enhanced Validation', () => {
    it('should create label with comprehensive order metadata', async () => {
      const orderMetadata = {
        orderId: 'order-456',
        customerEmail: 'customer@example.com',
        fulfillmentType: 'nationwide_shipping',
        priority: 'standard',
      };

      mockShippo.transactions.create.mockResolvedValue({
        object_id: 'transaction-123',
        status: 'SUCCESS',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        tracking_number: '9405511899564540000000',
        eta: '2024-12-15T18:00:00Z',
      });

      await createShippingLabel('rate-123', orderMetadata);

      const createCall = mockShippo.transactions.create.mock.calls[0][0];
      const metadata = JSON.parse(createCall.metadata);

      expect(metadata.source).toBe('destino_sf_website');
      expect(metadata.orderId).toBe('order-456');
      expect(metadata.customerEmail).toBe('customer@example.com');
      expect(metadata.fulfillmentType).toBe('nationwide_shipping');
      expect(metadata.priority).toBe('standard');
      expect(metadata.created_at).toBeDefined();
    });

    it('should handle label creation failures with detailed errors', async () => {
      const labelError = {
        object_id: 'transaction-123',
        status: 'ERROR',
        messages: [
          { code: 'INVALID_RATE', text: 'Selected rate is no longer valid' },
          { code: 'PAYMENT_REQUIRED', text: 'Insufficient funds for label creation' },
        ],
      };

      mockShippo.transactions.create.mockResolvedValue(labelError);

      const result = await createShippingLabel('invalid-rate-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Selected rate is no longer valid');
      expect(result.error).toContain('Insufficient funds for label creation');
    });

    it('should handle transaction API errors gracefully', async () => {
      const apiError = new Error('Shippo transaction API error');
      mockShippo.transactions.create.mockRejectedValue(apiError);

      const result = await createShippingLabel('rate-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shippo transaction API error');
    });
  });

  describe('Environment Configuration Validation', () => {
    it('should validate all required environment variables', async () => {
      delete process.env.SHIPPO_API_KEY;

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shipping provider configuration error.');
    });

    it('should validate origin address completeness', async () => {
      delete process.env.SHIPPING_ORIGIN_CITY;

      const result = await getShippingRates(mockShipmentInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Shipping origin configuration error.');
    });

    it('should use default values when optional fields are missing', async () => {
      delete process.env.SHIPPING_ORIGIN_NAME;
      delete process.env.SHIPPING_ORIGIN_COMPANY;
      delete process.env.SHIPPING_ORIGIN_COUNTRY;

      mockShippo.shipments.create.mockResolvedValue({
        objectId: 'shipment-123',
        status: 'SUCCESS',
        rates: [],
        addressTo: {
          validationResults: { isValid: true, messages: [] },
        },
      });

      await getShippingRates(mockShipmentInput);

      const createCall = mockShippo.shipments.create.mock.calls[0][0];
      
      expect(createCall.addressFrom.name).toBe('Destino SF');
      expect(createCall.addressFrom.company).toBe('Destino SF');
      expect(createCall.addressFrom.country).toBe('US');
    });
  });
}); 