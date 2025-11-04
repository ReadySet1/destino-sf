/**
 * Square Catalog API External Contracts
 *
 * Zod schemas for validating Square Catalog API responses at runtime.
 * These schemas mirror the TypeScript types in src/types/square.d.ts
 * and provide runtime validation to catch breaking changes from Square's API.
 *
 * @see https://developer.squareup.com/reference/square/catalog-api
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// Base Types
// ============================================================

/**
 * Money type used throughout Square API
 */
export const MoneySchema = z.object({
  amount: z.union([z.number(), z.bigint()]).optional(),
  currency: z.string().optional(),
});

export type Money = z.infer<typeof MoneySchema>;

/**
 * Square Error structure
 */
export const SquareErrorSchema = z.object({
  category: z.string(),
  code: z.string(),
  detail: z.string().optional(),
  field: z.string().optional(),
});

export type SquareError = z.infer<typeof SquareErrorSchema>;

// ============================================================
// Catalog Enums
// ============================================================

export const CatalogObjectTypeSchema = z.enum([
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
]);

export type CatalogObjectType = z.infer<typeof CatalogObjectTypeSchema>;

export const ProductTypeSchema = z.enum(['REGULAR', 'GIFT_CARD', 'APPOINTMENTS_SERVICE']);

export const PricingTypeSchema = z.enum(['FIXED_PRICING', 'VARIABLE_PRICING']);

export const InventoryAlertTypeSchema = z.enum(['NONE', 'LOW_QUANTITY']);

export const CategoryTypeSchema = z.enum(['REGULAR_CATEGORY', 'OTHER_CATEGORY']);

// ============================================================
// Catalog Item Structures
// ============================================================

export const CatalogItemOptionForItemSchema = z.object({
  item_option_id: z.string().optional(),
});

export const CatalogItemOptionValueForItemVariationSchema = z.object({
  item_option_id: z.string().optional(),
  item_option_value_id: z.string().optional(),
});

export const CatalogModifierOverrideSchema = z.object({
  modifier_id: z.string().optional(),
  on_by_default: z.boolean().optional(),
});

export const CatalogItemModifierListInfoSchema = z.object({
  modifier_list_id: z.string().optional(),
  modifier_overrides: z.array(CatalogModifierOverrideSchema).optional(),
  min_selected_modifiers: z.number().int().optional(),
  max_selected_modifiers: z.number().int().optional(),
  enabled: z.boolean().optional(),
  ordinal: z.number().int().optional(),
  allow_quantities: z.boolean().optional(),
  is_conversational: z.boolean().optional(),
  hidden_from_customer_override: z.boolean().optional(),
  hidden_from_customer: z.boolean().optional(),
});

export const CatalogStockConversionSchema = z.object({
  stockable_item_variation_id: z.string(),
  stockable_quantity: z.string(),
  nonstockable_modifier: z.string(),
});

export const CatalogItemVariationLocationOverridesSchema = z.object({
  location_id: z.string().optional(),
  price_money: MoneySchema.optional(),
  pricing_type: PricingTypeSchema.optional(),
  track_inventory: z.boolean().optional(),
  inventory_alert_type: InventoryAlertTypeSchema.optional(),
  inventory_alert_threshold: z.union([z.number(), z.bigint()]).optional(),
  sold_out: z.boolean().optional(),
  sold_out_valid_until: z.string().optional(),
});

/**
 * Catalog Item Variation (product variant/SKU)
 */
export const CatalogItemVariationSchema = z.object({
  item_id: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  upc: z.string().optional(),
  ordinal: z.number().int().optional(),
  pricing_type: PricingTypeSchema.optional(),
  price_money: MoneySchema.optional(),
  location_overrides: z.array(CatalogItemVariationLocationOverridesSchema).optional(),
  track_inventory: z.boolean().optional(),
  inventory_alert_type: InventoryAlertTypeSchema.optional(),
  inventory_alert_threshold: z.union([z.number(), z.bigint()]).optional(),
  user_data: z.string().optional(),
  service_duration: z.union([z.number(), z.bigint()]).optional(),
  available_for_booking: z.boolean().optional(),
  item_option_values: z.array(CatalogItemOptionValueForItemVariationSchema).optional(),
  measurement_unit_id: z.string().optional(),
  sellable: z.boolean().optional(),
  stockable: z.boolean().optional(),
  image_ids: z.array(z.string()).optional(),
  team_member_ids: z.array(z.string()).optional(),
  stockable_conversion: CatalogStockConversionSchema.optional(),
});

