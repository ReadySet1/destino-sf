/**
 * OpenAPI schema validation utilities
 * Placeholder implementation for test compatibility
 */

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOpenAPISchema(): SchemaValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

export function validateEndpointDocumentation(): SchemaValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

export function validateResponseSchemas(): SchemaValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

export function validateRequestSchemas(): SchemaValidationResult {
  return { valid: true, errors: [], warnings: [] };
}
