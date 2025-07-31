## 🎯 Feature/Fix Overview

**Name**: Square Products & Images Sync Refactoring

**Type**: Refactor

**Priority**: High

### Problem Statement

The current Square sync process has become overly complex with two implementations (admin/products and admin/sync), making it difficult to maintain. The main concern is protecting manually integrated catering elements while syncing only alfajores and empanadas from Square's production environment, without accidentally deleting or modifying catering database entries.

### Success Criteria

- [x] Unified sync process that only imports alfajores and empanadas from Square
- [x] Complete protection of existing catering items and their custom implementation
- [x] Zero data loss during sync operations
- [x] Clear separation between Square products and catering items
- [x] Consistent and predictable sync behavior

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// New/Modified Files
src/
├── app/
│   ├── api/
│   │   └── square/
│   │       ├── sync/
│   │       │   ├── route.ts              // Main sync endpoint (keep)
│   │       │   └── route.test.ts         
│   │       └── sync-filtered/
│   │           ├── route.ts              // New filtered sync endpoint
│   │           └── route.test.ts
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── products/
│   │           ├── page.tsx              // Unified admin page
│   │           └── sync-button.tsx       // Simplified sync button
├── lib/
│   ├── square/
│   │   ├── filtered-sync.ts              // New filtered sync manager
│   │   ├── sync-constants.ts             // Sync configuration
│   │   └── catering-protection.ts        // Catering protection logic
│   └── db/
│       └── queries/
│           └── sync-queries.ts           // Database sync queries
├── types/
│   └── square-sync.ts                    // TypeScript interfaces
└── migrations/
    └── [timestamp]_add_sync_metadata.sql // Track sync history

```

### Key Interfaces & Types

```tsx
// types/square-sync.ts
interface FilteredSyncConfig {
  allowedCategories: string[];
  allowedProductNames: RegExp[];
  protectedCategories: string[];
  enableImageSync: boolean;
  validateBeforeSync: boolean;
}

interface SyncResult {
  success: boolean;
  message: string;
  syncedProducts: number;
  protectedItems: number;
  errors: string[];
}

interface CateringProtection {
  itemIds: string[];
  packageIds: string[];
  preserveImages: boolean;
}

type SyncStrategy = 'FILTERED' | 'FULL' | 'IMAGES_ONLY';

```

### Database Schema Reference

```sql
-- migrations/[timestamp]_add_sync_metadata.sql
-- Add sync tracking to prevent accidental overwrites
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50) DEFAULT 'SQUARE',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_locked BOOLEAN DEFAULT FALSE;

-- Create sync history table
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  products_synced INTEGER DEFAULT 0,
  products_skipped INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by VARCHAR(255)
);

-- Index for catering protection
CREATE INDEX idx_catering_items_protection 
ON catering_items(square_product_id) 
WHERE square_product_id IS NOT NULL;

```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [x] Filter Square products to only sync alfajores and empanadas
- [x] Preserve all existing catering items, packages, and custom implementations
- [x] Maintain image URLs for catering items that were manually set
- [x] Create audit trail of all sync operations
- [x] Implement rollback capability for sync failures

### Implementation Assumptions

- Square production API contains both product types and catering items
- Alfajores and empanadas can be identified by category or product name patterns
- Catering items use separate tables (catering_items, catering_packages) from products
- Some catering items may reference Square product IDs but should not be modified

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// POST /api/square/sync-filtered - Main filtered sync
// GET /api/square/sync-filtered/preview - Preview what will be synced
// POST /api/square/sync-filtered/rollback - Rollback last sync
// GET /api/admin/sync/history - View sync history

```

### Server Actions (App Router)

```tsx
// app/(dashboard)/admin/products/actions.ts
async function syncFilteredProducts(): Promise<SyncResult>
async function previewSync(): Promise<{ products: Product[]; willSkip: string[] }>
async function rollbackSync(syncId: string): Promise<{ success: boolean }>
async function getSyncHistory(): Promise<SyncHistory[]>

```

### Client-Server Data Flow

