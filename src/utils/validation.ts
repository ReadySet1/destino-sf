/**
 * Utility functions for data validation
 */

/**
 * Validates if a string is a valid UUID format
 * @param uuid - The string to validate
 * @returns true if the string matches UUID format, false otherwise
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Safely decodes a URL component, returning the original string if decoding fails
 * @param encodedString - The potentially encoded string
 * @returns The decoded string or original string if decoding fails
 */
export const safeDecodeURIComponent = (encodedString: string): string => {
  try {
    return decodeURIComponent(encodedString);
  } catch (error) {
    console.warn(`Failed to decode URI component: ${encodedString}`, error);
    return encodedString;
  }
};

/**
 * Validates and sanitizes an order ID from URL parameters
 * @param orderId - The order ID to validate
 * @returns The sanitized order ID or null if invalid
 */
export const validateOrderId = (orderId: string | null): string | null => {
  if (!orderId) {
    return null;
  }

  // URL decode the orderId in case it was encoded
  let decodedOrderId = safeDecodeURIComponent(orderId);

  // Handle Square redirect corruption: extract valid UUID if it's at the beginning
  if (decodedOrderId.length > 36) {
    console.warn(`Order ID appears to be corrupted with extra data: ${decodedOrderId}`);
    
    // Try to extract the UUID from the beginning of the string
    const uuidMatch = decodedOrderId.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i);
    if (uuidMatch) {
      const extractedUuid = uuidMatch[1];
      console.log(`Extracted valid UUID from corrupted order ID: ${extractedUuid}`);
      decodedOrderId = extractedUuid;
    }
  }

  // Validate UUID format
  if (!isValidUUID(decodedOrderId)) {
    console.error(`Invalid UUID format for orderId: ${decodedOrderId}`);
    return null;
  }

  return decodedOrderId;
};
