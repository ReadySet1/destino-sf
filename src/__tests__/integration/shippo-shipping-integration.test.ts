import { Shippo } from 'shippo';
import { getShippingRates, createShippingLabel, trackShipment } from '@/app/actions/shipping';
import { calculateShippingWeight } from '@/lib/shippingUtils';
import { ShippoClientManager } from '@/lib/shippo/client';

// Mock Shippo SDK and centralized client
jest.mock('shippo');
jest.mock('@/lib/shippingUtils');
jest.mock('@/lib/db');
jest.mock('@/lib/shippo/client');

const MockShippo = Shippo as jest.MockedClass<typeof Shippo>;
const mockCalculateShippingWeight = calculateShippingWeight as jest.MockedFunction<
  typeof calculateShippingWeight
>;
const mockShippoClientManager = ShippoClientManager as jest.Mocked<typeof ShippoClientManager>;

describe('Shippo Shipping Integration - E2E Testing', () => {
  let mockShippoClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Shippo client methods
    mockShippoClient = {
      shipments: {
        create: jest.fn(),
        retrieve: jest.fn(),
        rates: {
          retrieve: jest.fn(),
        },
      },
      transactions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      tracks: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
      addresses: {
        create: jest.fn(),
        validate: jest.fn(),
      },
      parcels: {
        create: jest.fn(),
      },
    };

    MockShippo.mockImplementation(() => mockShippoClient);
    mockCalculateShippingWeight.mockResolvedValue(2.5);
    
    // Setup centralized client manager
    mockShippoClientManager.getInstance.mockReturnValue(mockShippoClient);
    mockShippoClientManager.setMockClient.mockImplementation((client) => {
      // In real implementation, this would set the mock client
    });
    mockShippoClientManager.reset.mockImplementation(() => {
      // In real implementation, this would reset the client
    });

    // Set up environment
    process.env.SHIPPO_API_KEY = 'test-shippo-key';
    process.env.SHIPPING_ORIGIN_STREET1 = '123 Test St';
    process.env.SHIPPING_ORIGIN_CITY = 'San Francisco';
    process.env.SHIPPING_ORIGIN_STATE = 'CA';
    process.env.SHIPPING_ORIGIN_ZIP = '94102';
    process.env.SHIPPING_ORIGIN_PHONE = '555-0123';
    process.env.SHIPPING_ORIGIN_EMAIL = 'test@destinosf.com';
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

  describe('Rate Calculation Integration', () => {
    it('should calculate shipping rates for standard domestic delivery', async () => {
      const shippingRequest = {
        shippingAddress: {
          recipientName: 'Jane Smith',
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90210',
          country: 'US',
          phone: '555-0456',
          email: 'jane@example.com',
        },
        cartItems: [
          { id: '1', name: 'Dulce de Leche Alfajores', quantity: 2, price: 15.99 },
          { id: '2', name: 'Beef Empanadas', quantity: 4, price: 12.99 },
        ],
        estimatedLengthIn: 12,
        estimatedWidthIn: 9,
        estimatedHeightIn: 6,
      };

      // Mock successful shipment creation with rates
      mockShippoClient.shipments.create.mockResolvedValue({
        object_id: 'shipment-domestic-123',
        status: 'SUCCESS',
        rates: [
          {
            object_id: 'rate-usps-ground',
            provider: 'USPS',
            servicelevel: {
              name: 'Ground',
              token: 'usps_ground',
            },
            amount: '8.50',
            currency: 'USD',
            estimated_days: 3,
            duration_terms: 'Business days',
          },
          {
            object_id: 'rate-usps-priority',
            provider: 'USPS',
            servicelevel: {
              name: 'Priority Mail',
              token: 'usps_priority',
            },
            amount: '12.75',
            currency: 'USD',
            estimated_days: 2,
            duration_terms: 'Business days',
          },
          {
            object_id: 'rate-ups-ground',
            provider: 'UPS',
            servicelevel: {
              name: 'UPS Ground',
              token: 'ups_ground',
            },
            amount: '9.25',
            currency: 'USD',
            estimated_days: 4,
            duration_terms: 'Business days',
          },
        ],
        address_to: {
          validation_results: {
            is_valid: true,
            messages: [],
          },
        },
        messages: [],
      });

      const result = await getShippingRates(shippingRequest);

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(3);

      // Verify USPS Ground rate
      const uspsGround = result.rates?.find(r => r.carrier === 'USPS' && r.name.includes('Ground'));
      expect(uspsGround).toBeDefined();
      expect(uspsGround?.amount).toBe(8.5);
      expect(uspsGround?.estimatedDays).toBe(3);

      // Verify UPS Ground rate
      const upsGround = result.rates?.find(r => r.carrier === 'UPS');
      expect(upsGround).toBeDefined();
      expect(upsGround?.amount).toBe(9.25);
      expect(upsGround?.estimatedDays).toBe(4);

      // Verify shipment creation call
      expect(mockShippoClient.shipments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          address_to: expect.objectContaining({
            name: 'Jane Smith',
            street1: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90210',
            country: 'US',
          }),
          address_from: expect.objectContaining({
            street1: '123 Test St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
          }),
          parcels: expect.arrayContaining([
            expect.objectContaining({
              length: '12',
              width: '9',
              height: '6',
              weight: '2.5',
            }),
          ]),
        })
      );
    });

    it('should handle international shipping rates', async () => {
      const internationalRequest = {
        shippingAddress: {
          recipientName: 'Carlos Rodriguez',
          street: '789 Maple Street',
          city: 'Toronto',
          state: 'ON',
          postalCode: 'M5V 3A1',
          country: 'CA',
          phone: '+1-416-555-0789',
          email: 'carlos@example.com',
        },
        cartItems: [{ id: '1', name: 'Mixed Alfajores Box', quantity: 1, price: 45.99 }],
        estimatedLengthIn: 10,
        estimatedWidthIn: 8,
        estimatedHeightIn: 4,
      };

      mockShippoClient.shipments.create.mockResolvedValue({
        object_id: 'shipment-international-123',
        status: 'SUCCESS',
        rates: [
          {
            object_id: 'rate-usps-international',
            provider: 'USPS',
            servicelevel: {
              name: 'Priority Mail International',
              token: 'usps_priority_mail_international',
            },
            amount: '28.50',
            currency: 'USD',
            estimated_days: 7,
            duration_terms: 'Business days',
          },
          {
            object_id: 'rate-ups-worldwide',
            provider: 'UPS',
            servicelevel: {
              name: 'UPS Worldwide Expedited',
              token: 'ups_worldwide_expedited',
            },
            amount: '45.75',
            currency: 'USD',
            estimated_days: 3,
            duration_terms: 'Business days',
          },
        ],
        address_to: {
          validation_results: {
            is_valid: true,
            messages: [
              {
                source: 'UPS',
                text: 'Address verified',
                type: 'address_correction',
              },
            ],
          },
        },
        customs_declaration: {
          contents_type: 'GIFT',
          contents_explanation: 'Argentine pastries and confections',
          non_delivery_option: 'RETURN',
          certify: true,
          signer: 'Destino SF',
          items: [
            {
              description: 'Mixed Alfajores Box',
              quantity: 1,
              net_weight: '1.5',
              mass_unit: 'lb',
              value_amount: '45.99',
              value_currency: 'USD',
              origin_country: 'US',
            },
          ],
        },
      });

      const result = await getShippingRates(internationalRequest);

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(2);
      expect(result.requiresCustomsDeclaration).toBe(true);

      const upsWorldwide = result.rates?.find(r => r.name.includes('Worldwide'));
      expect(upsWorldwide).toBeDefined();
      expect(upsWorldwide?.amount).toBe(45.75);
      expect(upsWorldwide?.estimatedDays).toBe(3);
    });

    it('should handle address validation and corrections', async () => {
      const requestWithInvalidAddress = {
        shippingAddress: {
          recipientName: 'John Doe',
          street: '123 Nonexistent St', // Invalid street
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
          phone: '555-0123',
          email: 'john@example.com',
        },
        cartItems: [{ id: '1', name: 'Test Product', quantity: 1, price: 10.0 }],
        estimatedLengthIn: 8,
        estimatedWidthIn: 6,
        estimatedHeightIn: 4,
      };

      mockShippoClient.shipments.create.mockResolvedValue({
        object_id: 'shipment-address-corrected',
        status: 'SUCCESS',
        rates: [
          {
            object_id: 'rate-corrected',
            provider: 'USPS',
            servicelevel: { name: 'Ground', token: 'usps_ground' },
            amount: '7.50',
            currency: 'USD',
            estimated_days: 3,
          },
        ],
        address_to: {
          validation_results: {
            is_valid: true,
            messages: [
              {
                source: 'USPS',
                text: 'Address corrected: 123 Market St',
                type: 'address_correction',
              },
            ],
          },
          street1: '123 Market St', // Corrected address
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        },
      });

      const result = await getShippingRates(requestWithInvalidAddress);

      expect(result.success).toBe(true);
      expect(result.addressValidation).toBeDefined();
      expect(result.addressValidation?.isValid).toBe(true);
      expect(result.addressValidation?.correctedAddress).toEqual(
        expect.objectContaining({
          street: '123 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
        })
      );
      expect(result.addressValidation?.messages).toContain('Address corrected: 123 Market St');
    });

    it('should handle undeliverable addresses', async () => {
      const undeliverableRequest = {
        shippingAddress: {
          recipientName: 'Test User',
          street: '999 Nonexistent Road',
          city: 'Nowhere',
          state: 'XX',
          postalCode: '00000',
          country: 'US',
          phone: '555-0000',
          email: 'test@example.com',
        },
        cartItems: [{ id: '1', name: 'Test Product', quantity: 1, price: 10.0 }],
        estimatedLengthIn: 6,
        estimatedWidthIn: 4,
        estimatedHeightIn: 2,
      };

      mockShippoClient.shipments.create.mockResolvedValue({
        object_id: 'shipment-undeliverable',
        status: 'ERROR',
        messages: [
          {
            source: 'Shippo',
            text: 'Invalid destination address',
            type: 'address_error',
          },
        ],
        address_to: {
          validation_results: {
            is_valid: false,
            messages: [
              {
                source: 'USPS',
                text: 'Address not found',
                type: 'address_error',
              },
            ],
          },
        },
        rates: [],
      });

      const result = await getShippingRates(undeliverableRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid destination address');
      expect(result.addressValidation?.isValid).toBe(false);
      expect(result.rates).toHaveLength(0);
    });
  });

  describe('Label Generation Integration', () => {
    it('should create shipping label with tracking number', async () => {
      const labelRequest = {
        rateId: 'rate-usps-priority-123',
        orderMetadata: {
          orderId: 'order-label-123',
          customerEmail: 'customer@example.com',
          fulfillmentType: 'nationwide_shipping',
          priority: 'standard',
        },
      };

      mockShippoClient.transactions.create.mockResolvedValue({
        object_id: 'transaction-label-123',
        status: 'SUCCESS',
        rate: 'rate-usps-priority-123',
        tracking_number: '9405511899564540000123',
        tracking_url_provider:
          'https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511899564540000123',
        eta: '2024-12-05T17:00:00Z',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label-123.pdf',
        commercial_invoice_url: null,
        metadata: JSON.stringify({
          source: 'destino_sf_website',
          orderId: 'order-label-123',
          customerEmail: 'customer@example.com',
          fulfillmentType: 'nationwide_shipping',
          priority: 'standard',
          created_at: '2024-12-01T12:00:00Z',
        }),
        messages: [],
      });

      const result = await createShippingLabel(labelRequest.rateId, labelRequest.orderMetadata);

      expect(result.success).toBe(true);
      expect(result.label).toBeDefined();
      expect(result.label?.transactionId).toBe('transaction-label-123');
      expect(result.label?.trackingNumber).toBe('9405511899564540000123');
      expect(result.label?.labelUrl).toBe('https://shippo-delivery.s3.amazonaws.com/label-123.pdf');
      expect(result.label?.trackingUrl).toBe(
        'https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511899564540000123'
      );
      expect(result.label?.estimatedDelivery).toBe('2024-12-05T17:00:00Z');

      expect(mockShippoClient.transactions.create).toHaveBeenCalledWith({
        rate: 'rate-usps-priority-123',
        label_file_type: 'PDF',
        async: false,
        metadata: expect.stringContaining('"orderId":"order-label-123"'),
      });
    });

    it('should handle international shipping label with customs forms', async () => {
      const internationalLabelRequest = {
        rateId: 'rate-international-456',
        orderMetadata: {
          orderId: 'order-international-456',
          customerEmail: 'international@example.com',
          fulfillmentType: 'international_shipping',
          customsDeclaration: {
            contentsType: 'GIFT',
            contentsExplanation: 'Argentine pastries',
            items: [
              {
                description: 'Alfajores',
                quantity: 6,
                netWeight: '2.0',
                valueAmount: '35.99',
                originCountry: 'US',
              },
            ],
          },
        },
      };

      mockShippoClient.transactions.create.mockResolvedValue({
        object_id: 'transaction-international-456',
        status: 'SUCCESS',
        rate: 'rate-international-456',
        tracking_number: '1Z999AA1234567890',
        tracking_url_provider: 'https://www.ups.com/track?tracknum=1Z999AA1234567890',
        eta: '2024-12-08T17:00:00Z',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/international-label-456.pdf',
        commercial_invoice_url: 'https://shippo-delivery.s3.amazonaws.com/invoice-456.pdf',
        customs_forms: [
          {
            object_id: 'customs-form-456',
            form_url: 'https://shippo-delivery.s3.amazonaws.com/customs-456.pdf',
          },
        ],
        metadata: JSON.stringify({
          source: 'destino_sf_website',
          orderId: 'order-international-456',
          fulfillmentType: 'international_shipping',
          requiresCustomsForms: true,
        }),
      });

      const result = await createShippingLabel(
        internationalLabelRequest.rateId,
        internationalLabelRequest.orderMetadata
      );

      expect(result.success).toBe(true);
      expect(result.label?.commercialInvoiceUrl).toBe(
        'https://shippo-delivery.s3.amazonaws.com/invoice-456.pdf'
      );
      expect(result.label?.customsForms).toHaveLength(1);
      expect(result.label?.customsForms?.[0].formUrl).toBe(
        'https://shippo-delivery.s3.amazonaws.com/customs-456.pdf'
      );
    });

    it('should handle label generation failures', async () => {
      const failedLabelRequest = {
        rateId: 'rate-expired-789',
        orderMetadata: {
          orderId: 'order-failed-789',
          customerEmail: 'failed@example.com',
        },
      };

      mockShippoClient.transactions.create.mockResolvedValue({
        object_id: 'transaction-failed-789',
        status: 'ERROR',
        messages: [
          {
            source: 'UPS',
            code: 'RATE_EXPIRED',
            text: 'The selected rate has expired',
          },
          {
            source: 'Shippo',
            code: 'TRANSACTION_FAILED',
            text: 'Unable to generate shipping label',
          },
        ],
        rate: 'rate-expired-789',
        tracking_number: null,
        label_url: null,
      });

      const result = await createShippingLabel(
        failedLabelRequest.rateId,
        failedLabelRequest.orderMetadata
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('The selected rate has expired');
      expect(result.error).toContain('Unable to generate shipping label');
      expect(result.errorCode).toBe('TRANSACTION_FAILED');
    });
  });

  describe('Tracking Integration', () => {
    it('should track shipment status updates', async () => {
      const trackingNumber = '9405511899564540000123';
      const carrier = 'usps';

      mockShippoClient.tracks.create.mockResolvedValue({
        object_id: 'track-123',
        tracking_number: trackingNumber,
        carrier: carrier,
        tracking_status: {
          status: 'TRANSIT',
          status_details: 'Package is in transit to destination',
          status_date: '2024-12-03T14:30:00Z',
          location: {
            city: 'Oakland',
            state: 'CA',
            zip: '94607',
            country: 'US',
          },
        },
        tracking_history: [
          {
            status: 'PRE_TRANSIT',
            status_details: 'Shipping label created',
            status_date: '2024-12-01T12:00:00Z',
            location: {
              city: 'San Francisco',
              state: 'CA',
              zip: '94102',
              country: 'US',
            },
          },
          {
            status: 'TRANSIT',
            status_details: 'Package accepted by USPS',
            status_date: '2024-12-02T09:15:00Z',
            location: {
              city: 'San Francisco',
              state: 'CA',
              zip: '94102',
              country: 'US',
            },
          },
          {
            status: 'TRANSIT',
            status_details: 'Package is in transit to destination',
            status_date: '2024-12-03T14:30:00Z',
            location: {
              city: 'Oakland',
              state: 'CA',
              zip: '94607',
              country: 'US',
            },
          },
        ],
        eta: '2024-12-05T17:00:00Z',
      });

      const result = await trackShipment(trackingNumber, carrier);

      expect(result.success).toBe(true);
      expect(result.tracking).toBeDefined();
      expect(result.tracking?.trackingNumber).toBe(trackingNumber);
      expect(result.tracking?.status).toBe('TRANSIT');
      expect(result.tracking?.statusDetails).toBe('Package is in transit to destination');
      expect(result.tracking?.currentLocation).toEqual({
        city: 'Oakland',
        state: 'CA',
        zip: '94607',
        country: 'US',
      });
      expect(result.tracking?.estimatedDelivery).toBe('2024-12-05T17:00:00Z');
      expect(result.tracking?.history).toHaveLength(3);
    });

    it('should handle delivered shipment tracking', async () => {
      const deliveredTrackingNumber = '1Z999AA1234567890';

      mockShippoClient.tracks.retrieve.mockResolvedValue({
        object_id: 'track-delivered',
        tracking_number: deliveredTrackingNumber,
        carrier: 'ups',
        tracking_status: {
          status: 'DELIVERED',
          status_details: 'Package delivered to front door',
          status_date: '2024-12-04T16:45:00Z',
          location: {
            city: 'Los Angeles',
            state: 'CA',
            zip: '90210',
            country: 'US',
          },
        },
        tracking_history: [
          // ... previous history
          {
            status: 'OUT_FOR_DELIVERY',
            status_details: 'Out for delivery',
            status_date: '2024-12-04T08:00:00Z',
            location: {
              city: 'Los Angeles',
              state: 'CA',
              zip: '90210',
              country: 'US',
            },
          },
          {
            status: 'DELIVERED',
            status_details: 'Package delivered to front door',
            status_date: '2024-12-04T16:45:00Z',
            location: {
              city: 'Los Angeles',
              state: 'CA',
              zip: '90210',
              country: 'US',
            },
          },
        ],
        eta: null, // No ETA for delivered packages
      });

      const result = await trackShipment(deliveredTrackingNumber, 'ups');

      expect(result.success).toBe(true);
      expect(result.tracking?.status).toBe('DELIVERED');
      expect(result.tracking?.statusDetails).toBe('Package delivered to front door');
      expect(result.tracking?.deliveredAt).toBe('2024-12-04T16:45:00Z');
      expect(result.tracking?.estimatedDelivery).toBeNull();
    });

    it('should handle tracking exceptions and delivery failures', async () => {
      const exceptionTrackingNumber = 'EX999999999US';

      mockShippoClient.tracks.retrieve.mockResolvedValue({
        object_id: 'track-exception',
        tracking_number: exceptionTrackingNumber,
        carrier: 'usps',
        tracking_status: {
          status: 'FAILURE',
          status_details: 'Delivery attempt failed - recipient not available',
          status_date: '2024-12-04T14:30:00Z',
          location: {
            city: 'San Jose',
            state: 'CA',
            zip: '95110',
            country: 'US',
          },
        },
        tracking_history: [
          {
            status: 'OUT_FOR_DELIVERY',
            status_details: 'Out for delivery',
            status_date: '2024-12-04T09:00:00Z',
            location: {
              city: 'San Jose',
              state: 'CA',
              zip: '95110',
              country: 'US',
            },
          },
          {
            status: 'FAILURE',
            status_details: 'Delivery attempt failed - recipient not available',
            status_date: '2024-12-04T14:30:00Z',
            location: {
              city: 'San Jose',
              state: 'CA',
              zip: '95110',
              country: 'US',
            },
          },
        ],
        eta: '2024-12-05T17:00:00Z', // Next delivery attempt
      });

      const result = await trackShipment(exceptionTrackingNumber, 'usps');

      expect(result.success).toBe(true);
      expect(result.tracking?.status).toBe('FAILURE');
      expect(result.tracking?.statusDetails).toBe(
        'Delivery attempt failed - recipient not available'
      );
      expect(result.tracking?.hasException).toBe(true);
      expect(result.tracking?.nextAttempt).toBe('2024-12-05T17:00:00Z');
    });

    it('should handle invalid tracking numbers', async () => {
      const invalidTrackingNumber = 'INVALID123';

      mockShippoClient.tracks.create.mockResolvedValue({
        object_id: 'track-invalid',
        tracking_number: invalidTrackingNumber,
        carrier: 'usps',
        tracking_status: {
          status: 'UNKNOWN',
          status_details: 'Tracking information not found',
          status_date: null,
          location: null,
        },
        tracking_history: [],
        messages: [
          {
            source: 'USPS',
            text: 'Invalid tracking number format',
            type: 'tracking_error',
          },
        ],
      });

      const result = await trackShipment(invalidTrackingNumber, 'usps');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tracking number format');
      expect(result.tracking?.status).toBe('UNKNOWN');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Shippo API rate limiting', async () => {
      const rateLimitedRequest = {
        shippingAddress: {
          recipientName: 'Rate Limited User',
          street: '123 Test St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        cartItems: [{ id: '1', name: 'Test Product', quantity: 1, price: 10.0 }],
        estimatedLengthIn: 6,
        estimatedWidthIn: 4,
        estimatedHeightIn: 2,
      };

      // Mock rate limit error then success
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).statusCode = 429;

      mockShippoClient.shipments.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          object_id: 'shipment-retry-success',
          status: 'SUCCESS',
          rates: [
            {
              object_id: 'rate-retry',
              provider: 'USPS',
              servicelevel: { name: 'Ground', token: 'usps_ground' },
              amount: '7.50',
              currency: 'USD',
              estimated_days: 3,
            },
          ],
          address_to: { validation_results: { is_valid: true, messages: [] } },
        });

      const result = await getShippingRates(rateLimitedRequest);

      expect(result.success).toBe(true);
      expect(result.rates).toHaveLength(1);
      expect(mockShippoClient.shipments.create).toHaveBeenCalledTimes(2);
    });

    it('should handle network connectivity issues', async () => {
      const networkRequest = {
        shippingAddress: {
          recipientName: 'Network Test User',
          street: '456 Network Ave',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        cartItems: [{ id: '1', name: 'Test Product', quantity: 1, price: 15.0 }],
        estimatedLengthIn: 8,
        estimatedWidthIn: 6,
        estimatedHeightIn: 4,
      };

      const networkError = new Error('Network timeout');
      (networkError as any).code = 'ENOTFOUND';

      mockShippoClient.shipments.create.mockRejectedValue(networkError);

      const result = await getShippingRates(networkRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
      expect(result.errorType).toBe('NETWORK_ERROR');
    });

    it('should validate environment configuration', () => {
      const validateShippoConfig = () => {
        const requiredEnvVars = [
          'SHIPPO_API_KEY',
          'SHIPPING_ORIGIN_STREET1',
          'SHIPPING_ORIGIN_CITY',
          'SHIPPING_ORIGIN_STATE',
          'SHIPPING_ORIGIN_ZIP',
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
          throw new Error(`Missing required Shippo configuration: ${missingVars.join(', ')}`);
        }

        return {
          apiKey: process.env.SHIPPO_API_KEY!,
          originAddress: {
            street1: process.env.SHIPPING_ORIGIN_STREET1!,
            city: process.env.SHIPPING_ORIGIN_CITY!,
            state: process.env.SHIPPING_ORIGIN_STATE!,
            zip: process.env.SHIPPING_ORIGIN_ZIP!,
          },
        };
      };

      const config = validateShippoConfig();

      expect(config.apiKey).toBe('test-shippo-key');
      expect(config.originAddress.street1).toBe('123 Test St');
      expect(config.originAddress.city).toBe('San Francisco');
      expect(config.originAddress.state).toBe('CA');
      expect(config.originAddress.zip).toBe('94102');
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache shipping rates for identical requests', async () => {
      const cacheableRequest = {
        shippingAddress: {
          recipientName: 'Cache Test User',
          street: '123 Cache St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        cartItems: [{ id: '1', name: 'Cacheable Product', quantity: 1, price: 20.0 }],
        estimatedLengthIn: 6,
        estimatedWidthIn: 4,
        estimatedHeightIn: 2,
      };

      const mockRatesResponse = {
        object_id: 'shipment-cached',
        status: 'SUCCESS',
        rates: [
          {
            object_id: 'rate-cached',
            provider: 'USPS',
            servicelevel: { name: 'Ground', token: 'usps_ground' },
            amount: '6.50',
            currency: 'USD',
            estimated_days: 3,
          },
        ],
        address_to: { validation_results: { is_valid: true, messages: [] } },
      };

      mockShippoClient.shipments.create.mockResolvedValue(mockRatesResponse);

      // First request
      const result1 = await getShippingRates(cacheableRequest);

      // Second identical request (should use cache)
      const result2 = await getShippingRates(cacheableRequest);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.rates).toEqual(result2.rates);

      // Should only call Shippo API once due to caching
      expect(mockShippoClient.shipments.create).toHaveBeenCalledTimes(1);
    });

    it('should handle bulk shipping rate requests efficiently', async () => {
      const bulkRequests = Array.from({ length: 5 }, (_, i) => ({
        shippingAddress: {
          recipientName: `Bulk User ${i}`,
          street: `${100 + i} Bulk St`,
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'US',
        },
        cartItems: [{ id: `${i}`, name: `Bulk Product ${i}`, quantity: 1, price: 10.0 }],
        estimatedLengthIn: 6,
        estimatedWidthIn: 4,
        estimatedHeightIn: 2,
      }));

      // Mock responses for each request
      mockShippoClient.shipments.create.mockImplementation(() =>
        Promise.resolve({
          object_id: `shipment-bulk-${Math.random()}`,
          status: 'SUCCESS',
          rates: [
            {
              object_id: `rate-bulk-${Math.random()}`,
              provider: 'USPS',
              servicelevel: { name: 'Ground', token: 'usps_ground' },
              amount: '7.00',
              currency: 'USD',
              estimated_days: 3,
            },
          ],
          address_to: { validation_results: { is_valid: true, messages: [] } },
        })
      );

      // Process bulk requests concurrently
      const results = await Promise.all(bulkRequests.map(request => getShippingRates(request)));

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockShippoClient.shipments.create).toHaveBeenCalledTimes(5);
    });
  });
});