1. Admin triggers sync from UI
2. Preview endpoint shows what will be synced
3. Confirmation required before actual sync
4. Filtered sync runs with progress updates
5. Audit log created with rollback capability
6. UI updates with results and any warnings

---

## 🧪 Testing Strategy

### Unit Tests

```tsx
// Filtered Sync Tests
describe('FilteredSyncManager', () => {
  it('only syncs products matching allowed categories', async () => {})
  it('skips all catering-related categories', async () => {})
  it('preserves existing catering item images', async () => {})
  it('creates accurate sync history records', async () => {})
});

// Protection Tests
describe('CateringProtection', () => {
  it('identifies all catering items correctly', async () => {})
  it('prevents modification of protected items', async () => {})
  it('maintains catering-product relationships', async () => {})
});

// Rollback Tests
describe('SyncRollback', () => {
  it('restores previous product state', async () => {})
  it('preserves catering data during rollback', async () => {})
  it('updates sync history on rollback', async () => {})
});

```

### Integration Tests

```tsx
// Full Sync Flow
describe('Square Filtered Sync Integration', () => {
  beforeEach(async () => {
    // Seed test data with mixed products
  });

  it('completes filtered sync without affecting catering', async () => {})
  it('handles Square API failures gracefully', async () => {})
  it('maintains data integrity with concurrent syncs', async () => {})
});

// Catering Protection Integration
describe('Catering Protection During Sync', () => {
  it('preserves all catering relationships', async () => {})
  it('maintains custom catering images', async () => {})
  it('keeps catering menu structure intact', async () => {})
});

```

### E2E Tests (Playwright)

```tsx
test.describe('Admin Sync Flow', () => {
  test('preview and execute filtered sync', async ({ page }) => {
    // Test complete sync flow with UI
  });

  test('rollback sync operation', async ({ page }) => {
    // Test rollback functionality
  });

  test('catering pages remain functional after sync', async ({ page }) => {
    // Verify catering functionality
  });
});

```

### Type Safety Tests

```tsx
// types/square-sync.test-d.ts
import { expectType } from 'tsd';

// Test sync configuration types
// Test catering protection types
// Test rollback metadata types

```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [x] Admin role required for all sync operations
- [x] Sync history tracks user who initiated sync
- [x] Rate limiting on sync endpoints (max 3 per hour)
- [x] Rollback requires special permission

### Input Validation & Sanitization

```tsx
// Sync configuration validation
const SyncConfigSchema = z.object({
  strategy: z.enum(['FILTERED', 'FULL', 'IMAGES_ONLY']),
  options: z.object({
    dryRun: z.boolean().optional(),
    forceImageUpdate: z.boolean().optional(),
    batchSize: z.number().min(10).max(100).optional(),
  }).optional(),
}).strict();

```

### SQL Injection Prevention

```tsx
// Use Prisma ORM exclusively
// No raw SQL for product operations
// Parameterized queries for sync history
const protectedItems = await prisma.cateringItem.findMany({
  where: {
    squareProductId: { not: null }
  }
});

```

### XSS Protection

- [x] Sanitize all product descriptions from Square
- [x] Validate image URLs before storage
- [x] Escape category names in UI
- [x] Use React's built-in protection

### Additional Security Measures

```tsx
// Backup before sync
const backup = await createProductBackup();

// Validate Square data integrity
const isValidProduct = (product: SquareProduct) => {
  return product.id && product.name && !BLOCKED_PRODUCTS.includes(product.id);
};

// Audit logging for all operations
await createAuditLog('SYNC_INITIATED', { userId, strategy, options });

```

---

## 📊 Performance Considerations

### Database Optimization

```sql
-- Indexes for filtered sync
CREATE INDEX idx_products_square_category ON products(square_category_id);
CREATE INDEX idx_products_sync_source ON products(sync_source);
CREATE INDEX idx_sync_history_completed ON sync_history(completed_at DESC);

-- Partial index for active catering items
CREATE INDEX idx_active_catering ON catering_items(id) WHERE is_active = true;

```

### Caching Strategy

- [x] Cache Square API responses for 5 minutes
- [x] Use database transactions for batch operations
- [x] Implement progress tracking for long syncs
- [x] Queue sync jobs to prevent timeouts

