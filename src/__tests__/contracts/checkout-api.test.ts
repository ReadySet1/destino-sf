/**
 * Checkout & Payment API Contract Tests
 *
 * Tests to ensure the Checkout/Payment API endpoints conform to their defined schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  CreatePaymentRequestSchema,
  CreatePaymentResponseSchema,
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  OrderSchema,
  OrderItemSchema,
  CartItemSchema,
  FulfillmentTypeSchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
} from '@/lib/api/schemas/checkout';
import { matchesSchema, getValidationErrors, contractAssert, mockData } from './setup';

describe('Checkout & Payment API Contract Tests', () => {
  describe('Order Item Schema', () => {
    it('should validate a valid order item', () => {
      const orderItem = {
        productId: mockData.uuid(),
        productName: 'Alfajores',
        variantId: mockData.uuid(),
        variantName: 'Dozen',
        quantity: 2,
        unitPrice: 1299,
        total: 2598,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(true);
    });

    it('should reject order item with zero quantity', () => {
      const orderItem = {
        productId: mockData.uuid(),
        productName: 'Alfajores',
        variantId: null,
        variantName: null,
        quantity: 0, // Must be positive
        unitPrice: 1299,
        total: 0,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(false);
      const errors = getValidationErrors(OrderItemSchema, orderItem);
      expect(errors.some(e => e.includes('quantity'))).toBe(true);
    });

    it('should reject order item with negative price', () => {
      const orderItem = {
        productId: mockData.uuid(),
        productName: 'Alfajores',
        variantId: null,
        variantName: null,
        quantity: 1,
        unitPrice: -100,
        total: -100,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(false);
    });
  });

  describe('Cart Item Schema', () => {
    it('should validate a valid cart item', () => {
      const cartItem = {
        id: 'product-123',
        name: 'Empanadas',
        price: 1099,
        quantity: 3,
        variantId: 'variant-456',
        imageUrl: 'https://example.com/empanadas.jpg',
      };

      expect(matchesSchema(CartItemSchema, cartItem)).toBe(true);
    });

    it('should allow cart item without variant', () => {
      const cartItem = {
        id: 'product-123',
        name: 'Empanadas',
        price: 1099,
        quantity: 1,
        variantId: null,
      };

      expect(matchesSchema(CartItemSchema, cartItem)).toBe(true);
    });

    it('should reject cart item with empty name', () => {
      const cartItem = {
        id: 'product-123',
        name: '',
        price: 1099,
        quantity: 1,
      };

      expect(matchesSchema(CartItemSchema, cartItem)).toBe(false);
    });
  });

  describe('Create Payment Request Schema', () => {
    it('should validate a valid payment request', () => {
      const request = {
        sourceId: 'card-nonce-abc123',
        orderId: mockData.uuid(),
        amount: 7500, // $75.00
      };

      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(true);
    });

    it('should reject payment request with missing sourceId', () => {
      const request = {
        orderId: mockData.uuid(),
        amount: 7500,
      };

      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(false);
      const errors = getValidationErrors(CreatePaymentRequestSchema, request);
      expect(errors.some(e => e.includes('sourceId'))).toBe(true);
    });

    it('should reject payment request with invalid orderId', () => {
      const request = {
        sourceId: 'card-nonce-abc123',
        orderId: 'not-a-uuid',
        amount: 7500,
      };

      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(false);
      const errors = getValidationErrors(CreatePaymentRequestSchema, request);
      expect(errors.some(e => e.includes('orderId'))).toBe(true);
    });

    it('should reject payment request with negative amount', () => {
      const request = {
        sourceId: 'card-nonce-abc123',
        orderId: mockData.uuid(),
        amount: -100,
      };

      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(false);
    });

    it('should reject payment request with zero amount', () => {
      const request = {
        sourceId: 'card-nonce-abc123',
        orderId: mockData.uuid(),
        amount: 0,
      };

      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(false);
    });
  });

  describe('Create Payment Response Schema', () => {
    it('should validate a valid payment response', () => {
      const response = {
        success: true,
        paymentId: 'payment-xyz789',
      };

      expect(matchesSchema(CreatePaymentResponseSchema, response)).toBe(true);
    });

    it('should reject response with missing paymentId', () => {
      const response = {
        success: true,
      };

      expect(matchesSchema(CreatePaymentResponseSchema, response)).toBe(false);
    });
  });

  describe('Create Order Request Schema', () => {
    it('should validate a valid pickup order request', () => {
      const request = {
        customerName: 'John Doe',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Alfajores',
            price: 1299,
            quantity: 2,
          },
        ],
        pickupDate: mockData.timestamp(),
        subtotal: 2598,
        total: 2598,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate a valid delivery order request', () => {
      const request = {
        customerName: 'Jane Smith',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'DELIVERY' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Empanadas',
            price: 1099,
            quantity: 3,
          },
        ],
        deliveryAddress: mockData.address(),
        notes: 'Leave at front door',
        subtotal: 3297,
        tax: 263,
        total: 3560,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate a valid shipping order request', () => {
      const request = {
        customerName: 'Bob Johnson',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'SHIPPING' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Alfajores',
            price: 1299,
            quantity: 1,
          },
        ],
        shippingAddress: mockData.address(),
        shippingMethod: 'USPS Priority',
        shippingCost: 899,
        subtotal: 1299,
        tax: 104,
        total: 2302,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(true);
    });

    it('should reject order with empty items', () => {
      const request = {
        customerName: 'John Doe',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [], // Must have at least one item
        subtotal: 0,
        total: 0,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(false);
      const errors = getValidationErrors(CreateOrderRequestSchema, request);
      expect(errors.some(e => e.includes('items'))).toBe(true);
    });

    it('should reject order with invalid email', () => {
      const request = {
        customerName: 'John Doe',
        email: 'not-an-email',
        phone: mockData.phone(),
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Alfajores',
            price: 1299,
            quantity: 1,
          },
        ],
        subtotal: 1299,
        total: 1299,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(false);
      const errors = getValidationErrors(CreateOrderRequestSchema, request);
      expect(errors.some(e => e.includes('email'))).toBe(true);
    });

    it('should reject order with invalid phone', () => {
      const request = {
        customerName: 'John Doe',
        email: mockData.email(),
        phone: '123', // Too short
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Alfajores',
            price: 1299,
            quantity: 1,
          },
        ],
        subtotal: 1299,
        total: 1299,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(false);
      const errors = getValidationErrors(CreateOrderRequestSchema, request);
      expect(errors.some(e => e.includes('phone'))).toBe(true);
    });

    it('should reject order with notes over 1000 characters', () => {
      const request = {
        customerName: 'John Doe',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            id: 'product-123',
            name: 'Alfajores',
            price: 1299,
            quantity: 1,
          },
        ],
        notes: 'a'.repeat(1001), // Over limit
        subtotal: 1299,
        total: 1299,
      };

      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(false);
    });
  });

  describe('Order Schema', () => {
    it('should validate a complete order', () => {
      const order = {
        id: mockData.uuid(),
        orderNumber: 'ORDER-12345',
        status: 'COMPLETED' as const,
        paymentStatus: 'COMPLETED' as const,
        customerName: 'John Doe',
        email: mockData.email(),
        phone: mockData.phone(),
        fulfillmentType: 'PICKUP' as const,
        paymentMethod: 'CREDIT_CARD' as const,
        items: [
          {
            productId: mockData.uuid(),
            productName: 'Alfajores',
            variantId: null,
            variantName: null,
            quantity: 2,
            unitPrice: 1299,
            total: 2598,
          },
        ],
        notes: 'Special instructions',
        pickupDate: mockData.timestamp(),
        deliveryAddress: null,
        shippingAddress: null,
        shippingMethod: null,
        shippingCost: null,
        subtotal: 2598,
        tax: 208,
        total: 2806,
        squareOrderId: 'square-order-123',
        squarePaymentId: 'square-payment-456',
        createdAt: mockData.timestamp(),
        updatedAt: mockData.timestamp(),
      };

      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });
  });

  describe('Enum Schemas', () => {
    it('should validate fulfillment types', () => {
      expect(matchesSchema(FulfillmentTypeSchema, 'PICKUP')).toBe(true);
      expect(matchesSchema(FulfillmentTypeSchema, 'DELIVERY')).toBe(true);
      expect(matchesSchema(FulfillmentTypeSchema, 'SHIPPING')).toBe(true);
      expect(matchesSchema(FulfillmentTypeSchema, 'INVALID')).toBe(false);
    });

    it('should validate payment methods', () => {
      expect(matchesSchema(PaymentMethodSchema, 'CREDIT_CARD')).toBe(true);
      expect(matchesSchema(PaymentMethodSchema, 'GIFT_CARD')).toBe(true);
      expect(matchesSchema(PaymentMethodSchema, 'CASH')).toBe(true);
      expect(matchesSchema(PaymentMethodSchema, 'VENMO')).toBe(true);
      expect(matchesSchema(PaymentMethodSchema, 'ZELLE')).toBe(true);
      expect(matchesSchema(PaymentMethodSchema, 'BITCOIN')).toBe(false);
    });

    it('should validate payment statuses', () => {
      expect(matchesSchema(PaymentStatusSchema, 'PENDING')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'APPROVED')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'COMPLETED')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'FAILED')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'CANCELLED')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'REFUNDED')).toBe(true);
      expect(matchesSchema(PaymentStatusSchema, 'UNKNOWN')).toBe(false);
    });
  });
});
