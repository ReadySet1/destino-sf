import { logger } from '@/utils/logger';
import { serializeDecimal } from '@/utils/serialization';

/**
 * Formats a price/money value to a standardized string with 2 decimal places
 * Handles different input types: numbers, strings, Decimal objects, or undefined/null values
 *
 * @param value The price value to format
 * @param currency Whether to include the currency symbol (default: true)
 * @returns Formatted price string with two decimal places
 */
export const formatPrice = (value: any, currency = true): string => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return currency ? '$0.00' : '0.00';
  }

  // Try to convert to a number using our specialized utility
  let num: number | null = null;

  // If it's already a number
  if (typeof value === 'number') {
    num = isNaN(value) ? 0 : value;
  } else {
    // Use our serializeDecimal utility to handle Prisma Decimal objects
    num = serializeDecimal(value);

    // If conversion fails, log and use 0
    if (num === null) {
      logger.warn('Failed to format price value:', value);
      num = 0;
    }
  }

  // Format the result with 2 decimal places
  const formatted = num.toFixed(2);
  return currency ? `$${formatted}` : formatted;
};

/**
 * Formats a date-time value to a human-readable string
 *
 * @param date The date to format
 * @returns Formatted date string or 'N/A' if not available
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    logger.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Format a number as currency
 *
 * @param amount The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: any): string => {
  // Handle null/undefined case first
  if (amount === null || amount === undefined) {
    return '$0.00';
  }

  // If it's already a number
  if (typeof amount === 'number') {
    // Extra safety check for NaN values
    if (isNaN(amount)) {
      logger.warn('Failed to format currency value (NaN):', amount);
      return '$0.00';
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      logger.error('Error formatting currency:', error);
      return '$0.00';
    }
  }

  // Try to convert to number using our utility
  try {
    const num = serializeDecimal(amount);

    // If conversion returns null or NaN, use zero
    if (num === null || isNaN(num)) {
      logger.warn('Failed to format currency value:', amount);
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (error) {
    logger.error('Error formatting currency:', error);
    return '$0.00';
  }
};