### Bundle Size Optimization

- [x] Lazy load sync UI components
- [x] Use dynamic imports for admin features
- [x] Minimize Square SDK imports

---

## 🚦 Implementation Checklist

### Pre-Development

- [x] Document all current catering items and their sources
- [x] Identify exact Square categories for alfajores/empanadas
- [x] Create comprehensive backup of production database
- [x] Map all catering-product relationships

### Development Phase

- [x] Implement filtered sync manager with category filtering
- [x] Create catering protection service
- [x] Build sync preview functionality
- [x] Develop rollback mechanism
- [x] Update admin UI to single sync interface
- [x] Add comprehensive logging and monitoring

### Pre-Deployment

- [x] Test on staging with production data copy
- [x] Verify no catering data is modified
- [x] Confirm only target products are synced
- [x] Load test sync process
- [x] Create rollback procedures
- [x] Document new sync process

---

## 📝 MCP Analysis Commands

### For Local Development

```bash
# Analyze current sync implementations
desktop-commander: read_file ./src/app/(dashboard)/admin/products/sync-square.tsx
desktop-commander: read_file ./src/lib/square/production-sync.ts

# Check catering structure
desktop-commander: list_directory ./src/app/catering
desktop-commander: search_code "catering_items" path: ./src

# Review Square integration
desktop-commander: read_file ./src/lib/square/client.ts
desktop-commander: search_code "squareClient" path: ./src

```

### For GitHub Repositories

```bash
# Analyze sync history
github: search_code "syncProducts" repo: destino-sf

# Review catering implementation
github: get_file_contents path: src/app/api/catering

# Check Square API usage
github: search_code "catalogApi" repo: destino-sf

```

---

## 🎨 Code Style Guidelines

### TypeScript Best Practices

- Use strict typing for all Square API responses
- Create type guards for product filtering
- Use const assertions for configuration
- Implement proper error boundaries

### Next.js Patterns

- Use Server Components for admin pages
- Implement streaming for large syncs
- Use Server Actions for mutations
- Add proper loading and error states

### PostgreSQL Conventions

- Use transactions for all sync operations
- Implement soft deletes for rollback
- Add audit columns to track changes
- Use JSONB for flexible metadata

---

## 📚 Documentation Template

### API Documentation

```tsx
/**
 * Filtered Square Sync Endpoint
 *
 * @route POST /api/square/sync-filtered
 * @param {FilteredSyncConfig} config - Sync configuration
 * @returns {SyncResult} Sync results with protected items count
 * @throws {400} Invalid configuration
 * @throws {401} Unauthorized
 * @throws {429} Rate limit exceeded
 * @throws {500} Sync failure
 */

```

### Component Documentation

```tsx
/**
 * FilteredSyncButton - Triggers filtered Square sync
 *
 * Only syncs alfajores and empanadas while protecting catering items
 *
 * @example
 * ```tsx
 * <FilteredSyncButton
 *   onSuccess={handleSuccess}
 *   showPreview={true}
 * />
 * ```
 */

```

---

## 🔄 Rollback Plan

### Database Rollback

```sql
-- Restore from sync history
WITH last_sync AS (
  SELECT * FROM sync_history 
  WHERE completed_at IS NOT NULL 
  ORDER BY completed_at DESC 
  LIMIT 1
)
UPDATE products 
SET 
  name = (last_sync.metadata->>'previous_state'->>'name'),
  price = (last_sync.metadata->>'previous_state'->>'price')::DECIMAL
FROM last_sync
WHERE sync_source = 'SQUARE';

```

### Feature Toggle

```tsx
// Environment-based sync strategy
const SYNC_STRATEGY = process.env.NEXT_PUBLIC_SYNC_STRATEGY || 'FILTERED';

if (SYNC_STRATEGY === 'FILTERED') {
  // New filtered implementation
} else {
  // Fallback to original implementation
}

```

### Monitoring & Alerts

- [x] Monitor sync duration and success rate
- [x] Alert on catering data modifications
- [x] Track Square API errors
- [x] Set up automated rollback triggers
- [x] Create dashboard for sync health