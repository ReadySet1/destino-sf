/**
 * TypeScript interfaces for the filtered Square sync process
 * 
 * This file defines all types needed for the unified sync that only imports
 * alfajores and empanadas while protecting catering items.
 */

export interface FilteredSyncConfig {
  /** Categories allowed to be synced from Square */
  allowedCategories: string[];
  /** Product name patterns that are allowed to be synced */
  allowedProductNames: RegExp[];
  /** Categories that should never be modified during sync */
  protectedCategories: string[];
  /** Whether to sync product images */
  enableImageSync: boolean;
  /** Whether to validate data before performing sync */
  validateBeforeSync: boolean;
  /** Batch size for processing products */
  batchSize?: number;
  /** Whether this is a dry run (preview only) */
  dryRun?: boolean;
}

export interface SyncResult {
  /** Whether the sync completed successfully */
  success: boolean;
  /** Human-readable message describing the result */
  message: string;
  /** Number of products that were synced */
  syncedProducts: number;
  /** Number of items that were protected from modification */
  protectedItems: number;
  /** List of errors that occurred during sync */
  errors: string[];
  /** List of warnings that occurred during sync */
  warnings: string[];
  /** Detailed breakdown of products processed */
  productDetails?: {
    created: number;
    updated: number;
    withImages: number;
    withoutImages: number;
    skipped: number;
  };
  /** Sync metadata for tracking */
  metadata?: {
    syncId: string;
    startedAt: Date;
    completedAt?: Date;
    strategy: SyncStrategy;
  };
}

export interface CateringProtection {
  /** Product IDs that should never be modified */
  itemIds: string[];
  /** Package IDs that should never be modified */
  packageIds: string[];
  /** Whether to preserve custom catering images */
  preserveImages: boolean;
  /** Categories that contain catering items */
  protectedCategoryNames: string[];
}

export type SyncStrategy = 'FILTERED' | 'FULL' | 'IMAGES_ONLY';

export interface SyncOptions {
  /** The sync strategy to use */
  strategy: SyncStrategy;
  /** Additional options for the sync */
  options?: {
    /** Preview changes without applying them */
    dryRun?: boolean;
    /** Force update images even if they haven't changed */
    forceImageUpdate?: boolean;
    /** Number of products to process in each batch */
    batchSize?: number;
  };
}

export interface SyncHistory {
  id: string;
  syncType: string;
  startedAt: Date;
  completedAt?: Date;
  productsSynced: number;
  productsSkipped: number;
  errors: string[];
  metadata: Record<string, any>;
  createdBy?: string;
}

export interface PreviewResult {
  /** Products that will be synced */
  productsToSync: {
    id: string;
    name: string;
    category: string;
    action: 'CREATE' | 'UPDATE';
  }[];
  /** Items that will be skipped with reasons */
  itemsToSkip: {
    id: string;
    name: string;
    reason: string;
  }[];
  /** Summary statistics */
  summary: {
    totalProducts: number;
    willSync: number;
    willSkip: number;
    protectedItems: number;
  };
}

export interface RollbackResult {
  success: boolean;
  message: string;
  productsRestored: number;
  errors: string[];
}

/**
 * Configuration for the filtered sync process
 * Only alfajores and empanadas should be synced from Square
 */
export const FILTERED_SYNC_CONFIG: FilteredSyncConfig = {
  allowedCategories: [
    'ALFAJORES',
    'EMPANADAS',
    'ALFAJORES & SWEETS', // Alternative category name
    'EMPANADAS & SAVORY'  // Alternative category name
  ],
  allowedProductNames: [
    /alfajor/i,
    /empanada/i
  ],
  protectedCategories: [
    'CATERING',
    'CATERING- APPETIZERS',
    'CATERING- ENTREES', 
    'CATERING- DESSERTS',
    'CATERING- BEVERAGES',
    'CATERING- SIDES',
    'CATERING- PACKAGES'
  ],
  enableImageSync: true,
  validateBeforeSync: true,
  batchSize: 50,
  dryRun: false
};

/**
 * Error types specific to the sync process
 */
export enum SyncErrorType {
  SQUARE_API_ERROR = 'SQUARE_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CATERING_PROTECTION_ERROR = 'CATERING_PROTECTION_ERROR',
  IMAGE_SYNC_ERROR = 'IMAGE_SYNC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SyncError {
  type: SyncErrorType;
  message: string;
  details?: Record<string, any>;
  productId?: string;
  productName?: string;
}