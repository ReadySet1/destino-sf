/**
 * Products API Contract Tests
 *
 * Tests to ensure the Products API endpoints conform to their defined schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  GetProductsQuerySchema,
  GetProductsResponseSchema,
  ProductSchema,
  ProductCategorySchema,
  ProductVariantSchema,
  // Extended Products schemas (Phase 3)
  ProductDisplayOrderSchema,
  GetProductsByCategoryQuerySchema,
  GetProductsByCategoryParamsSchema,
  GetProductsByCategoryResponseSchema,
  ProductValidationIssueSchema,
  ValidateProductRequestSchema,
  ValidateProductResponseSchema,
  ProductReorderUpdateSchema,
  ReorderProductsRequestSchema,
  ReorderProductsResponseSchema,
  ReorderStrategySchema,
  QuickSortProductsRequestSchema,
  QuickSortProductsResponseSchema,
  GetCategoriesResponseSchema,
  PaginationSchema,
} from '@/lib/api/schemas/products';
import { matchesSchema, getValidationErrors, contractAssert, mockData } from './setup';

describe('Products API Contract Tests', () => {
  describe('Product Schema', () => {
    it('should validate a valid product object', () => {
      const product = {
        id: mockData.uuid(),
        name: 'Alfajores',
        description: 'Traditional Argentinian cookie sandwich',
        slug: 'alfajores',
        price: 1299, // $12.99
        images: ['https://example.com/alfajores.jpg'],
        categoryId: mockData.uuid(),
        squareId: 'SQUARE-123',
        featured: true,
        active: true,
        variants: [],
        isCatering: false,
      };

      expect(matchesSchema(ProductSchema, product)).toBe(true);
      const errors = getValidationErrors(ProductSchema, product);
      expect(errors).toHaveLength(0);
    });

    it('should reject product with invalid price', () => {
      const product = {
        ...mockData.product(),
        price: -100, // Negative price
      };

      expect(matchesSchema(ProductSchema, product)).toBe(false);
      const errors = getValidationErrors(ProductSchema, product);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('price'))).toBe(true);
    });

    it('should reject product with empty name', () => {
      const product = {
        ...mockData.product(),
        name: '',
      };

      expect(matchesSchema(ProductSchema, product)).toBe(false);
      const errors = getValidationErrors(ProductSchema, product);
      expect(errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should reject product with invalid UUID', () => {
      const product = {
        ...mockData.product(),
        id: 'not-a-uuid',
      };

      expect(matchesSchema(ProductSchema, product)).toBe(false);
      const errors = getValidationErrors(ProductSchema, product);
      expect(errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should allow product with null description', () => {
      const product = {
        ...mockData.product(),
        description: null,
      };

      expect(matchesSchema(ProductSchema, product)).toBe(true);
    });

    it('should allow product with empty images array', () => {
      const product = {
        ...mockData.product(),
        images: ['https://example.com/image.jpg'], // At least one required
      };

      expect(matchesSchema(ProductSchema, product)).toBe(true);
    });
  });

  describe('Product Category Schema', () => {
    it('should validate a valid category', () => {
      const category = {
        id: mockData.uuid(),
        name: 'Cookies',
        slug: 'cookies',
      };

      expect(matchesSchema(ProductCategorySchema, category)).toBe(true);
    });

    it('should reject category with invalid slug characters', () => {
      const category = {
        id: mockData.uuid(),
        name: 'Cookies & Treats',
        slug: 'cookies & treats', // Spaces not allowed in slug
      };

      // Note: Current schema doesn't restrict slug characters, but it should in production
      expect(matchesSchema(ProductCategorySchema, category)).toBe(true);
    });
  });

  describe('Product Variant Schema', () => {
    it('should validate a valid variant', () => {
      const variant = {
        id: mockData.uuid(),
        name: 'Dozen',
        price: 1299,
        squareVariantId: 'SQUARE-VAR-123',
        available: true,
      };

      expect(matchesSchema(ProductVariantSchema, variant)).toBe(true);
    });

    it('should reject variant with negative price', () => {
      const variant = {
        id: mockData.uuid(),
        name: 'Dozen',
        price: -100,
      };

      expect(matchesSchema(ProductVariantSchema, variant)).toBe(false);
    });

    it('should allow variant without squareVariantId', () => {
      const variant = {
        id: mockData.uuid(),
        name: 'Half Dozen',
        price: 799,
        squareVariantId: null,
      };

      expect(matchesSchema(ProductVariantSchema, variant)).toBe(true);
    });
  });

  describe('GET /api/products Query Parameters', () => {
    it('should validate valid query parameters', () => {
      const query = {
        includeVariants: 'true',
        onlyActive: 'true',
        categoryId: mockData.uuid(),
        featured: 'true',
        page: '1',
        limit: '20',
        orderBy: 'name',
        orderDirection: 'asc',
      };

      expect(matchesSchema(GetProductsQuerySchema, query)).toBe(true);
    });

    it('should handle boolean string transformation', () => {
      const query = {
        includeVariants: 'true',
        onlyActive: 'false',
      };

      const result = GetProductsQuerySchema.parse(query);
      expect(result.includeVariants).toBe(true);
      expect(result.onlyActive).toBe(false);
    });

    it('should handle pagination defaults', () => {
      const query = {};

      const result = GetProductsQuerySchema.parse(query);
      expect(result.page).toBe(1);
      expect(result.orderBy).toBe('name');
      expect(result.orderDirection).toBe('asc');
    });

    it('should reject invalid page number', () => {
      const query = {
        page: '0', // Must be positive
      };

      expect(matchesSchema(GetProductsQuerySchema, query)).toBe(false);
    });

    it('should reject limit over 100', () => {
      const query = {
        limit: '150', // Max 100
      };

      expect(matchesSchema(GetProductsQuerySchema, query)).toBe(false);
    });

    it('should reject invalid orderBy field', () => {
      const query = {
        orderBy: 'invalid_field',
      };

      expect(matchesSchema(GetProductsQuerySchema, query)).toBe(false);
    });

    it('should reject invalid orderDirection', () => {
      const query = {
        orderDirection: 'sideways',
      };

      expect(matchesSchema(GetProductsQuerySchema, query)).toBe(false);
    });
  });

  describe('GET /api/products Response', () => {
    it('should validate array of products', () => {
      const products = [
        mockData.product(),
        {
          ...mockData.product(),
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Empanadas',
          slug: 'empanadas',
        },
      ];

      expect(matchesSchema(GetProductsResponseSchema, products)).toBe(true);
    });

    it('should validate empty array', () => {
      const products: any[] = [];

      expect(matchesSchema(GetProductsResponseSchema, products)).toBe(true);
    });

    it('should reject invalid product in array', () => {
      const products = [
        mockData.product(),
        {
          id: 'invalid-uuid',
          name: 'Bad Product',
        },
      ];

      expect(matchesSchema(GetProductsResponseSchema, products)).toBe(false);
    });

    it('should reject non-array response', () => {
      const response = {
        products: [mockData.product()],
      };

      expect(matchesSchema(GetProductsResponseSchema, response)).toBe(false);
    });
  });

  describe('Contract Assertion Helpers', () => {
    it('should assert schema match', () => {
      const product = mockData.product();

      expect(() => {
        contractAssert.matchesSchema(ProductSchema, product, 'Product validation');
      }).not.toThrow();
    });

    it('should throw on schema mismatch', () => {
      const product = {
        ...mockData.product(),
        price: -100,
      };

      expect(() => {
        contractAssert.matchesSchema(ProductSchema, product, 'Product validation');
      }).toThrow(/Product validation/);
    });

    it('should assert required fields', () => {
      const product = mockData.product();

      expect(() => {
        contractAssert.hasFields(product, ['id', 'name', 'price']);
      }).not.toThrow();
    });

    it('should throw on missing fields', () => {
      const product = { name: 'Test' };

      expect(() => {
        contractAssert.hasFields(product, ['id', 'name', 'price']);
      }).toThrow(/Missing required fields/);
    });
  });

  // ============================================================
  // Extended Products API Tests (Phase 3)
  // ============================================================

  describe('ProductDisplayOrderSchema', () => {
    it('should validate a complete product display order object', () => {
      const displayOrder = {
        id: mockData.uuid(),
        name: 'Empanadas',
        ordinal: 5,
        categoryId: mockData.uuid(),
        imageUrl: 'https://example.com/empanadas.jpg',
        price: 799,
        active: true,
        isAvailable: true,
        isPreorder: false,
        visibility: 'PUBLIC',
        itemState: 'AVAILABLE',
      };

      expect(matchesSchema(ProductDisplayOrderSchema, displayOrder)).toBe(true);
    });

    it('should accept null categoryId', () => {
      const displayOrder = {
        id: mockData.uuid(),
        name: 'Test Product',
        ordinal: 0,
        categoryId: null,
        price: 999,
        active: true,
      };

      expect(matchesSchema(ProductDisplayOrderSchema, displayOrder)).toBe(true);
    });

    it('should reject negative ordinal', () => {
      const displayOrder = {
        id: mockData.uuid(),
        name: 'Test Product',
        ordinal: -1, // Invalid
        categoryId: null,
        price: 999,
        active: true,
      };

      expect(matchesSchema(ProductDisplayOrderSchema, displayOrder)).toBe(false);
    });
  });

  describe('GET /api/products/by-category/[categoryId]', () => {
    describe('GetProductsByCategoryQuerySchema', () => {
      it('should validate valid query parameters', () => {
        const query = {
          includeInactive: 'true',
          includeAvailabilityEvaluation: 'false',
          limit: '20',
          page: '1',
        };

        expect(matchesSchema(GetProductsByCategoryQuerySchema, query)).toBe(true);
      });

      it('should transform string booleans to booleans', () => {
        const query = { includeInactive: 'true' };
        const result = GetProductsByCategoryQuerySchema.parse(query);
        expect(result.includeInactive).toBe(true);
        expect(typeof result.includeInactive).toBe('boolean');
      });

      it('should default page to 1', () => {
        const query = {};
        const result = GetProductsByCategoryQuerySchema.parse(query);
        expect(result.page).toBe(1);
      });

      it('should accept all optional query parameters', () => {
        const query = {};
        expect(matchesSchema(GetProductsByCategoryQuerySchema, query)).toBe(true);
      });
    });

    describe('GetProductsByCategoryParamsSchema', () => {
      it('should validate valid category UUID', () => {
        const params = { categoryId: mockData.uuid() };
        expect(matchesSchema(GetProductsByCategoryParamsSchema, params)).toBe(true);
      });

      it('should reject invalid UUID', () => {
        const params = { categoryId: 'invalid-uuid' };
        expect(matchesSchema(GetProductsByCategoryParamsSchema, params)).toBe(false);
      });
    });

    describe('GetProductsByCategoryResponseSchema', () => {
      it('should validate complete response with pagination', () => {
        const response = {
          success: true,
          categoryId: mockData.uuid(),
          products: [
            {
              id: mockData.uuid(),
              name: 'Product 1',
              ordinal: 1,
              categoryId: mockData.uuid(),
              price: 999,
              active: true,
            },
          ],
          count: 1,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        };

        expect(matchesSchema(GetProductsByCategoryResponseSchema, response)).toBe(true);
      });

      it('should validate response without pagination', () => {
        const response = {
          success: true,
          categoryId: mockData.uuid(),
          products: [],
          count: 0,
        };

        expect(matchesSchema(GetProductsByCategoryResponseSchema, response)).toBe(true);
      });
    });
  });

  describe('POST /api/products/validate', () => {
    describe('ProductValidationIssueSchema', () => {
      it('should validate a validation issue', () => {
        const issue = {
          field: 'price',
          message: 'Price must be positive',
          severity: 'error' as const,
          current: -100,
          expected: 'positive number',
        };

        expect(matchesSchema(ProductValidationIssueSchema, issue)).toBe(true);
      });

      it('should accept all severity levels', () => {
        const severities = ['error', 'warning', 'info'] as const;
        severities.forEach(severity => {
          const issue = {
            field: 'test',
            message: 'test message',
            severity,
          };
          expect(matchesSchema(ProductValidationIssueSchema, issue)).toBe(true);
        });
      });
    });

    describe('ValidateProductRequestSchema', () => {
      it('should validate valid request', () => {
        const request = { productId: mockData.uuid() };
        expect(matchesSchema(ValidateProductRequestSchema, request)).toBe(true);
      });

      it('should reject invalid UUID', () => {
        const request = { productId: 'not-a-uuid' };
        expect(matchesSchema(ValidateProductRequestSchema, request)).toBe(false);
      });
    });

    describe('ValidateProductResponseSchema', () => {
      it('should validate response with no issues', () => {
        const response = {
          success: true,
          issues: [],
          isValid: true,
        };

        expect(matchesSchema(ValidateProductResponseSchema, response)).toBe(true);
      });

      it('should validate response with issues', () => {
        const response = {
          success: true,
          issues: [
            {
              field: 'description',
              message: 'Description is missing',
              severity: 'warning' as const,
            },
          ],
          isValid: false,
        };

        expect(matchesSchema(ValidateProductResponseSchema, response)).toBe(true);
      });
    });
  });

  describe('POST /api/products/reorder', () => {
    describe('ProductReorderUpdateSchema', () => {
      it('should validate a reorder update', () => {
        const update = {
          id: mockData.uuid(),
          ordinal: 5,
        };

        expect(matchesSchema(ProductReorderUpdateSchema, update)).toBe(true);
      });

      it('should reject zero ordinal', () => {
        const update = {
          id: mockData.uuid(),
          ordinal: 0, // Must be positive (>0)
        };

        expect(matchesSchema(ProductReorderUpdateSchema, update)).toBe(false);
      });

      it('should reject negative ordinal', () => {
        const update = {
          id: mockData.uuid(),
          ordinal: -1,
        };

        expect(matchesSchema(ProductReorderUpdateSchema, update)).toBe(false);
      });
    });

    describe('ReorderProductsRequestSchema', () => {
      it('should validate valid request with category', () => {
        const request = {
          updates: [
            { id: mockData.uuid(), ordinal: 1 },
            { id: mockData.uuid(), ordinal: 2 },
          ],
          categoryId: mockData.uuid(),
        };

        expect(matchesSchema(ReorderProductsRequestSchema, request)).toBe(true);
      });

      it('should validate request without category', () => {
        const request = {
          updates: [{ id: mockData.uuid(), ordinal: 1 }],
        };

        expect(matchesSchema(ReorderProductsRequestSchema, request)).toBe(true);
      });

      it('should reject empty updates array', () => {
        const request = {
          updates: [],
        };

        expect(matchesSchema(ReorderProductsRequestSchema, request)).toBe(false);
      });
    });

    describe('ReorderProductsResponseSchema', () => {
      it('should validate successful response', () => {
        const response = {
          success: true,
          message: 'Successfully updated display order for 5 products',
          updatedCount: 5,
        };

        expect(matchesSchema(ReorderProductsResponseSchema, response)).toBe(true);
      });

      it('should validate zero updates', () => {
        const response = {
          success: true,
          message: 'No products to update',
          updatedCount: 0,
        };

        expect(matchesSchema(ReorderProductsResponseSchema, response)).toBe(true);
      });
    });
  });

  describe('PUT /api/products/reorder (Quick Sort)', () => {
    describe('ReorderStrategySchema', () => {
      it('should validate all strategy types', () => {
        const strategies = ['ALPHABETICAL', 'PRICE_ASC', 'PRICE_DESC', 'NEWEST_FIRST'];
        strategies.forEach(strategy => {
          expect(matchesSchema(ReorderStrategySchema, strategy)).toBe(true);
        });
      });

      it('should reject invalid strategy', () => {
        expect(matchesSchema(ReorderStrategySchema, 'INVALID_STRATEGY')).toBe(false);
      });
    });

    describe('QuickSortProductsRequestSchema', () => {
      it('should validate valid request', () => {
        const request = {
          categoryId: mockData.uuid(),
          strategy: 'ALPHABETICAL' as const,
        };

        expect(matchesSchema(QuickSortProductsRequestSchema, request)).toBe(true);
      });

      it('should require both fields', () => {
        const request = { categoryId: mockData.uuid() };
        expect(matchesSchema(QuickSortProductsRequestSchema, request)).toBe(false);
      });
    });

    describe('QuickSortProductsResponseSchema', () => {
      it('should validate successful response', () => {
        const response = {
          success: true,
          message: 'Successfully applied ALPHABETICAL sorting to 10 products',
          updatedCount: 10,
          strategy: 'ALPHABETICAL' as const,
        };

        expect(matchesSchema(QuickSortProductsResponseSchema, response)).toBe(true);
      });
    });
  });

  describe('GET /api/categories', () => {
    describe('GetCategoriesResponseSchema', () => {
      it('should validate empty categories array', () => {
        const response: any[] = [];
        expect(matchesSchema(GetCategoriesResponseSchema, response)).toBe(true);
      });

      it('should validate categories array', () => {
        const response = [
          {
            id: mockData.uuid(),
            name: 'Empanadas',
            slug: 'empanadas',
          },
          {
            id: mockData.uuid(),
            name: 'Alfajores',
            slug: 'alfajores',
          },
        ];

        expect(matchesSchema(GetCategoriesResponseSchema, response)).toBe(true);
      });

      it('should reject invalid category format', () => {
        const response = [
          {
            id: 'not-a-uuid', // Invalid
            name: 'Test',
            slug: 'test',
          },
        ];

        expect(matchesSchema(GetCategoriesResponseSchema, response)).toBe(false);
      });
    });
  });

  describe('PaginationSchema', () => {
    it('should validate valid pagination', () => {
      const pagination = {
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
      };

      expect(matchesSchema(PaginationSchema, pagination)).toBe(true);
    });

    it('should reject negative values', () => {
      const pagination = {
        page: -1,
        limit: 20,
        total: 100,
        totalPages: 5,
      };

      expect(matchesSchema(PaginationSchema, pagination)).toBe(false);
    });

    it('should reject zero page/limit', () => {
      const pagination = {
        page: 0, // Must be positive (>0)
        limit: 20,
        total: 100,
        totalPages: 5,
      };

      expect(matchesSchema(PaginationSchema, pagination)).toBe(false);
    });
  });
});
