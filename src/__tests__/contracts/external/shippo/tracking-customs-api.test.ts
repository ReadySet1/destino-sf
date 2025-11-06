/**
 * Shippo Tracking & Customs API Contract Tests
 *
 * Tests to ensure Shippo Tracking and Customs API responses conform to expected schemas.
 * These tests validate that our type definitions match Shippo's actual API responses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ShippoTrackSchema,
  ShippoTrackingStatusSchema,
  ShippoTrackingStatusDetailSchema,
  ShippoTrackingUpdateSchema,
  ShippoTrackingSubstatusSchema,
  ShippoLocationSchema,
  ShippoCustomsDeclarationSchema,
  ShippoCustomsItemSchema,
  ShippoContentsTypeSchema,
  ShippoNonDeliveryOptionSchema,
  ShippoMassUnitSchema,
  ShippoAddressSchema,
  ShippoServiceLevelSchema,
  ShippoErrorSchema,
  ShippingLabelResponseSchema,
  ShippoApiResponseSchema,
  ShippoRateResponseSchema,
} from '@/lib/api/schemas/external/shippo';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Shippo Tracking & Customs API Contract Tests', () => {
  // ============================================================
  // Tracking Enums
  // ============================================================

  describe('ShippoTrackingStatusSchema', () => {
    it('should validate all tracking statuses', () => {
      const statuses = ['UNKNOWN', 'DELIVERED', 'TRANSIT', 'FAILURE', 'RETURNED'];
      statuses.forEach(status => {
        expect(matchesSchema(ShippoTrackingStatusSchema, status)).toBe(true);
      });
    });

    it('should reject invalid status', () => {
      expect(matchesSchema(ShippoTrackingStatusSchema, 'PENDING')).toBe(false);
    });
  });

  // ============================================================
  // Location & Substatus
  // ============================================================

  describe('ShippoLocationSchema', () => {
    it('should validate complete location', () => {
      const location = {
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      };
      expect(matchesSchema(ShippoLocationSchema, location)).toBe(true);
    });

    it('should validate minimal location', () => {
      const location = {
        city: 'San Francisco',
      };
      expect(matchesSchema(ShippoLocationSchema, location)).toBe(true);
    });

    it('should validate international location', () => {
      const location = {
        city: 'London',
        country: 'GB',
      };
      expect(matchesSchema(ShippoLocationSchema, location)).toBe(true);
    });
  });

  describe('ShippoTrackingSubstatusSchema', () => {
    it('should validate substatus with action required', () => {
      const substatus = {
        code: 'delivery_attempted',
        text: 'Delivery attempted - recipient not available',
        action_required: true,
      };
      expect(matchesSchema(ShippoTrackingSubstatusSchema, substatus)).toBe(true);
    });

    it('should validate substatus without action', () => {
      const substatus = {
        code: 'out_for_delivery',
        text: 'Out for delivery',
        action_required: false,
      };
      expect(matchesSchema(ShippoTrackingSubstatusSchema, substatus)).toBe(true);
    });
  });

  // ============================================================
  // Tracking Status & Updates
  // ============================================================

  describe('ShippoTrackingStatusDetailSchema', () => {
    it('should validate complete tracking status detail', () => {
      const statusDetail = {
        object_created: '2025-01-15T10:00:00Z',
        object_updated: '2025-01-15T10:00:00Z',
        object_id: mockData.uuid(),
        status: 'TRANSIT' as const,
        status_details: 'Package in transit',
        status_date: '2025-01-15T09:30:00Z',
        substatus: {
          code: 'in_transit',
          text: 'Package is in transit to destination',
          action_required: false,
        },
        location: {
          city: 'Oakland',
          state: 'CA',
          zip: '94601',
          country: 'US',
        },
      };
      expect(matchesSchema(ShippoTrackingStatusDetailSchema, statusDetail)).toBe(true);
    });

    it('should validate minimal status detail', () => {
      const statusDetail = {
        status: 'UNKNOWN' as const,
      };
      expect(matchesSchema(ShippoTrackingStatusDetailSchema, statusDetail)).toBe(true);
    });

    it('should validate delivered status', () => {
      const statusDetail = {
        status: 'DELIVERED' as const,
        status_details: 'Delivered to front door',
        status_date: '2025-01-17T14:30:00Z',
        location: {
          city: 'San Francisco',
          state: 'CA',
          zip: '94103',
          country: 'US',
        },
      };
      expect(matchesSchema(ShippoTrackingStatusDetailSchema, statusDetail)).toBe(true);
    });
  });

  describe('ShippoTrackingUpdateSchema', () => {
    it('should validate tracking update', () => {
      const update = {
        object_created: '2025-01-15T08:00:00Z',
        object_updated: '2025-01-15T08:00:00Z',
        object_id: mockData.uuid(),
        status: 'Departed USPS Regional Facility',
        status_details: 'Package departed sorting facility',
        status_date: '2025-01-15T07:45:00Z',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };
      expect(matchesSchema(ShippoTrackingUpdateSchema, update)).toBe(true);
    });

    it('should validate minimal update', () => {
      const update = {
        status: 'Package received',
      };
      expect(matchesSchema(ShippoTrackingUpdateSchema, update)).toBe(true);
    });
  });

  // ============================================================
  // Complete Tracking
  // ============================================================

  describe('ShippoTrackSchema', () => {
    it('should validate complete tracking information', () => {
      const track = {
        carrier: 'usps',
        tracking_number: '9400111899562537866471',
        address_from: {
          name: 'Destino SF',
          street1: '1234 Mission St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        },
        address_to: {
          name: 'John Doe',
          street1: '456 Market St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94103',
          country: 'US',
        },
        eta: '2025-01-17T17:00:00Z',
        servicelevel: {
          name: 'Priority Mail',
          token: 'usps_priority',
        },
        tracking_status: {
          status: 'TRANSIT' as const,
          status_details: 'In transit to destination',
          status_date: '2025-01-15T10:00:00Z',
          location: {
            city: 'Oakland',
            state: 'CA',
            country: 'US',
          },
        },
        tracking_history: [
          {
            status: 'Departed USPS Regional Facility',
            status_date: '2025-01-15T07:00:00Z',
            location: {
              city: 'San Francisco',
              state: 'CA',
              country: 'US',
            },
          },
          {
            status: 'Arrived at USPS Regional Facility',
            status_date: '2025-01-14T22:00:00Z',
            location: {
              city: 'San Francisco',
              state: 'CA',
              country: 'US',
            },
          },
        ],
        transaction: mockData.uuid(),
        test: true,
      };
      expect(matchesSchema(ShippoTrackSchema, track)).toBe(true);
    });

    it('should validate minimal tracking', () => {
      const track = {
        carrier: 'usps',
        tracking_number: '9400111899562537866471',
      };
      expect(matchesSchema(ShippoTrackSchema, track)).toBe(true);
    });

    it('should validate tracking with delivered status', () => {
      const track = {
        carrier: 'fedex',
        tracking_number: '123456789012',
        tracking_status: {
          status: 'DELIVERED' as const,
          status_details: 'Delivered - Left at front door',
          status_date: '2025-01-16T14:30:00Z',
          location: {
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            country: 'US',
          },
        },
        test: false,
      };
      expect(matchesSchema(ShippoTrackSchema, track)).toBe(true);
    });

    it('should validate tracking with failure status', () => {
      const track = {
        carrier: 'ups',
        tracking_number: '1Z999AA10123456784',
        tracking_status: {
          status: 'FAILURE' as const,
          status_details: 'Delivery failed - incorrect address',
          status_date: '2025-01-16T10:00:00Z',
          substatus: {
            code: 'address_error',
            text: 'Address incomplete or incorrect',
            action_required: true,
          },
        },
        tracking_history: [
          {
            status: 'Delivery attempted',
            status_date: '2025-01-16T09:45:00Z',
          },
          {
            status: 'Out for delivery',
            status_date: '2025-01-16T08:00:00Z',
          },
        ],
      };
      expect(matchesSchema(ShippoTrackSchema, track)).toBe(true);
    });
  });

  // ============================================================
  // Customs Enums
  // ============================================================

  describe('ShippoContentsTypeSchema', () => {
    it('should validate all contents types', () => {
      const types = [
        'DOCUMENTS',
        'GIFT',
        'SAMPLE',
        'MERCHANDISE',
        'HUMANITARIAN_DONATION',
        'RETURN_MERCHANDISE',
        'OTHER',
      ];
      types.forEach(type => {
        expect(matchesSchema(ShippoContentsTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid contents type', () => {
      expect(matchesSchema(ShippoContentsTypeSchema, 'PERSONAL_USE')).toBe(false);
    });
  });

  describe('ShippoNonDeliveryOptionSchema', () => {
    it('should validate non-delivery options', () => {
      const options = ['ABANDON', 'RETURN'];
      options.forEach(option => {
        expect(matchesSchema(ShippoNonDeliveryOptionSchema, option)).toBe(true);
      });
    });

    it('should reject invalid option', () => {
      expect(matchesSchema(ShippoNonDeliveryOptionSchema, 'DESTROY')).toBe(false);
    });
  });

  // ============================================================
  // Customs Items
  // ============================================================

  describe('ShippoCustomsItemSchema', () => {
    it('should validate complete customs item', () => {
      const item = {
        object_id: mockData.uuid(),
        description: 'Argentinian Alfajores Cookies',
        quantity: 12,
        net_weight: '1.5',
        mass_unit: 'lb' as const,
        value_amount: '48.00',
        value_currency: 'USD',
        origin_country: 'AR',
        tariff_number: '1905.90',
        sku: 'ALFAJ-12PK',
        hs_code: '190590',
        metadata: 'product-123',
        test: true,
      };
      expect(matchesSchema(ShippoCustomsItemSchema, item)).toBe(true);
    });

    it('should validate minimal customs item', () => {
      const item = {
        description: 'Food items',
        quantity: 1,
      };
      expect(matchesSchema(ShippoCustomsItemSchema, item)).toBe(true);
    });

    it('should validate item with HS code', () => {
      const item = {
        description: 'Cookies',
        quantity: 24,
        net_weight: '3.0',
        mass_unit: 'lb' as const,
        value_amount: '96.00',
        value_currency: 'USD',
        origin_country: 'AR',
        hs_code: '190590',
      };
      expect(matchesSchema(ShippoCustomsItemSchema, item)).toBe(true);
    });
  });

  // ============================================================
  // Customs Declaration
  // ============================================================

  describe('ShippoCustomsDeclarationSchema', () => {
    it('should validate complete customs declaration', () => {
      const declaration = {
        object_id: mockData.uuid(),
        contents_type: 'MERCHANDISE' as const,
        contents_explanation: 'Argentinian food products',
        non_delivery_option: 'RETURN' as const,
        certify: true,
        certify_signer: 'John Smith',
        items: [
          {
            description: 'Alfajores cookies',
            quantity: 12,
            net_weight: '1.5',
            mass_unit: 'lb' as const,
            value_amount: '48.00',
            value_currency: 'USD',
            origin_country: 'AR',
            hs_code: '190590',
          },
          {
            description: 'Empanadas',
            quantity: 6,
            net_weight: '2.0',
            mass_unit: 'lb' as const,
            value_amount: '30.00',
            value_currency: 'USD',
            origin_country: 'AR',
            hs_code: '160250',
          },
        ],
        notes: 'Handle with care - food products',
        eel_pfc: 'NOEEI 30.37(a)',
        incoterm: 'DAP',
        metadata: 'shipment-789',
        test: true,
      };
      expect(matchesSchema(ShippoCustomsDeclarationSchema, declaration)).toBe(true);
    });

    it('should validate gift declaration', () => {
      const declaration = {
        contents_type: 'GIFT' as const,
        contents_explanation: 'Birthday gift',
        non_delivery_option: 'RETURN' as const,
        certify: true,
        certify_signer: 'Jane Doe',
        items: [
          {
            description: 'Gift basket',
            quantity: 1,
            value_amount: '75.00',
            value_currency: 'USD',
            origin_country: 'US',
          },
        ],
      };
      expect(matchesSchema(ShippoCustomsDeclarationSchema, declaration)).toBe(true);
    });

    it('should validate documents declaration', () => {
      const declaration = {
        contents_type: 'DOCUMENTS' as const,
        non_delivery_option: 'ABANDON' as const,
        certify: true,
        certify_signer: 'Office Manager',
      };
      expect(matchesSchema(ShippoCustomsDeclarationSchema, declaration)).toBe(true);
    });

    it('should validate sample declaration', () => {
      const declaration = {
        contents_type: 'SAMPLE' as const,
        contents_explanation: 'Product samples for trade show',
        non_delivery_option: 'ABANDON' as const,
        certify: true,
        certify_signer: 'Sales Manager',
        items: [
          {
            description: 'Sample products',
            quantity: 5,
            net_weight: '1.0',
            mass_unit: 'kg' as const,
            value_amount: '25.00',
            value_currency: 'USD',
            origin_country: 'US',
          },
        ],
        notes: 'Not for resale',
      };
      expect(matchesSchema(ShippoCustomsDeclarationSchema, declaration)).toBe(true);
    });
  });

  // ============================================================
  // Error Types
  // ============================================================

  describe('ShippoErrorSchema', () => {
    it('should validate rate expired error', () => {
      const error = {
        type: 'RATE_EXPIRED' as const,
        rateId: mockData.uuid(),
        message: 'The selected rate has expired',
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });

    it('should validate API initialization error', () => {
      const error = {
        type: 'API_INITIALIZATION' as const,
        message: 'Failed to initialize Shippo API client',
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });

    it('should validate transaction failed error', () => {
      const error = {
        type: 'TRANSACTION_FAILED' as const,
        details: 'Label purchase failed',
        messages: [
          {
            text: 'Insufficient funds in carrier account',
            type: 'ERROR',
          },
        ],
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });

    it('should validate network error', () => {
      const error = {
        type: 'NETWORK_ERROR' as const,
        message: 'Connection timeout',
        statusCode: 504,
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });

    it('should validate validation error', () => {
      const error = {
        type: 'VALIDATION_ERROR' as const,
        field: 'address_to.zip',
        message: 'ZIP code is required',
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });

    it('should validate retry exhausted error', () => {
      const error = {
        type: 'RETRY_EXHAUSTED' as const,
        attempts: 3,
        lastError: 'Rate limit exceeded',
      };
      expect(matchesSchema(ShippoErrorSchema, error)).toBe(true);
    });
  });

  // ============================================================
  // API Response Types
  // ============================================================

  describe('ShippingLabelResponseSchema', () => {
    it('should validate successful label response', () => {
      const response = {
        success: true,
        labelUrl: 'https://shippo-delivery.s3.amazonaws.com/label.pdf',
        trackingNumber: '9400111899562537866471',
      };
      expect(matchesSchema(ShippingLabelResponseSchema, response)).toBe(true);
    });

    it('should validate failed label response', () => {
      const response = {
        success: false,
        error: 'Rate has expired',
        errorCode: 'RATE_EXPIRED',
        retryAttempt: 1,
      };
      expect(matchesSchema(ShippingLabelResponseSchema, response)).toBe(true);
    });
  });

  describe('ShippoRateResponseSchema', () => {
    it('should validate rate response with pagination', () => {
      const response = {
        results: [
          {
            object_id: mockData.uuid(),
            amount: '10.50',
            currency: 'USD',
            provider: 'USPS',
            servicelevel: {
              name: 'Priority Mail',
              token: 'usps_priority',
            },
          },
        ],
        next: 'https://api.goshippo.com/rates/?page=2',
        count: 5,
      };
      expect(matchesSchema(ShippoRateResponseSchema, response)).toBe(true);
    });
  });
});
