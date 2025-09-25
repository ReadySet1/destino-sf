/**
 * 🚢 Shippo API Mock Implementation
 * Comprehensive mock for Shippo shipping API including rates, labels, and tracking
 */

import type {
  ShippoAddress,
  ShippoParcel,
  ShippoShipment,
  ShippoRate,
  ShippoTransaction,
  ShippoTrack,
  ShippoAddressValidation,
  ShippoAddressValidationRequest,
  ShippoAddressValidationResponse,
  ShippoShipmentRequest,
  ShippoShipmentResponse,
  ShippoTransactionRequest,
  ShippoTransactionResponse,
  ShippoRateResponse,
  ShippoApiResponse,
  ShippoCarrierAccount,
  ShippoCustomsDeclaration,
  ShippoCustomsItem,
  ShippoServiceLevel,
  ShippoValidationMessage,
  ShippoTrackingStatus,
  ShippoTrackingUpdate,
  ShippoLocation,
  ShippingLabelResponse,
  ShippoError
} from '@/types/shippo';

// Mock data generators
const generateMockId = (prefix: string = 'shippo'): string => 
  `${prefix}_${Math.random().toString(36).substring(2, 15)}`;

const generateMockTimestamp = (): string => new Date().toISOString();

// Mock Address Generator
const generateMockAddress = (overrides: Partial<ShippoAddress> = {}): ShippoAddress => ({
  object_id: generateMockId('address'),
  object_state: 'VALID',
  object_purpose: 'QUOTE',
  name: 'John Doe',
  company: 'Test Company',
  street1: '123 Test Street',
  city: 'San Francisco',
  state: 'CA',
  zip: '94102',
  country: 'US',
  phone: '+1 555-123-4567',
  email: 'test@example.com',
  is_residential: true,
  test: true,
  validation_results: {
    is_valid: true,
    messages: []
  },
  ...overrides
});

// Mock Parcel Generator
const generateMockParcel = (overrides: Partial<ShippoParcel> = {}): ShippoParcel => ({
  object_id: generateMockId('parcel'),
  length: '10',
  width: '8',
  height: '4',
  distance_unit: 'in',
  weight: '2',
  mass_unit: 'lb',
  value_amount: '25.00',
  value_currency: 'USD',
  test: true,
  ...overrides
});

// Mock Service Levels
const mockServiceLevels = {
  usps: {
    ground: {
      name: 'USPS Ground Advantage',
      token: 'usps_ground_advantage',
      terms: 'Standard ground shipping',
      extended_token: 'usps_ground_advantage'
    },
    priority: {
      name: 'USPS Priority Mail',
      token: 'usps_priority',
      terms: '1-3 business days',
      extended_token: 'usps_priority'
    },
    express: {
      name: 'USPS Priority Mail Express',
      token: 'usps_priority_express',
      terms: 'Overnight to most locations',
      extended_token: 'usps_priority_express'
    }
  },
  ups: {
    ground: {
      name: 'UPS Ground',
      token: 'ups_ground',
      terms: '1-5 business days',
      extended_token: 'ups_ground'
    },
    air: {
      name: 'UPS Next Day Air',
      token: 'ups_next_day_air',
      terms: 'Next business day',
      extended_token: 'ups_next_day_air'
    }
  },
  fedex: {
    ground: {
      name: 'FedEx Ground',
      token: 'fedex_ground',
      terms: '1-5 business days',
      extended_token: 'fedex_ground'
    },
    express: {
      name: 'FedEx Express Saver',
      token: 'fedex_express_saver',
      terms: '3 business days',
      extended_token: 'fedex_express_saver'
    }
  }
};

// Mock Rate Generator
const generateMockRate = (
  provider: string = 'USPS',
  serviceName: string = 'Ground',
  amount: string = '8.50',
  overrides: Partial<ShippoRate> = {}
): ShippoRate => ({
  object_id: generateMockId('rate'),
  amount,
  currency: 'USD',
  amount_local: amount,
  currency_local: 'USD',
  provider,
  provider_image_75: `https://shippo-static.s3.amazonaws.com/providers/75/${provider.toLowerCase()}.png`,
  provider_image_200: `https://shippo-static.s3.amazonaws.com/providers/200/${provider.toLowerCase()}.png`,
  servicelevel: {
    name: `${provider} ${serviceName}`,
    token: `${provider.toLowerCase()}_${serviceName.toLowerCase().replace(/\s+/g, '_')}`,
    terms: serviceName.includes('Express') ? 'Overnight' : '1-5 business days'
  },
  days: serviceName.includes('Express') ? 1 : Math.floor(Math.random() * 5) + 1,
  arrives_by: new Date(Date.now() + (serviceName.includes('Express') ? 86400000 : 432000000)).toISOString(),
  duration_terms: serviceName.includes('Express') ? 'Overnight' : '1-5 business days',
  trackable: true,
  delivery_time: {
    type: 'ESTIMATED',
    datetime: new Date(Date.now() + (serviceName.includes('Express') ? 86400000 : 432000000)).toISOString()
  },
  estimated_days: serviceName.includes('Express') ? 1 : Math.floor(Math.random() * 5) + 1,
  test: true,
  zone: '1',
  messages: [],
  insurance_amount: '0.00',
  insurance_currency: 'USD',
  included_insurance_price: '0.00',
  ...overrides
});

