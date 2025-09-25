/**
 * 🎯 Square API Mock Implementation
 * Comprehensive mock for Square API services including payments, catalog, and webhooks
 */

import type {
  Money,
  SquareCard,
  SquareTokenizationResult,
  SquarePayments,
  CatalogObject,
  CatalogObjectType,
  PaymentStatus,
  OrderState,
  SquareCatalogApiResponse,
  SquarePaymentApiResponse,
  SquareWebhookPayload,
  GiftCardError,
  Payment,
  Order,
  CreatePaymentRequest,
  CreateOrderRequest,
  ApplePayRequest,
  GooglePayRequest
} from '@/types/square';

// Mock data generators
const generateMockId = (prefix: string = 'mock'): string => 
  `${prefix}_${Math.random().toString(36).substring(2, 15)}`;

const generateMockMoney = (amount: number = 1000, currency: string = 'USD'): Money => ({
  amount: BigInt(amount),
  currency
});

const generateMockTimestamp = (): string => new Date().toISOString();

// Mock Card Implementation
const createMockCard = (): SquareCard => ({
  async attach(selector: string): Promise<void> {
    // Mock DOM attachment
    return Promise.resolve();
  },

  async tokenize(): Promise<SquareTokenizationResult> {
    // Mock successful tokenization
    return Promise.resolve({
      status: 'OK',
      token: generateMockId('cnon'),
      details: {
        card: {
          brand: 'VISA',
          expMonth: 12,
          expYear: 2025,
          last4: '1111'
        }
      }
    });
  },

  destroy(): void {
    // Mock cleanup
  }
});

// Mock error card for testing failure scenarios
const createMockErrorCard = (): SquareCard => ({
  async attach(selector: string): Promise<void> {
    return Promise.resolve();
  },

  async tokenize(): Promise<SquareTokenizationResult> {
    return Promise.resolve({
      status: 'INVALID_CARD',
      errors: [{
        type: 'INVALID_CARD',
        field: 'cardNumber',
        message: 'Invalid card number'
      }]
    });
  },

  destroy(): void {}
});

// Mock Payments SDK
const createMockPayments = (): SquarePayments => ({
  async card(): Promise<SquareCard> {
    return createMockCard();
  },

  async giftCard(): Promise<SquareCard> {
    return createMockCard();
  },

  async ach(): Promise<SquareCard> {
    return createMockCard();
  },

  async applePay(request: ApplePayRequest): Promise<SquareCard> {
    return createMockCard();
  },

  async googlePay(request: GooglePayRequest): Promise<SquareCard> {
    return createMockCard();
  }
});

// Mock Window.Square
export const mockWindowSquare = {
  payments: (appId: string, locationId: string) => createMockPayments()
};

// Mock Catalog Objects
const generateMockCatalogItem = (overrides: Partial<CatalogObject> = {}): CatalogObject => ({
  type: CatalogObjectType.ITEM,
  id: generateMockId('catalog_item'),
  updated_at: generateMockTimestamp(),
  created_at: generateMockTimestamp(),
  version: BigInt(1),
  is_deleted: false,
  present_at_all_locations: true,
  item_data: {
    name: 'Mock Product',
    description: 'A mock product for testing',
    available_online: true,
    available_for_pickup: true,
    category_id: generateMockId('category'),
    variations: [
      {
        type: CatalogObjectType.ITEM_VARIATION,
        id: generateMockId('variation'),
        item_variation_data: {
          name: 'Regular',
          pricing_type: 'FIXED_PRICING',
          price_money: generateMockMoney(1200, 'USD'),
          track_inventory: true
        }
      }
    ]
  },
  ...overrides
});

const generateMockCatalogCategory = (overrides: Partial<CatalogObject> = {}): CatalogObject => ({
  type: CatalogObjectType.CATEGORY,
  id: generateMockId('category'),
  updated_at: generateMockTimestamp(),
  created_at: generateMockTimestamp(),
  version: BigInt(1),
  is_deleted: false,
  present_at_all_locations: true,
  category_data: {
    name: 'Mock Category',
    category_type: 'REGULAR_CATEGORY',
    is_top_level: true,
    online_visibility: true
  },
  ...overrides
});

