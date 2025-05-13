import { Decimal } from '@prisma/client/runtime/library';

/**
 * Safely converts a Decimal value to a JavaScript number
 * @param value Decimal value to convert
 * @returns number or null if value is null/undefined
 */
export const serializeDecimal = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a string that can be parsed as a number, return the parsed value
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  
  // Handle Decimal objects
  try {
    // Check if it's a BigInt
    if (typeof value === 'bigint') {
      return Number(value);
    }
    
    // Try to use toNumber method if available (Prisma Decimal standard method)
    if (typeof value === 'object' && value !== null && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    
    // Try to use valueOf method if available
    if (typeof value === 'object' && value !== null && typeof value.valueOf === 'function') {
      const valueOfResult = value.valueOf();
      if (typeof valueOfResult === 'number') return valueOfResult;
      if (typeof valueOfResult === 'string') {
        const parsed = parseFloat(valueOfResult);
        return isNaN(parsed) ? null : parsed;
      }
    }
    
    // Fallback to toString and parse
    if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
      const stringVal = value.toString();
      const parsed = parseFloat(stringVal);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    
    // Last resort: try to directly convert the value to string and parse
    const stringVal = String(value);
    const parsed = parseFloat(stringVal);
    if (!isNaN(parsed)) {
      return parsed;
    }
    
    // If we got here, we couldn't convert it
    console.warn(`Failed to convert Decimal value: ${typeof value}`, value);
    return null;
  } catch (e) {
    console.error("Error serializing Decimal:", e, "Value:", value);
    return null; // Return null as fallback so we can identify the issue
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
      value.constructor.name === 'Decimal') ||
     // Additional check for BigDecimal or other decimal-like objects
     (typeof value.toNumber === 'function' || 
      typeof value.toString === 'function' && 
      !Array.isArray(value) && 
      Object.prototype.toString.call(value) !== '[object Date]'))
  );
};

/**
 * Recursively serializes an object, converting Decimal values to numbers
 * This is useful when passing data from server components to client components
 * @param obj Object to serialize
 * @returns Serialized object with Decimal values converted to numbers
 */
export const serializeObject = <T extends Record<string, any>>(obj: T): any => {
  // Add focused debugging
  console.log('serializeObject input type:', obj ? typeof obj : 'null/undefined');
  
  if (!obj || typeof obj !== 'object') {
    console.log('Early return - not an object');
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    console.log(`serializeObject processing array with ${obj.length} items`);
    return obj.map(item => 
      typeof item === 'object' && item !== null ? serializeObject(item) : item
    );
  }
  
  // Handle Decimal object directly
  if (isDecimal(obj)) {
    console.log('serializeObject processing direct Decimal object');
    const serialized = serializeDecimal(obj);
    if (serialized === null) {
      console.warn('Failed to serialize Decimal object directly', obj);
      // Fallback to a safe default of 0
      return 0;
    }
    return serialized;
  }
  
  const serialized: Record<string, any> = {};
  
  // List all keys for debugging
  const objKeys = Object.keys(obj);
  if (objKeys.includes('id') || objKeys.includes('status')) {
    console.log(`serializeObject processing object with keys: ${objKeys.join(', ')}`);
  }
  
  for (const [key, value] of Object.entries(obj)) {
    // Special handling for 'total' field for debugging
    if (key === 'total' || key === 'price' || key === 'amount') {
      console.log(`Processing ${key} field with value:`, value);
    }
    
    if (value === undefined) {
      serialized[key] = null; // Use null instead of undefined for serialization
      continue;
    }
    
    if (isDecimal(value)) {
      const serializedValue = serializeDecimal(value);
      if (serializedValue === null && (key === 'total' || key === 'price' || key === 'amount')) {
        console.warn(`Failed to serialize ${key} field:`, value);
        // Default important fields to 0 instead of null
        serialized[key] = 0;
      } else {
        serialized[key] = serializedValue;
      }
    } else if (typeof value === 'function') {
      // Skip functions, they can't be serialized
      continue;
    } else if (Array.isArray(value)) {
      if (key === 'items') {
        console.log(`Serializing items array with ${value.length} items`);
      }
      serialized[key] = value.map(item => 
        typeof item === 'object' && item !== null ? serializeObject(item) : item
      );
    } else if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      serialized[key] = serializeObject(value);
    } else {
      // Primitive value
      serialized[key] = value;
    }
  }
  
  // Debug output for key properties specifically
  if ('id' in obj) {
    console.log(`Final serialized id: ${serialized.id}`);
  }
  
  if ('total' in obj) {
    console.log(`Final serialized total: ${serialized.total}`);
  }
  
  return serialized;
}; 