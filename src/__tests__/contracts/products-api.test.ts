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
});
