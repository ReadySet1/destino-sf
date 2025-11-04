/**
 * Schema Versioning Utility
 *
 * Provides version tracking for API schemas to help monitor
 * when external APIs make breaking changes.
 */

import { z } from 'zod';

/**
 * Schema version metadata
 */
export interface SchemaVersion {
  /** Schema version (semantic versioning recommended: 1.0.0) */
  version: string;
  /** Date when schema was last updated */
  lastUpdated: string;
  /** Description of latest changes */
  changelog?: string;
}

/**
 * Create a versioned schema by extending it with version metadata
 *
 * @example
 * ```ts
 * const MySchema = versionedSchema(
 *   z.object({ name: z.string() }),
 *   {
 *     version: '1.0.0',
 *     lastUpdated: '2025-01-01',
 *     changelog: 'Initial version'
 *   }
 * );
 * ```
 */
export function versionedSchema<T extends z.ZodTypeAny>(
  schema: T,
  versionInfo: SchemaVersion
): T & { _version: SchemaVersion } {
  // Attach version metadata to schema
  return Object.assign(schema, {
    _version: versionInfo,
  });
}

/**
 * Get version info from a versioned schema
 */
export function getSchemaVersion<T extends z.ZodTypeAny>(
  schema: T & { _version?: SchemaVersion }
): SchemaVersion | undefined {
  return schema._version;
}

/**
 * Schema version registry for tracking all schemas
 */
class SchemaVersionRegistry {
  private schemas: Map<string, SchemaVersion> = new Map();

  /**
   * Register a schema with version info
   */
  register(schemaName: string, versionInfo: SchemaVersion): void {
    this.schemas.set(schemaName, versionInfo);
  }

  /**
   * Get version info for a schema
   */
  get(schemaName: string): SchemaVersion | undefined {
    return this.schemas.get(schemaName);
  }

  /**
   * Get all registered schemas
   */
  getAll(): Record<string, SchemaVersion> {
    const result: Record<string, SchemaVersion> = {};
    this.schemas.forEach((version, name) => {
      result[name] = version;
    });
    return result;
  }

  /**
   * Check if schema needs update based on age
   */
  needsReview(schemaName: string, maxAgeDays: number = 90): boolean {
    const version = this.schemas.get(schemaName);
    if (!version) return false;

    const lastUpdated = new Date(version.lastUpdated);
    const now = new Date();
    const ageInDays = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

    return ageInDays > maxAgeDays;
  }
}

/**
 * Global schema version registry
 */
export const schemaVersionRegistry = new SchemaVersionRegistry();

/**
 * Predefined schema versions for external APIs
 */
export const SCHEMA_VERSIONS = {
  // Square API Schemas
  SQUARE_CATALOG: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Square Catalog API schema with all object types',
  },
  SQUARE_PAYMENTS: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Square Payments API schema',
  },
  SQUARE_ORDERS: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Square Orders API schema',
  },
  SQUARE_WEBHOOKS: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Square Webhooks schema',
  },

  // Shippo API Schemas
  SHIPPO_SHIPMENTS: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Shippo Shipments API schema',
  },
  SHIPPO_TRANSACTIONS: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Shippo Transactions API schema',
  },
  SHIPPO_TRACKING: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Shippo Tracking API schema',
  },

  // Internal API Schemas
  PRODUCTS_API: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Products API schema with pagination and sorting',
  },
  ORDERS_API: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Orders API schema',
  },
  CATERING_API: {
    version: '1.0.0',
    lastUpdated: '2025-01-04',
    changelog: 'Initial Catering API schema with delivery zones',
  },
} as const;

// Register all predefined versions
Object.entries(SCHEMA_VERSIONS).forEach(([name, version]) => {
  schemaVersionRegistry.register(name, version);
});
