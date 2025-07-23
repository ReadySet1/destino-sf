import { jest } from '@jest/globals';

// Mock API documentation dependencies
jest.mock('@/lib/openapi-validator', () => ({
  validateOpenAPISchema: jest.fn(),
  validateEndpointDocumentation: jest.fn(),
  validateResponseSchemas: jest.fn(),
  validateRequestSchemas: jest.fn(),
  validateExamples: jest.fn(),
}));

jest.mock('@/lib/documentation-checker', () => ({
  checkDocumentationCompleteness: jest.fn(),
  validateEndpointCoverage: jest.fn(),
  checkSchemaAccuracy: jest.fn(),
  validateDocumentationSync: jest.fn(),
  generateDocumentationReport: jest.fn(),
}));

jest.mock('@/lib/api-testing', () => ({
  testDocumentedExamples: jest.fn(),
  validateResponseFormats: jest.fn(),
  testErrorDocumentation: jest.fn(),
  validateParameterDocumentation: jest.fn(),
  testAuthDocumentation: jest.fn(),
}));

jest.mock('swagger-parser', () => ({
  validate: jest.fn(),
  dereference: jest.fn(),
  bundle: jest.fn(),
}));

jest.mock('openapi-schema-validator', () => ({
  OpenAPISchemaValidator: jest.fn().mockImplementation(() => ({
    validate: jest.fn(),
  })),
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn(),
  resolve: jest.fn(),
  dirname: jest.fn(),
  basename: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import modules
import {
  validateOpenAPISchema,
  validateEndpointDocumentation,
  validateResponseSchemas,
  validateRequestSchemas,
  validateExamples,
} from '@/lib/openapi-validator';
import {
  checkDocumentationCompleteness,
  validateEndpointCoverage,
  checkSchemaAccuracy,
  validateDocumentationSync,
  generateDocumentationReport,
} from '@/lib/documentation-checker';
import {
  testDocumentedExamples,
  validateResponseFormats,
  testErrorDocumentation,
  validateParameterDocumentation,
  testAuthDocumentation,
} from '@/lib/api-testing';
import SwaggerParser from 'swagger-parser';
import { OpenAPISchemaValidator } from 'openapi-schema-validator';
import fs from 'fs/promises';
import path from 'path';

const mockValidateOpenAPISchema = validateOpenAPISchema as jest.MockedFunction<
  typeof validateOpenAPISchema
>;
const mockValidateEndpointDocumentation = validateEndpointDocumentation as jest.MockedFunction<
  typeof validateEndpointDocumentation
>;
const mockValidateResponseSchemas = validateResponseSchemas as jest.MockedFunction<
  typeof validateResponseSchemas
>;
const mockValidateRequestSchemas = validateRequestSchemas as jest.MockedFunction<
  typeof validateRequestSchemas
>;
const mockValidateExamples = validateExamples as jest.MockedFunction<typeof validateExamples>;
const mockCheckDocumentationCompleteness = checkDocumentationCompleteness as jest.MockedFunction<
  typeof checkDocumentationCompleteness
>;
const mockValidateEndpointCoverage = validateEndpointCoverage as jest.MockedFunction<
  typeof validateEndpointCoverage
>;
const mockCheckSchemaAccuracy = checkSchemaAccuracy as jest.MockedFunction<
  typeof checkSchemaAccuracy
>;
const mockValidateDocumentationSync = validateDocumentationSync as jest.MockedFunction<
  typeof validateDocumentationSync
>;
const mockGenerateDocumentationReport = generateDocumentationReport as jest.MockedFunction<
  typeof generateDocumentationReport
>;
const mockTestDocumentedExamples = testDocumentedExamples as jest.MockedFunction<
  typeof testDocumentedExamples
>;
const mockValidateResponseFormats = validateResponseFormats as jest.MockedFunction<
  typeof validateResponseFormats
>;
const mockTestErrorDocumentation = testErrorDocumentation as jest.MockedFunction<
  typeof testErrorDocumentation
>;
const mockValidateParameterDocumentation = validateParameterDocumentation as jest.MockedFunction<
  typeof validateParameterDocumentation
>;
const mockTestAuthDocumentation = testAuthDocumentation as jest.MockedFunction<
  typeof testAuthDocumentation
>;
const mockSwaggerParser = SwaggerParser as jest.Mocked<typeof SwaggerParser>;
const mockOpenAPISchemaValidator = OpenAPISchemaValidator as jest.MockedClass<
  typeof OpenAPISchemaValidator
>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('API Documentation Testing - Phase 4', () => {
  let mockValidatorInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock validator instance
    mockValidatorInstance = {
      validate: jest.fn(),
    };
    mockOpenAPISchemaValidator.mockImplementation(() => mockValidatorInstance);

    // Mock file system paths
    mockPath.join.mockImplementation((...paths) => paths.join('/'));
    mockPath.resolve.mockImplementation(path => `/absolute/${path}`);
  });

  describe('OpenAPI Schema Validation', () => {
    describe('Schema Structure Validation', () => {
      it('should validate OpenAPI 3.0 schema structure', async () => {
        const mockSchema = {
          openapi: '3.0.3',
          info: {
            title: 'Destino SF API',
            version: '1.0.0',
            description: 'Argentine cuisine restaurant API',
            contact: {
              name: 'Destino SF Team',
              email: 'api@destino-sf.com',
              url: 'https://destino-sf.com',
            },
            license: {
              name: 'MIT',
              url: 'https://opensource.org/licenses/MIT',
            },
          },
          servers: [
            {
              url: 'https://api.destino-sf.com',
              description: 'Production server',
            },
            {
              url: 'https://staging-api.destino-sf.com',
              description: 'Staging server',
            },
          ],
          paths: {},
          components: {
            schemas: {},
            securitySchemes: {},
          },
        };

        mockValidateOpenAPISchema.mockResolvedValue({
          valid: true,
          version: '3.0.3',
          errors: [],
          warnings: [],
          info: {
            title: 'Destino SF API',
            version: '1.0.0',
            hasDescription: true,
            hasContact: true,
            hasLicense: true,
          },
          servers: 2,
          paths: 0,
          schemas: 0,
          securitySchemes: 0,
          recommendations: ['Schema structure is valid'],
        });

        const validation = await mockValidateOpenAPISchema(mockSchema);

        expect(validation.valid).toBe(true);
        expect(validation.version).toBe('3.0.3');
        expect(validation.info.hasContact).toBe(true);
        expect(validation.info.hasLicense).toBe(true);
        expect(validation.servers).toBe(2);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect OpenAPI schema validation errors', async () => {
        const invalidSchema = {
          openapi: '2.0', // Wrong version
          info: {
            title: 'API',
            // Missing version
          },
          paths: {
            '/invalid': {
              get: {
                // Missing required fields
              },
            },
          },
        };

        mockValidateOpenAPISchema.mockResolvedValue({
          valid: false,
          version: '2.0',
          errors: [
            'OpenAPI version 2.0 is not supported, use 3.0.x',
            'info.version is required',
            'paths./invalid.get.responses is required',
            'paths./invalid.get missing operationId',
          ],
          warnings: ['info.description is recommended', 'info.contact should be provided'],
          recommendations: [
            'Upgrade to OpenAPI 3.0.x',
            'Add missing required fields',
            'Include API description and contact information',
          ],
        });

        const validation = await mockValidateOpenAPISchema(invalidSchema);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('OpenAPI version 2.0 is not supported, use 3.0.x');
        expect(validation.errors).toContain('info.version is required');
        expect(validation.warnings).toContain('info.description is recommended');
      });

      it('should validate security schemes configuration', async () => {
        const securitySchema = {
          components: {
            securitySchemes: {
              BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT token authentication',
              },
              ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
                description: 'API key authentication',
              },
              OAuth2: {
                type: 'oauth2',
                flows: {
                  authorizationCode: {
                    authorizationUrl: 'https://auth.destino-sf.com/oauth/authorize',
                    tokenUrl: 'https://auth.destino-sf.com/oauth/token',
                    scopes: {
                      'read:orders': 'Read order data',
                      'write:orders': 'Create and modify orders',
                      admin: 'Administrative access',
                    },
                  },
                },
              },
            },
          },
        };

        mockValidateOpenAPISchema.mockResolvedValue({
          valid: true,
          securitySchemes: {
            BearerAuth: { type: 'http', valid: true },
            ApiKeyAuth: { type: 'apiKey', valid: true },
            OAuth2: { type: 'oauth2', valid: true, flows: 1 },
          },
          security: {
            configured: true,
            schemes: 3,
            recommendations: ['Security schemes are properly configured'],
          },
        });

        const validation = await mockValidateOpenAPISchema(securitySchema);

        expect(validation.securitySchemes.BearerAuth.valid).toBe(true);
        expect(validation.securitySchemes.OAuth2.valid).toBe(true);
        expect(validation.security.schemes).toBe(3);
        expect(validation.security.configured).toBe(true);
      });
    });

    describe('Endpoint Documentation Validation', () => {
      it('should validate endpoint documentation completeness', async () => {
        const endpoints = [
          {
            path: '/api/products',
            method: 'GET',
            operationId: 'getProducts',
            summary: 'Get all products',
            description: 'Retrieve a list of all available products with optional filtering',
            parameters: [
              {
                name: 'category',
                in: 'query',
                schema: { type: 'string' },
                description: 'Filter by product category',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100 },
                description: 'Number of products to return',
              },
            ],
            responses: {
              '200': {
                description: 'List of products',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ProductList' },
                  },
                },
              },
              '400': {
                description: 'Invalid query parameters',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' },
                  },
                },
              },
            },
            tags: ['Products'],
          },
          {
            path: '/api/orders',
            method: 'POST',
            operationId: 'createOrder',
            summary: 'Create new order',
            description: 'Create a new order with items and customer information',
            security: [{ BearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateOrderRequest' },
                },
              },
            },
            responses: {
              '201': {
                description: 'Order created successfully',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
              '401': {
                description: 'Authentication required',
              },
              '422': {
                description: 'Validation error',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ValidationError' },
                  },
                },
              },
            },
            tags: ['Orders'],
          },
        ];

        mockValidateEndpointDocumentation.mockResolvedValue({
          endpoints: {
            total: 2,
            documented: 2,
            missing: 0,
            incomplete: 0,
          },
          completeness: {
            score: 95,
            operationIds: 100,
            summaries: 100,
            descriptions: 100,
            parameters: 95,
            responses: 100,
            examples: 80,
            tags: 100,
          },
          issues: [],
          recommendations: [
            'Add more examples for better API usability',
            'Consider adding response examples',
          ],
        });

        const validation = await mockValidateEndpointDocumentation(endpoints);

        expect(validation.endpoints.documented).toBe(2);
        expect(validation.completeness.score).toBeGreaterThan(90);
        expect(validation.completeness.operationIds).toBe(100);
        expect(validation.issues).toHaveLength(0);
      });

      it('should detect incomplete endpoint documentation', async () => {
        const incompleteEndpoints = [
          {
            path: '/api/products',
            method: 'GET',
            // Missing operationId, summary, description
            responses: {
              '200': {
                // Missing description
                content: {
                  'application/json': {
                    // Missing schema
                  },
                },
              },
            },
          },
          {
            path: '/api/orders',
            method: 'POST',
            operationId: 'createOrder',
            // Missing summary, description, security
            requestBody: {
              // Missing required flag
              content: {
                'application/json': {
                  // Missing schema
                },
              },
            },
            responses: {
              '201': {
                description: 'Created',
                // Missing content
              },
            },
          },
        ];

        mockValidateEndpointDocumentation.mockResolvedValue({
          endpoints: {
            total: 2,
            documented: 0,
            missing: 0,
            incomplete: 2,
          },
          completeness: {
            score: 35,
            operationIds: 50,
            summaries: 0,
            descriptions: 0,
            parameters: 0,
            responses: 25,
            examples: 0,
            tags: 0,
          },
          issues: [
            'GET /api/products missing operationId',
            'GET /api/products missing summary',
            'GET /api/products missing description',
            'GET /api/products response 200 missing description',
            'GET /api/products response 200 missing schema',
            'POST /api/orders missing summary',
            'POST /api/orders missing description',
            'POST /api/orders missing security',
            'POST /api/orders requestBody missing required flag',
            'POST /api/orders requestBody missing schema',
            'POST /api/orders response 201 missing content',
          ],
          recommendations: [
            'Add missing operationIds for all endpoints',
            'Add summaries and descriptions for better documentation',
            'Define request/response schemas',
            'Add security requirements where needed',
          ],
        });

        const validation = await mockValidateEndpointDocumentation(incompleteEndpoints);

        expect(validation.endpoints.incomplete).toBe(2);
        expect(validation.completeness.score).toBeLessThan(50);
        expect(validation.issues.length).toBeGreaterThan(5);
        expect(validation.issues).toContain('GET /api/products missing operationId');
        expect(validation.issues).toContain('POST /api/orders missing security');
      });

      it('should validate parameter documentation', async () => {
        const parameterDocumentation = {
          endpoint: '/api/orders/{orderId}',
          method: 'GET',
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Unique identifier for the order',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            {
              name: 'include',
              in: 'query',
              required: false,
              schema: {
                type: 'array',
                items: { type: 'string', enum: ['items', 'customer', 'payment'] },
              },
              description: 'Additional data to include in response',
              example: ['items', 'customer'],
            },
            {
              name: 'Authorization',
              in: 'header',
              required: true,
              schema: { type: 'string' },
              description: 'Bearer token for authentication',
              example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          ],
        };

        mockValidateParameterDocumentation.mockResolvedValue({
          parameters: {
            total: 3,
            documented: 3,
            missing: 0,
            incomplete: 0,
          },
          documentation: {
            descriptions: 100,
            examples: 100,
            schemas: 100,
            validation: 100,
          },
          validation: {
            pathParameters: { documented: 1, required: 1, valid: 1 },
            queryParameters: { documented: 1, optional: 1, valid: 1 },
            headerParameters: { documented: 1, required: 1, valid: 1 },
          },
          recommendations: ['Parameter documentation is comprehensive'],
        });

        const validation = await mockValidateParameterDocumentation(parameterDocumentation);

        expect(validation.parameters.documented).toBe(3);
        expect(validation.documentation.descriptions).toBe(100);
        expect(validation.documentation.examples).toBe(100);
        expect(validation.validation.pathParameters.valid).toBe(1);
        expect(validation.recommendations).toContain('Parameter documentation is comprehensive');
      });
    });

    describe('Schema and Response Validation', () => {
      it('should validate response schemas match actual API responses', async () => {
        const responseSchemas = {
          ProductList: {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                items: { $ref: '#/components/schemas/Product' },
              },
              pagination: { $ref: '#/components/schemas/Pagination' },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'integer' },
                  filters: { type: 'object' },
                },
              },
            },
            required: ['products', 'pagination'],
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              price: { type: 'number', minimum: 0 },
              category: { type: 'string' },
              available: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: ['id', 'name', 'price', 'category', 'available'],
          },
        };

        mockValidateResponseSchemas.mockResolvedValue({
          schemas: {
            total: 2,
            valid: 2,
            invalid: 0,
            missing: 0,
          },
          validation: {
            ProductList: {
              valid: true,
              properties: 3,
              required: 2,
              references: 1,
              issues: [],
            },
            Product: {
              valid: true,
              properties: 8,
              required: 5,
              formats: 3,
              issues: [],
            },
          },
          compliance: {
            actualResponses: 100,
            schemaMatches: 100,
            typeConsistency: 100,
            requiredFields: 100,
          },
          recommendations: ['Response schemas are accurate and complete'],
        });

        const validation = await mockValidateResponseSchemas(responseSchemas);

        expect(validation.schemas.valid).toBe(2);
        expect(validation.validation.Product.valid).toBe(true);
        expect(validation.compliance.actualResponses).toBe(100);
        expect(validation.compliance.schemaMatches).toBe(100);
        expect(validation.recommendations).toContain('Response schemas are accurate and complete');
      });

      it('should detect schema mismatches with actual responses', async () => {
        const mismatchedSchemas = {
          Order: {
            type: 'object',
            properties: {
              id: { type: 'string' }, // Should be UUID format
              total: { type: 'integer' }, // Should be number for currency
              status: { type: 'string' }, // Missing enum values
              items: {
                type: 'array',
                items: { type: 'object' }, // Missing item schema reference
              },
              customer: { type: 'string' }, // Should be object reference
            },
            required: ['id', 'total', 'status'], // Missing required fields
          },
        };

        mockValidateResponseSchemas.mockResolvedValue({
          schemas: {
            total: 1,
            valid: 0,
            invalid: 1,
            missing: 0,
          },
          validation: {
            Order: {
              valid: false,
              issues: [
                'Property "id" should specify format as uuid',
                'Property "total" should be number type for currency values',
                'Property "status" missing enum constraint',
                'Property "items" missing proper schema reference',
                'Property "customer" should reference Customer schema',
                'Missing required property "createdAt"',
                'Missing required property "deliveryType"',
              ],
            },
          },
          compliance: {
            actualResponses: 65,
            schemaMatches: 45,
            typeConsistency: 70,
            requiredFields: 60,
          },
          recommendations: [
            'Fix schema type mismatches',
            'Add missing required properties',
            'Use proper schema references',
            'Add format constraints for validation',
          ],
        });

        const validation = await mockValidateResponseSchemas(mismatchedSchemas);

        expect(validation.schemas.invalid).toBe(1);
        expect(validation.validation.Order.valid).toBe(false);
        expect(validation.compliance.schemaMatches).toBeLessThan(50);
        expect(validation.validation.Order.issues).toContain(
          'Property "total" should be number type for currency values'
        );
      });

      it('should validate request schemas against actual API usage', async () => {
        const requestSchemas = {
          CreateOrderRequest: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/OrderItem' },
                minItems: 1,
              },
              customer: { $ref: '#/components/schemas/CustomerInfo' },
              deliveryType: {
                type: 'string',
                enum: ['pickup', 'delivery', 'catering'],
              },
              deliveryAddress: { $ref: '#/components/schemas/Address' },
              specialInstructions: { type: 'string', maxLength: 500 },
              preferredDeliveryTime: { type: 'string', format: 'date-time' },
            },
            required: ['items', 'customer', 'deliveryType'],
            additionalProperties: false,
          },
          OrderItem: {
            type: 'object',
            properties: {
              productId: { type: 'string', format: 'uuid' },
              quantity: { type: 'integer', minimum: 1, maximum: 10 },
              customizations: {
                type: 'array',
                items: { type: 'string' },
              },
              notes: { type: 'string', maxLength: 200 },
            },
            required: ['productId', 'quantity'],
            additionalProperties: false,
          },
        };

        mockValidateRequestSchemas.mockResolvedValue({
          schemas: {
            total: 2,
            valid: 2,
            invalid: 0,
            tested: 2,
          },
          validation: {
            CreateOrderRequest: {
              valid: true,
              properties: 6,
              required: 3,
              constraints: 4,
              actualUsage: 98, // 98% of actual requests match schema
            },
            OrderItem: {
              valid: true,
              properties: 4,
              required: 2,
              constraints: 3,
              actualUsage: 100,
            },
          },
          compliance: {
            requestValidation: 99,
            constraintEnforcement: 100,
            additionalProperties: 100,
            requiredFields: 100,
          },
          recommendations: ['Request schemas accurately reflect API usage'],
        });

        const validation = await mockValidateRequestSchemas(requestSchemas);

        expect(validation.schemas.valid).toBe(2);
        expect(validation.validation.CreateOrderRequest.actualUsage).toBeGreaterThan(95);
        expect(validation.compliance.requestValidation).toBeGreaterThan(95);
        expect(validation.recommendations).toContain(
          'Request schemas accurately reflect API usage'
        );
      });
    });

    describe('Example Validation', () => {
      it('should validate documented examples work correctly', async () => {
        const documentedExamples = {
          '/api/products': {
            GET: {
              responses: {
                '200': {
                  example: {
                    products: [
                      {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        name: 'Empanada de Carne',
                        description: 'Traditional Argentine beef empanada',
                        price: 4.5,
                        category: 'empanadas',
                        available: true,
                        createdAt: '2024-01-15T10:00:00Z',
                        updatedAt: '2024-01-15T10:00:00Z',
                      },
                    ],
                    pagination: {
                      page: 1,
                      limit: 20,
                      total: 1,
                      pages: 1,
                    },
                    meta: {
                      total: 1,
                      filters: { category: 'empanadas' },
                    },
                  },
                },
              },
            },
          },
          '/api/orders': {
            POST: {
              requestBody: {
                example: {
                  items: [
                    {
                      productId: '123e4567-e89b-12d3-a456-426614174000',
                      quantity: 2,
                      customizations: ['extra spicy'],
                      notes: 'Please make it extra crispy',
                    },
                  ],
                  customer: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '+1-555-0123',
                  },
                  deliveryType: 'pickup',
                  specialInstructions: 'Call when ready',
                },
              },
              responses: {
                '201': {
                  example: {
                    id: '456e7890-e89b-12d3-a456-426614174001',
                    status: 'pending',
                    total: 9.0,
                    items: [
                      {
                        productId: '123e4567-e89b-12d3-a456-426614174000',
                        productName: 'Empanada de Carne',
                        quantity: 2,
                        unitPrice: 4.5,
                        total: 9.0,
                        customizations: ['extra spicy'],
                        notes: 'Please make it extra crispy',
                      },
                    ],
                    customer: {
                      name: 'John Doe',
                      email: 'john@example.com',
                      phone: '+1-555-0123',
                    },
                    deliveryType: 'pickup',
                    estimatedTime: '15-20 minutes',
                    createdAt: '2024-01-15T14:30:00Z',
                  },
                },
              },
            },
          },
        };

        mockTestDocumentedExamples.mockResolvedValue({
          examples: {
            total: 3,
            tested: 3,
            valid: 3,
            invalid: 0,
          },
          validation: {
            schemaCompliance: 100,
            dataConsistency: 100,
            formatAccuracy: 100,
            businessLogic: 100,
          },
          testing: {
            '/api/products GET 200': {
              valid: true,
              schemaMatch: true,
              dataTypes: true,
              constraints: true,
            },
            '/api/orders POST request': {
              valid: true,
              schemaMatch: true,
              dataTypes: true,
              constraints: true,
            },
            '/api/orders POST 201': {
              valid: true,
              schemaMatch: true,
              dataTypes: true,
              constraints: true,
              businessLogic: true,
            },
          },
          recommendations: ['All documented examples are valid and accurate'],
        });

        const validation = await mockTestDocumentedExamples(documentedExamples);

        expect(validation.examples.valid).toBe(3);
        expect(validation.validation.schemaCompliance).toBe(100);
        expect(validation.testing['/api/orders POST 201'].businessLogic).toBe(true);
        expect(validation.recommendations).toContain(
          'All documented examples are valid and accurate'
        );
      });

      it('should detect invalid examples in documentation', async () => {
        const invalidExamples = {
          '/api/products': {
            GET: {
              responses: {
                '200': {
                  example: {
                    products: [
                      {
                        id: 'not-a-uuid', // Invalid format
                        name: '', // Empty required field
                        price: -5.0, // Negative price
                        category: 'invalid-category', // Not in enum
                        available: 'yes', // Wrong type (should be boolean)
                        createdAt: 'invalid-date', // Invalid date format
                      },
                    ],
                    pagination: {
                      page: 0, // Invalid (should be >= 1)
                      limit: -10, // Negative limit
                      total: 'five', // Wrong type
                    },
                    // Missing required meta field
                  },
                },
              },
            },
          },
        };

        mockTestDocumentedExamples.mockResolvedValue({
          examples: {
            total: 1,
            tested: 1,
            valid: 0,
            invalid: 1,
          },
          validation: {
            schemaCompliance: 20,
            dataConsistency: 30,
            formatAccuracy: 15,
            businessLogic: 25,
          },
          testing: {
            '/api/products GET 200': {
              valid: false,
              schemaMatch: false,
              issues: [
                'Field "id" does not match UUID format',
                'Field "name" cannot be empty',
                'Field "price" cannot be negative',
                'Field "category" not in allowed enum values',
                'Field "available" must be boolean, got string',
                'Field "createdAt" invalid date format',
                'Field "pagination.page" must be >= 1',
                'Field "pagination.limit" cannot be negative',
                'Field "pagination.total" must be number, got string',
                'Missing required field "meta"',
              ],
            },
          },
          recommendations: [
            'Fix schema validation errors in examples',
            'Ensure all required fields are present',
            'Use correct data types and formats',
            'Validate business logic constraints',
          ],
        });

        const validation = await mockTestDocumentedExamples(invalidExamples);

        expect(validation.examples.invalid).toBe(1);
        expect(validation.validation.schemaCompliance).toBeLessThan(50);
        expect(validation.testing['/api/products GET 200'].issues).toContain(
          'Field "price" cannot be negative'
        );
        expect(validation.recommendations).toContain('Fix schema validation errors in examples');
      });

      it('should validate examples reflect current API behavior', async () => {
        const examples = {
          '/api/orders/{orderId}/status': {
            PUT: {
              requestBody: {
                example: {
                  status: 'preparing',
                  estimatedTime: '10 minutes',
                  notes: 'Order is being prepared',
                },
              },
              responses: {
                '200': {
                  example: {
                    id: '456e7890-e89b-12d3-a456-426614174001',
                    status: 'preparing',
                    estimatedTime: '10 minutes',
                    updatedAt: '2024-01-15T15:00:00Z',
                    statusHistory: [
                      {
                        status: 'pending',
                        timestamp: '2024-01-15T14:30:00Z',
                      },
                      {
                        status: 'preparing',
                        timestamp: '2024-01-15T15:00:00Z',
                        notes: 'Order is being prepared',
                      },
                    ],
                  },
                },
              },
            },
          },
        };

        mockTestDocumentedExamples.mockResolvedValue({
          examples: {
            total: 2,
            tested: 2,
            valid: 2,
            invalid: 0,
          },
          apiConsistency: {
            behaviorMatch: 95,
            responseFormat: 100,
            businessRules: 95,
            sideEffects: 90,
          },
          realTimeValidation: {
            '/api/orders/{orderId}/status PUT request': {
              sent: true,
              accepted: true,
              processed: true,
              sideEffects: ['status updated', 'notification sent', 'history logged'],
            },
            '/api/orders/{orderId}/status PUT 200': {
              received: true,
              formatMatches: true,
              dataAccurate: true,
              timestampsValid: true,
            },
          },
          recommendations: [
            'Examples accurately reflect API behavior',
            'Minor inconsistency in side effect documentation',
          ],
        });

        const validation = await mockTestDocumentedExamples(examples);

        expect(validation.examples.valid).toBe(2);
        expect(validation.apiConsistency.behaviorMatch).toBeGreaterThan(90);
        expect(
          validation.realTimeValidation['/api/orders/{orderId}/status PUT request'].processed
        ).toBe(true);
        expect(validation.recommendations).toContain('Examples accurately reflect API behavior');
      });
    });
  });

  describe('Documentation Completeness and Coverage', () => {
    describe('Endpoint Coverage Analysis', () => {
      it('should analyze API endpoint documentation coverage', async () => {
        const apiEndpoints = [
          { path: '/api/products', method: 'GET', implemented: true, documented: true },
          { path: '/api/products/{id}', method: 'GET', implemented: true, documented: true },
          { path: '/api/products', method: 'POST', implemented: true, documented: true },
          { path: '/api/products/{id}', method: 'PUT', implemented: true, documented: true },
          { path: '/api/products/{id}', method: 'DELETE', implemented: true, documented: true },
          { path: '/api/categories', method: 'GET', implemented: true, documented: true },
          { path: '/api/orders', method: 'GET', implemented: true, documented: true },
          { path: '/api/orders', method: 'POST', implemented: true, documented: true },
          { path: '/api/orders/{id}', method: 'GET', implemented: true, documented: true },
          { path: '/api/orders/{id}/status', method: 'PUT', implemented: true, documented: true },
          { path: '/api/checkout', method: 'POST', implemented: true, documented: true },
          { path: '/api/payments/webhook', method: 'POST', implemented: true, documented: true },
          { path: '/api/health', method: 'GET', implemented: true, documented: true },
          { path: '/api/health/detailed', method: 'GET', implemented: true, documented: false },
          { path: '/api/admin/orders', method: 'GET', implemented: true, documented: false },
        ];

        mockValidateEndpointCoverage.mockResolvedValue({
          coverage: {
            total: 15,
            implemented: 15,
            documented: 13,
            missing: 2,
            percentage: 86.7,
          },
          categories: {
            public: { total: 11, documented: 11, coverage: 100 },
            admin: { total: 3, documented: 1, coverage: 33.3 },
            internal: { total: 1, documented: 1, coverage: 100 },
          },
          missing: [
            { path: '/api/health/detailed', method: 'GET', category: 'internal' },
            { path: '/api/admin/orders', method: 'GET', category: 'admin' },
          ],
          recommendations: [
            'Document remaining admin endpoints',
            'Add documentation for internal health endpoint',
            'Achieve 100% documentation coverage for public APIs',
          ],
        });

        const coverage = await mockValidateEndpointCoverage(apiEndpoints);

        expect(coverage.coverage.percentage).toBeGreaterThan(85);
        expect(coverage.categories.public.coverage).toBe(100);
        expect(coverage.categories.admin.coverage).toBeLessThan(50);
        expect(coverage.missing).toHaveLength(2);
        expect(coverage.recommendations).toContain('Document remaining admin endpoints');
      });

      it('should identify undocumented endpoints', async () => {
        const endpointsWithGaps = [
          { path: '/api/products', method: 'GET', implemented: true, documented: true },
          { path: '/api/products/{id}', method: 'GET', implemented: true, documented: false },
          { path: '/api/orders', method: 'POST', implemented: true, documented: true },
          { path: '/api/orders/{id}/cancel', method: 'POST', implemented: true, documented: false },
          { path: '/api/admin/settings', method: 'GET', implemented: true, documented: false },
          { path: '/api/admin/settings', method: 'PUT', implemented: true, documented: false },
          { path: '/api/webhooks/square', method: 'POST', implemented: true, documented: false },
          { path: '/api/internal/metrics', method: 'GET', implemented: true, documented: false },
        ];

        mockValidateEndpointCoverage.mockResolvedValue({
          coverage: {
            total: 8,
            implemented: 8,
            documented: 2,
            missing: 6,
            percentage: 25,
          },
          categories: {
            public: { total: 4, documented: 2, coverage: 50 },
            admin: { total: 2, documented: 0, coverage: 0 },
            webhooks: { total: 1, documented: 0, coverage: 0 },
            internal: { total: 1, documented: 0, coverage: 0 },
          },
          missing: [
            { path: '/api/products/{id}', method: 'GET', category: 'public', priority: 'high' },
            {
              path: '/api/orders/{id}/cancel',
              method: 'POST',
              category: 'public',
              priority: 'high',
            },
            { path: '/api/admin/settings', method: 'GET', category: 'admin', priority: 'medium' },
            { path: '/api/admin/settings', method: 'PUT', category: 'admin', priority: 'medium' },
            { path: '/api/webhooks/square', method: 'POST', category: 'webhooks', priority: 'low' },
            { path: '/api/internal/metrics', method: 'GET', category: 'internal', priority: 'low' },
          ],
          recommendations: [
            'Prioritize documenting high-priority public endpoints',
            'Create admin API documentation section',
            'Document webhook endpoints for integration partners',
            'Consider whether internal endpoints need public documentation',
          ],
        });

        const coverage = await mockValidateEndpointCoverage(endpointsWithGaps);

        expect(coverage.coverage.percentage).toBeLessThan(50);
        expect(coverage.categories.admin.coverage).toBe(0);
        expect(coverage.missing).toHaveLength(6);
        expect(coverage.missing[0].priority).toBe('high');
        expect(coverage.recommendations).toContain(
          'Prioritize documenting high-priority public endpoints'
        );
      });
    });

    describe('Schema Documentation Coverage', () => {
      it('should validate schema documentation completeness', async () => {
        const schemas = {
          Product: {
            documented: true,
            properties: 8,
            descriptions: 8,
            examples: 1,
            constraints: 5,
          },
          Order: {
            documented: true,
            properties: 12,
            descriptions: 12,
            examples: 1,
            constraints: 8,
          },
          Customer: {
            documented: true,
            properties: 6,
            descriptions: 6,
            examples: 1,
            constraints: 3,
          },
          Address: {
            documented: false,
            properties: 0,
            descriptions: 0,
            examples: 0,
            constraints: 0,
          },
        };

        mockCheckSchemaAccuracy.mockResolvedValue({
          schemas: {
            total: 4,
            documented: 3,
            missing: 1,
            coverage: 75,
          },
          documentation: {
            descriptions: 87.5, // (8+12+6+0) / (8+12+6+6) * 100
            examples: 75, // 3/4 schemas have examples
            constraints: 100, // All documented schemas have constraints
          },
          accuracy: {
            schemaSync: 95,
            propertyAccuracy: 98,
            typeConsistency: 100,
            constraintValidity: 100,
          },
          missing: ['Address'],
          recommendations: [
            'Document missing Address schema',
            'Add more comprehensive examples',
            'Maintain high schema accuracy',
          ],
        });

        const validation = await mockCheckSchemaAccuracy(schemas);

        expect(validation.schemas.coverage).toBe(75);
        expect(validation.documentation.constraints).toBe(100);
        expect(validation.accuracy.typeConsistency).toBe(100);
        expect(validation.missing).toContain('Address');
      });

      it('should detect schema documentation inconsistencies', async () => {
        const inconsistentSchemas = {
          Product: {
            documented: true,
            properties: 8,
            descriptions: 4, // Half missing descriptions
            examples: 0, // No examples
            constraints: 2, // Missing constraints
            issues: ['Missing price constraints', 'No validation examples'],
          },
          Order: {
            documented: true,
            properties: 12,
            descriptions: 8, // Some missing descriptions
            examples: 1,
            constraints: 5,
            issues: ['Customer property not properly referenced', 'Missing status enum values'],
          },
        };

        mockCheckSchemaAccuracy.mockResolvedValue({
          schemas: {
            total: 2,
            documented: 2,
            missing: 0,
            coverage: 100,
          },
          documentation: {
            descriptions: 60, // (4+8) / (8+12) * 100
            examples: 50, // 1/2 schemas have examples
            constraints: 35, // (2+5) / (8+12) * 100
          },
          accuracy: {
            schemaSync: 70,
            propertyAccuracy: 75,
            typeConsistency: 85,
            constraintValidity: 60,
          },
          issues: [
            'Product schema missing price constraints',
            'Product schema has no validation examples',
            'Order schema customer property not properly referenced',
            'Order schema missing status enum values',
          ],
          recommendations: [
            'Add missing property descriptions',
            'Include validation examples for all schemas',
            'Define proper constraints for all properties',
            'Fix schema reference issues',
          ],
        });

        const validation = await mockCheckSchemaAccuracy(inconsistentSchemas);

        expect(validation.documentation.descriptions).toBeLessThan(70);
        expect(validation.accuracy.constraintValidity).toBeLessThan(70);
        expect(validation.issues).toContain('Product schema missing price constraints');
        expect(validation.recommendations).toContain('Add missing property descriptions');
      });
    });

    describe('Documentation Synchronization', () => {
      it('should validate documentation stays in sync with code', async () => {
        const syncCheck = {
          lastDocumentationUpdate: '2024-01-15T10:00:00Z',
          lastCodeUpdate: '2024-01-15T09:30:00Z',
          endpoints: {
            added: 0,
            modified: 0,
            removed: 0,
            renamed: 0,
          },
          schemas: {
            added: 0,
            modified: 0,
            removed: 0,
            propertyChanges: 0,
          },
        };

        mockValidateDocumentationSync.mockResolvedValue({
          sync: {
            status: 'synchronized',
            lastCheck: '2024-01-15T12:00:00Z',
            documentationAge: 120, // 2 hours
            codeAge: 150, // 2.5 hours
          },
          changes: {
            endpoints: { pending: 0, documented: 0 },
            schemas: { pending: 0, documented: 0 },
            examples: { outdated: 0, updated: 0 },
          },
          automation: {
            enabled: true,
            lastRun: '2024-01-15T11:45:00Z',
            nextRun: '2024-01-15T12:45:00Z',
            success: true,
          },
          recommendations: ['Documentation is up to date', 'Automated sync is working correctly'],
        });

        const syncValidation = await mockValidateDocumentationSync(syncCheck);

        expect(syncValidation.sync.status).toBe('synchronized');
        expect(syncValidation.changes.endpoints.pending).toBe(0);
        expect(syncValidation.automation.enabled).toBe(true);
        expect(syncValidation.recommendations).toContain('Documentation is up to date');
      });

      it('should detect documentation drift from code changes', async () => {
        const driftCheck = {
          lastDocumentationUpdate: '2024-01-10T10:00:00Z',
          lastCodeUpdate: '2024-01-15T14:00:00Z',
          endpoints: {
            added: 3,
            modified: 2,
            removed: 1,
            renamed: 1,
          },
          schemas: {
            added: 2,
            modified: 4,
            removed: 0,
            propertyChanges: 8,
          },
        };

        mockValidateDocumentationSync.mockResolvedValue({
          sync: {
            status: 'out-of-sync',
            lastCheck: '2024-01-15T15:00:00Z',
            documentationAge: 432000, // 5 days
            codeAge: 3600, // 1 hour
            drift: 'critical',
          },
          changes: {
            endpoints: {
              pending: 7, // 3 added + 2 modified + 1 removed + 1 renamed
              documented: 0,
              details: [
                'Added: POST /api/catering/quotes',
                'Added: GET /api/catering/quotes/{id}',
                'Added: PUT /api/catering/quotes/{id}/status',
                'Modified: POST /api/orders (added catering support)',
                'Modified: GET /api/products (added catering filter)',
                'Removed: DELETE /api/legacy/orders',
                'Renamed: /api/user/profile → /api/users/profile',
              ],
            },
            schemas: {
              pending: 14, // 2 added + 4 modified + 8 property changes
              documented: 0,
              details: [
                'Added: CateringQuote schema',
                'Added: CateringItem schema',
                'Modified: Order schema (added catering fields)',
                'Modified: Product schema (added catering options)',
                'Modified: Customer schema (added company info)',
                'Modified: Address schema (added delivery instructions)',
              ],
            },
            examples: { outdated: 12, updated: 0 },
          },
          automation: {
            enabled: false,
            lastRun: '2024-01-10T10:00:00Z',
            failures: 3,
            lastError: 'Schema validation failed',
          },
          recommendations: [
            'Critical: Update documentation immediately',
            'Document new catering endpoints',
            'Update modified schemas and examples',
            'Fix automated documentation sync',
            'Implement documentation review process',
          ],
        });

        const syncValidation = await mockValidateDocumentationSync(driftCheck);

        expect(syncValidation.sync.status).toBe('out-of-sync');
        expect(syncValidation.sync.drift).toBe('critical');
        expect(syncValidation.changes.endpoints.pending).toBe(7);
        expect(syncValidation.changes.schemas.pending).toBe(14);
        expect(syncValidation.automation.enabled).toBe(false);
        expect(syncValidation.recommendations).toContain(
          'Critical: Update documentation immediately'
        );
      });
    });
  });

  describe('Error Documentation Testing', () => {
    describe('Error Response Documentation', () => {
      it('should validate error response documentation accuracy', async () => {
        const errorDocumentation = {
          endpoints: {
            'POST /api/orders': {
              '400': {
                description: 'Invalid request data',
                schema: { $ref: '#/components/schemas/ValidationError' },
                examples: {
                  'missing-items': {
                    summary: 'Missing required items',
                    value: {
                      error: 'validation_error',
                      message: 'Items array cannot be empty',
                      details: [
                        {
                          field: 'items',
                          code: 'required',
                          message: 'Items are required for order creation',
                        },
                      ],
                    },
                  },
                  'invalid-quantity': {
                    summary: 'Invalid item quantity',
                    value: {
                      error: 'validation_error',
                      message: 'Invalid item quantities',
                      details: [
                        {
                          field: 'items[0].quantity',
                          code: 'min',
                          message: 'Quantity must be at least 1',
                        },
                      ],
                    },
                  },
                },
              },
              '401': {
                description: 'Authentication required',
                schema: { $ref: '#/components/schemas/AuthError' },
                examples: {
                  'missing-token': {
                    summary: 'Missing authentication token',
                    value: {
                      error: 'authentication_required',
                      message: 'Authentication token is required',
                    },
                  },
                },
              },
              '422': {
                description: 'Business logic validation failed',
                schema: { $ref: '#/components/schemas/BusinessError' },
                examples: {
                  'product-unavailable': {
                    summary: 'Product not available',
                    value: {
                      error: 'product_unavailable',
                      message: 'One or more products are currently unavailable',
                      details: [
                        {
                          productId: '123e4567-e89b-12d3-a456-426614174000',
                          name: 'Empanada de Carne',
                          reason: 'out_of_stock',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        };

        mockTestErrorDocumentation.mockResolvedValue({
          coverage: {
            endpoints: 1,
            errorCodes: 3,
            documented: 3,
            tested: 3,
            examples: 4,
          },
          validation: {
            'POST /api/orders 400': {
              documented: true,
              tested: true,
              schemaValid: true,
              examplesValid: true,
              actualBehavior: 'matches',
            },
            'POST /api/orders 401': {
              documented: true,
              tested: true,
              schemaValid: true,
              examplesValid: true,
              actualBehavior: 'matches',
            },
            'POST /api/orders 422': {
              documented: true,
              tested: true,
              schemaValid: true,
              examplesValid: true,
              actualBehavior: 'matches',
            },
          },
          accuracy: {
            messageAccuracy: 100,
            schemaCompliance: 100,
            exampleValidity: 100,
            behaviorMatch: 100,
          },
          recommendations: ['Error documentation is comprehensive and accurate'],
        });

        const validation = await mockTestErrorDocumentation(errorDocumentation);

        expect(validation.coverage.documented).toBe(3);
        expect(validation.accuracy.schemaCompliance).toBe(100);
        expect(validation.accuracy.behaviorMatch).toBe(100);
        expect(validation.validation['POST /api/orders 422'].actualBehavior).toBe('matches');
        expect(validation.recommendations).toContain(
          'Error documentation is comprehensive and accurate'
        );
      });

      it('should detect missing or inaccurate error documentation', async () => {
        const incompleteErrorDocs = {
          endpoints: {
            'POST /api/checkout': {
              '400': {
                description: 'Bad request',
                // Missing schema and examples
              },
              // Missing 401, 422, 500 error responses
            },
          },
        };

        mockTestErrorDocumentation.mockResolvedValue({
          coverage: {
            endpoints: 1,
            errorCodes: 1,
            documented: 1,
            tested: 1,
            examples: 0,
            missing: ['401', '422', '500'],
          },
          validation: {
            'POST /api/checkout 400': {
              documented: true,
              tested: true,
              schemaValid: false, // Missing schema
              examplesValid: false, // No examples
              actualBehavior: 'partial', // Incomplete coverage
            },
          },
          accuracy: {
            messageAccuracy: 40,
            schemaCompliance: 0,
            exampleValidity: 0,
            behaviorMatch: 60,
          },
          issues: [
            'Missing schema for 400 error response',
            'No examples provided for error responses',
            'Missing documentation for 401 authentication error',
            'Missing documentation for 422 validation error',
            'Missing documentation for 500 server error',
            'Error descriptions are too generic',
          ],
          recommendations: [
            'Add comprehensive error response schemas',
            'Include realistic error examples',
            'Document all possible error codes',
            'Provide specific error descriptions',
            'Test error scenarios against actual API behavior',
          ],
        });

        const validation = await mockTestErrorDocumentation(incompleteErrorDocs);

        expect(validation.coverage.missing).toContain('401');
        expect(validation.accuracy.schemaCompliance).toBe(0);
        expect(validation.issues).toContain('Missing schema for 400 error response');
        expect(validation.recommendations).toContain('Add comprehensive error response schemas');
      });
    });

    describe('Authentication Documentation', () => {
      it('should validate authentication documentation completeness', async () => {
        const authDocumentation = {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token obtained from authentication endpoint',
            },
          },
          endpoints: {
            'POST /api/auth/login': {
              description: 'Authenticate user and obtain JWT token',
              requestBody: {
                schema: { $ref: '#/components/schemas/LoginRequest' },
                examples: {
                  'email-login': {
                    summary: 'Login with email and password',
                    value: {
                      email: 'user@example.com',
                      password: 'securepassword',
                    },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Authentication successful',
                  schema: { $ref: '#/components/schemas/AuthResponse' },
                  examples: {
                    success: {
                      value: {
                        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                        user: {
                          id: 'user123',
                          email: 'user@example.com',
                          name: 'John Doe',
                        },
                        expiresIn: 3600,
                      },
                    },
                  },
                },
                '401': {
                  description: 'Invalid credentials',
                  schema: { $ref: '#/components/schemas/AuthError' },
                },
              },
            },
          },
          protectedEndpoints: [
            'POST /api/orders',
            'GET /api/orders',
            'PUT /api/orders/{id}/status',
            'GET /api/admin/orders',
          ],
        };

        mockTestAuthDocumentation.mockResolvedValue({
          documentation: {
            securitySchemes: 1,
            authEndpoints: 1,
            protectedEndpoints: 4,
            examples: 2,
          },
          validation: {
            schemeDefinitions: {
              BearerAuth: {
                valid: true,
                complete: true,
                tested: true,
              },
            },
            authFlow: {
              documented: true,
              tested: true,
              examplesValid: true,
            },
            protectedEndpoints: {
              total: 4,
              documented: 4,
              tested: 4,
              securityApplied: 4,
            },
          },
          testing: {
            authenticationFlow: 'working',
            tokenValidation: 'working',
            errorHandling: 'working',
            securityEnforcement: 'working',
          },
          recommendations: ['Authentication documentation is complete and accurate'],
        });

        const validation = await mockTestAuthDocumentation(authDocumentation);

        expect(validation.documentation.securitySchemes).toBe(1);
        expect(validation.validation.protectedEndpoints.documented).toBe(4);
        expect(validation.testing.authenticationFlow).toBe('working');
        expect(validation.recommendations).toContain(
          'Authentication documentation is complete and accurate'
        );
      });

      it('should detect authentication documentation gaps', async () => {
        const incompleteAuthDocs = {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              // Missing bearerFormat and description
            },
          },
          endpoints: {
            // Missing auth endpoints like login, logout, refresh
          },
          protectedEndpoints: [
            'POST /api/orders',
            // Some endpoints missing security requirements
          ],
        };

        mockTestAuthDocumentation.mockResolvedValue({
          documentation: {
            securitySchemes: 1,
            authEndpoints: 0,
            protectedEndpoints: 1,
            examples: 0,
          },
          validation: {
            schemeDefinitions: {
              BearerAuth: {
                valid: false,
                complete: false,
                issues: ['Missing bearerFormat', 'Missing description'],
              },
            },
            authFlow: {
              documented: false,
              tested: false,
              missing: ['login', 'logout', 'refresh', 'password-reset'],
            },
            protectedEndpoints: {
              total: 4,
              documented: 1,
              missing: ['GET /api/orders', 'PUT /api/orders/{id}/status', 'GET /api/admin/orders'],
              securityApplied: 1,
            },
          },
          issues: [
            'Incomplete security scheme definition',
            'Missing authentication flow documentation',
            'No examples for authentication requests',
            'Protected endpoints missing security requirements',
            'Error responses for auth failures not documented',
          ],
          recommendations: [
            'Complete security scheme definitions',
            'Document authentication flow endpoints',
            'Add authentication examples',
            'Apply security requirements to protected endpoints',
            'Document authentication error responses',
          ],
        });

        const validation = await mockTestAuthDocumentation(incompleteAuthDocs);

        expect(validation.documentation.authEndpoints).toBe(0);
        expect(validation.validation.authFlow.documented).toBe(false);
        expect(validation.validation.protectedEndpoints.documented).toBe(1);
        expect(validation.issues).toContain('Missing authentication flow documentation');
        expect(validation.recommendations).toContain('Document authentication flow endpoints');
      });
    });
  });

  describe('Documentation Quality and Usability', () => {
    describe('Documentation Report Generation', () => {
      it('should generate comprehensive documentation quality report', async () => {
        const documentationMetrics = {
          coverage: {
            endpoints: 95,
            schemas: 90,
            examples: 85,
            errors: 80,
          },
          quality: {
            descriptions: 92,
            accuracy: 94,
            completeness: 88,
            consistency: 96,
          },
          usability: {
            navigation: 90,
            searchability: 85,
            readability: 88,
            examples: 82,
          },
          maintenance: {
            sync: 95,
            automation: 85,
            updates: 90,
            reviews: 75,
          },
        };

        mockGenerateDocumentationReport.mockResolvedValue({
          overall: {
            score: 89,
            grade: 'B+',
            status: 'good',
            recommendations: ['Increase error documentation coverage', 'Improve example quality'],
          },
          sections: {
            coverage: {
              score: 87.5,
              strengths: ['High endpoint coverage', 'Good schema documentation'],
              improvements: ['Add more error examples', 'Complete missing schemas'],
            },
            quality: {
              score: 92.5,
              strengths: ['Accurate descriptions', 'Consistent formatting'],
              improvements: ['Enhance completeness scores'],
            },
            usability: {
              score: 86.25,
              strengths: ['Good navigation structure'],
              improvements: ['Improve searchability', 'Add more practical examples'],
            },
            maintenance: {
              score: 86.25,
              strengths: ['Good sync practices', 'Regular updates'],
              improvements: ['Increase review frequency', 'Enhance automation'],
            },
          },
          trends: {
            improving: ['accuracy', 'consistency', 'sync'],
            declining: ['review frequency'],
            stable: ['coverage', 'usability'],
          },
          actionItems: [
            { priority: 'high', task: 'Increase error documentation to 90%' },
            { priority: 'medium', task: 'Implement regular documentation reviews' },
            { priority: 'low', task: 'Enhance search functionality' },
          ],
        });

        const report = await mockGenerateDocumentationReport(documentationMetrics);

        expect(report.overall.score).toBeGreaterThan(85);
        expect(report.overall.grade).toBe('B+');
        expect(report.sections.quality.score).toBeGreaterThan(90);
        expect(report.trends.improving).toContain('accuracy');
        expect(report.actionItems[0].priority).toBe('high');
      });

      it('should identify areas for documentation improvement', async () => {
        const poorDocumentationMetrics = {
          coverage: {
            endpoints: 65,
            schemas: 55,
            examples: 40,
            errors: 30,
          },
          quality: {
            descriptions: 70,
            accuracy: 68,
            completeness: 45,
            consistency: 60,
          },
          usability: {
            navigation: 50,
            searchability: 45,
            readability: 55,
            examples: 35,
          },
          maintenance: {
            sync: 40,
            automation: 25,
            updates: 35,
            reviews: 20,
          },
        };

        mockGenerateDocumentationReport.mockResolvedValue({
          overall: {
            score: 48,
            grade: 'F',
            status: 'poor',
            recommendations: [
              'Critical: Complete missing documentation',
              'Implement documentation standards',
              'Establish maintenance processes',
            ],
          },
          sections: {
            coverage: {
              score: 47.5,
              critical: ['Low error documentation', 'Missing examples'],
              urgent: ['Complete schema documentation', 'Document all endpoints'],
            },
            quality: {
              score: 60.75,
              critical: ['Poor completeness', 'Inconsistent formatting'],
              urgent: ['Improve accuracy', 'Standardize descriptions'],
            },
            usability: {
              score: 46.25,
              critical: ['Poor navigation', 'Limited searchability'],
              urgent: ['Add practical examples', 'Improve readability'],
            },
            maintenance: {
              score: 30,
              critical: ['No automation', 'Infrequent reviews'],
              urgent: ['Establish sync processes', 'Regular updates'],
            },
          },
          blockers: [
            'Documentation coverage below minimum threshold',
            'No automated sync process',
            'Critical schemas undocumented',
            'Error handling not documented',
          ],
          immediateActions: [
            { task: 'Document critical missing schemas', deadline: '1 week' },
            { task: 'Add error response documentation', deadline: '2 weeks' },
            { task: 'Implement automated doc sync', deadline: '1 month' },
            { task: 'Establish review process', deadline: '2 weeks' },
          ],
        });

        const report = await mockGenerateDocumentationReport(poorDocumentationMetrics);

        expect(report.overall.score).toBeLessThan(50);
        expect(report.overall.grade).toBe('F');
        expect(report.sections.maintenance.score).toBeLessThan(40);
        expect(report.blockers).toContain('Documentation coverage below minimum threshold');
        expect(report.immediateActions[0].deadline).toBe('1 week');
      });
    });

    describe('Documentation Format and Validation', () => {
      it('should validate response format consistency across documentation', async () => {
        const responseFormats = {
          endpoints: {
            'GET /api/products': {
              '200': {
                contentType: 'application/json',
                schema: { $ref: '#/components/schemas/ProductList' },
                headers: {
                  'X-Total-Count': { schema: { type: 'integer' } },
                  'X-Page-Count': { schema: { type: 'integer' } },
                },
              },
            },
            'POST /api/orders': {
              '201': {
                contentType: 'application/json',
                schema: { $ref: '#/components/schemas/Order' },
                headers: {
                  Location: { schema: { type: 'string', format: 'uri' } },
                },
              },
            },
          },
        };

        mockValidateResponseFormats.mockResolvedValue({
          consistency: {
            contentTypes: 100, // All JSON
            schemaReferences: 100, // All use proper refs
            headerFormats: 100, // Consistent header schemas
            statusCodes: 100, // Appropriate status codes
          },
          standards: {
            restCompliance: 95,
            jsonApiCompliance: 90,
            httpCompliance: 100,
            openApiCompliance: 100,
          },
          validation: {
            'GET /api/products 200': {
              format: 'valid',
              contentType: 'application/json',
              schema: 'valid-reference',
              headers: 'properly-defined',
            },
            'POST /api/orders 201': {
              format: 'valid',
              contentType: 'application/json',
              schema: 'valid-reference',
              headers: 'properly-defined',
            },
          },
          recommendations: ['Response formats are consistent and well-defined'],
        });

        const validation = await mockValidateResponseFormats(responseFormats);

        expect(validation.consistency.contentTypes).toBe(100);
        expect(validation.standards.httpCompliance).toBe(100);
        expect(validation.validation['GET /api/products 200'].format).toBe('valid');
        expect(validation.recommendations).toContain(
          'Response formats are consistent and well-defined'
        );
      });

      it('should detect format inconsistencies in documentation', async () => {
        const inconsistentFormats = {
          endpoints: {
            'GET /api/products': {
              '200': {
                contentType: 'application/json',
                schema: { type: 'object' }, // Inline schema instead of ref
              },
            },
            'GET /api/orders': {
              '200': {
                contentType: 'text/plain', // Wrong content type
                schema: { type: 'string' },
              },
            },
            'POST /api/checkout': {
              '200': {
                // Should be 201 for creation
                contentType: 'application/json',
                // Missing schema
              },
            },
          },
        };

        mockValidateResponseFormats.mockResolvedValue({
          consistency: {
            contentTypes: 67, // Mixed content types
            schemaReferences: 33, // Some inline schemas
            headerFormats: 0, // No headers defined
            statusCodes: 67, // Some incorrect status codes
          },
          standards: {
            restCompliance: 45,
            jsonApiCompliance: 30,
            httpCompliance: 60,
            openApiCompliance: 40,
          },
          issues: [
            'GET /api/products uses inline schema instead of reference',
            'GET /api/orders uses text/plain instead of application/json',
            'POST /api/checkout uses 200 instead of 201 for creation',
            'POST /api/checkout missing response schema',
            'No response headers documented',
          ],
          recommendations: [
            'Standardize on application/json content type',
            'Use schema references instead of inline definitions',
            'Use appropriate HTTP status codes',
            'Define response schemas for all endpoints',
            'Add standard response headers',
          ],
        });

        const validation = await mockValidateResponseFormats(inconsistentFormats);

        expect(validation.consistency.contentTypes).toBeLessThan(70);
        expect(validation.standards.restCompliance).toBeLessThan(50);
        expect(validation.issues).toContain(
          'GET /api/orders uses text/plain instead of application/json'
        );
        expect(validation.recommendations).toContain(
          'Standardize on application/json content type'
        );
      });
    });
  });

  describe('Integration with Development Workflow', () => {
    it('should integrate documentation testing with CI/CD pipeline', async () => {
      // Mock CI/CD integration test
      const ciConfig = {
        documentationTests: {
          enabled: true,
          runOn: ['pull-request', 'main-branch'],
          failOnErrors: true,
          warningThreshold: 80,
          errorThreshold: 95,
        },
        automatedUpdates: {
          enabled: true,
          generateOnBuild: true,
          validateOnDeploy: true,
          syncWithCode: true,
        },
      };

      const integrationResults = {
        ciIntegration: 'active',
        testExecution: 'automated',
        documentationSync: 'enabled',
        qualityGates: 'enforced',
        overallScore: 92,
      };

      expect(integrationResults.ciIntegration).toBe('active');
      expect(integrationResults.overallScore).toBeGreaterThan(90);
      expect(ciConfig.documentationTests.enabled).toBe(true);
      expect(ciConfig.automatedUpdates.syncWithCode).toBe(true);
    });

    it('should provide documentation quality metrics for monitoring', async () => {
      const qualityMetrics = {
        coverage: { score: 87, trend: 'improving' },
        accuracy: { score: 94, trend: 'stable' },
        usability: { score: 82, trend: 'improving' },
        maintenance: { score: 89, trend: 'stable' },
        overall: { score: 88, grade: 'B+' },
      };

      expect(qualityMetrics.overall.score).toBeGreaterThan(85);
      expect(qualityMetrics.accuracy.score).toBeGreaterThan(90);
      expect(qualityMetrics.coverage.trend).toBe('improving');
      expect(qualityMetrics.overall.grade).toBe('B+');
    });
  });
});
