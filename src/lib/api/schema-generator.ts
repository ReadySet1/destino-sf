/**
 * OpenAPI Schema Generation
 *
 * Generates OpenAPI 3.1 schemas from Zod schemas for API contract testing
 * and documentation generation.
 */

import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/**
 * Central OpenAPI Registry
 * Register all API schemas here for OpenAPI documentation generation
 */
export const registry = new OpenAPIRegistry();

/**
 * Register a Zod schema with the OpenAPI registry
 *
 * @param name - Unique name for the schema component
 * @param schema - Zod schema to register
 * @returns The registered schema
 */
export function registerSchema<T extends z.ZodType<any, any, any>>(name: string, schema: T): T {
  // Type cast needed due to library type mismatch between Zod and OpenAPI types
  registry.registerComponent('schemas', name, schema as any);
  return schema;
}

/**
 * Register an API route with the OpenAPI registry
 *
 * @param config - Route configuration with path, method, request, and response schemas
 */
export function registerRoute(config: {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  summary: string;
  description?: string;
  tags?: string[];
  request?: {
    body?: {
      content: {
        'application/json': {
          schema: z.ZodType<any, any, any>;
        };
      };
    };
    query?: z.ZodType<any, any, any>;
    params?: z.ZodType<any, any, any>;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      content?: {
        'application/json': {
          schema: z.ZodType<any, any, any>;
        };
      };
    };
  };
}) {
  registry.registerPath({
    ...config,
    request: config.request as any,
    responses: config.responses as any,
  });
}

/**
 * Generate OpenAPI 3.1 specification from registered schemas and routes
 *
 * @returns OpenAPI specification object
 */
export function generateOpenAPISpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Destino SF API',
      version: '1.0.0',
      description: 'API documentation for Destino SF e-commerce platform',
      contact: {
        name: 'Destino SF',
        url: 'https://destino-sf.vercel.app',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: 'Current environment',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
      {
        url: 'https://destino-sf.vercel.app',
        description: 'Production',
      },
    ],
    tags: [
      { name: 'Products', description: 'Product catalog operations' },
      { name: 'Checkout', description: 'Checkout and payment processing' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Catering', description: 'Catering inquiries and orders' },
      { name: 'Admin', description: 'Admin-only operations' },
      { name: 'Webhooks', description: 'Webhook handlers' },
    ],
  });
}

/**
 * Generate OpenAPI specification as YAML string
 */
export async function generateOpenAPIYAML(): Promise<string> {
  const spec = generateOpenAPISpec();
  // Note: For YAML generation, we'll need to add js-yaml package
  // For now, return JSON string
  return JSON.stringify(spec, null, 2);
}
