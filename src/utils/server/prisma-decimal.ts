import { Decimal } from '@prisma/client/runtime/library';

/**
 * Exports the Decimal class for type checking only
 */
export type PrismaDecimal = Decimal;

/**
 * Safely converts a Decimal value to a JavaScript number
 * Only used on the server side
 */
export const decimalToNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  
  // If it's a Decimal instance
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a decimal-like object with toNumber method
  if (typeof value === 'object' && value !== null && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  
  return null;
};

/**
 * Checks if a value is a Decimal object
 * Only used on the server side
 */
export const isDecimal = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value instanceof Decimal || 
     (typeof value.constructor === 'function' && 
      value.constructor.name === 'Decimal') ||
     (typeof value.toNumber === 'function'))
  );
}; 