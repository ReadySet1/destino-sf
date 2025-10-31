/**
 * OpenAPI Schema Validation Utilities
 *
 * Validates API requests and responses against OpenAPI schemas
 * for contract testing and runtime validation.
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { z } from 'zod';
import type { OpenAPIV3_1 } from 'openapi-types';

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationContext {
  path: string;
  method: string;
  statusCode?: number;
}

/**
 * Validate OpenAPI schema file for correctness
 *
 * @param schemaPath - Path to OpenAPI schema file or schema object
 * @returns Validation result with any errors or warnings
 */
export async function validateOpenAPISchema(
  schema: string | OpenAPIV3_1.Document
): Promise<SchemaValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse and validate the OpenAPI schema
    await SwaggerParser.validate(schema as any);
    return { valid: true, errors: [], warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    errors.push(message);
    return { valid: false, errors, warnings: [] };
  }
}

/**
 * Validate that all API endpoints have proper documentation
 *
 * @param schema - OpenAPI schema object
 * @returns Validation result
 */
export function validateEndpointDocumentation(
  schema: OpenAPIV3_1.Document
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema.paths) {
    errors.push('No paths defined in OpenAPI schema');
    return { valid: false, errors, warnings };
  }

  // Check each path for proper documentation
  Object.entries(schema.paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;

    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    methods.forEach(method => {
      const operation = pathItem[method];
      if (!operation) return;

      // Check for summary
      if (!operation.summary) {
        warnings.push(`${method.toUpperCase()} ${path}: Missing summary`);
      }

      // Check for description
      if (!operation.description) {
        warnings.push(`${method.toUpperCase()} ${path}: Missing description`);
      }

      // Check for responses
      if (!operation.responses || Object.keys(operation.responses).length === 0) {
        errors.push(`${method.toUpperCase()} ${path}: No responses defined`);
      }

      // Check for tags
      if (!operation.tags || operation.tags.length === 0) {
        warnings.push(`${method.toUpperCase()} ${path}: No tags defined`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate response schemas are properly defined
 *
 * @param schema - OpenAPI schema object
 * @returns Validation result
 */
export function validateResponseSchemas(
  schema: OpenAPIV3_1.Document
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema.paths) {
    errors.push('No paths defined in OpenAPI schema');
    return { valid: false, errors, warnings };
  }

  Object.entries(schema.paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;

    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
    methods.forEach(method => {
      const operation = pathItem[method];
      if (!operation || !operation.responses) return;

      Object.entries(operation.responses).forEach(([statusCode, response]) => {
        if (!response) return;

        // Check for response description
        if ('description' in response && !response.description) {
          warnings.push(
            `${method.toUpperCase()} ${path} [${statusCode}]: Missing response description`
          );
        }

        // Check for content schema
        if ('content' in response && response.content) {
          const jsonContent = response.content['application/json'];
          if (jsonContent && !jsonContent.schema) {
            errors.push(
              `${method.toUpperCase()} ${path} [${statusCode}]: Missing schema for application/json`
            );
          }
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate request schemas are properly defined
 *
 * @param schema - OpenAPI schema object
 * @returns Validation result
 */
export function validateRequestSchemas(
  schema: OpenAPIV3_1.Document
): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema.paths) {
    errors.push('No paths defined in OpenAPI schema');
    return { valid: false, errors, warnings };
  }

  Object.entries(schema.paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;

    const methods = ['post', 'put', 'patch'] as const;
    methods.forEach(method => {
      const operation = pathItem[method];
      if (!operation) return;

      // Check for request body schema
      if (operation.requestBody && 'content' in operation.requestBody) {
        const jsonContent = operation.requestBody.content?.['application/json'];
        if (jsonContent && !jsonContent.schema) {
          errors.push(
            `${method.toUpperCase()} ${path}: Missing schema for request body`
          );
        }
      }

      // Check for query parameters
      if (operation.parameters) {
        operation.parameters.forEach((param, index) => {
          if (!param || !('in' in param)) return;

          if (!param.schema) {
            warnings.push(
              `${method.toUpperCase()} ${path}: Parameter ${param.name || index} missing schema`
            );
          }
        });
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a request object against a Zod schema
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @param context - Validation context for error messages
 * @returns Validation result
 */
export function validateRequest<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: ValidationContext
): SchemaValidationResult {
  try {
    schema.parse(data);
    return { valid: true, errors: [], warnings: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        err => `${context.method.toUpperCase()} ${context.path}: ${err.path.join('.')} - ${err.message}`
      );
      return { valid: false, errors, warnings: [] };
    }

    return {
      valid: false,
      errors: [`${context.method.toUpperCase()} ${context.path}: Unknown validation error`],
      warnings: [],
    };
  }
}

/**
 * Validate a response object against a Zod schema
 *
 * @param schema - Zod schema
 * @param data - Data to validate
 * @param context - Validation context for error messages
 * @returns Validation result
 */
export function validateResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: ValidationContext
): SchemaValidationResult {
  try {
    schema.parse(data);
    return { valid: true, errors: [], warnings: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        err =>
          `${context.method.toUpperCase()} ${context.path} [${context.statusCode}]: ${err.path.join('.')} - ${err.message}`
      );
      return { valid: false, errors, warnings: [] };
    }

    return {
      valid: false,
      errors: [
        `${context.method.toUpperCase()} ${context.path} [${context.statusCode}]: Unknown validation error`,
      ],
      warnings: [],
    };
  }
}
