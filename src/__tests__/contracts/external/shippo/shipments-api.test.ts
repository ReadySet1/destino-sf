/**
 * Shippo Shipments API Contract Tests
 *
 * Tests to ensure Shippo Shipments API responses conform to expected schemas.
 * These tests validate that our type definitions match Shippo's actual API responses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  ShippoAddressSchema,
  ShippoAddressValidationRequestSchema,
  ShippoAddressValidationResponseSchema,
  ShippoAddressValidationSchema,
  ShippoParcelSchema,
  ShippoRateSchema,
  ShippoServiceLevelSchema,
  ShippoShipmentRequestSchema,
  ShippoShipmentResponseSchema,
  ShippoShipmentExtraSchema,
  ShippoValidationMessageSchema,
  ShippoObjectStateSchema,
  ShippoDistanceUnitSchema,
  ShippoMassUnitSchema,
  ShippoDeliveryTimeTypeSchema,
} from '@/lib/api/schemas/external/shippo';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Shippo Shipments API Contract Tests', () => {
  // ============================================================
  // Enums
  // ============================================================

  describe('ShippoObjectStateSchema', () => {
    it('should validate all object states', () => {
      const states = ['VALID', 'INVALID', 'INCOMPLETE'];
      states.forEach(state => {
        expect(matchesSchema(ShippoObjectStateSchema, state)).toBe(true);
      });
    });

    it('should reject invalid state', () => {
      expect(matchesSchema(ShippoObjectStateSchema, 'PENDING')).toBe(false);
    });
  });

  describe('ShippoDistanceUnitSchema', () => {
    it('should validate all distance units', () => {
      const units = ['cm', 'in', 'ft', 'mm', 'm', 'yd'];
      units.forEach(unit => {
        expect(matchesSchema(ShippoDistanceUnitSchema, unit)).toBe(true);
      });
    });

    it('should reject invalid unit', () => {
      expect(matchesSchema(ShippoDistanceUnitSchema, 'km')).toBe(false);
    });
  });

  describe('ShippoMassUnitSchema', () => {
    it('should validate all mass units', () => {
      const units = ['g', 'oz', 'lb', 'kg'];
      units.forEach(unit => {
        expect(matchesSchema(ShippoMassUnitSchema, unit)).toBe(true);
      });
    });

    it('should reject invalid unit', () => {
      expect(matchesSchema(ShippoMassUnitSchema, 'ton')).toBe(false);
    });
  });

  // ============================================================
  // Address Validation
  // ============================================================

  describe('ShippoValidationMessageSchema', () => {
    it('should validate complete validation message', () => {
      const message = {
        source: 'Shippo Address Validator',
        code: 'address_corrected',
        text: 'The address was corrected',
        type: 'WARNING' as const,
      };
      expect(matchesSchema(ShippoValidationMessageSchema, message)).toBe(true);
    });

    it('should validate minimal message', () => {
      const message = {
        text: 'Address is valid',
      };
      expect(matchesSchema(ShippoValidationMessageSchema, message)).toBe(true);
    });
  });

  describe('ShippoAddressValidationSchema', () => {
    it('should validate address validation result', () => {
      const validation = {
        is_valid: true,
        messages: [
          {
            code: 'address_ok',
            text: 'Address is valid',
            type: 'INFO' as const,
          },
        ],
      };
      expect(matchesSchema(ShippoAddressValidationSchema, validation)).toBe(true);
    });

    it('should validate invalid address result', () => {
      const validation = {
        is_valid: false,
        messages: [
          {
            code: 'invalid_zip',
            text: 'ZIP code is invalid',
            type: 'ERROR' as const,
          },
        ],
      };
      expect(matchesSchema(ShippoAddressValidationSchema, validation)).toBe(true);
    });
  });

  // ============================================================
  // Address Types
  // ============================================================

  describe('ShippoAddressSchema', () => {
    it('should validate complete address', () => {
      const address = {
        object_id: mockData.uuid(),
        object_state: 'VALID' as const,
        name: 'John Doe',
        company: 'Destino SF',
        street1: '1234 Mission St',
        street2: 'Apt 5',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
        phone: '415-555-0100',
        email: 'john@example.com',
        is_residential: false,
        metadata: 'order-123',
        test: true,
        validation_results: {
          is_valid: true,
        },
      };
      expect(matchesSchema(ShippoAddressSchema, address)).toBe(true);
    });

    it('should validate minimal address', () => {
      const address = {
        name: 'Jane Smith',
        street1: '456 Market St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94103',
        country: 'US',
      };
      expect(matchesSchema(ShippoAddressSchema, address)).toBe(true);
    });

    it('should validate residential address', () => {
      const address = {
        name: 'Bob Johnson',
        street1: '789 Valencia St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94110',
        country: 'US',
        is_residential: true,
      };
      expect(matchesSchema(ShippoAddressSchema, address)).toBe(true);
    });
  });

  describe('ShippoAddressValidationRequestSchema', () => {
    it('should validate validation request', () => {
      const request = {
        name: 'Test User',
        street1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
        validate: true,
      };
      expect(matchesSchema(ShippoAddressValidationRequestSchema, request)).toBe(true);
    });
  });

  describe('ShippoAddressValidationResponseSchema', () => {
    it('should validate successful validation response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'VALID' as const,
        name: 'Test User',
        street1: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
        validation_results: {
          is_valid: true,
        },
        was_test: true,
      };
      expect(matchesSchema(ShippoAddressValidationResponseSchema, response)).toBe(true);
    });

    it('should validate response with corrected address', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'VALID' as const,
        name: 'Test User',
        street1: '123 Test St',
        street_no: '123',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
        validation_results: {
          is_valid: true,
          messages: [
            {
              code: 'address_corrected',
              text: 'Street number extracted',
              type: 'WARNING' as const,
            },
          ],
        },
        was_test: false,
      };
      expect(matchesSchema(ShippoAddressValidationResponseSchema, response)).toBe(true);
    });
  });

  // ============================================================
  // Parcel Types
  // ============================================================

  describe('ShippoParcelSchema', () => {
    it('should validate complete parcel', () => {
      const parcel = {
        object_id: mockData.uuid(),
        object_owner: 'user@example.com',
        length: '10',
        width: '8',
        height: '6',
        distance_unit: 'in' as const,
        weight: '2.5',
        mass_unit: 'lb' as const,
        value_amount: '50.00',
        value_currency: 'USD',
        metadata: 'order-456',
        test: true,
      };
      expect(matchesSchema(ShippoParcelSchema, parcel)).toBe(true);
    });

    it('should validate minimal parcel', () => {
      const parcel = {
        weight: '1.0',
        mass_unit: 'lb' as const,
      };
      expect(matchesSchema(ShippoParcelSchema, parcel)).toBe(true);
    });

    it('should validate parcel with template', () => {
      const parcel = {
        template: 'USPS_FlatRatePaddedEnvelope',
        weight: '1.5',
        mass_unit: 'lb' as const,
      };
      expect(matchesSchema(ShippoParcelSchema, parcel)).toBe(true);
    });
  });

  // ============================================================
  // Rate Types
  // ============================================================

  describe('ShippoServiceLevelSchema', () => {
    it('should validate service level', () => {
      const serviceLevel = {
        name: 'Priority Mail',
        token: 'usps_priority',
        terms: 'Delivery in 1-3 business days',
        extended_token: 'usps_priority_mail',
      };
      expect(matchesSchema(ShippoServiceLevelSchema, serviceLevel)).toBe(true);
    });
  });

  describe('ShippoRateSchema', () => {
    it('should validate complete rate', () => {
      const rate = {
        object_id: mockData.uuid(),
        object_owner: 'user@example.com',
        shipment: mockData.uuid(),
        attributes: ['CHEAPEST', 'FASTEST'],
        amount: '10.50',
        currency: 'USD',
        amount_local: '10.50',
        currency_local: 'USD',
        provider: 'USPS',
        provider_image_75: 'https://example.com/usps-75.png',
        provider_image_200: 'https://example.com/usps-200.png',
        servicelevel: {
          name: 'Priority Mail',
          token: 'usps_priority',
        },
        days: 2,
        arrives_by: '2025-01-17T17:00:00Z',
        duration_terms: '1-3 business days',
        trackable: true,
        insurance_amount: '100.00',
        insurance_currency: 'USD',
        delivery_time: {
          type: 'ESTIMATED' as const,
          datetime: '2025-01-17T17:00:00Z',
        },
        estimated_days: 2,
        test: true,
        zone: '4',
        carrier_account: mockData.uuid(),
        included_insurance_price: '0.00',
      };
      expect(matchesSchema(ShippoRateSchema, rate)).toBe(true);
    });

    it('should validate minimal rate', () => {
      const rate = {
        amount: '8.50',
        currency: 'USD',
        provider: 'USPS',
      };
      expect(matchesSchema(ShippoRateSchema, rate)).toBe(true);
    });

    it('should validate rate with guaranteed delivery', () => {
      const rate = {
        object_id: mockData.uuid(),
        amount: '25.00',
        currency: 'USD',
        provider: 'FedEx',
        servicelevel: {
          name: 'FedEx Standard Overnight',
          token: 'fedex_standard_overnight',
        },
        delivery_time: {
          type: 'GUARANTEED' as const,
          datetime: '2025-01-16T10:30:00Z',
        },
        days: 1,
        trackable: true,
      };
      expect(matchesSchema(ShippoRateSchema, rate)).toBe(true);
    });

    it('should validate rate with messages', () => {
      const rate = {
        object_id: mockData.uuid(),
        amount: '15.00',
        currency: 'USD',
        provider: 'UPS',
        messages: [
          {
            code: 'carrier_timeout',
            text: 'Rate calculation timed out',
            type: 'WARNING' as const,
          },
        ],
      };
      expect(matchesSchema(ShippoRateSchema, rate)).toBe(true);
    });
  });

  // ============================================================
  // Shipment Extra Fields
  // ============================================================

  describe('ShippoShipmentExtraSchema', () => {
    it('should validate shipment extras with insurance', () => {
      const extra = {
        signature_confirmation: 'STANDARD',
        insurance: {
          amount: '100.00',
          currency: 'USD',
          provider: 'Shippo',
          content: 'Electronics',
        },
        reference_1: 'ORDER-123',
        reference_2: 'CUSTOMER-456',
      };
      expect(matchesSchema(ShippoShipmentExtraSchema, extra)).toBe(true);
    });

    it('should validate USPS-specific attributes', () => {
      const extra = {
        saturday_delivery: true,
        usps_attrs: {
          usps_sort_type: 'MixedBMC',
          usps_package_efficiency: 'bulk',
        },
      };
      expect(matchesSchema(ShippoShipmentExtraSchema, extra)).toBe(true);
    });

    it('should validate FedEx-specific attributes', () => {
      const extra = {
        fedex_attrs: {
          fedex_freight_billing: 'SENDER',
          fedex_transit_time: '1_DAY',
        },
      };
      expect(matchesSchema(ShippoShipmentExtraSchema, extra)).toBe(true);
    });

    it('should validate UPS-specific attributes', () => {
      const extra = {
        ups_attrs: {
          ups_billing_option: 'PREPAID',
          ups_duty_payment: 'SENDER',
        },
      };
      expect(matchesSchema(ShippoShipmentExtraSchema, extra)).toBe(true);
    });

    it('should validate delivery confirmation', () => {
      const extra = {
        delivery_confirmation: 'ADULT_SIGNATURE',
        bypass_address_validation: false,
        request_retail_rates: true,
      };
      expect(matchesSchema(ShippoShipmentExtraSchema, extra)).toBe(true);
    });
  });

  // ============================================================
  // Shipment Request & Response
  // ============================================================

  describe('ShippoShipmentRequestSchema', () => {
    it('should validate complete shipment request with address objects', () => {
      const request = {
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
        parcels: [
          {
            length: '10',
            width: '8',
            height: '6',
            distance_unit: 'in' as const,
            weight: '2.5',
            mass_unit: 'lb' as const,
          },
        ],
        shipment_date: '2025-01-15T12:00:00Z',
        extra: {
          insurance: {
            amount: '50.00',
            currency: 'USD',
          },
        },
        async: false,
        metadata: 'order-789',
      };
      expect(matchesSchema(ShippoShipmentRequestSchema, request)).toBe(true);
    });

    it('should validate shipment request with address IDs', () => {
      const request = {
        address_from: mockData.uuid(),
        address_to: mockData.uuid(),
        parcels: [mockData.uuid()],
      };
      expect(matchesSchema(ShippoShipmentRequestSchema, request)).toBe(true);
    });

    it('should validate shipment request with return address', () => {
      const request = {
        address_from: mockData.uuid(),
        address_to: mockData.uuid(),
        address_return: {
          name: 'Returns Department',
          street1: '1234 Mission St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        },
        parcels: [mockData.uuid()],
      };
      expect(matchesSchema(ShippoShipmentRequestSchema, request)).toBe(true);
    });

    it('should validate shipment request with customs', () => {
      const request = {
        address_from: mockData.uuid(),
        address_to: mockData.uuid(),
        parcels: [mockData.uuid()],
        customs_declaration: mockData.uuid(),
      };
      expect(matchesSchema(ShippoShipmentRequestSchema, request)).toBe(true);
    });
  });

  describe('ShippoShipmentResponseSchema', () => {
    it('should validate successful shipment response', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'VALID' as const,
        object_owner: 'user@example.com',
        object_created: '2025-01-15T12:00:00Z',
        object_updated: '2025-01-15T12:00:00Z',
        was_test: true,
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
        parcels: [
          {
            object_id: mockData.uuid(),
            length: '10',
            width: '8',
            height: '6',
            distance_unit: 'in' as const,
            weight: '2.5',
            mass_unit: 'lb' as const,
          },
        ],
        rates: [
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
        messages: [],
      };
      expect(matchesSchema(ShippoShipmentResponseSchema, response)).toBe(true);
    });

    it('should validate shipment response with errors', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'INVALID' as const,
        was_test: true,
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
          street1: 'Invalid Address',
          city: 'San Francisco',
          state: 'CA',
          zip: '00000',
          country: 'US',
        },
        parcels: [],
        rates: [],
        messages: [
          {
            code: 'invalid_address',
            text: 'The destination address is invalid',
            type: 'ERROR' as const,
          },
        ],
      };
      expect(matchesSchema(ShippoShipmentResponseSchema, response)).toBe(true);
    });

    it('should validate shipment response with multiple rates', () => {
      const response = {
        object_id: mockData.uuid(),
        object_state: 'VALID' as const,
        was_test: false,
        address_from: {
          name: 'Sender',
          street1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        },
        address_to: {
          name: 'Recipient',
          street1: '456 Market St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001',
          country: 'US',
        },
        parcels: [
          {
            weight: '2.5',
            mass_unit: 'lb' as const,
          },
        ],
        rates: [
          {
            object_id: mockData.uuid(),
            amount: '8.50',
            currency: 'USD',
            provider: 'USPS',
            servicelevel: { name: 'Priority Mail', token: 'usps_priority' },
            days: 2,
          },
          {
            object_id: mockData.uuid(),
            amount: '25.00',
            currency: 'USD',
            provider: 'FedEx',
            servicelevel: { name: 'FedEx 2Day', token: 'fedex_2_day' },
            days: 2,
          },
          {
            object_id: mockData.uuid(),
            amount: '30.00',
            currency: 'USD',
            provider: 'UPS',
            servicelevel: { name: 'UPS Next Day Air', token: 'ups_next_day_air' },
            days: 1,
          },
        ],
      };
      expect(matchesSchema(ShippoShipmentResponseSchema, response)).toBe(true);
    });
  });
});