// Mock Shipment Generator
const generateMockShipment = (overrides: Partial<ShippoShipmentResponse> = {}): ShippoShipmentResponse => ({
  object_id: generateMockId('shipment'),
  object_state: 'VALID',
  object_created: generateMockTimestamp(),
  object_updated: generateMockTimestamp(),
  was_test: true,
  address_from: generateMockAddress({ name: 'Destino SF Store' }),
  address_to: generateMockAddress({ name: 'Customer Name' }),
  parcels: [generateMockParcel()],
  rates: [
    generateMockRate('USPS', 'Ground Advantage', '8.50'),
    generateMockRate('USPS', 'Priority Mail', '12.25'),
    generateMockRate('USPS', 'Priority Mail Express', '25.75'),
    generateMockRate('UPS', 'Ground', '9.85'),
    generateMockRate('FedEx', 'Ground', '10.25')
  ],
  messages: [],
  ...overrides
});

// Mock Transaction Generator
const generateMockTransaction = (overrides: Partial<ShippoTransactionResponse> = {}): ShippoTransactionResponse => ({
  object_id: generateMockId('transaction'),
  object_state: 'VALID',
  object_status: 'SUCCESS',
  object_created: generateMockTimestamp(),
  object_updated: generateMockTimestamp(),
  was_test: true,
  rate: generateMockRate(),
  tracking_number: `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
  tracking_status: 'UNKNOWN',
  tracking_url_provider: 'https://tools.usps.com/go/TrackConfirmAction_input',
  label_url: 'https://shippo-delivery.s3.amazonaws.com/mock-label.pdf',
  commercial_invoice_url: null,
  qr_code_url: 'https://shippo-delivery.s3.amazonaws.com/mock-qr.png',
  messages: [],
  eta: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
  ...overrides
});

// Mock Tracking Status Generator
const generateMockTrackingStatus = (
  status: 'UNKNOWN' | 'DELIVERED' | 'TRANSIT' | 'FAILURE' | 'RETURNED' = 'TRANSIT'
): ShippoTrackingStatus => ({
  object_created: generateMockTimestamp(),
  object_updated: generateMockTimestamp(),
  object_id: generateMockId('tracking_status'),
  status,
  status_details: status === 'TRANSIT' ? 'In transit to destination' : 'Package delivered',
  status_date: generateMockTimestamp(),
  location: {
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'US'
  }
});

// Mock Tracking Updates
const generateMockTrackingHistory = (): ShippoTrackingUpdate[] => [
  {
    object_created: generateMockTimestamp(),
    object_updated: generateMockTimestamp(),
    object_id: generateMockId('tracking_update'),
    status: 'TRANSIT',
    status_details: 'Package received',
    status_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    location: {
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US'
    }
  },
  {
    object_created: generateMockTimestamp(),
    object_updated: generateMockTimestamp(),
    object_id: generateMockId('tracking_update'),
    status: 'TRANSIT',
    status_details: 'In transit',
    status_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    location: {
      city: 'Oakland',
      state: 'CA',
      zip: '94607',
      country: 'US'
    }
  }
];

// Mock Track Generator
const generateMockTrack = (overrides: Partial<ShippoTrack> = {}): ShippoTrack => ({
  carrier: 'usps',
  tracking_number: `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
  address_from: generateMockAddress({ name: 'Destino SF Store' }),
  address_to: generateMockAddress({ name: 'Customer Name' }),
  eta: new Date(Date.now() + 432000000).toISOString(),
  servicelevel: mockServiceLevels.usps.ground,
  tracking_status: generateMockTrackingStatus(),
  tracking_history: generateMockTrackingHistory(),
  test: true,
  ...overrides
});

// Mock Carrier Accounts
const generateMockCarrierAccounts = (): ShippoCarrierAccount[] => [
  {
    object_id: generateMockId('carrier_account'),
    carrier: 'usps',
    account_id: 'usps_account_123',
    active: true,
    test: true,
    parameters: {},
    credentials: {}
  },
  {
    object_id: generateMockId('carrier_account'),
    carrier: 'ups',
    account_id: 'ups_account_456',
    active: true,
    test: true,
    parameters: {},
    credentials: {}
  },
  {
    object_id: generateMockId('carrier_account'),
    carrier: 'fedex',
    account_id: 'fedex_account_789',
    active: true,
    test: true,
    parameters: {},
    credentials: {}
  }
];

