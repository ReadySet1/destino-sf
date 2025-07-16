import { Decimal } from '@prisma/client/runtime/library';

/**
 * Utility functions for handling Decimal.js operations
 * This helps avoid type conflicts between Decimal and number types
 */

/**
 * Convert a Decimal to a number safely
 */
export const decimalToNumber = (value: Decimal): number => {
  return value.toNumber();
};

/**
 * Convert a number to a Decimal
 */
export const numberToDecimal = (value: number): Decimal => {
  return new Decimal(value);
};

/**
 * Convert a string to a Decimal
 */
export const stringToDecimal = (value: string): Decimal => {
  return new Decimal(value);
};

/**
 * Add two Decimal values
 */
export const addDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.plus(b);
};

/**
 * Subtract two Decimal values
 */
export const subtractDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.minus(b);
};

/**
 * Multiply two Decimal values
 */
export const multiplyDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.mul(b);
};

/**
 * Divide two Decimal values
 */
export const divideDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.div(b);
};

/**
 * Compare two Decimal values
 */
export const compareDecimals = (a: Decimal, b: Decimal): number => {
  return a.comparedTo(b);
};

/**
 * Check if a Decimal is greater than another
 */
export const isGreaterThan = (a: Decimal, b: Decimal): boolean => {
  return a.greaterThan(b);
};

/**
 * Check if a Decimal is less than another
 */
export const isLessThan = (a: Decimal, b: Decimal): boolean => {
  return a.lessThan(b);
};

/**
 * Check if two Decimals are equal
 */
export const isEqual = (a: Decimal, b: Decimal): boolean => {
  return a.equals(b);
};

/**
 * Sum an array of Decimals
 */
export const sumDecimals = (values: Decimal[]): Decimal => {
  return values.reduce((sum, value) => sum.plus(value), new Decimal(0));
};

/**
 * Calculate percentage of a Decimal value
 */
export const calculatePercentage = (value: Decimal, percentage: number): Decimal => {
  return value.mul(percentage / 100);
};

/**
 * Round a Decimal to specified decimal places
 */
export const roundDecimal = (value: Decimal, decimalPlaces: number): Decimal => {
  return value.toDecimalPlaces(decimalPlaces);
};

/**
 * Convert a Decimal to a currency string
 */
export const toCurrencyString = (value: Decimal): string => {
  return `$${value.toFixed(2)}`;
};

/**
 * Safely convert any value to Decimal
 */
export const toDecimal = (value: number | string | Decimal): Decimal => {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value);
};

/**
 * Helper for arithmetic operations with mixed types
 */
export const safeAdd = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return toDecimal(a).plus(toDecimal(b));
};

export const safeSubtract = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return toDecimal(a).minus(toDecimal(b));
};

export const safeMultiply = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return toDecimal(a).mul(toDecimal(b));
};

export const safeDivide = (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
  return toDecimal(a).div(toDecimal(b));
}; 