export type CatalogItemVariation = z.infer<typeof CatalogItemVariationSchema>;

/**
 * Forward declare CatalogObject for recursive types
 */
export type CatalogObject = {
  type: CatalogObjectType;
  id: string;
  updated_at?: string;
  created_at?: string;
  version?: number | bigint;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: CatalogItem;
  item_variation_data?: CatalogItemVariation;
  category_data?: CatalogCategory;
  modifier_list_data?: CatalogModifierList;
  modifier_data?: CatalogModifier;
  custom_attribute_values?: Record<string, unknown>;
};

/**
 * Catalog Item (product)
 */
export const CatalogItemSchema = z.lazy(() =>
  z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    abbreviation: z.string().optional(),
    label_color: z.string().optional(),
    available_online: z.boolean().optional(),
    available_for_pickup: z.boolean().optional(),
    available_electronically: z.boolean().optional(),
    category_id: z.string().optional(),
    tax_ids: z.array(z.string()).optional(),
    modifier_list_info: z.array(CatalogItemModifierListInfoSchema).optional(),
    variations: z.array(CatalogObjectSchema).optional(),
    product_type: ProductTypeSchema.optional(),
    skip_modifier_screen: z.boolean().optional(),
    item_options: z.array(CatalogItemOptionForItemSchema).optional(),
    image_ids: z.array(z.string()).optional(),
    sort_name: z.string().optional(),
    description_html: z.string().optional(),
    description_plaintext: z.string().optional(),
  })
);

export type CatalogItem = z.infer<typeof CatalogItemSchema>;

// ============================================================
// Catalog Category Structures
// ============================================================

export const CatalogObjectCategorySchema = z.object({
  id: z.string().optional(),
  ordinal: z.number().int().optional(),
});

export const CatalogEcomSeoDataSchema = z.object({
  page_title: z.string().optional(),
  page_description: z.string().optional(),
  permalink: z.string().optional(),
});

export const CatalogCategorySchema = z.object({
  name: z.string().optional(),
  image_ids: z.array(z.string()).optional(),
  category_type: CategoryTypeSchema.optional(),
  parent_category: CatalogObjectCategorySchema.optional(),
  is_top_level: z.boolean().optional(),
  channels: z.array(z.string()).optional(),
  availability_period_ids: z.array(z.string()).optional(),
  online_visibility: z.boolean().optional(),
  root_category: z.string().optional(),
  ecom_seo_data: CatalogEcomSeoDataSchema.optional(),
  ecom_image_uris: z.array(z.string()).optional(),
  ordinal: z.number().int().optional(),
});

export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;

// ============================================================
// Catalog Modifier Structures
// ============================================================