// Mock Address Validation
const mockAddressValidation = {
  validateAddress: jest.fn().mockImplementation(
    (request: ShippoAddressValidationRequest): Promise<ShippoAddressValidationResponse> => {
      const isValid = !request.street1.toLowerCase().includes('invalid');
      
      return Promise.resolve({
        object_id: generateMockId('address'),
        object_state: isValid ? 'VALID' : 'INVALID',
        name: request.name,
        company: request.company,
        street1: request.street1,
        street2: request.street2,
        city: request.city,
        state: request.state,
        zip: request.zip,
        country: request.country,
        phone: request.phone,
        email: request.email,
        is_residential: request.is_residential || false,
        validation_results: {
          is_valid: isValid,
          messages: isValid ? [] : [
            {
              source: 'UPS',
              code: 'INVALID_ADDRESS',
              text: 'Address not found',
              type: 'ERROR'
            }
          ]
        },
        was_test: true,
        object_created: generateMockTimestamp(),
        object_updated: generateMockTimestamp()
      });
    }
  )
};

// Mock Shippo Client API
export const mockShippoClient = {
  shipments: {
    create: jest.fn().mockImplementation(
      (request: ShippoShipmentRequest): Promise<ShippoShipmentResponse> => {
        // Simulate API delay
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(generateMockShipment({
              address_from: typeof request.address_from === 'string' 
                ? generateMockAddress() 
                : request.address_from,
              address_to: typeof request.address_to === 'string' 
                ? generateMockAddress() 
                : request.address_to,
              parcels: request.parcels.map(p => 
                typeof p === 'string' ? generateMockParcel() : p
              )
            }));
          }, 100);
        });
      }
    ),

    retrieve: jest.fn().mockImplementation(
      (shipmentId: string): Promise<ShippoShipmentResponse> => {
        return Promise.resolve(generateMockShipment({ object_id: shipmentId }));
      }
    ),

    rates: jest.fn().mockImplementation(
      (shipmentId: string): Promise<ShippoRateResponse> => {
        return Promise.resolve({
          results: [
            generateMockRate('USPS', 'Ground Advantage', '8.50'),
            generateMockRate('USPS', 'Priority Mail', '12.25'),
            generateMockRate('UPS', 'Ground', '9.85'),
            generateMockRate('FedEx', 'Ground', '10.25')
          ],
          shipment: generateMockShipment({ object_id: shipmentId })
        });
      }
    )
  },

  transactions: {
    create: jest.fn().mockImplementation(
      (request: ShippoTransactionRequest): Promise<ShippoTransactionResponse> => {
        // Simulate potential rate expiration error
        if (typeof request.rate === 'string' && request.rate.includes('expired')) {
          return Promise.reject(new Error('Rate has expired. Please create a new shipment.'));
        }

        return Promise.resolve(generateMockTransaction({
          rate: typeof request.rate === 'string' 
            ? generateMockRate() 
            : request.rate
        }));
      }
    ),

    retrieve: jest.fn().mockImplementation(
      (transactionId: string): Promise<ShippoTransactionResponse> => {
        return Promise.resolve(generateMockTransaction({ object_id: transactionId }));
      }
    ),

    list: jest.fn().mockImplementation(
      (params?: { results?: number; page?: number }): Promise<ShippoApiResponse<ShippoTransaction>> => {
        const results = params?.results || 10;
        const transactions = Array.from({ length: results }, () => generateMockTransaction());
        
        return Promise.resolve({
          results: transactions,
          count: results,
          next: null,
          previous: null
        });
      }
    )
  },

  addresses: {
    create: jest.fn().mockImplementation(mockAddressValidation.validateAddress),
    
    retrieve: jest.fn().mockImplementation(
      (addressId: string): Promise<ShippoAddressValidationResponse> => {
        return Promise.resolve({
          object_id: addressId,
          object_state: 'VALID',
          name: 'John Doe',
          street1: '123 Test Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
          is_residential: true,
          validation_results: {
            is_valid: true,
            messages: []
          },
          was_test: true,
          object_created: generateMockTimestamp(),
          object_updated: generateMockTimestamp()
        });
      }
    ),

    validate: jest.fn().mockImplementation(
      (addressId: string): Promise<ShippoAddressValidationResponse> => {
        return mockShippoClient.addresses.retrieve(addressId);
      }
    )
  },

  parcels: {
    create: jest.fn().mockImplementation(
      (request: ShippoParcel): Promise<ShippoParcel> => {
        return Promise.resolve(generateMockParcel(request));
      }
    ),

    retrieve: jest.fn().mockImplementation(
      (parcelId: string): Promise<ShippoParcel> => {
        return Promise.resolve(generateMockParcel({ object_id: parcelId }));
      }
    )
  },

  tracks: {
    create: jest.fn().mockImplementation(
      (carrier: string, trackingNumber: string): Promise<ShippoTrack> => {
        return Promise.resolve(generateMockTrack({ 
          carrier, 
          tracking_number: trackingNumber 
        }));
      }
    ),

    retrieve: jest.fn().mockImplementation(
      (carrier: string, trackingNumber: string): Promise<ShippoTrack> => {
        return Promise.resolve(generateMockTrack({ 
          carrier, 
          tracking_number: trackingNumber 
        }));
      }
    )
  },

  carrierAccounts: {
    list: jest.fn().mockImplementation(
      (): Promise<ShippoApiResponse<ShippoCarrierAccount>> => {
        return Promise.resolve({
          results: generateMockCarrierAccounts(),
          count: 3,
          next: null,
          previous: null
        });
      }
    ),

    retrieve: jest.fn().mockImplementation(
      (accountId: string): Promise<ShippoCarrierAccount> => {
        return Promise.resolve({
          object_id: accountId,
          carrier: 'usps',
          account_id: accountId,
          active: true,
          test: true,
          parameters: {},
          credentials: {}
        });
      }
    )
  }
};