// Mock Payment
const generateMockPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: generateMockId('payment'),
  created_at: generateMockTimestamp(),
  updated_at: generateMockTimestamp(),
  amount_money: generateMockMoney(1200, 'USD'),
  total_money: generateMockMoney(1200, 'USD'),
  status: PaymentStatus.COMPLETED,
  delay_duration: 'PT0S',
  source_type: 'CARD',
  card_details: {
    status: 'CAPTURED',
    card: {
      card_brand: 'VISA',
      last_4: '1111',
      exp_month: 12,
      exp_year: 2025
    },
    entry_method: 'KEYED',
    cvv_status: 'CVV_ACCEPTED',
    avs_status: 'AVS_ACCEPTED'
  },
  location_id: generateMockId('location'),
  order_id: generateMockId('order'),
  processing_fee: [
    {
      effective_at: generateMockTimestamp(),
      type: 'INITIAL',
      amount_money: generateMockMoney(65, 'USD')
    }
  ],
  reference_id: generateMockId('ref'),
  receipt_number: generateMockId('receipt'),
  receipt_url: 'https://squareup.com/receipt/preview/mock',
  ...overrides
});

// Mock Order
const generateMockOrder = (overrides: Partial<Order> = {}): Order => ({
  id: generateMockId('order'),
  location_id: generateMockId('location'),
  order_source: {
    name: 'Destino SF Online Store'
  },
  line_items: [
    {
      uid: generateMockId('line_item'),
      name: 'Mock Product',
      quantity: '1',
      base_price_money: generateMockMoney(1200, 'USD'),
      total_money: generateMockMoney(1200, 'USD'),
      catalog_object_id: generateMockId('catalog_item'),
      variation_name: 'Regular'
    }
  ],
  taxes: [
    {
      uid: generateMockId('tax'),
      name: 'Tax',
      percentage: '8.75',
      applied_money: generateMockMoney(105, 'USD'),
      type: 'ADDITIVE'
    }
  ],
  total_money: generateMockMoney(1305, 'USD'),
  total_tax_money: generateMockMoney(105, 'USD'),
  total_discount_money: generateMockMoney(0, 'USD'),
  total_tip_money: generateMockMoney(0, 'USD'),
  total_service_charge_money: generateMockMoney(0, 'USD'),
  net_amounts: {
    total_money: generateMockMoney(1305, 'USD'),
    tax_money: generateMockMoney(105, 'USD'),
    discount_money: generateMockMoney(0, 'USD'),
    tip_money: generateMockMoney(0, 'USD'),
    service_charge_money: generateMockMoney(0, 'USD')
  },
  created_at: generateMockTimestamp(),
  updated_at: generateMockTimestamp(),
  state: OrderState.OPEN,
  version: 1,
  ...overrides
});

// Mock API Responses
export const mockSquareApiResponses = {
  // Catalog API
  listCatalog: (): SquareCatalogApiResponse => ({
    objects: [
      generateMockCatalogCategory(),
      generateMockCatalogItem(),
      generateMockCatalogItem({ 
        item_data: { 
          name: 'Another Mock Product',
          description: 'Another test product' 
        } 
      })
    ],
    cursor: 'mock_cursor_123'
  }),

  searchCatalogObjects: (query?: string): SquareCatalogApiResponse => ({
    objects: [generateMockCatalogItem()],
    cursor: undefined
  }),

  retrieveCatalogObject: (objectId: string): { object: CatalogObject } => ({
    object: generateMockCatalogItem({ id: objectId })
  }),

  // Payments API
  createPayment: (request: CreatePaymentRequest): SquarePaymentApiResponse => ({
    payment: generateMockPayment({
      source_type: request.source_id ? 'CARD' : 'EXTERNAL',
      amount_money: request.amount_money,
      reference_id: request.reference_id,
      order_id: request.order_id
    })
  }),

  getPayment: (paymentId: string): SquarePaymentApiResponse => ({
    payment: generateMockPayment({ id: paymentId })
  }),

  // Orders API
  createOrder: (request: CreateOrderRequest): { order: Order } => ({
    order: generateMockOrder({
      location_id: request.order.location_id,
      line_items: request.order.line_items,
      taxes: request.order.taxes,
      reference_id: request.order.reference_id
    })
  }),

  retrieveOrder: (orderId: string): { order: Order } => ({
    order: generateMockOrder({ id: orderId })
  }),

  updateOrder: (orderId: string, request: any): { order: Order } => ({
    order: generateMockOrder({ 
      id: orderId,
      ...request.order,
      updated_at: generateMockTimestamp()
    })
  })
};

// Mock Webhook Signature Validation
export const mockWebhookValidator = {
  isValidSignature: jest.fn().mockReturnValue(true),
  
  validateSignature: jest.fn().mockImplementation(
    (body: string, signature: string, signatureKey: string, notificationUrl: string) => {
      // Mock signature validation - always returns true in tests
      return true;
    }
  )
};

