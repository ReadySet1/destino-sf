// Removed the Prisma Decimal import to make this file client-safe

/**
 * Safely converts a Decimal-like value to a JavaScript number
 * This is a client-safe version that doesn't import Prisma
 * @param value Decimal-like value to convert
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
    if (typeof value === 'object' && value !== null) {
      // Access toNumber if available
      if (typeof value.toNumber === 'function') {
        return value.toNumber();
      }
      
      // Handle other Decimal-like objects that might have different APIs
      if (typeof value.toString === 'function') {
        const stringVal = value.toString();
        if (stringVal && !isNaN(parseFloat(stringVal))) {
          return parseFloat(stringVal);
        }
      }

      // If the object has a value property that is a number (some ORMs do this)
      if (typeof value.value === 'number') {
        return value.value;
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
    return 0; // Return 0 as fallback instead of null to avoid null errors
  } catch (e) {
    console.error("Error serializing Decimal:", e, "Value:", value);
    return 0; // Return 0 as fallback instead of null
  }
};

/**
 * Safely checks if a value is a Decimal-like object
 * This is a client-safe version that doesn't rely on instanceof checks
 */
const isDecimal = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    (
      // Check for common Decimal-like properties/methods
      (typeof value.toNumber === 'function') || 
      (typeof value.toString === 'function' && 
      !Array.isArray(value) && 
      Object.prototype.toString.call(value) !== '[object Date]')
    )
  );
};

/**
 * Recursively serializes an object, converting Decimal values to numbers
 * This is useful when passing data from server components to client components
 * @param obj Object to serialize
 * @returns Serialized object with Decimal values converted to numbers
 */
export const serializeObject = <T extends Record<string, any>>(obj: T): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null ? serializeObject(item) : item
    );
  }
  
  // Handle Decimal object directly
  if (isDecimal(obj)) {
    return serializeDecimal(obj) || 0; // Always return a number, default to 0
  }
  
  const serialized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      serialized[key] = null; // Use null instead of undefined for serialization
      continue;
    }
    
    if (isDecimal(value)) {
      // Critical fields should never be null
      const criticalFields = ['total', 'price', 'amount', 'taxAmount', 'shippingCostCents'];
      const shouldDefaultToZero = criticalFields.includes(key);
      
      const serializedValue = serializeDecimal(value);
      serialized[key] = serializedValue !== null ? serializedValue : (shouldDefaultToZero ? 0 : null);
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
      // Primitive value
      serialized[key] = value;
    }
  }
  
  return serialized;
}; 