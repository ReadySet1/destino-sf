import { Decimal } from '@prisma/client/runtime/library';

/**
 * Safely converts a Decimal value to a JavaScript number
 * @param value Decimal value to convert
 * @returns number or null if value is null/undefined
 */
export const serializeDecimal = (value: Decimal | null | undefined): number | null => {
  if (!value) return null;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a string that can be parsed as a number, return the parsed value
  if (typeof value === 'string') return parseFloat(value);
  
  // Handle Decimal objects
  try {
    // Try to use toNumber method if available
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    
    // Fallback to toString and parse
    if (typeof value.toString === 'function') {
      return parseFloat(value.toString());
    }
    
    // Last resort: try to directly convert the value to string and parse
    return parseFloat(String(value));
  } catch (e) {
    console.error("Error serializing Decimal:", e);
    return 0; // Return 0 as fallback
  }
};

/**
 * Safely checks if a value is a Decimal object
 */
const isDecimal = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value instanceof Decimal || 
     (typeof value.constructor === 'function' && 
      value.constructor.name === 'Decimal'))
  );
};

/**
 * Recursively serializes an object, converting Decimal values to numbers
 * This is useful when passing data from server components to client components
 * @param obj Object to serialize
 * @returns Serialized object with Decimal values converted to numbers
 */
export const serializeObject = <T extends Record<string, any>>(obj: T): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null ? serializeObject(item) : item
    );
  }
  
  // Handle Decimal object directly
  if (isDecimal(obj)) {
    return serializeDecimal(obj as unknown as Decimal);
  }
  
  const serialized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (isDecimal(value)) {
      serialized[key] = serializeDecimal(value as unknown as Decimal);
    } else if (typeof value === 'function') {
      // Skip functions, they can't be serialized
      continue;
    } else if (Array.isArray(value)) {
      serialized[key] = value.map(item => 
        typeof item === 'object' && item !== null ? serializeObject(item) : item
      );
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      serialized[key] = serializeObject(value);
    } else {
      serialized[key] = value;
    }
  }
  
  return serialized;
}; 