// Mock rate calculation utilities
export const mockRateCalculation = {
  calculateShippingRates: jest.fn().mockImplementation(
    (fromAddress: ShippoAddress, toAddress: ShippoAddress, parcel: ShippoParcel) => {
      return Promise.resolve([
        generateMockRate('USPS', 'Ground Advantage', '8.50'),
        generateMockRate('USPS', 'Priority Mail', '12.25'),
        generateMockRate('UPS', 'Ground', '9.85')
      ]);
    }
  ),

  getLowestRate: jest.fn().mockImplementation(
    (rates: ShippoRate[]) => {
      return rates.reduce((lowest, rate) => 
        parseFloat(rate.amount || '0') < parseFloat(lowest.amount || '0') ? rate : lowest
      );
    }
  ),

  filterRatesByCarrier: jest.fn().mockImplementation(
    (rates: ShippoRate[], carrier: string) => {
      return rates.filter(rate => rate.provider?.toLowerCase() === carrier.toLowerCase());
    }
  )
};

// Mock label creation utilities
export const mockLabelCreation = {
  createShippingLabel: jest.fn().mockImplementation(
    (rateId: string): Promise<ShippingLabelResponse> => {
      if (rateId.includes('expired')) {
        return Promise.resolve({
          success: false,
          error: 'Rate has expired',
          errorCode: 'RATE_EXPIRED'
        });
      }

      return Promise.resolve({
        success: true,
        labelUrl: 'https://shippo-delivery.s3.amazonaws.com/mock-label.pdf',
        trackingNumber: `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`
      });
    }
  ),

  downloadLabel: jest.fn().mockImplementation(
    (labelUrl: string): Promise<Buffer> => {
      // Mock PDF buffer
      return Promise.resolve(Buffer.from('Mock PDF content'));
    }
  )
};

// Mock error scenarios
export const mockShippoErrors = {
  rateExpired: new Error('Rate has expired. Please create a new shipment.'),
  apiInitialization: new Error('Shippo API client not initialized'),
  invalidAddress: new Error('Invalid shipping address provided'),
  networkError: new Error('Network error: Unable to connect to Shippo API'),
  validationError: new Error('Validation failed: Required field missing'),
  rateLimitExceeded: new Error('Rate limit exceeded. Please try again later.')
};

// Mock configuration for different test scenarios
export const mockShippoConfig = {
  test: {
    apiKey: 'shippo_test_mock_key',
    baseUrl: 'https://api.goshippo.com/v1/',
    timeout: 5000
  },
  live: {
    apiKey: 'shippo_live_mock_key',
    baseUrl: 'https://api.goshippo.com/v1/',
    timeout: 10000
  }
};

// Export factory functions for easy test setup
export const createMockShippoRate = generateMockRate;
export const createMockShippoShipment = generateMockShipment;
export const createMockShippoTransaction = generateMockTransaction;
export const createMockShippoAddress = generateMockAddress;
export const createMockShippoParcel = generateMockParcel;
export const createMockShippoTrack = generateMockTrack;

// Default export for easy importing
export default {
  mockShippoClient,
  mockRateCalculation,
  mockLabelCreation,
  mockAddressValidation,
  mockShippoErrors,
  mockShippoConfig,
  createMockShippoRate,
  createMockShippoShipment,
  createMockShippoTransaction,
  createMockShippoAddress,
  createMockShippoParcel,
  createMockShippoTrack
};
