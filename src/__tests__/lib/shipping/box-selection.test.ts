/**
 * Tests for USPS Flat Rate Box Selection Logic
 */

import {
  selectBoxTemplateSync,
  getBoxDisplayName,
  validateFlatRateEligibility,
  type BoxConfig,
} from '@/lib/shipping/box-selection';

describe('Box Selection Logic', () => {
  describe('selectBoxTemplateSync', () => {
    it('should select small box for light orders with few items', () => {
      const result = selectBoxTemplateSync(2.5, 2);
      expect(result.boxSize).toBe('small');
      expect(result.template).toBe('USPS_SmallFlatRateBox');
    });

    it('should select medium box when weight exceeds small box limit', () => {
      const result = selectBoxTemplateSync(5.0, 4);
      expect(result.boxSize).toBe('medium');
      expect(result.template).toBe('USPS_MediumFlatRateBox1');
    });

    it('should select medium box when item count exceeds small box limit', () => {
      const result = selectBoxTemplateSync(2.0, 5);
      expect(result.boxSize).toBe('medium');
      expect(result.template).toBe('USPS_MediumFlatRateBox1');
    });

    it('should select large box for heavy orders', () => {
      const result = selectBoxTemplateSync(15.0, 10);
      expect(result.boxSize).toBe('large');
      expect(result.template).toBe('USPS_LargeFlatRateBox');
    });

    it('should select large box when item count exceeds medium box limit', () => {
      const result = selectBoxTemplateSync(5.0, 10);
      expect(result.boxSize).toBe('large');
      expect(result.template).toBe('USPS_LargeFlatRateBox');
    });

    it('should select large box for orders exceeding all limits', () => {
      const result = selectBoxTemplateSync(25.0, 15);
      expect(result.boxSize).toBe('large');
      expect(result.template).toBe('USPS_LargeFlatRateBox');
      expect(result.reason).toContain('largest available box');
    });

    it('should handle edge case at small box weight limit', () => {
      const result = selectBoxTemplateSync(3.0, 2);
      expect(result.boxSize).toBe('small');
    });

    it('should select medium when exactly at small weight limit but over item count', () => {
      const result = selectBoxTemplateSync(3.0, 3);
      expect(result.boxSize).toBe('medium');
    });

    it('should handle edge case at medium box limits', () => {
      const result = selectBoxTemplateSync(10.0, 6);
      expect(result.boxSize).toBe('medium');
    });

    it('should select large when exactly at medium limits but over item count', () => {
      const result = selectBoxTemplateSync(10.0, 7);
      expect(result.boxSize).toBe('large');
    });
  });

  describe('getBoxDisplayName', () => {
    it('should return correct display name for small box', () => {
      expect(getBoxDisplayName('USPS_SmallFlatRateBox')).toBe('USPS Small Flat Rate Box');
    });

    it('should return correct display name for medium box', () => {
      expect(getBoxDisplayName('USPS_MediumFlatRateBox1')).toBe('USPS Medium Flat Rate Box');
    });

    it('should return correct display name for side-loading medium box', () => {
      expect(getBoxDisplayName('USPS_MediumFlatRateBox2')).toBe(
        'USPS Medium Flat Rate Box (Side-Loading)'
      );
    });

    it('should return correct display name for large box', () => {
      expect(getBoxDisplayName('USPS_LargeFlatRateBox')).toBe('USPS Large Flat Rate Box');
    });

    it('should return correct display name for board game box', () => {
      expect(getBoxDisplayName('USPS_LargeFlatRateBoardGameBox')).toBe(
        'USPS Large Flat Rate Board Game Box'
      );
    });

    it('should return template string for unknown templates', () => {
      expect(getBoxDisplayName('Unknown_Template')).toBe('Unknown_Template');
    });
  });

  describe('validateFlatRateEligibility', () => {
    it('should return eligible for orders within limits', () => {
      const result = validateFlatRateEligibility(10.0, 6);
      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('eligible');
    });

    it('should return ineligible for orders exceeding USPS max weight', () => {
      const result = validateFlatRateEligibility(75.0, 5);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('exceeds USPS flat rate limit');
    });

    it('should return ineligible for very heavy orders', () => {
      // 20 * 1.5 = 30 lbs - significantly over largest box
      const result = validateFlatRateEligibility(35.0, 10);
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('significantly exceeds');
    });

    it('should return eligible for orders at large box weight limit', () => {
      const result = validateFlatRateEligibility(20.0, 12);
      expect(result.eligible).toBe(true);
    });

    it('should return eligible for orders slightly over large box limit but under USPS max', () => {
      // 25 lbs is under 20 * 1.5 = 30, so still eligible
      const result = validateFlatRateEligibility(25.0, 15);
      expect(result.eligible).toBe(true);
    });
  });

  describe('Weight calculation scenarios', () => {
    // Test realistic order scenarios

    it('should select small box for 1 alfajor pack (1.8 lbs)', () => {
      const weight = 1 * 1.8; // 1.8 lbs
      const result = selectBoxTemplateSync(weight, 1);
      expect(result.boxSize).toBe('small');
    });

    it('should select small box for 1 empanada pack (1.6 lbs)', () => {
      const weight = 1 * 1.6; // 1.6 lbs
      const result = selectBoxTemplateSync(weight, 1);
      expect(result.boxSize).toBe('small');
    });

    it('should select medium box for 2 alfajor + 2 empanada (6.8 lbs, 4 items)', () => {
      const weight = 2 * 1.8 + 2 * 1.6; // 6.8 lbs
      const result = selectBoxTemplateSync(weight, 4);
      expect(result.boxSize).toBe('medium');
    });

    it('should select large box for 5 alfajor + 5 empanada (17 lbs, 10 items)', () => {
      const weight = 5 * 1.8 + 5 * 1.6; // 17 lbs
      const result = selectBoxTemplateSync(weight, 10);
      expect(result.boxSize).toBe('large');
    });

    it('should select medium box for 3 alfajor + 2 sauce (6.2 lbs, 5 items)', () => {
      const weight = 3 * 1.8 + 2 * 0.9; // 6.2 lbs
      const result = selectBoxTemplateSync(weight, 5);
      expect(result.boxSize).toBe('medium');
    });
  });

  describe('Box selection prioritizes smallest fitting box', () => {
    // Ensure we always select the smallest box that fits

    it('should not select large when medium fits', () => {
      // 8 lbs and 5 items fits in medium
      const result = selectBoxTemplateSync(8.0, 5);
      expect(result.boxSize).toBe('medium');
      expect(result.boxSize).not.toBe('large');
    });

    it('should not select medium when small fits', () => {
      // 2 lbs and 2 items fits in small
      const result = selectBoxTemplateSync(2.0, 2);
      expect(result.boxSize).toBe('small');
      expect(result.boxSize).not.toBe('medium');
    });
  });
});
