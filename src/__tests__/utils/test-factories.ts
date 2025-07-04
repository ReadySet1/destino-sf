import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { FulfillmentType, type OrderInput, type CreateOrderInput } from '@/types/order';
import { type ShippingRateResponse } from '@/lib/shipping';

// ===== ORDER DATA FACTORIES =====

export const createValidOrderInput = (overrides?: Partial<OrderInput>): OrderInput => ({
  items: [
    { id: '1', name: 'Beef Empanadas', price: 12.99, quantity: 2, variantId: 'variant-1' },
    { id: '2', name: 'Dulce de Leche Alfajores', price: 15.99, quantity: 1 }
  ],
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    pickupTime: '2024-01-15T14:00:00.000Z'
  },
  fulfillment: {
    method: 'pickup',
    pickupTime: '2024-01-15T14:00:00.000Z'
  },
  paymentMethod: PaymentMethod.SQUARE,
  ...overrides
});

export const createValidCreateOrderInput = (overrides?: Partial<CreateOrderInput>): CreateOrderInput => ({
  cartItems: [
    { id: '1', name: 'Beef Empanadas', quantity: 2, price: 12.99, category: 'empanadas' },
    { id: '2', name: 'Dulce de Leche Alfajores', quantity: 1, price: 15.99, category: 'alfajores' }
  ],
  customer: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123'
  },
  fulfillmentType: FulfillmentType.PICKUP,
  paymentMethod: 'SQUARE',
  specialInstructions: 'Handle with care',
  ...overrides
});

// ===== COMPLETE ORDER MOCK DATA =====

export const createMockOrder = (overrides?: any) => ({
  id: 'order-123',
  squareOrderId: 'square-123',
  status: OrderStatus.PENDING,
  total: new Decimal(41.97),
  userId: 'user-123',
  customerName: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  fulfillmentType: 'pickup',
  notes: 'Test order',
  pickupTime: new Date('2024-01-15T14:00:00.000Z'),
  deliveryDate: null,
  deliveryTime: null,
  shippingMethodName: null,
  shippingCarrier: null,
  shippingServiceLevelToken: null,
  shippingCostCents: null,
  shippingRateId: null,
  trackingNumber: null,
  cancelReason: null,
  paymentStatus: PaymentStatus.PENDING,
  rawData: null,
  createdAt: new Date('2025-01-15T16:55:08.495Z'),
  updatedAt: new Date('2025-01-15T16:55:08.495Z'),
  taxAmount: new Decimal(3.47),
  isCateringOrder: false,
  paymentMethod: PaymentMethod.SQUARE,
  paymentUrl: null,
  paymentUrlExpiresAt: null,
  retryCount: 0,
  lastRetryAt: null,
  ...overrides
});

// ===== ORDER WITH ITEMS =====

export const createMockOrderWithItems = (overrides?: any) => ({
  ...createMockOrder(),
  items: [
    {
      id: 'item-1',
      quantity: 2,
      price: new Decimal(12.99),
      productId: 'product-1',
      variantId: 'variant-1',
      orderId: 'order-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      product: {
        id: 'product-1',
        name: 'Beef Empanadas',
        price: new Decimal(12.99),
        squareId: 'square-product-1'
      },
      variant: {
        id: 'variant-1',
        name: 'Regular Size',
        price: new Decimal(12.99),
        squareVariantId: 'square-variant-1'
      }
    }
  ],
  ...overrides
});

// ===== ALERT DATA FACTORIES =====

export const createMockAlertData = (overrides?: any) => ({
  id: 'order-123',
  status: OrderStatus.PENDING,
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  customerPhone: '+1-555-0123',
  fulfillmentMethod: 'pickup',
  subtotal: { toNumber: () => 38.50 },
  taxAmount: { toNumber: () => 3.47 },
  serviceFee: { toNumber: () => 0 },
  total: { toNumber: () => 41.97 },
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-123',
  items: [
    {
      id: 'item-1',
      name: 'Beef Empanadas',
      quantity: 2,
      price: 12.99,
      product: { name: 'Beef Empanadas' }
    }
  ],
  ...overrides
});

// ===== SHIPPING DATA FACTORIES =====

