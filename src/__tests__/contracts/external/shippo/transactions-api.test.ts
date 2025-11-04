/**
 * Shippo Transactions API Contract Tests
 *
 * Tests to ensure Shippo Transactions API responses conform to expected schemas.
 * Transactions represent label purchases in Shippo.
 * These tests validate that our type definitions match Shippo's actual API responses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ShippoTransactionRequestSchema,
  ShippoTransactionResponseSchema,
  ShippoTransactionStateSchema,
  ShippoTransactionStatusSchema,
  ShippoLabelFileTypeSchema,
  ShippoSubmissionTypeSchema,
  ShippoRateSchema,
  ShippoValidationMessageSchema,
} from '@/lib/api/schemas/external/shippo';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Shippo Transactions API Contract Tests', () => {
  // ============================================================
  // Enums
  // ============================================================

  describe('ShippoTransactionStateSchema', () => {
    it('should validate all transaction states', () => {
      const states = ['VALID', 'INVALID', 'QUEUED', 'SUCCESS', 'ERROR'];
      states.forEach((state) => {
        expect(matchesSchema(ShippoTransactionStateSchema, state)).toBe(true);
      });
    });

    it('should reject invalid state', () => {
      expect(matchesSchema(ShippoTransactionStateSchema, 'PENDING')).toBe(false);
    });
  });

  describe('ShippoTransactionStatusSchema', () => {
    it('should validate all transaction statuses', () => {
      const statuses = ['QUEUED', 'SUCCESS', 'ERROR', 'UNKNOWN'];
      statuses.forEach((status) => {
        expect(matchesSchema(ShippoTransactionStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      expect(matchesSchema(ShippoTransactionStatusSchema, 'COMPLETED')).toBe(false);
    });
  });

  describe('ShippoLabelFileTypeSchema', () => {
    it('should validate all label file types', () => {
      const types = ['PNG', 'PDF', 'PDF_4x6', 'PDF_A4', 'PDF_A6', 'ZPLII'];
      types.forEach((type) => {
        expect(matchesSchema(ShippoLabelFileTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid file type', () => {
      expect(matchesSchema(ShippoLabelFileTypeSchema, 'JPG')).toBe(false);
    });
  });

  describe('ShippoSubmissionTypeSchema', () => {
    it('should validate submission types', () => {
      const types = ['PICKUP', 'DROPOFF'];
      types.forEach((type) => {
        expect(matchesSchema(ShippoSubmissionTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid submission type', () => {
      expect(matchesSchema(ShippoSubmissionTypeSchema, 'DELIVERY')).toBe(false);
    });
  });

  // ============================================================
  // Transaction Request
  // ============================================================

  describe('ShippoTransactionRequestSchema', () => {
    it('should validate transaction request with rate ID', () => {
      const request = {
        rate: mockData.uuid(),
        label_file_type: 'PDF_4x6' as const,
        async: false,
      };
      expect(matchesSchema(ShippoTransactionRequestSchema, request)).toBe(true);
    });

    it('should validate transaction request with rate object', () => {
      const request = {
        rate: {
          object_id: mockData.uuid(),
          amount: '10.50',
          currency: 'USD',
          provider: 'USPS',
          servicelevel: {
            name: 'Priority Mail',
            token: 'usps_priority',
          },
        },
        label_file_type: 'PNG' as const,
        async: true,
        metadata: 'order-123',
      };
      expect(matchesSchema(ShippoTransactionRequestSchema, request)).toBe(true);
    });

    it('should validate minimal transaction request', () => {
      const request = {
        rate: mockData.uuid(),
      };
      expect(matchesSchema(ShippoTransactionRequestSchema, request)).toBe(true);
    });

    it('should validate request with submission type', () => {
      const request = {
        rate: mockData.uuid(),
        label_file_type: 'ZPLII' as const,
        submission_type: 'DROPOFF' as const,
      };
      expect(matchesSchema(ShippoTransactionRequestSchema, request)).toBe(true);
    });

    it('should validate request for thermal printer', () => {
      const request = {
        rate: mockData.uuid(),
        label_file_type: 'ZPLII' as const,
        submission_type: 'PICKUP' as const,
        metadata: 'batch-456',
      };
      expect(matchesSchema(ShippoTransactionRequestSchema, request)).toBe(true);
    });
  });

  // ============================================================
  // Transaction Response
  // ============================================================

  describe('ShippoTransactionResponseSchema', () => {
    it('should validate successful transaction response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        object_owner: 'user@example.com',
        object_created: '2025-01-15T12:00:00Z',
        object_updated: '2025-01-15T12:00:00Z',
        was_test: true,
        rate: {
          object_id: mockData.uuid(),
          amount: '10.50',
          currency: 'USD',
          provider: 'USPS',
          servicelevel: {
            name: 'Priority Mail',
            token: 'usps_priority',
          },
        },
        tracking_number: '9400111899562537866471',
        tracking_status: 'UNKNOWN',
        tracking_url_provider: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899562537866471',
        eta: '2025-01-17T17:00:00Z',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/example-label.pdf',
        commercial_invoice_url: 'https://shippo-delivery.s3.amazonaws.com/example-invoice.pdf',
        metadata: 'order-123',
        test: true,
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate queued transaction response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'QUEUED' as const,
        object_status: 'QUEUED' as const,
        was_test: true,
        test: true,
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate failed transaction response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'ERROR' as const,
        object_status: 'ERROR' as const,
        was_test: true,
        messages: [
          {
            code: 'rate_expired',
            text: 'The rate has expired. Please create a new shipment.',
            type: 'ERROR' as const,
          },
        ],
        test: true,
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate transaction with QR code', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: false,
        tracking_number: '1Z999AA10123456784',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        qr_code_url: 'https://shippo-delivery.s3.amazonaws.com/qr-code.png',
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate international transaction with invoice', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: false,
        rate: {
          object_id: mockData.uuid(),
          amount: '45.00',
          currency: 'USD',
          provider: 'DHL',
          servicelevel: {
            name: 'DHL Express Worldwide',
            token: 'dhl_express_worldwide',
          },
        },
        tracking_number: 'JJD0000123456789',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        commercial_invoice_url: 'https://shippo-delivery.s3.amazonaws.com/invoice.pdf',
        customs_note: 'Gift items',
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate transaction with order reference', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: true,
        tracking_number: '9400111899562537866471',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        order: mockData.uuid(),
        submission_note: 'Handle with care',
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate transaction with multiple validation messages', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: true,
        tracking_number: '9400111899562537866471',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        messages: [
          {
            code: 'carrier_timeout',
            text: 'Carrier took longer than expected to respond',
            type: 'WARNING' as const,
          },
          {
            code: 'address_corrected',
            text: 'Destination address was corrected',
            type: 'INFO' as const,
          },
        ],
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate minimal success response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: true,
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });

    it('should validate transaction with all URLs', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'SUCCESS' as const,
        object_status: 'SUCCESS' as const,
        was_test: false,
        tracking_number: 'JJD0000123456789',
        tracking_url_provider: 'https://www.dhl.com/track?id=JJD0000123456789',
        label_url: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        commercial_invoice_url: 'https://shippo-delivery.s3.amazonaws.com/invoice.pdf',
        qr_code_url: 'https://shippo-delivery.s3.amazonaws.com/qr.png',
        eta: '2025-01-20T17:00:00Z',
      };
      expect(matchesSchema(ShippoTransactionResponseSchema, response)).toBe(true);
    });
  });
});