// Mock Webhook Payloads
export const generateMockWebhookPayload = (
  eventType: string = 'payment.updated',
  eventData: any = {}
): SquareWebhookPayload => ({
  merchant_id: generateMockId('merchant'),
  type: eventType,
  event_id: generateMockId('event'),
  created_at: generateMockTimestamp(),
  data: {
    type: eventType.split('.')[0],
    id: generateMockId(eventType.split('.')[0]),
    object: {
      payment: eventType.startsWith('payment') ? generateMockPayment(eventData) : undefined,
      order: eventType.startsWith('order') ? generateMockOrder(eventData) : undefined,
      catalog_object: eventType.startsWith('catalog') ? generateMockCatalogItem(eventData) : undefined
    }
  }
});

// Mock Square Client
export const mockSquareClient = {
  paymentsApi: {
    createPayment: jest.fn().mockImplementation((request: CreatePaymentRequest) =>
      Promise.resolve({
        result: mockSquareApiResponses.createPayment(request),
        statusCode: 200
      })
    ),

    getPayment: jest.fn().mockImplementation((paymentId: string) =>
      Promise.resolve({
        result: mockSquareApiResponses.getPayment(paymentId),
        statusCode: 200
      })
    ),

    cancelPayment: jest.fn().mockResolvedValue({
      result: { payment: generateMockPayment({ status: PaymentStatus.CANCELED }) },
      statusCode: 200
    })
  },

  ordersApi: {
    createOrder: jest.fn().mockImplementation((request: CreateOrderRequest) =>
      Promise.resolve({
        result: mockSquareApiResponses.createOrder(request),
        statusCode: 200
      })
    ),

    retrieveOrder: jest.fn().mockImplementation((orderId: string) =>
      Promise.resolve({
        result: mockSquareApiResponses.retrieveOrder(orderId),
        statusCode: 200
      })
    ),

    updateOrder: jest.fn().mockImplementation((orderId: string, request: any) =>
      Promise.resolve({
        result: mockSquareApiResponses.updateOrder(orderId, request),
        statusCode: 200
      })
    )
  },

  catalogApi: {
    listCatalog: jest.fn().mockResolvedValue({
      result: mockSquareApiResponses.listCatalog(),
      statusCode: 200
    }),

    searchCatalogObjects: jest.fn().mockImplementation((request: any) =>
      Promise.resolve({
        result: mockSquareApiResponses.searchCatalogObjects(request.query),
        statusCode: 200
      })
    ),

    retrieveCatalogObject: jest.fn().mockImplementation((objectId: string) =>
      Promise.resolve({
        result: mockSquareApiResponses.retrieveCatalogObject(objectId),
        statusCode: 200
      })
    ),

    upsertCatalogObject: jest.fn().mockResolvedValue({
      result: {
        catalog_object: generateMockCatalogItem(),
        id_mappings: []
      },
      statusCode: 200
    })
  },

  locationsApi: {
    listLocations: jest.fn().mockResolvedValue({
      result: {
        locations: [
          {
            id: generateMockId('location'),
            name: 'Destino SF Mock Location',
            address: {
              address_line_1: '123 Mock Street',
              locality: 'San Francisco',
              administrative_district_level_1: 'CA',
              postal_code: '94102',
              country: 'US'
            },
            timezone: 'America/Los_Angeles',
            capabilities: ['CREDIT_CARD_PROCESSING'],
            status: 'ACTIVE'
          }
        ]
      },
      statusCode: 200
    })
  }
};

// Mock error scenarios
export const mockSquareErrors = {
  paymentFailed: new Error('Payment processing failed'),
  catalogNotFound: new Error('Catalog object not found'),
  invalidToken: new Error('Invalid access token'),
  rateLimitExceeded: new Error('Rate limit exceeded'),
  webhookSignatureInvalid: new Error('Invalid webhook signature')
};

// Mock configuration for different test scenarios
export const mockSquareConfig = {
  sandbox: {
    applicationId: 'sandbox-sq0idb-mock',
    accessToken: 'EAAAl7HuqkfyMockSandboxToken',
    locationId: 'MOCK_SANDBOX_LOCATION',
    environment: 'sandbox'
  },
  production: {
    applicationId: 'sq0idp-mock',
    accessToken: 'EAAAl7HuqkfyMockProductionToken',
    locationId: 'MOCK_PRODUCTION_LOCATION',
    environment: 'production'
  }
};

// Export mock factory functions for easy test setup
export const createMockSquarePayment = generateMockPayment;
export const createMockSquareOrder = generateMockOrder;
export const createMockCatalogObject = generateMockCatalogItem;
export const createMockWebhookPayload = generateMockWebhookPayload;

// Default export for easy importing
export default {
  mockWindowSquare,
  mockSquareClient,
  mockSquareApiResponses,
  mockWebhookValidator,
  mockSquareErrors,
  mockSquareConfig,
  createMockSquarePayment,
  createMockSquareOrder,
  createMockCatalogObject,
  createMockWebhookPayload
};