// Factory for creating mock shipping responses that match the ShippingRateResponse interface
export const createMockShippingResponse = (overrides?: any): ShippingRateResponse => ({
  success: true,
  rates: [
    {
      id: 'rate_123',
      carrier: 'USPS',
      name: 'Priority Mail',
      amount: 12.50,
      currency: 'USD',
      estimatedDays: 2,
      serviceLevel: 'usps_priority',
      rateId: 'rate_123',
    }
  ],
  addressValidation: {
    isValid: true,
    messages: []
  },
  ...overrides
});

// Factory for creating mock Shippo shipment responses (used internally by shipping functions)
export const createMockShippoShipmentResponse = (overrides?: any) => ({
  object_id: 'shipment_123',
  status: 'SUCCESS',
  rates: [
    {
      object_id: 'rate_123',
      provider: 'USPS',
      servicelevel: {
        name: 'Priority Mail',
        token: 'usps_priority'
      },
      amount: '12.50',
      currency: 'USD',
      estimated_days: 2,
      provider_image_75: 'https://shippo.com/usps_75.png',
      provider_image_200: 'https://shippo.com/usps_200.png',
      attributes: ['FASTEST'],
      zone: 'Zone 1',
      arrives_by: '2024-01-17T17:00:00Z'
    }
  ],
  address_to: {
    validation_results: {
      is_valid: true,
      messages: []
    }
  },
  ...overrides
});

export const createMockShippingTransaction = (overrides?: any) => ({
  object_id: 'transaction_123',
  status: 'SUCCESS',
  label_url: 'https://shippo.com/label_123.pdf',
  tracking_number: '1234567890123456',
  eta: '2024-01-17T17:00:00Z',
  ...overrides
});

// ===== CART ITEMS =====

export const createMockCartItems = () => [
  {
    id: 'product-1',
    name: 'Beef Empanadas',
    price: 12.99,
    quantity: 2,
    variantId: 'variant-1',
    category: 'empanadas'
  },
  {
    id: 'product-2',
    name: 'Dulce de Leche Alfajores',
    price: 15.99,
    quantity: 1,
    category: 'dessert'
  }
];

// ===== CUSTOMER INFO =====

export const createMockCustomerInfo = (overrides?: any) => ({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0123',
  pickupTime: '2024-01-15T14:00:00.000Z',
  ...overrides
});

// ===== FULFILLMENT OPTIONS =====

export const createMockPickupFulfillment = (overrides?: any) => ({
  method: 'pickup' as const,
  pickupTime: '2024-01-15T14:00:00.000Z',
  ...overrides
});

export const createMockLocalDeliveryFulfillment = (overrides?: any) => ({
  method: 'local_delivery' as const,
  deliveryDate: '2024-01-15',
  deliveryTime: '14:00',
  deliveryAddress: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102'
  },
  deliveryInstructions: 'Leave at door',
  ...overrides
});

export const createMockNationwideShippingFulfillment = (overrides?: any) => ({
  method: 'nationwide_shipping' as const,
  shippingAddress: {
    street: '456 Oak Ave',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90210'
  },
  shippingMethod: 'USPS Priority',
  shippingCarrier: 'USPS',
  shippingCost: 12.50,
  rateId: 'rate_123',
  ...overrides
});

// ===== SPLIT PAYMENT TYPES =====

export interface SplitPayment {
  payments: Array<{
    method: 'CREDIT_CARD' | 'GIFT_CARD' | 'CASH';
    amount: number;
    details: any;
  }>;
  totalAmount: number;
}

export const createMockSplitPayment = (overrides?: Partial<SplitPayment>): SplitPayment => ({
  payments: [
    { method: 'CREDIT_CARD', amount: 2500, details: { token: 'card_token_123' } },
    { method: 'GIFT_CARD', amount: 1000, details: { code: 'GC123456' } },
  ],
  totalAmount: 3500,
  ...overrides
});

// ===== TYPE EXPORTS =====

export type MockOrder = ReturnType<typeof createMockOrder>;
export type MockOrderWithItems = ReturnType<typeof createMockOrderWithItems>;
export type MockShippingResponse = ReturnType<typeof createMockShippingResponse>;
export type MockCartItems = ReturnType<typeof createMockCartItems>; 