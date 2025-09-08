// src/lib/square/order-validation.ts

/**
 * Square Order Field Validation and Sanitization
 * Fixes invalid field errors like "order.workfl" by ensuring only valid Square fields are sent
 */

export interface SquareOrderPayload {
  order: {
    location_id: string;
    reference_id?: string;
    line_items?: any[];
    taxes?: any[];
    service_charges?: any[];
    fulfillments?: any[];
    metadata?: Record<string, string>;
    [key: string]: any;
  };
  idempotency_key?: string;
  checkout_options?: any;
  [key: string]: any;
}

/**
 * Valid Square Order fields based on Square API documentation
 */
const VALID_ORDER_FIELDS = new Set([
  'location_id',
  'reference_id',
  'line_items',
  'taxes',
  'discounts',
  'service_charges',
  'fulfillments',
  'rewards',
  'metadata',
  'pricing_options',
  'ticket_name',
  'order_source',
  'customer_id',
  'net_amounts',
  'rounding_adjustment',
  'returns',
  'net_amount_due_money',
  'version',
  'total_money',
  'total_tax_money',
  'total_discount_money',
  'total_tip_money',
  'total_service_charge_money',
  'closed_at',
  'state',
  'created_at',
  'updated_at'
]);

/**
 * Valid metadata keys that Square accepts
 * Note: 'fulfillment_type' removed as it triggers Weebly Digital Commerce validation
 */
const VALID_METADATA_KEYS = new Set([
  'supabaseUserId',
  'order_type',
  // 'fulfillment_type', // REMOVED: Triggers Square's Weebly Digital validation ("com.weebly.Digi" error)
  'source',
  'idempotency_key',
  'customer_id',
  'internal_notes',
  'platform_source'
]);

/**
 * Sanitizes Square order payload to remove invalid fields
 */
export function sanitizeSquareOrderPayload(payload: SquareOrderPayload): SquareOrderPayload {
  const sanitized: SquareOrderPayload = {
    order: {
      location_id: payload.order.location_id // Always preserve location_id as it's required
    }
  };

  // Copy valid top-level fields
  if (payload.idempotency_key) {
    sanitized.idempotency_key = payload.idempotency_key;
  }
  if (payload.checkout_options) {
    sanitized.checkout_options = payload.checkout_options;
  }

  // Sanitize order object
  for (const [key, value] of Object.entries(payload.order)) {
    if (VALID_ORDER_FIELDS.has(key)) {
      if (key === 'metadata' && value && typeof value === 'object') {
        // Sanitize metadata to only include valid keys with string values
        sanitized.order.metadata = {};
        for (const [metaKey, metaValue] of Object.entries(value)) {
          if (VALID_METADATA_KEYS.has(metaKey) && typeof metaValue === 'string') {
            sanitized.order.metadata[metaKey] = metaValue;
          }
        }
        // Only include metadata if it has valid entries
        if (Object.keys(sanitized.order.metadata).length === 0) {
          delete sanitized.order.metadata;
        }
      } else {
        sanitized.order[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validates that order payload doesn't contain problematic fields
 */
export function validateSquareOrderPayload(payload: SquareOrderPayload): { 
  valid: boolean; 
  errors: string[];
  sanitized?: SquareOrderPayload;
} {
  const errors: string[] = [];

  // Check for completely invalid fields
  const invalidFields = Object.keys(payload.order).filter(key => !VALID_ORDER_FIELDS.has(key));
  if (invalidFields.length > 0) {
    errors.push(`Invalid order fields detected: ${invalidFields.join(', ')}`);
  }

  // Check metadata
  if (payload.order.metadata) {
    const invalidMetaKeys = Object.keys(payload.order.metadata).filter(
      key => !VALID_METADATA_KEYS.has(key)
    );
    if (invalidMetaKeys.length > 0) {
      errors.push(`Invalid metadata keys detected: ${invalidMetaKeys.join(', ')}`);
    }

    // Check for non-string metadata values
    const nonStringMeta = Object.entries(payload.order.metadata).filter(
      ([_, value]) => typeof value !== 'string'
    );
    if (nonStringMeta.length > 0) {
      errors.push(`Metadata values must be strings. Invalid: ${nonStringMeta.map(([k, v]) => `${k}=${typeof v}`).join(', ')}`);
    }
  }

  // Check for truncated field names (like "workfl" from "workflow")
  const suspiciousFields = Object.keys(payload.order).filter(key => 
    key.length < 6 && !VALID_ORDER_FIELDS.has(key)
  );
  if (suspiciousFields.length > 0) {
    errors.push(`Suspicious truncated fields detected: ${suspiciousFields.join(', ')}`);
  }

  const valid = errors.length === 0;
  const sanitized = valid ? payload : sanitizeSquareOrderPayload(payload);

  return { valid, errors, sanitized };
}

/**
 * Logs validation errors and returns sanitized payload
 */
export function safeSquareOrderPayload(payload: SquareOrderPayload, context: string = ''): SquareOrderPayload {
  const validation = validateSquareOrderPayload(payload);
  
  if (!validation.valid) {
    console.warn(`⚠️ Square order payload validation errors${context ? ` in ${context}` : ''}:`, validation.errors);
    console.warn('Original payload:', JSON.stringify(payload, null, 2));
    console.warn('Sanitized payload:', JSON.stringify(validation.sanitized, null, 2));
  }

  return validation.sanitized || payload;
}
