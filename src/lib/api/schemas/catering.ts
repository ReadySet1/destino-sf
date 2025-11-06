/**
 * Catering API Schemas
 *
 * Zod schemas for catering-related API endpoints validation.
 * Covers catering orders, menu items, packages, and delivery zones.
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// Enums and Constants
// ============================================================

/**
 * Catering order status enum
 */
export const CateringStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
]);

/**
 * Delivery zone enum (SF Bay Area zones)
 */
export const DeliveryZoneSchema = z.enum(['SF', 'SOUTH_BAY', 'PENINSULA', 'EAST_BAY', 'NORTH_BAY']);

/**
 * Catering item type enum
 */
export const CateringItemTypeSchema = z.enum([
  'PACKAGE',
  'APPETIZER',
  'ENTREE',
  'SIDE',
  'DESSERT',
  'BEVERAGE',
  'A_LA_CARTE',
]);

/**
 * Catering category enum
 */
export const CateringCategorySchema = z.enum([
  'APPETIZER',
  'SHARE PLATTER',
  'DESSERT',
  'BUFFET',
  'BOXED_LUNCH',
  'LUNCH_PACKAGE',
]);

// ============================================================
// Catering Item Schemas
// ============================================================

/**
 * Dietary preference schema
 */
export const DietaryPreferenceSchema = z.object({
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
});

/**
 * Catering item variation schema (for different sizes/options)
 */
export const CateringItemVariationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number().nonnegative(),
});

/**
 * Catering menu item schema
 */
export const CateringItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    price: z.number().nonnegative(),
    category: CateringCategorySchema,
    servingSize: z.string().optional(),
    imageUrl: z.string().url().nullable().optional(),
    isActive: z.boolean(),
    squareCategory: z.string().optional(),
    squareProductId: z.string().nullable().optional(),
    variations: z.array(CateringItemVariationSchema).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .merge(DietaryPreferenceSchema);

/**
 * Catering order item schema
 */
export const CateringOrderItemSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string(),
  itemType: z.string(),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  notes: z.string().nullable().optional(),
});

// ============================================================
// Catering Order Schema
// ============================================================

/**
 * Full catering order schema
 */
export const CateringOrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string(),
  eventDate: z.string().datetime(),
  numberOfPeople: z.number().int().positive(),
  totalAmount: z.number().nonnegative(),
  status: CateringStatusSchema,
  notes: z.string().nullable().optional(),
  specialRequests: z.string().nullable().optional(),
  deliveryZone: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  deliveryAddressJson: z.record(z.string(), z.unknown()).nullable().optional(),
  deliveryFee: z.number().nonnegative().nullable().optional(),
  paymentMethod: z.enum(['SQUARE', 'VENMO', 'CASH', 'ZELLE']),
  paymentStatus: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']),
  squareOrderId: z.string().nullable().optional(),
  squareCheckoutUrl: z.string().url().nullable().optional(),
  squareCheckoutId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  isArchived: z.boolean(),
  archiveReason: z.string().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  retryCount: z.number().int().nonnegative(),
  lastRetryAt: z.string().datetime().nullable().optional(),
  paymentUrl: z.string().url().nullable().optional(),
  paymentUrlExpiresAt: z.string().datetime().nullable().optional(),
  items: z.array(CateringOrderItemSchema),
});

// ============================================================
// Boxed Lunch Schemas
// ============================================================

/**
 * Boxed lunch entree schema
 */
export const BoxedLunchEntreeSchema = z
  .object({
    id: z.string().uuid(),
    squareId: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().url().nullable().optional(),
    category: z.literal('BOXED_LUNCH_ENTREE'),
    available: z.boolean(),
    sortOrder: z.number().int().nonnegative(),
    calories: z.number().int().positive().optional(),
    ingredients: z.array(z.string()).optional(),
    allergens: z.array(z.string()).optional(),
  })
  .merge(DietaryPreferenceSchema);

/**
 * Boxed lunch tier schema
 */
export const BoxedLunchTierSchema = z.object({
  tier: z.string(), // TIER_1, TIER_2, TIER_3
  name: z.string(),
  price: z.number().nonnegative(),
  proteinAmount: z.string(),
  sides: z.array(z.string()),
  availableEntrees: z.array(BoxedLunchEntreeSchema),
});

/**
 * Boxed lunch item modifier schema
 */
export const BoxedLunchModifierSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  dietaryInfo: z.string().optional(),
});

/**
 * Legacy boxed lunch item schema
 */
export const LegacyBoxedLunchItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    price: z.number().nonnegative(),
    squareId: z.string(),
    imageUrl: z.string().url().nullable().optional(),
    modifiers: z.array(BoxedLunchModifierSchema).optional(),
  })
  .merge(DietaryPreferenceSchema);

// ============================================================
// GET /api/catering/order/[orderId] - Get Catering Order
// ============================================================

/**
 * Path parameters for getting catering order by ID
 */
export const GetCateringOrderByIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

/**
 * Response for getting catering order by ID
 */
export const GetCateringOrderByIdResponseSchema = z.object({
  order: CateringOrderSchema,
  status: z.string(), // Computed status: 'processing', 'success', 'failed', 'confirmed', 'pending'
});

