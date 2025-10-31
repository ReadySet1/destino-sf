/**
 * Contract Test Setup
 *
 * Utilities and helpers for API contract testing
 */

import { z } from 'zod';
import type { ValidationContext } from '@/lib/openapi-validator';

/**
 * Test if a value matches a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Boolean indicating if validation passed
 */
export function matchesSchema<T>(schema: z.ZodType<T>, value: unknown): boolean {
  try {
    schema.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get validation errors for a value against a schema
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Array of validation error messages
 */
export function getValidationErrors<T>(schema: z.ZodType<T>, value: unknown): string[] {
  try {
    schema.parse(value);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    }
    return ['Unknown validation error'];
  }
}

/**
 * Create a mock Next.js Request for testing
 *
 * @param config - Request configuration
 * @returns Mock Request object
 */
export function createMockRequest(config: {
  method: string;
  url: string;
  body?: any;
  headers?: Record<string, string>;
}): Request {
  const { method, url, body, headers } = config;

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'DELETE') {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

/**
 * Create a validation context for testing
 */
export function createValidationContext(
  path: string,
  method: string,
  statusCode?: number
): ValidationContext {
  return {
    path,
    method: method.toLowerCase(),
    statusCode,
  };
}

/**
 * Contract test assertion helper
 */
export const contractAssert = {
  /**
   * Assert that a response matches the expected schema
   */
  matchesSchema<T>(schema: z.ZodType<T>, value: unknown, message?: string): void {
    const errors = getValidationErrors(schema, value);
    if (errors.length > 0) {
      throw new Error(
        `${message || 'Schema validation failed'}:\n${errors.map(e => `  - ${e}`).join('\n')}`
      );
    }
  },

  /**
   * Assert that a response has the expected status code
   */
  hasStatus(response: Response, expectedStatus: number): void {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, but got ${response.status}: ${response.statusText}`
      );
    }
  },

  /**
   * Assert that a response body contains expected fields
   */
  hasFields(value: any, fields: string[]): void {
    const missingFields = fields.filter(field => !(field in value));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  },

  /**
   * Assert that an array has expected length
   */
  hasLength(array: any[], length: number): void {
    if (array.length !== length) {
      throw new Error(`Expected array length ${length}, but got ${array.length}`);
    }
  },

  /**
   * Assert that an array is not empty
   */
  isNotEmpty(array: any[]): void {
    if (array.length === 0) {
      throw new Error('Expected non-empty array, but got empty array');
    }
  },
};

/**
 * Mock data generators for testing
 */
export const mockData = {
  /**
   * Generate a mock UUID
   */
  uuid(): string {
    return '00000000-0000-0000-0000-000000000000';
  },

  /**
   * Generate a mock email
   */
  email(): string {
    return 'test@example.com';
  },

  /**
   * Generate a mock phone number
   */
  phone(): string {
    return '+14155551234';
  },

  /**
   * Generate a mock timestamp
   */
  timestamp(): string {
    return new Date().toISOString();
  },

  /**
   * Generate a mock money amount (in cents)
   */
  money(dollars: number = 10): number {
    return Math.round(dollars * 100);
  },

  /**
   * Generate a mock address
   */
  address() {
    return {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'US',
    };
  },

  /**
   * Generate a mock product
   */
  product() {
    return {
      id: this.uuid(),
      name: 'Test Product',
      description: 'Test product description',
      slug: 'test-product',
      price: this.money(12.99),
      images: ['https://example.com/image.jpg'],
      categoryId: this.uuid(),
      squareId: null,
      featured: false,
      active: true,
      variants: [],
      isCatering: false,
    };
  },

  /**
   * Generate a mock order
   */
  order() {
    return {
      id: this.uuid(),
      orderNumber: 'ORDER-001',
      status: 'PENDING' as const,
      paymentStatus: 'PENDING' as const,
      customerName: 'John Doe',
      email: this.email(),
      phone: this.phone(),
      fulfillmentType: 'PICKUP' as const,
      paymentMethod: 'CREDIT_CARD' as const,
      items: [],
      subtotal: this.money(50),
      total: this.money(50),
      createdAt: this.timestamp(),
      updatedAt: this.timestamp(),
    };
  },
};
