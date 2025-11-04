/**
 * Orders API Contract Tests
 *
 * Tests to ensure the Orders API endpoints conform to their defined schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  OrderStatusSchema,
  PaymentStatusSchema,
  PaymentMethodSchema,
  FulfillmentTypeSchema,
  OrderItemSchema,
  OrderSchema,
  OrderSummarySchema,
  GetOrdersQuerySchema,
  GetOrdersResponseSchema,
  GetOrderByIdParamsSchema,
  GetOrderByIdResponseSchema,
  UpdateOrderRequestSchema,
  UpdateOrderResponseSchema,
  RetryPaymentRequestSchema,
  RetryPaymentResponseSchema,
  UserOrderSchema,
  GetUserOrdersResponseSchema,
} from '@/lib/api/schemas/orders';
import { matchesSchema, getValidationErrors, contractAssert, mockData } from './setup';

describe('Orders API Contract Tests', () => {
  // ============================================================
  // Enum Schema Tests
  // ============================================================

  describe('OrderStatusSchema', () => {
    it('should validate valid order statuses', () => {
      const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED'];
      statuses.forEach(status => {
        expect(matchesSchema(OrderStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid order status', () => {
      expect(matchesSchema(OrderStatusSchema, 'INVALID_STATUS')).toBe(false);
    });
  });

  describe('PaymentStatusSchema', () => {
    it('should validate valid payment statuses', () => {
      const statuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
      statuses.forEach(status => {
        expect(matchesSchema(PaymentStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid payment status', () => {
      expect(matchesSchema(PaymentStatusSchema, 'INVALID_STATUS')).toBe(false);
    });
  });

  describe('PaymentMethodSchema', () => {
    it('should validate valid payment methods', () => {
      const methods = ['SQUARE', 'VENMO', 'CASH', 'ZELLE'];
      methods.forEach(method => {
        expect(matchesSchema(PaymentMethodSchema, method)).toBe(true);
      });
    });

    it('should reject invalid payment method', () => {
      expect(matchesSchema(PaymentMethodSchema, 'BITCOIN')).toBe(false);
    });
  });

  describe('FulfillmentTypeSchema', () => {
    it('should validate valid fulfillment types', () => {
      const types = ['pickup', 'delivery', 'nationwide-shipping'];
      types.forEach(type => {
        expect(matchesSchema(FulfillmentTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid fulfillment type', () => {
      expect(matchesSchema(FulfillmentTypeSchema, 'drone-delivery')).toBe(false);
    });
  });

  // ============================================================
  // Order Item Schema Tests
  // ============================================================

  describe('OrderItemSchema', () => {
    it('should validate a valid order item', () => {
      const orderItem = {
        id: mockData.uuid(),
        quantity: 2,
        price: 12.99,
        product: {
          name: 'Alfajores',
          images: ['https://example.com/alfajores.jpg'],
        },
        variant: {
          name: 'Chocolate',
        },
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(true);
    });

    it('should validate order item without product and variant', () => {
      const orderItem = {
        id: mockData.uuid(),
        quantity: 1,
        price: 10.0,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(true);
    });

    it('should reject order item with negative quantity', () => {
      const orderItem = {
        id: mockData.uuid(),
        quantity: -1,
        price: 12.99,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(false);
    });

    it('should reject order item with negative price', () => {
      const orderItem = {
        id: mockData.uuid(),
        quantity: 1,
        price: -10.0,
      };

      expect(matchesSchema(OrderItemSchema, orderItem)).toBe(false);
    });
  });

  // ============================================================
  // Order Schema Tests
  // ============================================================

  describe('OrderSchema', () => {
    const mockOrder = () => ({
      id: mockData.uuid(),
      squareOrderId: 'SQUARE-ORDER-123',
      status: 'PENDING',
      total: 50.0,
      userId: mockData.uuid(),
      customerName: 'John Doe',
      email: mockData.email(),
      phone: mockData.phone(),
      fulfillmentType: 'pickup',
      notes: 'Please call upon arrival',
      pickupTime: mockData.timestamp(),
      deliveryDate: null,
      deliveryTime: null,
      shippingMethodName: null,
      shippingCarrier: null,
      shippingServiceLevelToken: null,
      shippingCostCents: null,
      shippingRateId: null,
      trackingNumber: null,
      cancelReason: null,
      paymentStatus: 'PENDING',
      paymentMethod: 'SQUARE',
      createdAt: mockData.timestamp(),
      updatedAt: mockData.timestamp(),
      taxAmount: 4.5,
      deliveryFee: 0,
      serviceFee: 0,
      gratuityAmount: 0,
      isCateringOrder: false,
      isArchived: false,
      archiveReason: null,
      archivedAt: null,
      retryCount: 0,
      lastRetryAt: null,
      paymentUrl: null,
      paymentUrlExpiresAt: null,
      labelUrl: null,
      labelCreatedAt: null,
      items: [
        {
          id: mockData.uuid(),
          quantity: 2,
          price: 25.0,
          product: { name: 'Alfajores' },
          variant: { name: 'Dulce de Leche' },
        },
      ],
    });

    it('should validate a complete order object', () => {
      const order = mockOrder();
      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });

    it('should validate order with shipping details', () => {
      const order = {
        ...mockOrder(),
        fulfillmentType: 'nationwide-shipping',
        shippingCarrier: 'USPS',
        shippingMethodName: 'Priority Mail',
        shippingCostCents: 850,
        trackingNumber: '1Z999AA10123456784',
      };

      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });

    it('should reject order with invalid email', () => {
      const order = {
        ...mockOrder(),
        email: 'not-an-email',
      };

      expect(matchesSchema(OrderSchema, order)).toBe(false);
      const errors = getValidationErrors(OrderSchema, order);
      expect(errors.some(e => e.includes('email'))).toBe(true);
    });

    it('should reject order with negative total', () => {
      const order = {
        ...mockOrder(),
        total: -50.0,
      };

      expect(matchesSchema(OrderSchema, order)).toBe(false);
    });

    it('should reject order with invalid UUID', () => {
      const order = {
        ...mockOrder(),
        id: 'not-a-uuid',
      };

      expect(matchesSchema(OrderSchema, order)).toBe(false);
    });
  });

  // ============================================================
  // GET /api/orders - List Orders
  // ============================================================

  describe('GetOrdersQuerySchema', () => {
    it('should validate empty query parameters', () => {
      const query = {};
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(true);
    });

    it('should validate query with status filter', () => {
      const query = {
        status: 'COMPLETED',
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(true);
    });

    it('should validate query with pagination', () => {
      const query = {
        limit: 50,
        offset: 10,
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(true);
    });

    it('should validate query with date range', () => {
      const query = {
        startDate: mockData.timestamp(),
        endDate: mockData.timestamp(),
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(true);
    });

    it('should validate query with all filters', () => {
      const query = {
        status: 'PENDING',
        paymentStatus: 'COMPLETED',
        fulfillmentType: 'pickup',
        userId: mockData.uuid(),
        startDate: mockData.timestamp(),
        endDate: mockData.timestamp(),
        limit: 20,
        offset: 0,
        includeArchived: false,
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(true);
    });

    it('should reject invalid limit (too large)', () => {
      const query = {
        limit: 150, // Max is 100
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(false);
    });

    it('should reject negative offset', () => {
      const query = {
        offset: -1,
      };
      expect(matchesSchema(GetOrdersQuerySchema, query)).toBe(false);
    });
  });

  describe('GetOrdersResponseSchema', () => {
    it('should validate response with orders array', () => {
      const response = {
        orders: [
          {
            id: mockData.uuid(),
            squareOrderId: null,
            status: 'COMPLETED',
            total: 100.0,
            userId: mockData.uuid(),
            customerName: 'Jane Smith',
            email: mockData.email(),
            phone: mockData.phone(),
            fulfillmentType: 'delivery',
            notes: null,
            pickupTime: null,
            deliveryDate: '2025-02-15',
            deliveryTime: '2:00 PM',
            shippingMethodName: null,
            shippingCarrier: null,
            shippingServiceLevelToken: null,
            shippingCostCents: null,
            shippingRateId: null,
            trackingNumber: null,
            cancelReason: null,
            paymentStatus: 'COMPLETED',
            paymentMethod: 'SQUARE',
            createdAt: mockData.timestamp(),
            updatedAt: mockData.timestamp(),
            taxAmount: 9.0,
            deliveryFee: 10.0,
            serviceFee: 5.0,
            gratuityAmount: 15.0,
            isCateringOrder: false,
            isArchived: false,
            archiveReason: null,
            archivedAt: null,
            retryCount: 0,
            lastRetryAt: null,
            paymentUrl: null,
            paymentUrlExpiresAt: null,
            labelUrl: null,
            labelCreatedAt: null,
            items: [],
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      expect(matchesSchema(GetOrdersResponseSchema, response)).toBe(true);
    });

    it('should validate response with empty orders array', () => {
      const response = {
        orders: [],
        total: 0,
      };

      expect(matchesSchema(GetOrdersResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // GET /api/orders/[orderId] - Get Order by ID
  // ============================================================

  describe('GetOrderByIdParamsSchema', () => {
    it('should validate valid UUID parameter', () => {
      const params = {
        orderId: mockData.uuid(),
      };

      expect(matchesSchema(GetOrderByIdParamsSchema, params)).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const params = {
        orderId: 'not-a-uuid',
      };

      expect(matchesSchema(GetOrderByIdParamsSchema, params)).toBe(false);
    });
  });

  describe('GetOrderByIdResponseSchema', () => {
    it('should validate success response with order', () => {
      const response = {
        success: true,
        order: {
          id: mockData.uuid(),
          squareOrderId: null,
          status: 'PENDING',
          total: 50.0,
          userId: mockData.uuid(),
          customerName: 'John Doe',
          email: mockData.email(),
          phone: mockData.phone(),
          fulfillmentType: 'pickup',
          notes: null,
          pickupTime: mockData.timestamp(),
          deliveryDate: null,
          deliveryTime: null,
          shippingMethodName: null,
          shippingCarrier: null,
          shippingServiceLevelToken: null,
          shippingCostCents: null,
          shippingRateId: null,
          trackingNumber: null,
          cancelReason: null,
          paymentStatus: 'PENDING',
          paymentMethod: 'SQUARE',
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
          taxAmount: 4.5,
          deliveryFee: 0,
          serviceFee: 0,
          gratuityAmount: 0,
          isCateringOrder: false,
          isArchived: false,
          archiveReason: null,
          archivedAt: null,
          retryCount: 0,
          lastRetryAt: null,
          paymentUrl: null,
          paymentUrlExpiresAt: null,
          labelUrl: null,
          labelCreatedAt: null,
          items: [],
        },
      };

      expect(matchesSchema(GetOrderByIdResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        error: 'Order not found',
      };

      expect(matchesSchema(GetOrderByIdResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // PATCH /api/orders/[orderId] - Update Order
  // ============================================================

  describe('UpdateOrderRequestSchema', () => {
    it('should validate status update', () => {
      const request = {
        status: 'PROCESSING',
      };

      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate tracking update', () => {
      const request = {
        trackingNumber: '1Z999AA10123456784',
        shippingCarrier: 'UPS',
      };

      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate archive request', () => {
      const request = {
        isArchived: true,
        archiveReason: 'Duplicate order',
      };

      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate empty update object', () => {
      const request = {};
      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(true);
    });

    it('should reject invalid status', () => {
      const request = {
        status: 'INVALID_STATUS',
      };

      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(false);
    });
  });

  describe('UpdateOrderResponseSchema', () => {
    it('should validate success response', () => {
      const response = {
        success: true,
        order: {
          id: mockData.uuid(),
          squareOrderId: null,
          status: 'PROCESSING',
          total: 50.0,
          userId: mockData.uuid(),
          customerName: 'John Doe',
          email: mockData.email(),
          phone: mockData.phone(),
          fulfillmentType: 'pickup',
          notes: null,
          pickupTime: mockData.timestamp(),
          deliveryDate: null,
          deliveryTime: null,
          shippingMethodName: null,
          shippingCarrier: null,
          shippingServiceLevelToken: null,
          shippingCostCents: null,
          shippingRateId: null,
          trackingNumber: null,
          cancelReason: null,
          paymentStatus: 'PENDING',
          paymentMethod: 'SQUARE',
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
          taxAmount: 4.5,
          deliveryFee: 0,
          serviceFee: 0,
          gratuityAmount: 0,
          isCateringOrder: false,
          isArchived: false,
          archiveReason: null,
          archivedAt: null,
          retryCount: 0,
          lastRetryAt: null,
          paymentUrl: null,
          paymentUrlExpiresAt: null,
          labelUrl: null,
          labelCreatedAt: null,
          items: [],
        },
      };

      expect(matchesSchema(UpdateOrderResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        error: 'Order not found',
      };

      expect(matchesSchema(UpdateOrderResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // POST /api/orders/[orderId]/retry-payment - Retry Payment
  // ============================================================

  describe('RetryPaymentRequestSchema', () => {
    it('should validate empty request', () => {
      const request = {};
      expect(matchesSchema(RetryPaymentRequestSchema, request)).toBe(true);
    });

    it('should validate request with payment method', () => {
      const request = {
        paymentMethod: 'SQUARE',
      };

      expect(matchesSchema(RetryPaymentRequestSchema, request)).toBe(true);
    });

    it('should reject invalid payment method', () => {
      const request = {
        paymentMethod: 'BITCOIN',
      };

      expect(matchesSchema(RetryPaymentRequestSchema, request)).toBe(false);
    });
  });

  describe('RetryPaymentResponseSchema', () => {
    it('should validate success response with payment URL', () => {
      const response = {
        success: true,
        order: {
          id: mockData.uuid(),
          squareOrderId: null,
          status: 'PENDING',
          total: 50.0,
          userId: mockData.uuid(),
          customerName: 'John Doe',
          email: mockData.email(),
          phone: mockData.phone(),
          fulfillmentType: 'pickup',
          notes: null,
          pickupTime: mockData.timestamp(),
          deliveryDate: null,
          deliveryTime: null,
          shippingMethodName: null,
          shippingCarrier: null,
          shippingServiceLevelToken: null,
          shippingCostCents: null,
          shippingRateId: null,
          trackingNumber: null,
          cancelReason: null,
          paymentStatus: 'PENDING',
          paymentMethod: 'SQUARE',
          createdAt: mockData.timestamp(),
          updatedAt: mockData.timestamp(),
          taxAmount: 4.5,
          deliveryFee: 0,
          serviceFee: 0,
          gratuityAmount: 0,
          isCateringOrder: false,
          isArchived: false,
          archiveReason: null,
          archivedAt: null,
          retryCount: 1,
          lastRetryAt: mockData.timestamp(),
          paymentUrl: 'https://payment.example.com/retry/abc123',
          paymentUrlExpiresAt: mockData.timestamp(),
          labelUrl: null,
          labelCreatedAt: null,
          items: [],
        },
        paymentUrl: 'https://payment.example.com/retry/abc123',
        message: 'Payment retry initiated',
      };

      expect(matchesSchema(RetryPaymentResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        error: 'Cannot retry payment for completed order',
      };

      expect(matchesSchema(RetryPaymentResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // GET /api/user/orders - User's Orders
  // ============================================================

  describe('UserOrderSchema', () => {
    it('should validate regular order', () => {
      const userOrder = {
        id: mockData.uuid(),
        createdAt: mockData.timestamp(),
        status: 'COMPLETED',
        total: 50.0,
        paymentStatus: 'COMPLETED',
        trackingNumber: null,
        shippingCarrier: null,
        type: 'regular',
        items: [
          {
            id: mockData.uuid(),
            quantity: 2,
            price: 25.0,
            product: { name: 'Alfajores' },
            variant: { name: 'Chocolate' },
          },
        ],
      };

      expect(matchesSchema(UserOrderSchema, userOrder)).toBe(true);
    });

    it('should validate catering order', () => {
      const userOrder = {
        id: mockData.uuid(),
        createdAt: mockData.timestamp(),
        status: 'PENDING',
        total: 500.0,
        paymentStatus: 'PENDING',
        trackingNumber: null,
        shippingCarrier: null,
        type: 'catering',
        eventDate: mockData.timestamp(),
        numberOfPeople: 50,
        items: [
          {
            id: mockData.uuid(),
            quantity: 1,
            price: 500.0,
            name: 'Empanadas Buffet Package',
          },
        ],
      };

      expect(matchesSchema(UserOrderSchema, userOrder)).toBe(true);
    });

    it('should reject order with invalid type', () => {
      const userOrder = {
        id: mockData.uuid(),
        createdAt: mockData.timestamp(),
        status: 'COMPLETED',
        total: 50.0,
        paymentStatus: 'COMPLETED',
        type: 'subscription',
        items: [],
      };

      expect(matchesSchema(UserOrderSchema, userOrder)).toBe(false);
    });
  });

  describe('GetUserOrdersResponseSchema', () => {
    it('should validate array of user orders', () => {
      const response = [
        {
          id: mockData.uuid(),
          createdAt: mockData.timestamp(),
          status: 'COMPLETED',
          total: 50.0,
          paymentStatus: 'COMPLETED',
          trackingNumber: '1Z999AA10123456784',
          shippingCarrier: 'UPS',
          type: 'regular',
          items: [],
        },
        {
          id: mockData.uuid(),
          createdAt: mockData.timestamp(),
          status: 'PENDING',
          total: 500.0,
          paymentStatus: 'PENDING',
          trackingNumber: null,
          shippingCarrier: null,
          type: 'catering',
          eventDate: mockData.timestamp(),
          numberOfPeople: 50,
          items: [],
        },
      ];

      expect(matchesSchema(GetUserOrdersResponseSchema, response)).toBe(true);
    });

    it('should validate empty orders array', () => {
      const response: any[] = [];
      expect(matchesSchema(GetUserOrdersResponseSchema, response)).toBe(true);
    });
  });
});
