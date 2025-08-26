import { z } from 'zod';

/**
 * Zod schema for store settings validation
 */
export const StoreSettingsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zipCode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email('Invalid email format').nullable(),
  taxRate: z.number().min(0, 'Tax rate must be non-negative').max(100, 'Tax rate cannot exceed 100%'),
  minOrderAmount: z.number().min(0, 'Minimum order amount must be non-negative'),
  cateringMinimumAmount: z.number().min(0, 'Catering minimum amount must be non-negative'),
  minAdvanceHours: z.number().int().min(0, 'Minimum advance hours must be non-negative'),
  maxDaysInAdvance: z.number().int().min(1, 'Maximum days in advance must be at least 1'),
  isStoreOpen: z.boolean(),
  temporaryClosureMsg: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;

/**
 * Schema for updating store settings (excludes readonly fields)
 */
export const StoreSettingsUpdateSchema = StoreSettingsSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoreSettingsUpdate = z.infer<typeof StoreSettingsUpdateSchema>;

/**
 * Result type for settings operations
 */
export type SettingsResult<T = StoreSettings> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Default settings fallback values
 */
export const DEFAULT_STORE_SETTINGS: Omit<StoreSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Destino SF',
  address: null,
  city: null,
  state: null,
  zipCode: null,
  phone: null,
  email: null,
  taxRate: 8.25, // 8.25% San Francisco tax rate
  minOrderAmount: 0,
  cateringMinimumAmount: 0,
  minAdvanceHours: 2,
  maxDaysInAdvance: 30,
  isStoreOpen: true,
  temporaryClosureMsg: null,
};

/**
 * Settings fields that affect order processing
 */
export const ORDER_AFFECTING_FIELDS = [
  'taxRate',
  'minOrderAmount',
  'cateringMinimumAmount',
  'isStoreOpen',
  'temporaryClosureMsg',
] as const;

export type OrderAffectingField = typeof ORDER_AFFECTING_FIELDS[number];