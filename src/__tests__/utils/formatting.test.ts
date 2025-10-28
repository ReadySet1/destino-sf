import { formatPrice, formatDateTime, formatCurrency } from '../../utils/formatting';

// Mock the logger to suppress console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../utils/logger';

describe.skip('Formatting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Currency Formatting', () => {
    describe('formatPrice', () => {
      describe('Basic price formatting', () => {
        test('should format numbers with currency symbol by default', () => {
          expect(formatPrice(10)).toBe('$10.00');
          expect(formatPrice(25.99)).toBe('$25.99');
          expect(formatPrice(0)).toBe('$0.00');
          expect(formatPrice(999.5)).toBe('$999.50');
        });

        test('should format numbers without currency symbol when specified', () => {
          expect(formatPrice(10, false)).toBe('10.00');
          expect(formatPrice(25.99, false)).toBe('25.99');
          expect(formatPrice(0, false)).toBe('0.00');
        });

        test('should handle large numbers correctly', () => {
          expect(formatPrice(1234567.89)).toBe('$1234567.89');
          expect(formatPrice(999999.99)).toBe('$999999.99');
        });

        test('should handle small decimal amounts', () => {
          expect(formatPrice(0.01)).toBe('$0.01');
          expect(formatPrice(0.99)).toBe('$0.99');
          expect(formatPrice(1.234)).toBe('$1.23');
        });
      });

      describe('Decimal.js handling', () => {
        test('should format Decimal-like objects using serializeDecimal', () => {
          const decimalLike = {
            toNumber: jest.fn().mockReturnValue(42.75),
          };

          const result = formatPrice(decimalLike);
          expect(result).toBe('$42.75');
          expect(decimalLike.toNumber).toHaveBeenCalled();
        });

        test('should handle Decimal-like objects without currency', () => {
          const decimalLike = {
            toNumber: jest.fn().mockReturnValue(15.5),
          };

          const result = formatPrice(decimalLike, false);
          expect(result).toBe('15.50');
        });

        test('should fallback when Decimal conversion fails', () => {
          const problematicDecimal = {
            toNumber: jest.fn().mockReturnValue(null),
          };

          const result = formatPrice(problematicDecimal);
          expect(result).toBe('$0.00');
          expect(logger.warn).toHaveBeenCalledWith(
            'Failed to format price value:',
            problematicDecimal
          );
        });
      });

      describe('Null and undefined handling', () => {
        test('should return default currency format for null', () => {
          expect(formatPrice(null)).toBe('$0.00');
          expect(formatPrice(null, false)).toBe('0.00');
        });

        test('should return default currency format for undefined', () => {
          expect(formatPrice(undefined)).toBe('$0.00');
          expect(formatPrice(undefined, false)).toBe('0.00');
        });
      });

      describe('Invalid input handling', () => {
        test('should handle NaN values', () => {
          expect(formatPrice(NaN)).toBe('$0.00');
          expect(formatPrice(NaN, false)).toBe('0.00');
        });

        test('should handle string values', () => {
          expect(formatPrice('10.50')).toBe('$10.50');
          expect(formatPrice('invalid')).toBe('$0.00');
          expect(formatPrice('')).toBe('$0.00');
        });
      });

      describe('Rounding behavior', () => {
        test('should round to 2 decimal places', () => {
          expect(formatPrice(10.999)).toBe('$11.00');
          expect(formatPrice(10.994)).toBe('$10.99');
          expect(formatPrice(10.996)).toBe('$11.00');
        });

        test('should handle very small decimal precision', () => {
          expect(formatPrice(0.999999)).toBe('$1.00');
          expect(formatPrice(0.001)).toBe('$0.00');
          expect(formatPrice(0.005)).toBe('$0.01');
        });
      });
    });

    describe('formatCurrency', () => {
      describe('Basic currency formatting', () => {
        test('should format numbers with proper currency formatting', () => {
          expect(formatCurrency(10)).toBe('$10.00');
          expect(formatCurrency(1234.56)).toBe('$1,234.56');
          expect(formatCurrency(0)).toBe('$0.00');
        });

        test('should add thousands separators for large amounts', () => {
          expect(formatCurrency(1000)).toBe('$1,000.00');
          expect(formatCurrency(10000)).toBe('$10,000.00');
          expect(formatCurrency(1000000)).toBe('$1,000,000.00');
          expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
        });

        test('should handle negative amounts', () => {
          expect(formatCurrency(-10)).toBe('-$10.00');
          expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
        });
      });

      describe('Decimal.js handling', () => {
        test('should format Decimal-like objects', () => {
          const decimalAmount = {
            toNumber: jest.fn().mockReturnValue(1234.56),
          };

          const result = formatCurrency(decimalAmount);
          expect(result).toBe('$1,234.56');
          expect(decimalAmount.toNumber).toHaveBeenCalled();
        });

        test('should handle failed Decimal conversion', () => {
          const problematicDecimal = {
            toNumber: jest.fn().mockReturnValue(null),
          };

          const result = formatCurrency(problematicDecimal);
          expect(result).toBe('$0.00');
          expect(logger.warn).toHaveBeenCalledWith(
            'Failed to format currency value:',
            problematicDecimal
          );
        });
      });

      describe('Error handling', () => {
        test('should handle null and undefined', () => {
          expect(formatCurrency(null)).toBe('$0.00');
          expect(formatCurrency(undefined)).toBe('$0.00');
        });

        test('should handle NaN values', () => {
          expect(formatCurrency(NaN)).toBe('$0.00');
          expect(logger.warn).toHaveBeenCalledWith('Failed to format currency value (NaN):', NaN);
        });

        test('should handle conversion errors gracefully', () => {
          // Mock console.error since that's where serializeDecimal logs errors
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

          const throwingObject = {
            toNumber: jest.fn().mockImplementation(() => {
              throw new Error('Conversion failed');
            }),
          };

          const result = formatCurrency(throwingObject);
          expect(result).toBe('$0.00');

          // The error is logged by serializeDecimal via console.error, not logger.error
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error serializing Decimal:',
            expect.any(Error),
            'Value:',
            throwingObject
          );

          consoleSpy.mockRestore();
        });

        test('should handle Intl.NumberFormat errors', () => {
          // Mock the entire Intl.NumberFormat constructor instead of just the prototype
          const originalNumberFormat = Intl.NumberFormat;
          const mockFormat = jest.fn().mockImplementation(() => {
            throw new Error('Formatting error');
          });

          // Create a mock constructor that returns an object with the throwing format method
          (Intl as any).NumberFormat = jest.fn().mockImplementation(() => ({
            format: mockFormat,
          }));

          const result = formatCurrency(100);
          expect(result).toBe('$0.00');
          expect(logger.error).toHaveBeenCalledWith(
            'Error formatting currency:',
            expect.any(Error)
          );

          // Restore original implementation
          Intl.NumberFormat = originalNumberFormat;
        });
      });
    });

    describe('Tax calculations and edge cases', () => {
      test('should handle tax-like calculations', () => {
        const subtotal = 100.0;
        const taxRate = 0.08875; // SF tax rate
        const tax = subtotal * taxRate;

        expect(formatCurrency(tax)).toBe('$8.88');
        expect(formatPrice(tax)).toBe('$8.88');
      });

      test('should handle tip calculations', () => {
        const bill = 87.5;
        const tipPercent = 0.18;
        const tip = bill * tipPercent;

        expect(formatCurrency(tip)).toBe('$15.75');
      });

      test('should handle currency conversion scenarios', () => {
        // Simulating currency conversion with precision issues
        const eurAmount = 100;
        const exchangeRate = 1.08452;
        const usdAmount = eurAmount * exchangeRate;

        expect(formatCurrency(usdAmount)).toBe('$108.45');
      });
    });
  });

  describe('Date-Time Formatting', () => {
    describe('formatDateTime', () => {
      describe('Valid date formatting', () => {
        test('should format Date objects correctly', () => {
          const date = new Date('2024-01-15T14:30:00Z');
          const result = formatDateTime(date);

          // Check that it contains expected components (format may vary by locale)
          expect(result).toMatch(/Jan/);
          expect(result).toMatch(/15/);
          expect(result).toMatch(/2024/);
          expect(result).toMatch(/PM|AM/);
        });

        test('should format date strings correctly', () => {
          const dateString = '2024-12-25T09:15:30Z';
          const result = formatDateTime(dateString);

          expect(result).toMatch(/Dec/);
          expect(result).toMatch(/25/);
          expect(result).toMatch(/2024/);
          expect(result).toMatch(/AM|PM/);
        });

        test('should handle different time zones consistently', () => {
          const utcDate = new Date('2024-06-15T12:00:00Z');
          const result = formatDateTime(utcDate);

          expect(result).toMatch(/Jun/);
          expect(result).toMatch(/15/);
          expect(result).toMatch(/2024/);
        });
      });

      describe('Invalid date handling', () => {
        test('should return N/A for null', () => {
          expect(formatDateTime(null)).toBe('N/A');
        });

        test('should return N/A for undefined', () => {
          expect(formatDateTime(undefined)).toBe('N/A');
        });

        test('should return N/A for invalid date strings', () => {
          expect(formatDateTime('invalid date')).toBe('N/A');
          expect(formatDateTime('2024-13-45')).toBe('N/A');
          expect(formatDateTime('')).toBe('N/A');
        });

        test('should return N/A for invalid Date objects', () => {
          expect(formatDateTime(new Date('invalid'))).toBe('N/A');
        });

        test('should handle formatting errors gracefully', () => {
          // Create a date that might cause formatting issues
          const problematicDate = new Date('1900-01-01T00:00:00Z');
          const result = formatDateTime(problematicDate);

          // Should either format correctly or return N/A, but not throw
          expect(typeof result).toBe('string');
        });
      });

      describe('Edge cases', () => {
        test('should handle dates at boundaries', () => {
          const endOfYear = new Date('2024-12-31T12:00:00Z'); // Use noon to avoid timezone edge cases
          const startOfYear = new Date('2024-01-01T12:00:00Z'); // Use noon to avoid timezone edge cases

          expect(formatDateTime(endOfYear)).toMatch(/Dec.*31.*2024/);
          expect(formatDateTime(startOfYear)).toMatch(/Jan.*1.*2024/);
        });

        test('should handle leap year dates', () => {
          const leapDay = new Date('2024-02-29T12:00:00Z');
          const result = formatDateTime(leapDay);

          expect(result).toMatch(/Feb.*29.*2024/);
        });

        test('should handle very old and future dates', () => {
          const oldDate = new Date('1970-01-01T12:00:00Z'); // Use noon to avoid timezone edge cases
          const futureDate = new Date('2099-12-31T12:00:00Z'); // Use noon to avoid timezone edge cases

          expect(formatDateTime(oldDate)).toMatch(/1970/);
          expect(formatDateTime(futureDate)).toMatch(/2099/);
        });
      });
    });
  });

  describe('Integration scenarios', () => {
    test('should handle order summary formatting', () => {
      const orderData = {
        subtotal: { toNumber: () => 45.5 },
        tax: { toNumber: () => 4.04 },
        deliveryFee: 15.0,
        total: { toNumber: () => 64.54 },
        createdAt: new Date('2024-01-15T16:30:00Z'),
      };

      expect(formatCurrency(orderData.subtotal)).toBe('$45.50');
      expect(formatCurrency(orderData.tax)).toBe('$4.04');
      expect(formatPrice(orderData.deliveryFee)).toBe('$15.00');
      expect(formatCurrency(orderData.total)).toBe('$64.54');
      // Check for date components but be flexible about the exact time due to timezone differences
      const dateResult = formatDateTime(orderData.createdAt);
      expect(dateResult).toMatch(/Jan.*15.*2024/);
      expect(dateResult).toMatch(/PM|AM/);
    });

    test('should handle product pricing scenarios', () => {
      const products = [
        { name: 'Alfajores', price: { toNumber: () => 12.99 } },
        { name: 'Empanadas', price: { toNumber: () => 8.5 } },
        { name: 'Milanesa', price: null },
      ];

      expect(formatPrice(products[0].price)).toBe('$12.99');
      expect(formatPrice(products[1].price)).toBe('$8.50');
      expect(formatPrice(products[2].price)).toBe('$0.00');
    });

    test('should handle promotional pricing', () => {
      const originalPrice = 25.0;
      const discountPercent = 0.2;
      const salePrice = originalPrice * (1 - discountPercent);

      expect(formatPrice(originalPrice)).toBe('$25.00');
      expect(formatPrice(salePrice)).toBe('$20.00');
      expect(formatCurrency(originalPrice - salePrice)).toBe('$5.00');
    });
  });
});