// ============================================================
// GET /api/catering/appetizers - Get Appetizers Menu
// ============================================================

/**
 * Response for getting appetizers (includes share platters and desserts)
 */
export const GetAppetizerMenuResponseSchema = z.array(CateringItemSchema);

// ============================================================
// GET /api/catering/boxed-lunches - Get Boxed Lunches
// ============================================================

/**
 * Query parameters for boxed lunches
 */
export const GetBoxedLunchesQuerySchema = z.object({
  mode: z.enum(['legacy', 'build-your-own']).optional(),
});

/**
 * Build-your-own response schema
 */
export const GetBoxedLunchesBuildYourOwnResponseSchema = z.object({
  success: z.boolean(),
  tiers: z.array(BoxedLunchTierSchema),
  entrees: z.array(BoxedLunchEntreeSchema),
  mode: z.literal('build-your-own'),
  error: z.string().optional(),
});

/**
 * Legacy response schema
 */
export const GetBoxedLunchesLegacyResponseSchema = z.array(LegacyBoxedLunchItemSchema);

/**
 * Combined response schema (union of both modes)
 */
export const GetBoxedLunchesResponseSchema = z.union([
  GetBoxedLunchesBuildYourOwnResponseSchema,
  GetBoxedLunchesLegacyResponseSchema,
]);

// ============================================================
// GET /api/catering/buffet - Get Buffet Menu
// ============================================================

/**
 * Response for getting buffet menu
 */
export const GetBuffetMenuResponseSchema = z.array(CateringItemSchema);

// ============================================================
// GET /api/catering/lunch - Get Lunch Packages
// ============================================================

/**
 * Response for getting lunch packages
 */
export const GetLunchPackagesResponseSchema = z.array(CateringItemSchema);

// ============================================================
// POST /api/catering/order - Create Catering Order (if exists)
// ============================================================

/**
 * Request body for creating catering order
 */
export const CreateCateringOrderRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().min(1),
  eventDate: z.string().datetime(),
  numberOfPeople: z.number().int().positive(),
  deliveryZone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  specialRequests: z.string().optional(),
  paymentMethod: z.enum(['SQUARE', 'VENMO', 'CASH', 'ZELLE']).default('SQUARE'),
  items: z
    .array(
      z.object({
        itemName: z.string(),
        itemType: z.string(),
        quantity: z.number().int().positive(),
        pricePerUnit: z.number().nonnegative(),
      })
    )
    .min(1, 'At least one item is required'),
});

/**
 * Response for creating catering order
 */
export const CreateCateringOrderResponseSchema = z.object({
  success: z.boolean(),
  order: CateringOrderSchema.optional(),
  orderId: z.string().uuid().optional(),
  checkoutUrl: z.string().url().optional(),
  error: z.string().optional(),
});

// ============================================================
// Type Exports
// ============================================================

export type CateringStatus = z.infer<typeof CateringStatusSchema>;
export type DeliveryZone = z.infer<typeof DeliveryZoneSchema>;
export type CateringItemType = z.infer<typeof CateringItemTypeSchema>;
export type CateringCategory = z.infer<typeof CateringCategorySchema>;
export type DietaryPreference = z.infer<typeof DietaryPreferenceSchema>;
export type CateringItemVariation = z.infer<typeof CateringItemVariationSchema>;
export type CateringItem = z.infer<typeof CateringItemSchema>;
export type CateringOrderItem = z.infer<typeof CateringOrderItemSchema>;
export type CateringOrder = z.infer<typeof CateringOrderSchema>;
export type BoxedLunchEntree = z.infer<typeof BoxedLunchEntreeSchema>;
export type BoxedLunchTier = z.infer<typeof BoxedLunchTierSchema>;
export type BoxedLunchModifier = z.infer<typeof BoxedLunchModifierSchema>;
export type LegacyBoxedLunchItem = z.infer<typeof LegacyBoxedLunchItemSchema>;
export type GetCateringOrderByIdParams = z.infer<typeof GetCateringOrderByIdParamsSchema>;
export type GetCateringOrderByIdResponse = z.infer<typeof GetCateringOrderByIdResponseSchema>;
export type GetAppetizerMenuResponse = z.infer<typeof GetAppetizerMenuResponseSchema>;
export type GetBoxedLunchesQuery = z.infer<typeof GetBoxedLunchesQuerySchema>;
export type GetBoxedLunchesBuildYourOwnResponse = z.infer<
  typeof GetBoxedLunchesBuildYourOwnResponseSchema
>;
export type GetBoxedLunchesLegacyResponse = z.infer<typeof GetBoxedLunchesLegacyResponseSchema>;
export type GetBoxedLunchesResponse = z.infer<typeof GetBoxedLunchesResponseSchema>;
export type GetBuffetMenuResponse = z.infer<typeof GetBuffetMenuResponseSchema>;
export type GetLunchPackagesResponse = z.infer<typeof GetLunchPackagesResponseSchema>;
export type CreateCateringOrderRequest = z.infer<typeof CreateCateringOrderRequestSchema>;
export type CreateCateringOrderResponse = z.infer<typeof CreateCateringOrderResponseSchema>;
