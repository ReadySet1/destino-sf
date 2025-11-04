/**
 * Square Payments API Contract Tests
 *
 * Tests to ensure Square Payments API responses conform to expected schemas.
 * These tests validate that our type definitions match Square's actual API responses.
 * Includes 2025 enhancements for gift card error handling.
 */

import { describe, it, expect } from '@jest/globals';
import {
  PaymentStatusSchema,
  ProcessingFeeSchema,
  CardSchema,
  CardPaymentDetailsSchema,
  CashPaymentDetailsSchema,
  ExternalPaymentDetailsSchema,
  GiftCardErrorSchema,
  PaymentSchema,
  AddressSchema,
  DeviceDetailsSchema,
  ApplicationDetailsSchema,
  RiskEvaluationSchema,
  CreatePaymentRequestSchema,
  CreatePaymentResponseSchema,
  GetPaymentResponseSchema,
  UpdatePaymentRequestSchema,
  UpdatePaymentResponseSchema,
  CompletePaymentRequestSchema,
  CompletePaymentResponseSchema,
  CancelPaymentResponseSchema,
  ListPaymentsRequestSchema,
  ListPaymentsResponseSchema,
  CancelPaymentByIdempotencyKeyRequestSchema,
  CancelPaymentByIdempotencyKeyResponseSchema,
} from '@/lib/api/schemas/external/square/payments';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Square Payments API Contract Tests', () => {
  // ============================================================
  // Base Types
  // ============================================================

  describe('AddressSchema', () => {
    it('should validate complete address', () => {
      const address = {
        address_line_1: '123 Main St',
        address_line_2: 'Apt 4B',
        locality: 'San Francisco',
        administrative_district_level_1: 'CA',
        postal_code: '94102',
        country: 'US',
        first_name: 'John',
        last_name: 'Doe',
      };
      expect(matchesSchema(AddressSchema, address)).toBe(true);
    });

    it('should validate minimal address', () => {
      const address = {
        postal_code: '94102',
      };
      expect(matchesSchema(AddressSchema, address)).toBe(true);
    });

    it('should validate empty address', () => {
      const address = {};
      expect(matchesSchema(AddressSchema, address)).toBe(true);
    });
  });

  describe('DeviceDetailsSchema', () => {
    it('should validate device details', () => {
      const device = {
        device_id: 'DEVICE123',
        device_installation_id: 'INSTALL456',
        device_name: 'Register 1',
      };
      expect(matchesSchema(DeviceDetailsSchema, device)).toBe(true);
    });
  });

  describe('ApplicationDetailsSchema', () => {
    it('should validate application details', () => {
      const app = {
        square_product: 'ECOMMERCE_API',
        application_id: 'sq0idp-APP123',
      };
      expect(matchesSchema(ApplicationDetailsSchema, app)).toBe(true);
    });
  });

  describe('RiskEvaluationSchema', () => {
    it('should validate risk evaluation', () => {
      const risk = {
        created_at: '2025-01-15T12:00:00Z',
        risk_level: 'NORMAL',
      };
      expect(matchesSchema(RiskEvaluationSchema, risk)).toBe(true);
    });
  });

  // ============================================================
  // Payment Enums
  // ============================================================

  describe('PaymentStatusSchema', () => {
    it('should validate all payment statuses', () => {
      const statuses = ['APPROVED', 'PENDING', 'COMPLETED', 'CANCELED', 'FAILED'];
      statuses.forEach(status => {
        expect(matchesSchema(PaymentStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      expect(matchesSchema(PaymentStatusSchema, 'INVALID_STATUS')).toBe(false);
    });
  });

  // ============================================================
  // Payment Structures
  // ============================================================

  describe('ProcessingFeeSchema', () => {
    it('should validate processing fee', () => {
      const fee = {
        effective_at: '2025-01-15T12:00:00Z',
        type: 'INITIAL',
        amount_money: { amount: 47, currency: 'USD' },
      };
      expect(matchesSchema(ProcessingFeeSchema, fee)).toBe(true);
    });
  });

  describe('CardSchema', () => {
    it('should validate complete card', () => {
      const card = {
        id: mockData.uuid(),
        card_brand: 'VISA',
        last_4: '1111',
        exp_month: 12,
        exp_year: 2025,
        cardholder_name: 'John Doe',
        billing_address: {
          postal_code: '94102',
        },
        fingerprint: 'sq0idp-FINGERPRINT',
        enabled: true,
        card_type: 'CREDIT',
      };
      expect(matchesSchema(CardSchema, card)).toBe(true);
    });

    it('should validate card with bigint expiration', () => {
      const card = {
        last_4: '1111',
        exp_month: BigInt(12),
        exp_year: BigInt(2025),
      };
      expect(matchesSchema(CardSchema, card)).toBe(true);
    });
  });

  describe('CardPaymentDetailsSchema', () => {
    it('should validate complete card payment details', () => {
      const details = {
        status: 'AUTHORIZED',
        card: {
          card_brand: 'VISA',
          last_4: '1111',
        },
        entry_method: 'KEYED',
        cvv_status: 'CVV_ACCEPTED',
        avs_status: 'AVS_ACCEPTED',
        auth_result_code: 'APPROVED',
        verification_method: 'CVV',
        verification_results: 'SUCCESS',
        statement_description: 'Destino SF',
      };
      expect(matchesSchema(CardPaymentDetailsSchema, details)).toBe(true);
    });

    it('should validate card details with errors', () => {
      const details = {
        status: 'FAILED',
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CARD_DECLINED',
            detail: 'Insufficient funds',
          },
        ],
      };
      expect(matchesSchema(CardPaymentDetailsSchema, details)).toBe(true);
    });
  });

  describe('CashPaymentDetailsSchema', () => {
    it('should validate cash payment', () => {
      const cash = {
        buyer_supplied_money: { amount: 2000, currency: 'USD' },
        change_back_money: { amount: 100, currency: 'USD' },
      };
      expect(matchesSchema(CashPaymentDetailsSchema, cash)).toBe(true);
    });
  });

  describe('ExternalPaymentDetailsSchema', () => {
    it('should validate external payment', () => {
      const external = {
        type: 'VENMO',
        source: 'Venmo',
        source_id: 'VENMO123',
        source_fee_money: { amount: 50, currency: 'USD' },
      };
      expect(matchesSchema(ExternalPaymentDetailsSchema, external)).toBe(true);
    });
  });

  describe('GiftCardErrorSchema', () => {
    it('should validate gift card available amount error', () => {
      const error = {
        code: 'GIFT_CARD_AVAILABLE_AMOUNT' as const,
        detail: 'Gift card has insufficient balance',
        available_amount: { amount: 500, currency: 'USD' },
      };
      expect(matchesSchema(GiftCardErrorSchema, error)).toBe(true);
    });

    it('should validate insufficient funds error', () => {
      const error = {
        code: 'INSUFFICIENT_FUNDS' as const,
        detail: 'Not enough balance',
        available_amount: { amount: 250, currency: 'USD' },
      };
      expect(matchesSchema(GiftCardErrorSchema, error)).toBe(true);
    });
  });

  // ============================================================
  // Payment Object
  // ============================================================

  describe('PaymentSchema', () => {
    it('should validate complete payment', () => {
      const payment = {
        id: mockData.uuid(),
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:01:00Z',
        amount_money: { amount: 1599, currency: 'USD' },
        tip_money: { amount: 300, currency: 'USD' },
        total_money: { amount: 1899, currency: 'USD' },
        approved_money: { amount: 1899, currency: 'USD' },
        processing_fee: [
          {
            type: 'INITIAL',
            amount_money: { amount: 47, currency: 'USD' },
          },
        ],
        status: 'COMPLETED' as const,
        source_type: 'CARD',
        card_details: {
          status: 'CAPTURED',
          card: {
            card_brand: 'VISA',
            last_4: '1111',
          },
          entry_method: 'ON_FILE',
        },
        location_id: mockData.uuid(),
        order_id: mockData.uuid(),
        reference_id: 'ORDER-123',
        buyer_email_address: 'customer@example.com',
        receipt_number: 'RCPT123',
        receipt_url: 'https://squareup.com/receipt/123',
      };
      expect(matchesSchema(PaymentSchema, payment)).toBe(true);
    });

    it('should validate payment with addresses', () => {
      const payment = {
        id: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
        billing_address: {
          address_line_1: '123 Main St',
          locality: 'San Francisco',
          administrative_district_level_1: 'CA',
          postal_code: '94102',
          country: 'US',
        },
        shipping_address: {
          address_line_1: '456 Oak Ave',
          locality: 'Oakland',
          postal_code: '94601',
        },
      };
      expect(matchesSchema(PaymentSchema, payment)).toBe(true);
    });

    it('should validate payment with risk evaluation', () => {
      const payment = {
        id: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
        status: 'PENDING' as const,
        risk_evaluation: {
          created_at: '2025-01-15T12:00:00Z',
          risk_level: 'HIGH',
        },
      };
      expect(matchesSchema(PaymentSchema, payment)).toBe(true);
    });
  });

  // ============================================================
  // API Requests
  // ============================================================

  describe('CreatePaymentRequestSchema', () => {
    it('should validate complete payment request', () => {
      const request = {
        source_id: 'cnon:card-nonce-ok',
        idempotency_key: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
        tip_money: { amount: 300, currency: 'USD' },
        autocomplete: true,
        order_id: mockData.uuid(),
        customer_id: mockData.uuid(),
        location_id: mockData.uuid(),
        reference_id: 'ORDER-123',
        verification_token: 'verify-token',
        accept_partial_authorization: false,
        buyer_email_address: 'customer@example.com',
        billing_address: {
          postal_code: '94102',
        },
        note: 'Payment for order #123',
      };
      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(true);
    });

    it('should validate minimal payment request', () => {
      const request = {
        source_id: 'cnon:card-nonce-ok',
        idempotency_key: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
      };
      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(true);
    });

    it('should validate cash payment request', () => {
      const request = {
        source_id: 'CASH',
        idempotency_key: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
        cash_details: {
          buyer_supplied_money: { amount: 2000, currency: 'USD' },
          change_back_money: { amount: 401, currency: 'USD' },
        },
      };
      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(true);
    });

    it('should validate external payment request', () => {
      const request = {
        source_id: 'EXTERNAL',
        idempotency_key: mockData.uuid(),
        amount_money: { amount: 1599, currency: 'USD' },
        external_details: {
          type: 'VENMO',
          source: 'Venmo',
          source_id: 'VENMO123',
        },
      };
      expect(matchesSchema(CreatePaymentRequestSchema, request)).toBe(true);
    });
  });

  describe('UpdatePaymentRequestSchema', () => {
    it('should validate update request', () => {
      const request = {
        idempotency_key: mockData.uuid(),
        payment: {
          id: mockData.uuid(),
          note: 'Updated note',
        },
      };
      expect(matchesSchema(UpdatePaymentRequestSchema, request)).toBe(true);
    });
  });

  describe('CompletePaymentRequestSchema', () => {
    it('should validate complete request with key', () => {
      const request = {
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(CompletePaymentRequestSchema, request)).toBe(true);
    });

    it('should validate complete request without key', () => {
      const request = {};
      expect(matchesSchema(CompletePaymentRequestSchema, request)).toBe(true);
    });
  });

  describe('CancelPaymentByIdempotencyKeyRequestSchema', () => {
    it('should validate cancel request', () => {
      const request = {
        idempotency_key: mockData.uuid(),
      };
      expect(matchesSchema(CancelPaymentByIdempotencyKeyRequestSchema, request)).toBe(true);
    });
  });

  describe('ListPaymentsRequestSchema', () => {
    it('should validate complete list request', () => {
      const request = {
        begin_time: '2025-01-01T00:00:00Z',
        end_time: '2025-01-31T23:59:59Z',
        sort_order: 'DESC',
        cursor: 'CURSOR123',
        location_id: mockData.uuid(),
        last_4: '1111',
        card_brand: 'VISA',
        limit: 100,
      };
      expect(matchesSchema(ListPaymentsRequestSchema, request)).toBe(true);
    });

    it('should validate minimal list request', () => {
      const request = {};
      expect(matchesSchema(ListPaymentsRequestSchema, request)).toBe(true);
    });

    it('should reject limit above 200', () => {
      const request = {
        limit: 500,
      };
      expect(matchesSchema(ListPaymentsRequestSchema, request)).toBe(false);
    });

    it('should reject negative limit', () => {
      const request = {
        limit: -1,
      };
      expect(matchesSchema(ListPaymentsRequestSchema, request)).toBe(false);
    });
  });

  // ============================================================
  // API Responses
  // ============================================================

  describe('CreatePaymentResponseSchema', () => {
    it('should validate successful payment creation', () => {
      const response = {
        payment: {
          id: mockData.uuid(),
          created_at: '2025-01-15T12:00:00Z',
          amount_money: { amount: 1599, currency: 'USD' },
          status: 'COMPLETED' as const,
          source_type: 'CARD',
          location_id: mockData.uuid(),
        },
      };
      expect(matchesSchema(CreatePaymentResponseSchema, response)).toBe(true);
    });

    it('should validate payment error response', () => {
      const response = {
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CARD_DECLINED',
            detail: 'Insufficient funds',
            field: 'source_id',
          },
        ],
      };
      expect(matchesSchema(CreatePaymentResponseSchema, response)).toBe(true);
    });
  });

  describe('GetPaymentResponseSchema', () => {
    it('should validate get payment response', () => {
      const response = {
        payment: {
          id: mockData.uuid(),
          amount_money: { amount: 1599, currency: 'USD' },
          status: 'COMPLETED' as const,
        },
      };
      expect(matchesSchema(GetPaymentResponseSchema, response)).toBe(true);
    });
  });

  describe('UpdatePaymentResponseSchema', () => {
    it('should validate update payment response', () => {
      const response = {
        payment: {
          id: mockData.uuid(),
          updated_at: '2025-01-15T12:05:00Z',
          note: 'Updated note',
        },
      };
      expect(matchesSchema(UpdatePaymentResponseSchema, response)).toBe(true);
    });
  });

  describe('CompletePaymentResponseSchema', () => {
    it('should validate complete payment response', () => {
      const response = {
        payment: {
          id: mockData.uuid(),
          status: 'COMPLETED' as const,
        },
      };
      expect(matchesSchema(CompletePaymentResponseSchema, response)).toBe(true);
    });
  });

  describe('CancelPaymentResponseSchema', () => {
    it('should validate cancel payment response', () => {
      const response = {
        payment: {
          id: mockData.uuid(),
          status: 'CANCELED' as const,
        },
      };
      expect(matchesSchema(CancelPaymentResponseSchema, response)).toBe(true);
    });
  });

  describe('CancelPaymentByIdempotencyKeyResponseSchema', () => {
    it('should validate successful cancellation', () => {
      const response = {};
      expect(matchesSchema(CancelPaymentByIdempotencyKeyResponseSchema, response)).toBe(true);
    });

    it('should validate cancellation with errors', () => {
      const response = {
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'NOT_FOUND',
            detail: 'Payment not found',
          },
        ],
      };
      expect(matchesSchema(CancelPaymentByIdempotencyKeyResponseSchema, response)).toBe(true);
    });
  });

  describe('ListPaymentsResponseSchema', () => {
    it('should validate list payments response', () => {
      const response = {
        payments: [
          {
            id: mockData.uuid(),
            amount_money: { amount: 1599, currency: 'USD' },
            status: 'COMPLETED' as const,
          },
          {
            id: mockData.uuid(),
            amount_money: { amount: 2499, currency: 'USD' },
            status: 'PENDING' as const,
          },
        ],
        cursor: 'NEXT_CURSOR',
      };
      expect(matchesSchema(ListPaymentsResponseSchema, response)).toBe(true);
    });

    it('should validate empty list response', () => {
      const response = {
        payments: [],
      };
      expect(matchesSchema(ListPaymentsResponseSchema, response)).toBe(true);
    });

    it('should validate list with errors', () => {
      const response = {
        errors: [
          {
            category: 'AUTHENTICATION_ERROR',
            code: 'UNAUTHORIZED',
            detail: 'Invalid access token',
          },
        ],
      };
      expect(matchesSchema(ListPaymentsResponseSchema, response)).toBe(true);
    });
  });
});
