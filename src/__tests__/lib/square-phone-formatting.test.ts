/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { formatPhoneForSquarePaymentLink, formatPhoneForSquare } from '@/lib/square/formatting';

describe('Square Phone Number Formatting', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('formatPhoneForSquarePaymentLink', () => {
    it('should format valid US phone numbers correctly', () => {
      const result = formatPhoneForSquarePaymentLink('415-123-4567');
      expect(result).toBe('+14151234567');
    });

    it('should handle 11-digit US numbers starting with 1', () => {
      const result = formatPhoneForSquarePaymentLink('14151234567');
      expect(result).toBe('+14151234567');
    });

    it('should handle phone numbers with country code already', () => {
      const result = formatPhoneForSquarePaymentLink('+14151234567');
      expect(result).toBe('+14151234567');
    });

    it('should reject invalid area codes (000-009)', () => {
      const invalidAreaCodes = [
        '000',
        '001',
        '002',
        '003',
        '004',
        '005',
        '006',
        '007',
        '008',
        '009',
      ];

      invalidAreaCodes.forEach(areaCode => {
        const result = formatPhoneForSquarePaymentLink(`${areaCode}1234567`);
        expect(result).toBeNull();
      });
    });

    it('should reject special service area codes', () => {
      const serviceAreaCodes = [
        '911',
        '555',
        '800',
        '888',
        '877',
        '866',
        '855',
        '844',
        '833',
        '822',
      ];

      serviceAreaCodes.forEach(areaCode => {
        const result = formatPhoneForSquarePaymentLink(`${areaCode}1234567`);
        expect(result).toBeNull();
      });
    });

    it('should handle phones with formatting characters', () => {
      const result = formatPhoneForSquarePaymentLink('(415) 123-4567');
      expect(result).toBe('+14151234567');
    });

    it('should handle the problematic phone number from the logs', () => {
      const result = formatPhoneForSquarePaymentLink('415-123-2323');
      expect(result).toBe('+14151232323');
    });

    it('should return null for phones that are too short', () => {
      const result = formatPhoneForSquarePaymentLink('123456');
      expect(result).toBeNull();
    });

    it('should return null for phones that are too long', () => {
      const result = formatPhoneForSquarePaymentLink('12345678901234567');
      expect(result).toBeNull();
    });

    it('should return null for empty or invalid input', () => {
      expect(formatPhoneForSquarePaymentLink('')).toBeNull();
      expect(formatPhoneForSquarePaymentLink('abc')).toBeNull();
      expect(formatPhoneForSquarePaymentLink('123-abc-4567')).toBeNull();
    });

    it('should handle international numbers correctly', () => {
      const result = formatPhoneForSquarePaymentLink('+44 20 7946 0958');
      expect(result).toBe('+442079460958');
    });

    it('should reject numbers starting with 0 (invalid country codes)', () => {
      const result = formatPhoneForSquarePaymentLink('+01234567890');
      expect(result).toBeNull();
    });
  });

  describe('formatPhoneForSquare (base function)', () => {
    it('should format 10-digit US numbers', () => {
      const result = formatPhoneForSquare('4151234567');
      expect(result).toBe('+14151234567');
    });

    it('should format 11-digit US numbers starting with 1', () => {
      const result = formatPhoneForSquare('14151234567');
      expect(result).toBe('+14151234567');
    });

    it('should handle already formatted international numbers', () => {
      const result = formatPhoneForSquare('+442079460958');
      expect(result).toBe('+442079460958');
    });

    it('should throw error for invalid phone lengths without country code', () => {
      expect(() => formatPhoneForSquare('123456')).toThrow('Invalid phone number');
      expect(() => formatPhoneForSquare('12345678901234567')).toThrow('Invalid phone number');
    });

    it('should throw error for numbers starting with 0', () => {
      expect(() => formatPhoneForSquare('+01234567890')).toThrow(
        'Invalid phone number: country codes cannot start with 0'
      );
    });

    it('should throw error for unclear format', () => {
      expect(() => formatPhoneForSquare('123456789')).toThrow('Phone number format unclear');
    });

    it('should throw error for empty input', () => {
      expect(() => formatPhoneForSquare('')).toThrow('Phone number is required');
    });
  });

  describe('Sandbox Environment Behavior', () => {
    beforeEach(() => {
      process.env.USE_SQUARE_SANDBOX = 'true';
    });

    it('should format phone numbers for Square sandbox requirements', () => {
      // Mock console.log to capture the formatting message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = formatPhoneForSquare('415-123-4567');

      // Should return a sandbox-formatted number
      expect(result).toMatch(/^\+1\d{3}555\d{4}$/);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sandbox: Phone formatted'));

      consoleSpy.mockRestore();
    });

    it('should handle invalid area codes in sandbox mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = formatPhoneForSquare('000-123-4567');

      // Should use default area code (425) for invalid input
      expect(result).toBe('+14255551234');

      consoleSpy.mockRestore();
    });
  });

  describe('Production Environment Behavior', () => {
    beforeEach(() => {
      process.env.USE_SQUARE_SANDBOX = 'false';
    });

    it('should use production formatting for valid numbers', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = formatPhoneForSquare('415-123-4567');

      expect(result).toBe('+14151234567');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Production: Using email as provided')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully in payment link function', () => {
      expect(formatPhoneForSquarePaymentLink(null as any)).toBeNull();
      expect(formatPhoneForSquarePaymentLink(undefined as any)).toBeNull();
    });

    it('should handle numbers with excessive formatting', () => {
      const result = formatPhoneForSquarePaymentLink('+1 (415) 123-4567 ext. 123');
      expect(result).toBe('+14151234567');
    });

    it('should maintain phone number validation for payment links', () => {
      // Test the specific validation that caused the original error
      const validPhone = formatPhoneForSquarePaymentLink('415-123-2323');
      expect(validPhone).toBe('+14151232323');

      // Test that invalid phones are rejected
      const invalidPhone = formatPhoneForSquarePaymentLink('555-123-4567');
      expect(invalidPhone).toBeNull();
    });

    it('should log warnings for rejected phone numbers', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      formatPhoneForSquarePaymentLink('555-123-4567');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('has potentially invalid area code 555 for Square payment links')
      );

      consoleSpy.mockRestore();
    });
  });
});
