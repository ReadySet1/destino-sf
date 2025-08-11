import { Decimal } from '@prisma/client/runtime/library';

export interface EnhancedSyncConfig {
  /** Target categories for sync */
  targetCategories: string[];
  /** Whether to perform a dry run */
  dryRun: boolean;
  /** Batch size for processing */
  batchSize: number;
  /** Enable detailed logging */
  verbose: boolean;
  /** Force update even if version matches */
  forceUpdate: boolean;
}

export interface SquareItemTransformed {
  squareId: string;
  version: bigint;
  name: string;
  description: string | null;
  categoryName: string;
  categoryId: string;
  price: Decimal;
  images: string[];
  variations: SquareVariationTransformed[];
  updatedAt: Date;
  isDeleted: boolean;
}

export interface SquareVariationTransformed {
  squareVariantId: string;
  name: string;
  price: Decimal | null;
  sku: string | null;
}

export interface SyncMetrics {
  startTime: number;
  endTime?: number;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  errors: SyncError[];
  warnings: string[];
}

export interface SyncError {
  itemId?: string;
  itemName?: string;
  error: string;
  timestamp: Date;
}

// Default configuration
export const DEFAULT_SYNC_CONFIG: EnhancedSyncConfig = {
  targetCategories: ['EMPANADAS', 'ALFAJORES'],
  dryRun: false,
  batchSize: 50,
  verbose: false,
  forceUpdate: false,
};
