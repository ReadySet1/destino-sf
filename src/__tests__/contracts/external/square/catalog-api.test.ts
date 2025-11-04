/**
 * Square Catalog API Contract Tests
 *
 * Tests to ensure Square Catalog API responses conform to expected schemas.
 * These tests validate that our type definitions match Square's actual API responses.
 */

import { describe, it, expect } from '@jest/globals';
import {
  CatalogObjectSchema,
  CatalogItemSchema,
  CatalogItemVariationSchema,
  CatalogCategorySchema,
  CatalogModifierSchema,
  CatalogModifierListSchema,
  SquareCatalogApiResponseSchema,
  SearchCatalogObjectsRequestSchema,
  MoneySchema,
  SquareErrorSchema,
  CatalogObjectTypeSchema,
  CatalogQuerySchema,
} from '@/lib/api/schemas/external/square/catalog';
import { matchesSchema, getValidationErrors, mockData } from '../../setup';

describe('Square Catalog API Contract Tests', () => {
  // ============================================================
  // Base Types
  // ============================================================

  describe('MoneySchema', () => {
    it('should validate money with number amount', () => {
      const money = { amount: 1299, currency: 'USD' };
      expect(matchesSchema(MoneySchema, money)).toBe(true);
    });

    it('should validate money with bigint amount', () => {
      const money = { amount: BigInt(1299), currency: 'USD' };
      expect(matchesSchema(MoneySchema, money)).toBe(true);
    });

    it('should validate money with optional fields', () => {
      const money = {};
      expect(matchesSchema(MoneySchema, money)).toBe(true);
    });
  });

  describe('SquareErrorSchema', () => {
    it('should validate a complete error', () => {
      const error = {
        category: 'INVALID_REQUEST_ERROR',
        code: 'MISSING_REQUIRED_PARAMETER',
        detail: 'Missing required parameter: object_types',
        field: 'object_types',
      };
      expect(matchesSchema(SquareErrorSchema, error)).toBe(true);
    });

    it('should validate error without optional fields', () => {
      const error = {
        category: 'API_ERROR',
        code: 'INTERNAL_SERVER_ERROR',
      };
      expect(matchesSchema(SquareErrorSchema, error)).toBe(true);
    });
  });

  describe('CatalogObjectTypeSchema', () => {
    it('should validate all catalog object types', () => {
      const types = [
        'ITEM',
        'CATEGORY',
        'ITEM_VARIATION',
        'TAX',
        'DISCOUNT',
        'MODIFIER_LIST',
        'MODIFIER',
        'PRICING_RULE',
        'PRODUCT_SET',
        'TIME_PERIOD',
        'MEASUREMENT_UNIT',
        'ITEM_OPTION',
        'ITEM_OPTION_VAL',
        'CUSTOM_ATTRIBUTE_DEFINITION',
        'QUICK_AMOUNTS_SETTINGS',
      ];

      types.forEach(type => {
        expect(matchesSchema(CatalogObjectTypeSchema, type)).toBe(true);
      });
    });

    it('should reject invalid catalog object type', () => {
      expect(matchesSchema(CatalogObjectTypeSchema, 'INVALID_TYPE')).toBe(false);
    });
  });

  // ============================================================
  // Catalog Item Variation
  // ============================================================

  describe('CatalogItemVariationSchema', () => {
    it('should validate a complete item variation', () => {
      const variation = {
        item_id: mockData.uuid(),
        name: 'Regular',
        sku: 'EMPANADA-BEEF-REG',
        upc: '123456789012',
        ordinal: 1,
        pricing_type: 'FIXED_PRICING' as const,
        price_money: { amount: 799, currency: 'USD' },
        track_inventory: true,
        inventory_alert_type: 'LOW_QUANTITY' as const,
        inventory_alert_threshold: 10,
        sellable: true,
        stockable: true,
      };

      expect(matchesSchema(CatalogItemVariationSchema, variation)).toBe(true);
    });

    it('should validate variation with location overrides', () => {
      const variation = {
        name: 'Large',
        price_money: { amount: 1299, currency: 'USD' },
        location_overrides: [
          {
            location_id: 'LOC123',
            price_money: { amount: 1199, currency: 'USD' },
            track_inventory: false,
          },
        ],
      };

      expect(matchesSchema(CatalogItemVariationSchema, variation)).toBe(true);
    });

    it('should validate minimal variation', () => {
      const variation = {
        name: 'Default',
      };

      expect(matchesSchema(CatalogItemVariationSchema, variation)).toBe(true);
    });
  });

  // ============================================================
  // Catalog Item
  // ============================================================

  describe('CatalogItemSchema', () => {
    it('should validate a complete catalog item', () => {
      const item = {
        name: 'Beef Empanada',
        description: 'Traditional Argentinian beef empanada',
        available_online: true,
        available_for_pickup: true,
        category_id: mockData.uuid(),
        product_type: 'REGULAR' as const,
        image_ids: ['IMG123'],
        variations: [
          {
            type: 'ITEM_VARIATION' as const,
            id: mockData.uuid(),
            item_variation_data: {
              name: 'Regular',
              price_money: { amount: 799, currency: 'USD' },
            },
          },
        ],
      };

      expect(matchesSchema(CatalogItemSchema, item)).toBe(true);
    });

    it('should validate item with modifiers', () => {
      const item = {
        name: 'Custom Empanada',
        modifier_list_info: [
          {
            modifier_list_id: 'MOD_LIST_123',
            min_selected_modifiers: 0,
            max_selected_modifiers: 3,
            enabled: true,
          },
        ],
      };

      expect(matchesSchema(CatalogItemSchema, item)).toBe(true);
    });

    it('should validate minimal item', () => {
      const item = {
        name: 'Test Item',
      };

      expect(matchesSchema(CatalogItemSchema, item)).toBe(true);
    });
  });

  // ============================================================
  // Catalog Category
  // ============================================================

  describe('CatalogCategorySchema', () => {
    it('should validate a complete category', () => {
      const category = {
        name: 'Empanadas',
        category_type: 'REGULAR_CATEGORY' as const,
        is_top_level: true,
        online_visibility: true,
        ordinal: 1,
        ecom_seo_data: {
          page_title: 'Argentinian Empanadas',
          page_description: 'Traditional empanadas made fresh daily',
          permalink: '/empanadas',
        },
      };

      expect(matchesSchema(CatalogCategorySchema, category)).toBe(true);
    });

    it('should validate category with parent', () => {
      const category = {
        name: 'Beef Empanadas',
        parent_category: {
          id: mockData.uuid(),
          ordinal: 1,
        },
        is_top_level: false,
      };

      expect(matchesSchema(CatalogCategorySchema, category)).toBe(true);
    });

    it('should validate minimal category', () => {
      const category = {
        name: 'Test Category',
      };

      expect(matchesSchema(CatalogCategorySchema, category)).toBe(true);
    });
  });

  // ============================================================
  // Catalog Modifier
  // ============================================================

  describe('CatalogModifierSchema', () => {
    it('should validate a complete modifier', () => {
      const modifier = {
        name: 'Extra Cheese',
        price_money: { amount: 150, currency: 'USD' },
        ordinal: 1,
        modifier_list_id: 'MOD_LIST_123',
        on_by_default: false,
        selection_type: 'SINGLE' as const,
      };

      expect(matchesSchema(CatalogModifierSchema, modifier)).toBe(true);
    });

    it('should validate minimal modifier', () => {
      const modifier = {
        name: 'No Onions',
      };

      expect(matchesSchema(CatalogModifierSchema, modifier)).toBe(true);
    });
  });

  describe('CatalogModifierListSchema', () => {
    it('should validate minimal modifier list', () => {
      const modifierList = {
        name: 'Toppings',
        selection_type: 'MULTIPLE' as const,
      };

      expect(matchesSchema(CatalogModifierListSchema, modifierList)).toBe(true);
    });

    it('should validate modifier list with modifiers array', () => {
      // Note: modifiers should be CatalogObject references (IDs) or full CatalogObjects
      // For simplicity, testing without nested modifiers data
      const modifierList = {
        name: 'Toppings',
        ordinal: 1,
        selection_type: 'MULTIPLE' as const,
        // Using simplified modifiers - just IDs in practice
        modifiers: [],
      };

      expect(matchesSchema(CatalogModifierListSchema, modifierList)).toBe(true);
    });
  });

  // ============================================================
  // Catalog Object
  // ============================================================

  describe('CatalogObjectSchema', () => {
    it('should validate item catalog object', () => {
      const catalogObject = {
        type: 'ITEM' as const,
        id: mockData.uuid(),
        updated_at: '2025-01-15T12:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        version: 1,
        is_deleted: false,
        present_at_all_locations: true,
        item_data: {
          name: 'Alfajores',
          description: 'Traditional Argentinian cookies',
          product_type: 'REGULAR' as const,
        },
      };

      expect(matchesSchema(CatalogObjectSchema, catalogObject)).toBe(true);
    });

    it('should validate category catalog object', () => {
      const catalogObject = {
        type: 'CATEGORY' as const,
        id: mockData.uuid(),
        category_data: {
          name: 'Desserts',
          is_top_level: true,
        },
      };

      expect(matchesSchema(CatalogObjectSchema, catalogObject)).toBe(true);
    });

    it('should validate variation catalog object', () => {
      const catalogObject = {
        type: 'ITEM_VARIATION' as const,
        id: mockData.uuid(),
        item_variation_data: {
          item_id: mockData.uuid(),
          name: 'Box of 6',
          price_money: { amount: 1499, currency: 'USD' },
        },
      };

      expect(matchesSchema(CatalogObjectSchema, catalogObject)).toBe(true);
    });

    it('should validate modifier catalog object', () => {
      const catalogObject = {
        type: 'MODIFIER' as const,
        id: mockData.uuid(),
        modifier_data: {
          name: 'Gluten Free',
          price_money: { amount: 200, currency: 'USD' },
        },
      };

      expect(matchesSchema(CatalogObjectSchema, catalogObject)).toBe(true);
    });

    it('should validate deleted catalog object', () => {
      const catalogObject = {
        type: 'ITEM' as const,
        id: mockData.uuid(),
        is_deleted: true,
      };

      expect(matchesSchema(CatalogObjectSchema, catalogObject)).toBe(true);
    });
  });

  // ============================================================
  // Catalog Query
  // ============================================================

  describe('CatalogQuerySchema', () => {
    it('should validate text query', () => {
      const query = {
        text_query: {
          keywords: ['empanada', 'beef'],
        },
      };

      expect(matchesSchema(CatalogQuerySchema, query)).toBe(true);
    });

    it('should validate exact query', () => {
      const query = {
        exact_query: {
          attribute_name: 'name',
          attribute_value: 'Beef Empanada',
        },
      };

      expect(matchesSchema(CatalogQuerySchema, query)).toBe(true);
    });

    it('should validate range query', () => {
      const query = {
        range_query: {
          attribute_name: 'price',
          attribute_min_value: 500,
          attribute_max_value: 2000,
        },
      };

      expect(matchesSchema(CatalogQuerySchema, query)).toBe(true);
    });

    it('should validate prefix query', () => {
      const query = {
        prefix_query: {
          attribute_name: 'name',
          attribute_prefix: 'Emp',
        },
      };

      expect(matchesSchema(CatalogQuerySchema, query)).toBe(true);
    });

    it('should validate sorted attribute query', () => {
      const query = {
        sorted_attribute_query: {
          attribute_name: 'name',
          sort_order: 'ASC',
        },
      };

      expect(matchesSchema(CatalogQuerySchema, query)).toBe(true);
    });
  });

  // ============================================================
  // API Requests
  // ============================================================

  describe('SearchCatalogObjectsRequestSchema', () => {
    it('should validate complete search request', () => {
      const request = {
        cursor: 'CURSOR123',
        object_types: ['ITEM' as const, 'ITEM_VARIATION' as const],
        include_deleted_objects: false,
        include_related_objects: true,
        begin_time: '2025-01-01T00:00:00Z',
        query: {
          text_query: {
            keywords: ['empanada'],
          },
        },
        limit: 100,
      };

      expect(matchesSchema(SearchCatalogObjectsRequestSchema, request)).toBe(true);
    });

    it('should validate minimal search request', () => {
      const request = {};
      expect(matchesSchema(SearchCatalogObjectsRequestSchema, request)).toBe(true);
    });

    it('should reject invalid limit', () => {
      const request = {
        limit: 2000, // Max is 1000
      };

      expect(matchesSchema(SearchCatalogObjectsRequestSchema, request)).toBe(false);
    });

    it('should reject negative limit', () => {
      const request = {
        limit: -1,
      };

      expect(matchesSchema(SearchCatalogObjectsRequestSchema, request)).toBe(false);
    });
  });

  // ============================================================
  // API Responses
  // ============================================================

  describe('SquareCatalogApiResponseSchema', () => {
    it('should validate successful search response', () => {
      const response = {
        result: {
          objects: [
            {
              type: 'ITEM' as const,
              id: mockData.uuid(),
              item_data: {
                name: 'Empanada',
                product_type: 'REGULAR' as const,
              },
            },
          ],
          cursor: 'NEXT_PAGE_CURSOR',
        },
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });

    it('should validate response with related objects', () => {
      const response = {
        result: {
          objects: [
            {
              type: 'ITEM' as const,
              id: mockData.uuid(),
              item_data: { name: 'Test Item' },
            },
          ],
          related_objects: [
            {
              type: 'CATEGORY' as const,
              id: mockData.uuid(),
              category_data: { name: 'Test Category' },
            },
          ],
        },
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });

    it('should validate successful retrieve response', () => {
      const response = {
        result: {
          object: {
            type: 'ITEM' as const,
            id: mockData.uuid(),
            item_data: {
              name: 'Alfajores',
              description: 'Traditional cookies',
            },
          },
        },
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });

    it('should validate empty result', () => {
      const response = {
        result: {},
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });

    it('should validate error response', () => {
      const response = {
        result: {},
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'NOT_FOUND',
            detail: 'Catalog object not found',
          },
        ],
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });

    it('should validate multiple errors', () => {
      const response = {
        result: {},
        errors: [
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'MISSING_REQUIRED_PARAMETER',
            field: 'object_types',
          },
          {
            category: 'INVALID_REQUEST_ERROR',
            code: 'INVALID_VALUE',
            field: 'limit',
          },
        ],
      };

      expect(matchesSchema(SquareCatalogApiResponseSchema, response)).toBe(true);
    });
  });
});
