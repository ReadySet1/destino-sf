import { z } from 'zod';

// Availability States Enum
export enum AvailabilityState {
  AVAILABLE = 'available',
  PRE_ORDER = 'pre_order',
  VIEW_ONLY = 'view_only',
  HIDDEN = 'hidden',
  COMING_SOON = 'coming_soon',
  SOLD_OUT = 'sold_out',
  RESTRICTED = 'restricted'
}

// Rule Types
export enum RuleType {
  DATE_RANGE = 'date_range',
  SEASONAL = 'seasonal',
  INVENTORY = 'inventory',
  CUSTOM = 'custom',
  TIME_BASED = 'time_based'
}

// Seasonal Configuration Schema
export const SeasonalConfigSchema = z.object({
  startMonth: z.number().min(1).max(12),
  startDay: z.number().min(1).max(31),
  endMonth: z.number().min(1).max(12),
  endDay: z.number().min(1).max(31),
  yearly: z.boolean(),
  timezone: z.string().default('America/Los_Angeles')
});

// Time Restrictions Schema
export const TimeRestrictionsSchema = z.object({
  daysOfWeek: z.array(z.number().min(0).max(6)),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().default('America/Los_Angeles')
});

// Pre-order Settings Schema
export const PreOrderSettingsSchema = z.object({
  message: z.string(),
  expectedDeliveryDate: z.coerce.date(),
  maxQuantity: z.number().nullable().optional(),
  depositRequired: z.boolean().default(false),
  depositAmount: z.number().nullable().optional()
});

/**
 * View-only Settings Schema
 * 
 * Used when a product is visible but cannot be purchased.
 * 
 * @property message - Custom message to display (null for default message)
 * @property showPrice - Whether to show the product price
 * @property allowWishlist - Whether users can add to wishlist
 * @property notifyWhenAvailable - Whether to show "notify me" option
 * 
 * @example
 * // With custom message
 * { message: "Available next season", showPrice: true, allowWishlist: true, notifyWhenAvailable: true }
 * 
 * @example
 * // With default message (null)
 * { message: null, showPrice: true, allowWishlist: false, notifyWhenAvailable: true }
 */
export const ViewOnlySettingsSchema = z.object({
  message: z.string().nullable(),
  showPrice: z.boolean().default(true),
  allowWishlist: z.boolean().default(false),
  notifyWhenAvailable: z.boolean().default(true)
});

// Main Availability Rule Schema
export const AvailabilityRuleSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  ruleType: z.nativeEnum(RuleType),
  state: z.nativeEnum(AvailabilityState),
  
  // Date controls
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  
  // Seasonal controls
  seasonalConfig: SeasonalConfigSchema.nullable().optional(),
  
  // Time restrictions
  timeRestrictions: TimeRestrictionsSchema.nullable().optional(),
  
  // Pre-order settings
  preOrderSettings: PreOrderSettingsSchema.nullable().optional(),
  
  // View-only settings
  viewOnlySettings: ViewOnlySettingsSchema.nullable().optional(),
  
  overrideSquare: z.boolean().default(true)
});

export type AvailabilityRule = z.infer<typeof AvailabilityRuleSchema>;
export type SeasonalConfig = z.infer<typeof SeasonalConfigSchema>;
export type TimeRestrictions = z.infer<typeof TimeRestrictionsSchema>;
export type PreOrderSettings = z.infer<typeof PreOrderSettingsSchema>;
export type ViewOnlySettings = z.infer<typeof ViewOnlySettingsSchema>;

// Bulk operation types
export interface BulkAvailabilityRequest {
  productIds: string[];
  rules: Partial<AvailabilityRule>[];
  operation: 'create' | 'update' | 'delete';
  applyToVariants: boolean;
}

// Preview types
export interface AvailabilityPreview {
  productId: string;
  currentState: AvailabilityState;
  futureStates: Array<{
    date: Date;
    state: AvailabilityState;
    rule: AvailabilityRule;
  }>;
  conflicts: Array<{
    rule1: AvailabilityRule;
    rule2: AvailabilityRule;
    resolution: 'priority' | 'date' | 'manual';
  }>;
}

// Availability Schedule Schema
export const AvailabilityScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  ruleId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
  stateChange: z.string(),
  processed: z.boolean().default(false),
  processedAt: z.coerce.date().nullable().optional(),
  errorMessage: z.string().nullable().optional()
});

export type AvailabilitySchedule = z.infer<typeof AvailabilityScheduleSchema>;

// API Response types
export interface AvailabilityApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

// Evaluation result types
export interface AvailabilityEvaluation {
  productId: string;
  currentState: AvailabilityState;
  appliedRules: AvailabilityRule[];
  computedAt: Date;
  nextStateChange?: {
    date: Date;
    newState: AvailabilityState;
    rule: AvailabilityRule;
  };
}

// Migration types
export interface SquareAvailabilityMigration {
  productId: string;
  squareData: {
    isHidden?: boolean;
    isPreorder?: boolean;
    preorderStartDate?: Date;
    preorderEndDate?: Date;
  };
  suggestedRules: Partial<AvailabilityRule>[];
  migrationStatus: 'pending' | 'completed' | 'failed';
}