export const CatalogModifierSchema = z.object({
  name: z.string().optional(),
  price_money: MoneySchema.optional(),
  ordinal: z.number().int().optional(),
  modifier_list_id: z.string().optional(),
  image_id: z.string().optional(),
  on_by_default: z.boolean().optional(),
  ordinal_position: z.number().int().optional(),
  available_for_booking: z.boolean().optional(),
  selection_type: z.enum(['SINGLE', 'MULTIPLE']).optional(),
  modifier_data_location_overrides: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type CatalogModifier = z.infer<typeof CatalogModifierSchema>;

export const CatalogModifierListSchema = z.lazy(() =>
  z.object({
    name: z.string().optional(),
    ordinal: z.number().int().optional(),
    selection_type: z.enum(['SINGLE', 'MULTIPLE']).optional(),
    modifiers: z.array(z.lazy(() => CatalogObjectSchema)).optional(),
    image_ids: z.array(z.string()).optional(),
    modifier_type: z.enum(['TEXT', 'LIST']).optional(),
    max_length: z.number().int().optional(),
    text_required: z.boolean().optional(),
    internal_name: z.string().optional(),
    available_for_booking: z.boolean().optional(),
  })
);

export type CatalogModifierList = z.infer<typeof CatalogModifierListSchema>;

// ============================================================
// Catalog Object (main container)
// ============================================================

export const CatalogObjectSchema: z.ZodType<CatalogObject> = z.lazy(() =>
  z.object({
    type: CatalogObjectTypeSchema,
    id: z.string(),
    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    version: z.union([z.number(), z.bigint()]).optional(),
    is_deleted: z.boolean().optional(),
    present_at_all_locations: z.boolean().optional(),
    present_at_location_ids: z.array(z.string()).optional(),
    absent_at_location_ids: z.array(z.string()).optional(),
    item_data: CatalogItemSchema.optional(),
    item_variation_data: CatalogItemVariationSchema.optional(),
    category_data: CatalogCategorySchema.optional(),
    modifier_list_data: CatalogModifierListSchema.optional(),
    modifier_data: CatalogModifierSchema.optional(),
    custom_attribute_values: z.record(z.string(), z.unknown()).optional(),
  })
);

// ============================================================
// Catalog Query Structures
// ============================================================

export const CatalogQuerySortedAttributeSchema = z.object({
  attribute_name: z.string(),
  initial_attribute_value: z.string().optional(),
  sort_order: z.string().optional(),
});

export const CatalogQueryExactSchema = z.object({
  attribute_name: z.string(),
  attribute_value: z.string(),
});

export const CatalogQuerySetSchema = z.object({
  attribute_name: z.string(),
  attribute_values: z.array(z.string()),
});

export const CatalogQueryPrefixSchema = z.object({
  attribute_name: z.string(),
  attribute_prefix: z.string(),
});

export const CatalogQueryRangeSchema = z.object({
  attribute_name: z.string(),
  attribute_min_value: z.union([z.number(), z.bigint()]).optional(),
  attribute_max_value: z.union([z.number(), z.bigint()]).optional(),
});

export const CatalogQueryTextSchema = z.object({
  keywords: z.array(z.string()),
});

export const CatalogQueryItemsForTaxSchema = z.object({
  tax_ids: z.array(z.string()),
});

export const CatalogQueryItemsForModifierListSchema = z.object({
  modifier_list_ids: z.array(z.string()),
});

export const CatalogQueryItemsForItemOptionsSchema = z.object({
  item_option_ids: z.array(z.string()).optional(),
});

export const CatalogQueryItemVariationsForItemOptionValuesSchema = z.object({
  item_option_value_ids: z.array(z.string()).optional(),
});

export const CatalogQuerySchema = z.object({
  sorted_attribute_query: CatalogQuerySortedAttributeSchema.optional(),
  exact_query: CatalogQueryExactSchema.optional(),
  set_query: CatalogQuerySetSchema.optional(),
  prefix_query: CatalogQueryPrefixSchema.optional(),
  range_query: CatalogQueryRangeSchema.optional(),
  text_query: CatalogQueryTextSchema.optional(),
  items_for_tax_query: CatalogQueryItemsForTaxSchema.optional(),
  items_for_modifier_list_query: CatalogQueryItemsForModifierListSchema.optional(),
  items_for_item_options_query: CatalogQueryItemsForItemOptionsSchema.optional(),
  item_variations_for_item_option_values_query:
    CatalogQueryItemVariationsForItemOptionValuesSchema.optional(),
});

export type CatalogQuery = z.infer<typeof CatalogQuerySchema>;

// ============================================================
// API Request/Response Schemas
// ============================================================

/**
 * Search Catalog Objects Request
 */
export const SearchCatalogObjectsRequestSchema = z.object({
  cursor: z.string().optional(),
  object_types: z.array(CatalogObjectTypeSchema).optional(),
  include_deleted_objects: z.boolean().optional(),
  include_related_objects: z.boolean().optional(),
  begin_time: z.string().optional(),
  query: CatalogQuerySchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export type SearchCatalogObjectsRequest = z.infer<typeof SearchCatalogObjectsRequestSchema>;

/**
 * Square Catalog API Response
 */
export const SquareCatalogApiResponseSchema = z.object({
  result: z.object({
    objects: z.array(CatalogObjectSchema).optional(),
    related_objects: z.array(CatalogObjectSchema).optional(),
    cursor: z.string().optional(),
    object: CatalogObjectSchema.optional(),
  }),
  errors: z.array(SquareErrorSchema).optional(),
});

export type SquareCatalogApiResponse = z.infer<typeof SquareCatalogApiResponseSchema>;

/**
 * List Catalog Request
 */
export const ListCatalogRequestSchema = z.object({
  cursor: z.string().optional(),
  types: z.string().optional(), // Comma-separated list
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
});

export type ListCatalogRequest = z.infer<typeof ListCatalogRequestSchema>;

/**
 * Retrieve Catalog Object Request
 */
export const RetrieveCatalogObjectRequestSchema = z.object({
  object_id: z.string(),
  include_related_objects: z.boolean().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
});

export type RetrieveCatalogObjectRequest = z.infer<typeof RetrieveCatalogObjectRequestSchema>;
