import { formatPrice, formatDateTime, formatCurrency } from '@/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format currency with proper locale', () => {
      expect(formatCurrency(1299.99)).toBe('$1,299.99');
      expect(formatCurrency(500.5)).toBe('$500.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle null and undefined values', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
    });

    it('should handle NaN values gracefully', () => {
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    it('should format large amounts correctly', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(123456.789)).toBe('$123,456.79');
    });
  });

  describe('formatPrice', () => {
    it('should format numeric prices correctly', () => {
      expect(formatPrice(12.99)).toBe('$12.99');
      expect(formatPrice(5)).toBe('$5.00');
      expect(formatPrice(0)).toBe('$0.00');
    });

    it('should handle null and undefined values', () => {
      expect(formatPrice(null)).toBe('$0.00');
      expect(formatPrice(undefined)).toBe('$0.00');
    });

    it('should format without currency symbol when requested', () => {
      expect(formatPrice(12.99, false)).toBe('12.99');
      expect(formatPrice(5, false)).toBe('5.00');
    });

    it('should handle NaN values gracefully', () => {
      expect(formatPrice(NaN)).toBe('$0.00');
    });

    it('should handle string numeric values', () => {
      expect(formatPrice('12.99')).toBe('$12.99');
    });
  });

  describe('formatDateTime', () => {
    it('should format Date objects correctly', () => {
      const testDate = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(testDate);
      expect(result).toMatch(/Jan 15, 2024/);
      expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
    });

    it('should format string dates correctly', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('should handle null and undefined values', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatDateTime('invalid-date')).toBe('N/A');
      expect(formatDateTime('')).toBe('N/A');
    });

    it('should handle edge case dates', () => {
      const result = formatDateTime(new Date('2024-12-31T23:59:59Z'));
      expect(result).toMatch(/Dec 31, 2024/);
    });
  });
});
