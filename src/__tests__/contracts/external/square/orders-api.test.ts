/**
 * Square Orders API Contract Tests
 *
 * Tests to ensure Square Orders API responses conform to expected schemas.
 * These tests validate that our type definitions match Square's actual API responses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  OrderStateSchema,
  FulfillmentTypeSchema,
  OrderSchema,
  OrderLineItemSchema,
  OrderServiceChargeSchema,
  OrderFulfillmentSchema,
  OrderReturnSchema,
  CreateOrderRequestSchema,
  CreateOrderResponseSchema,
  UpdateOrderRequestSchema,
  UpdateOrderResponseSchema,
  SearchOrdersRequestSchema,
  SearchOrdersResponseSchema,
  CalculateOrderRequestSchema,
  CalculateOrderResponseSchema,
  CloneOrderRequestSchema,
  CloneOrderResponseSchema,
  PayOrderRequestSchema,
  PayOrderResponseSchema,
  RetrieveOrderResponseSchema,
} from '@/lib/api/schemas/external/square/orders';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Square Orders API Contract Tests', () => {
  // ============================================================
  // Enums
  // ============================================================

  describe('OrderStateSchema', () => {
    it('should validate all order states', () => {
      const states = ['OPEN', 'COMPLETED', 'CANCELED', 'DRAFT'];
      states.forEach(state => {
        expect(matchesSchema(OrderStateSchema, state)).toBe(true);
      });
    });

    it('should reject invalid state', () => {
      expect(matchesSchema(OrderStateSchema, 'INVALID_STATE')).toBe(false);
    });
  });

  describe('FulfillmentTypeSchema', () => {
    it('should validate all fulfillment types', () => {
      const types = ['PICKUP', 'SHIPMENT', 'DELIVERY'];
      types.forEach(type => {
        expect(matchesSchema(FulfillmentTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid type', () => {
      expect(matchesSchema(FulfillmentTypeSchema, 'INVALID_TYPE')).toBe(false);
    });
  });

  // ============================================================
  // Order Line Items
  // ============================================================

  describe('OrderLineItemSchema', () => {
    it('should validate complete line item', () => {
      const lineItem = {
        uid: mockData.uuid(),
        name: 'Beef Empanada',
        quantity: '2',
        catalog_object_id: mockData.uuid(),
        variation_name: 'Regular',
        base_price_money: { amount: 799, currency: 'USD' },
        total_money: { amount: 1598, currency: 'USD' },
        modifiers: [
          {
            uid: mockData.uuid(),
            name: 'Extra Cheese',
            base_price_money: { amount: 100, currency: 'USD' },
            total_price_money: { amount: 200, currency: 'USD' },
          },
        ],
      };
      expect(matchesSchema(OrderLineItemSchema, lineItem)).toBe(true);
    });

    it('should validate minimal line item', () => {
      const lineItem = {
        quantity: '1',
      };
      expect(matchesSchema(OrderLineItemSchema, lineItem)).toBe(true);
    });

    it('should validate line item with taxes and discounts', () => {
      const lineItem = {
        quantity: '1',
        taxes: [
          {
            tax_uid: 'TAX123',
            applied_money: { amount: 80, currency: 'USD' },
          },
        ],
        discounts: [
          {
            discount_uid: 'DISC123',
            applied_money: { amount: 100, currency: 'USD' },
          },
        ],
      };
      expect(matchesSchema(OrderLineItemSchema, lineItem)).toBe(true);
    });
  });

  describe('OrderServiceChargeSchema', () => {
    it('should validate service charge', () => {
      const charge = {
        uid: mockData.uuid(),
        name: 'Delivery Fee',
        amount_money: { amount: 500, currency: 'USD' },
        applied_money: { amount: 500, currency: 'USD' },
        total_money: { amount: 500, currency: 'USD' },
        taxable: false,
      };
      expect(matchesSchema(OrderServiceChargeSchema, charge)).toBe(true);
    });
  });

  // ============================================================
  // Order Fulfillments
  // ============================================================

  describe('OrderFulfillmentSchema', () => {
    it('should validate pickup fulfillment', () => {
      const fulfillment = {
        uid: mockData.uuid(),
        type: 'PICKUP' as const,
        state: 'PROPOSED',
        pickup_details: {
          recipient: {
            display_name: 'John Doe',
            email_address: 'john@example.com',
            phone_number: '415-555-0100',
          },
          pickup_at: '2025-01-15T18:00:00Z',
          note: 'Please call when ready',
        },
      };
      expect(matchesSchema(OrderFulfillmentSchema, fulfillment)).toBe(true);
    });

    it('should validate shipment fulfillment', () => {
      const fulfillment = {
        uid: mockData.uuid(),
        type: 'SHIPMENT' as const,
        state: 'PROPOSED',
        shipment_details: {
          recipient: {
            display_name: 'Jane Smith',
            address: {
              address_line_1: '123 Main St',
              locality: 'San Francisco',
              administrative_district_level_1: 'CA',
              postal_code: '94102',
              country: 'US',
            },
          },
          carrier: 'USPS',
          shipping_type: 'Priority Mail',
          tracking_number: '1Z999AA10123456784',
        },
      };
      expect(matchesSchema(OrderFulfillmentSchema, fulfillment)).toBe(true);
    });

    it('should validate delivery fulfillment', () => {
      const fulfillment = {
        uid: mockData.uuid(),
        type: 'DELIVERY' as const,
        state: 'PROPOSED',
        delivery_details: {
          recipient: {
            display_name: 'Bob Johnson',
            phone_number: '415-555-0200',
          },
          deliver_at: '2025-01-15T19:00:00Z',
          is_no_contact_delivery: true,
          dropoff_notes: 'Leave at door',
        },
      };
      expect(matchesSchema(OrderFulfillmentSchema, fulfillment)).toBe(true);
    });
  });

  // ============================================================
  // Order Returns
  // ============================================================

  describe('OrderReturnSchema', () => {
    it('should validate order return', () => {
      const orderReturn = {
        uid: mockData.uuid(),
        source_order_uid: mockData.uuid(),
        return_line_items: [
          {
            quantity: '1',
            source_line_item_uid: mockData.uuid(),
            name: 'Beef Empanada',
            total_money: { amount: 799, currency: 'USD' },
          },
        ],
        return_amounts: {
          total_money: { amount: 799, currency: 'USD' },
          tax_money: { amount: 80, currency: 'USD' },
        },
      };
      expect(matchesSchema(OrderReturnSchema, orderReturn)).toBe(true);
    });
  });

  // ============================================================
  // Order Object
  // ============================================================

  describe('OrderSchema', () => {
    it('should validate complete order', () => {
      const order = {
        id: mockData.uuid(),
        location_id: mockData.uuid(),
        order_number: '123',
        reference_id: 'ORDER-123',
        customer_id: mockData.uuid(),
        line_items: [
          {
            uid: mockData.uuid(),
            name: 'Beef Empanada',
            quantity: '2',
            base_price_money: { amount: 799, currency: 'USD' },
            total_money: { amount: 1598, currency: 'USD' },
          },
        ],
        state: 'OPEN' as const,
        version: 1,
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:01:00Z',
        total_money: { amount: 1598, currency: 'USD' },
      };
      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });

    it('should validate order with fulfillment', () => {
      const order = {
        location_id: mockData.uuid(),
        line_items: [
          {
            quantity: '1',
            name: 'Alfajores',
          },
        ],
        fulfillments: [
          {
            type: 'PICKUP' as const,
            pickup_details: {
              recipient: {
                display_name: 'Customer Name',
              },
              pickup_at: '2025-01-15T18:00:00Z',
            },
          },
        ],
      };
      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });

    it('should validate minimal order', () => {
      const order = {
        location_id: mockData.uuid(),
      };
      expect(matchesSchema(OrderSchema, order)).toBe(true);
    });
  });

  // ============================================================
  // API Requests
  // ============================================================

  describe('CreateOrderRequestSchema', () => {
    it('should validate create order request', () => {
      const request = {
        order: {
          location_id: mockData.uuid(),
          line_items: [
            {
              quantity: '2',
              name: 'Beef Empanada',
              base_price_money: { amount: 799, currency: 'USD' },
            },
          ],
        },
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate minimal request', () => {
      const request = {};
      expect(matchesSchema(CreateOrderRequestSchema, request)).toBe(true);
    });
  });

  describe('UpdateOrderRequestSchema', () => {
    it('should validate update request', () => {
      const request = {
        order: {
          location_id: mockData.uuid(),
          version: 2,
        },
        fields_to_clear: ['customer_id'],
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(UpdateOrderRequestSchema, request)).toBe(true);
    });
  });

  describe('PayOrderRequestSchema', () => {
    it('should validate pay order request', () => {
      const request = {
        idempotency_key: mockData.uuid(),
        order_version: 1,
        payment_ids: [mockData.uuid()],
      };
      expect(matchesSchema(PayOrderRequestSchema, request)).toBe(true);
    });

    it('should validate minimal pay request', () => {
      const request = {
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(PayOrderRequestSchema, request)).toBe(true);
    });
  });

  describe('SearchOrdersRequestSchema', () => {
    it('should validate complete search request', () => {
      const request = {
        location_ids: [mockData.uuid()],
        cursor: 'CURSOR123',
        query: {
          filter: {
            state_filter: {
              states: ['COMPLETED' as const, 'OPEN' as const],
            },
            date_time_filter: {
              created_at: {
                start_at: '2025-01-01T00:00:00Z',
                end_at: '2025-01-31T23:59:59Z',
              },
            },
            fulfillment_filter: {
              fulfillment_types: ['PICKUP' as const],
            },
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC',
          },
        },
        limit: 100,
        return_entries: true,
      };
      expect(matchesSchema(SearchOrdersRequestSchema, request)).toBe(true);
    });

    it('should validate minimal search request', () => {
      const request = {};
      expect(matchesSchema(SearchOrdersRequestSchema, request)).toBe(true);
    });

    it('should reject limit above 1000', () => {
      const request = {
        limit: 2000,
      };
      expect(matchesSchema(SearchOrdersRequestSchema, request)).toBe(false);
    });
  });

  describe('CalculateOrderRequestSchema', () => {
    it('should validate calculate request', () => {
      const request = {
        order: {
          location_id: mockData.uuid(),
          line_items: [
            {
              quantity: '1',
              base_price_money: { amount: 799, currency: 'USD' },
            },
          ],
        },
      };
      expect(matchesSchema(CalculateOrderRequestSchema, request)).toBe(true);
    });

    it('should validate with proposed rewards', () => {
      const request = {
        order: {
          location_id: mockData.uuid(),
          line_items: [{ quantity: '1' }],
        },
        proposed_rewards: [
          {
            id: 'REWARD123',
            reward_tier_id: 'TIER456',
          },
        ],
      };
      expect(matchesSchema(CalculateOrderRequestSchema, request)).toBe(true);
    });
  });

  describe('CloneOrderRequestSchema', () => {
    it('should validate clone request', () => {
      const request = {
        order_id: mockData.uuid(),
        version: 1,
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(CloneOrderRequestSchema, request)).toBe(true);
    });

    it('should validate minimal clone request', () => {
      const request = {
        order_id: mockData.uuid(),
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(CloneOrderRequestSchema, request)).toBe(true);
    });
  });

  // ============================================================
  // API Responses
  // ============================================================

  describe('CreateOrderResponseSchema', () => {
    it('should validate successful creation', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          location_id: mockData.uuid(),
          state: 'OPEN' as const,
          created_at: '2025-01-15T12:00:00Z',
        },
      };
      expect(matchesSchema(CreateOrderResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'MISSING_REQUIRED_PARAMETER',
            detail: 'Missing location_id',
            field: 'location_id',
          },
        ],
      };
      expect(matchesSchema(CreateOrderResponseSchema, response)).toBe(true);
    });
  });

  describe('RetrieveOrderResponseSchema', () => {
    it('should validate retrieve response', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          location_id: mockData.uuid(),
          state: 'COMPLETED' as const,
        },
      };
      expect(matchesSchema(RetrieveOrderResponseSchema, response)).toBe(true);
    });
  });

  describe('UpdateOrderResponseSchema', () => {
    it('should validate update response', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          location_id: mockData.uuid(),
          version: 2,
          updated_at: '2025-01-15T12:05:00Z',
        },
      };
      expect(matchesSchema(UpdateOrderResponseSchema, response)).toBe(true);
    });
  });

  describe('PayOrderResponseSchema', () => {
    it('should validate pay order response', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          location_id: mockData.uuid(),
          state: 'COMPLETED' as const,
          tenders: [
            {
              type: 'CARD',
              amount_money: { amount: 1598, currency: 'USD' },
            },
          ],
        },
      };
      expect(matchesSchema(PayOrderResponseSchema, response)).toBe(true);
    });
  });

  describe('SearchOrdersResponseSchema', () => {
    it('should validate search results', () => {
      const response = {
        orders: [
          {
            id: mockData.uuid(),
            location_id: mockData.uuid(),
            state: 'COMPLETED' as const,
          },
          {
            id: mockData.uuid(),
            location_id: mockData.uuid(),
            state: 'OPEN' as const,
          },
        ],
        cursor: 'NEXT_CURSOR',
      };
      expect(matchesSchema(SearchOrdersResponseSchema, response)).toBe(true);
    });

    it('should validate search with order entries', () => {
      const response = {
        order_entries: [
          {
            order_id: mockData.uuid(),
            version: 1,
            location_id: mockData.uuid(),
          },
        ],
        orders: [
          {
            id: mockData.uuid(),
            location_id: mockData.uuid(),
          },
        ],
      };
      expect(matchesSchema(SearchOrdersResponseSchema, response)).toBe(true);
    });

    it('should validate empty results', () => {
      const response = {
        orders: [],
      };
      expect(matchesSchema(SearchOrdersResponseSchema, response)).toBe(true);
    });
  });

  describe('CalculateOrderResponseSchema', () => {
    it('should validate calculate response', () => {
      const response = {
        order: {
          location_id: mockData.uuid(),
          line_items: [
            {
              quantity: '1',
              total_money: { amount: 799, currency: 'USD' },
            },
          ],
          total_money: { amount: 799, currency: 'USD' },
        },
      };
      expect(matchesSchema(CalculateOrderResponseSchema, response)).toBe(true);
    });
  });

  describe('CloneOrderResponseSchema', () => {
    it('should validate clone response', () => {
      const response = {
        order: {
          id: mockData.uuid(),
          location_id: mockData.uuid(),
          state: 'DRAFT' as const,
        },
      };
      expect(matchesSchema(CloneOrderResponseSchema, response)).toBe(true);
    });
  });
});
