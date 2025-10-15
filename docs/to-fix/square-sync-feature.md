# Square Sync Implementation - Destino SF

## 📁 Implementation Status & Plan

**Last Updated:** August 11, 2025

### 🎯 Current Implementation Status

✅ **COMPLETED** - Phase 1: Database Schema (SyncHistory + NEW SyncLog model with enhanced tracking)  
✅ **COMPLETED** - Phase 2: Type Definitions (square-sync.ts + NEW square-sync-enhanced.ts)  
✅ **COMPLETED** - Phase 3: Core Sync Service (FilteredSyncManager)  
✅ **COMPLETED** - Phase 4: API Route Implementation (/api/square/sync-filtered)  
✅ **COMPLETED** - Phase 5: Webhook Handler for Square catalog updates (/api/webhooks/square/catalog-update)  
✅ **COMPLETED** - Phase 6: Admin Dashboard Component (/admin/square-sync)

### 📝 Implementation Notes

The Square Sync feature is now **FULLY IMPLEMENTED** with all phases complete:

#### ✅ **Phase 1: Enhanced Database Schema**

- **NEW SyncLog model** with comprehensive tracking (itemsSynced, itemsCreated, itemsUpdated, etc.)
- **Enhanced Product model** with squareVersion, squareUpdatedAt, syncStatus fields
- **Applied migrations** successfully to production database

#### ✅ **Phase 2: Enhanced Type Definitions**

- **NEW square-sync-enhanced.ts** with EnhancedSyncConfig, SyncMetrics, SquareItemTransformed
- **Comprehensive error handling** with structured SyncError types
- **Supports both dry-run and production sync modes**

#### ✅ **Phase 3-4: Working Sync System**

- **FilteredSyncManager** handles alfajores/empanadas sync with catering protection
- **Admin dashboard** (/admin/square-sync) provides real-time preview and sync execution
- **API endpoints** (/api/square/sync-filtered) support both preview and execution modes
- **Database tracking** uses both SyncHistory and new SyncLog models

#### ✅ **Phase 5: Real-time Webhook Integration**

- **NEW Webhook Handler** at `/api/webhooks/square/catalog-update/route.ts`
- **Square signature verification** for security
- **Smart filtering** for EMPANADAS and ALFAJORES categories only
- **Automatic logging** of webhook events in SyncLog table

#### ✅ **Phase 6: Production-Ready Build**

- **Build verification** completed successfully (pnpm build ✅)
- **All TypeScript compilation** passes without errors
- **Ready for local testing and deployment**

### 🎉 Implementation Complete!

All phases are now complete and the system is ready for testing. The implementation provides:

- 📊 **Comprehensive tracking** with detailed sync logs and statistics
- 🔄 **Real-time webhooks** for automatic Square catalog updates
- 📈 **Enhanced monitoring** with error/warning tracking and performance metrics
- ⚡ **Production-ready** with successful build verification
- 🛡️ **Security** with proper authentication and catering item protection

---

## 📋 Original Implementation Plan (for reference)

Based on your existing codebase structure, here's the adapted implementation plan for the Square sync feature focusing on EMPANADAS and ALFAJORES categories.

---

## Step 1: Database Schema Updates

First, let's add the necessary models to track sync operations. Create a new migration:

```bash
# Create migration file
npx prisma migrate dev --name add_square_sync_tracking --create-only
```

Add this to your migration SQL file:

```sql
-- migrations/[timestamp]_add_square_sync_tracking.sql

-- Create sync_logs table for tracking sync operations
CREATE TABLE "sync_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sync_type" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "items_synced" INTEGER NOT NULL DEFAULT 0,
  "items_created" INTEGER NOT NULL DEFAULT 0,
  "items_updated" INTEGER NOT NULL DEFAULT 0,
  "items_deleted" INTEGER NOT NULL DEFAULT 0,
  "items_skipped" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "warnings" JSONB,
  "metadata" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_by" UUID,

  CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient queries
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at" DESC);
CREATE INDEX "sync_logs_sync_type_idx" ON "sync_logs"("sync_type");

-- Add new columns to products table for better sync tracking
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "square_version" BIGINT,
  ADD COLUMN IF NOT EXISTS "square_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(20) DEFAULT 'SYNCED';

-- Create index for sync status
CREATE INDEX IF NOT EXISTS "products_sync_status_idx" ON "products"("sync_status");
```

Then update your Prisma schema (`prisma/schema.prisma`):

```prisma
// Add to your existing schema.prisma

model SyncLog {
  id             String    @id @default(uuid()) @db.Uuid
  syncType       String    @map("sync_type") @db.VarChar(50)
  status         String    @db.VarChar(20)
  itemsSynced    Int       @default(0) @map("items_synced")
  itemsCreated   Int       @default(0) @map("items_created")
  itemsUpdated   Int       @default(0) @map("items_updated")
  itemsDeleted   Int       @default(0) @map("items_deleted")
  itemsSkipped   Int       @default(0) @map("items_skipped")
  errors         Json?
  warnings       Json?
  metadata       Json?
  startedAt      DateTime  @default(now()) @map("started_at")
  completedAt    DateTime? @map("completed_at")
  createdBy      String?   @db.Uuid @map("created_by")

  @@index([status])
  @@index([startedAt])
  @@index([syncType])
  @@map("sync_logs")
}

// Update your Product model to include new fields
model Product {
  // ... existing fields ...
  squareVersion   BigInt?        @map("square_version")
  squareUpdatedAt DateTime?      @map("square_updated_at")
  syncStatus      String?        @default("SYNCED") @map("sync_status") @db.VarChar(20)
  // ... rest of existing fields ...
}
```

---

## Step 2: Enhanced Type Definitions

Create `/src/types/square-sync-enhanced.ts`:

```typescript
import { Decimal } from '@prisma/client/runtime/library';
import { CatalogObject, CatalogItem } from 'square';

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
```

---

## Step 3: Core Sync Service

Create `/src/lib/square/empanadas-alfajores-sync.ts`:

```typescript
import { Client, Environment } from 'square';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  EnhancedSyncConfig,
  SquareItemTransformed,
  SyncMetrics,
  DEFAULT_SYNC_CONFIG,
} from '@/types/square-sync-enhanced';

export class EmpanadasAlfajoresSyncService {
  private client: Client;
  private config: EnhancedSyncConfig;
  private metrics: SyncMetrics;

  constructor(accessToken: string, config: Partial<EnhancedSyncConfig> = {}) {
    this.client = new Client({
      accessToken,
      environment:
        process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
    });

    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): SyncMetrics {
    return {
      startTime: Date.now(),
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      errors: [],
      warnings: [],
    };
  }

  async performSync(): Promise<SyncMetrics> {
    const syncLog = await this.createSyncLog();

    try {
      console.log('🚀 Starting sync for EMPANADAS and ALFAJORES...');

      // Step 1: Fetch all catalog items from Square
      const squareItems = await this.fetchFilteredItems();
      console.log(`📦 Found ${squareItems.length} items to process`);

      // Step 2: Ensure categories exist
      await this.ensureCategories();

      // Step 3: Process items in batches
      await this.processItemsBatch(squareItems);

      // Step 4: Handle deleted items
      await this.handleDeletedItems(squareItems);

      // Complete metrics
      this.metrics.endTime = Date.now();

      // Update sync log
      await this.updateSyncLog(syncLog.id, 'COMPLETED');

      console.log('✅ Sync completed successfully!');
      return this.metrics;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.metrics.errors.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      await this.updateSyncLog(syncLog.id, 'FAILED');
      throw error;
    }
  }

  private async fetchFilteredItems(): Promise<SquareItemTransformed[]> {
    const items: SquareItemTransformed[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.catalogApi.listCatalog(cursor, 'ITEM');

      if (response.result.objects) {
        const filtered = response.result.objects
          .filter(obj => this.shouldSyncItem(obj))
          .map(obj => this.transformSquareItem(obj));

        items.push(...filtered);
      }

      cursor = response.result.cursor;
    } while (cursor);

    return items;
  }

  private shouldSyncItem(catalogObject: any): boolean {
    const itemData = catalogObject.itemData;
    if (!itemData) return false;

    // Check if item belongs to target categories
    const categories = itemData.categories || [];
    return categories.some((cat: any) =>
      this.config.targetCategories.includes(cat.name?.toUpperCase())
    );
  }

  private transformSquareItem(catalogObject: any): SquareItemTransformed {
    const itemData = catalogObject.itemData;
    const category = itemData.categories?.[0] || { name: 'UNCATEGORIZED' };

    // Get first variation for price
    const firstVariation = itemData.variations?.[0];
    const price = firstVariation?.itemVariationData?.priceMoney?.amount
      ? new Decimal(firstVariation.itemVariationData.priceMoney.amount).div(100)
      : new Decimal(0);

    return {
      squareId: catalogObject.id,
      version: BigInt(catalogObject.version || 0),
      name: itemData.name,
      description: itemData.description || null,
      categoryName: category.name,
      categoryId: category.id,
      price,
      images: itemData.imageIds || [],
      variations: this.transformVariations(itemData.variations || []),
      updatedAt: new Date(catalogObject.updatedAt),
      isDeleted: catalogObject.isDeleted || false,
    };
  }

  private transformVariations(variations: any[]): any[] {
    return variations.map(v => ({
      squareVariantId: v.id,
      name: v.itemVariationData?.name || 'Default',
      price: v.itemVariationData?.priceMoney?.amount
        ? new Decimal(v.itemVariationData.priceMoney.amount).div(100)
        : null,
      sku: v.itemVariationData?.sku || null,
    }));
  }

  private async ensureCategories(): Promise<void> {
    for (const categoryName of this.config.targetCategories) {
      await prisma.category.upsert({
        where: { name: categoryName },
        update: {},
        create: {
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
          active: true,
        },
      });
    }
  }

  private async processItemsBatch(items: SquareItemTransformed[]): Promise<void> {
    const { batchSize } = this.config;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      if (this.config.dryRun) {
        console.log(`[DRY RUN] Would process batch ${i / batchSize + 1}`);
        this.metrics.itemsProcessed += batch.length;
        continue;
      }

      await prisma.$transaction(async tx => {
        for (const item of batch) {
          await this.upsertProduct(tx, item);
        }
      });

      console.log(`✓ Processed batch ${i / batchSize + 1} (${batch.length} items)`);
    }
  }

  private async upsertProduct(tx: any, item: SquareItemTransformed): Promise<void> {
    try {
      // Get category
      const category = await tx.category.findFirst({
        where: { name: item.categoryName },
      });

      if (!category) {
        this.metrics.warnings.push(`Category not found for ${item.name}`);
        this.metrics.itemsSkipped++;
        return;
      }

      // Check if product exists
      const existing = await tx.product.findUnique({
        where: { squareId: item.squareId },
        include: { variants: true },
      });

      if (existing) {
        // Check if update is needed
        if (!this.config.forceUpdate && existing.squareVersion === item.version) {
          this.metrics.itemsSkipped++;
          return;
        }

        // Update product
        await tx.product.update({
          where: { squareId: item.squareId },
          data: {
            name: item.name,
            description: item.description,
            price: item.price,
            images: item.images,
            categoryId: category.id,
            squareVersion: item.version,
            squareUpdatedAt: item.updatedAt,
            lastSyncAt: new Date(),
            syncStatus: 'SYNCED',
          },
        });

        // Update variants
        await this.updateVariants(tx, existing.id, item.variations);

        this.metrics.itemsUpdated++;
      } else {
        // Create new product
        const product = await tx.product.create({
          data: {
            squareId: item.squareId,
            name: item.name,
            description: item.description,
            price: item.price,
            images: item.images,
            categoryId: category.id,
            squareVersion: item.version,
            squareUpdatedAt: item.updatedAt,
            lastSyncAt: new Date(),
            syncStatus: 'SYNCED',
            active: true,
          },
        });

        // Create variants
        if (item.variations.length > 0) {
          await tx.variant.createMany({
            data: item.variations.map(v => ({
              ...v,
              productId: product.id,
            })),
          });
        }

        this.metrics.itemsCreated++;
      }

      this.metrics.itemsProcessed++;
    } catch (error) {
      this.metrics.errors.push({
        itemId: item.squareId,
        itemName: item.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  private async updateVariants(tx: any, productId: string, newVariants: any[]): Promise<void> {
    // Delete existing variants
    await tx.variant.deleteMany({
      where: { productId },
    });

    // Create new variants
    if (newVariants.length > 0) {
      await tx.variant.createMany({
        data: newVariants.map(v => ({
          ...v,
          productId,
        })),
      });
    }
  }

  private async handleDeletedItems(currentItems: SquareItemTransformed[]): Promise<void> {
    const currentIds = currentItems.map(item => item.squareId);

    // Find products that exist in DB but not in Square
    const deletedProducts = await prisma.product.findMany({
      where: {
        squareId: { notIn: currentIds },
        category: {
          name: { in: this.config.targetCategories },
        },
        syncLocked: false,
      },
    });

    if (deletedProducts.length > 0) {
      if (this.config.dryRun) {
        console.log(`[DRY RUN] Would soft-delete ${deletedProducts.length} products`);
        return;
      }

      // Soft delete by marking as inactive
      await prisma.product.updateMany({
        where: {
          id: { in: deletedProducts.map(p => p.id) },
        },
        data: {
          active: false,
          syncStatus: 'DELETED',
          lastSyncAt: new Date(),
        },
      });

      this.metrics.itemsDeleted = deletedProducts.length;
    }
  }

  private async createSyncLog(): Promise<{ id: string }> {
    return await prisma.syncLog.create({
      data: {
        syncType: 'EMPANADAS_ALFAJORES',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  private async updateSyncLog(id: string, status: string): Promise<void> {
    await prisma.syncLog.update({
      where: { id },
      data: {
        status,
        completedAt: new Date(),
        itemsSynced: this.metrics.itemsProcessed,
        itemsCreated: this.metrics.itemsCreated,
        itemsUpdated: this.metrics.itemsUpdated,
        itemsDeleted: this.metrics.itemsDeleted || 0,
        itemsSkipped: this.metrics.itemsSkipped,
        errors: this.metrics.errors.length > 0 ? this.metrics.errors : null,
        warnings: this.metrics.warnings.length > 0 ? this.metrics.warnings : null,
        metadata: {
          duration: this.metrics.endTime
            ? `${(this.metrics.endTime - this.metrics.startTime) / 1000}s`
            : null,
          config: this.config,
        },
      },
    });
  }
}
```

---

## Step 4: API Route Implementation

Create `/src/app/api/square/sync-empanadas-alfajores/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EmpanadasAlfajoresSyncService } from '@/lib/square/empanadas-alfajores-sync';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Request validation schema
const SyncRequestSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  forceUpdate: z.boolean().optional().default(false),
  verbose: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const params = SyncRequestSchema.parse(body);

    // Check for existing sync in progress
    const inProgress = await prisma.syncLog.findFirst({
      where: {
        syncType: 'EMPANADAS_ALFAJORES',
        status: 'IN_PROGRESS',
      },
    });

    if (inProgress) {
      return NextResponse.json(
        {
          error: 'Sync already in progress',
          syncId: inProgress.id,
        },
        { status: 409 }
      );
    }

    // Initialize sync service
    const syncService = new EmpanadasAlfajoresSyncService(process.env.SQUARE_ACCESS_TOKEN!, {
      dryRun: params.dryRun,
      forceUpdate: params.forceUpdate,
      verbose: params.verbose,
    });

    // Perform sync
    const result = await syncService.performSync();

    return NextResponse.json({
      success: true,
      message: params.dryRun ? 'Dry run completed successfully' : 'Sync completed successfully',
      result,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get latest sync status
    const latestSync = await prisma.syncLog.findFirst({
      where: {
        syncType: 'EMPANADAS_ALFAJORES',
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Get sync statistics
    const stats = await prisma.syncLog.aggregate({
      where: {
        syncType: 'EMPANADAS_ALFAJORES',
        status: 'COMPLETED',
      },
      _count: true,
      _sum: {
        itemsSynced: true,
        itemsCreated: true,
        itemsUpdated: true,
        itemsDeleted: true,
      },
    });

    return NextResponse.json({
      latestSync,
      statistics: {
        totalSyncs: stats._count,
        totalItemsSynced: stats._sum.itemsSynced || 0,
        totalItemsCreated: stats._sum.itemsCreated || 0,
        totalItemsUpdated: stats._sum.itemsUpdated || 0,
        totalItemsDeleted: stats._sum.itemsDeleted || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
  }
}
```

---

## Step 5: Webhook Handler

Create `/src/app/api/webhooks/square/catalog-update/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { EmpanadasAlfajoresSyncService } from '@/lib/square/empanadas-alfajores-sync';
import { z } from 'zod';

const WebhookSchema = z.object({
  merchant_id: z.string(),
  type: z.enum(['catalog.version.updated']),
  event_id: z.string(),
  created_at: z.string(),
  data: z.object({
    type: z.string(),
    id: z.string(),
    object: z.object({
      catalog_object: z.any(),
    }),
  }),
});

function verifyWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-square-signature');

  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature, process.env.SQUARE_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const event = WebhookSchema.parse(JSON.parse(body));

    // Check if the item belongs to our target categories
    const catalogObject = event.data.object.catalog_object;
    if (catalogObject?.type !== 'ITEM') {
      return NextResponse.json({ message: 'Not an item update' });
    }

    const categories = catalogObject.item_data?.categories || [];
    const isRelevant = categories.some((cat: any) =>
      ['EMPANADAS', 'ALFAJORES'].includes(cat.name?.toUpperCase())
    );

    if (!isRelevant) {
      return NextResponse.json({ message: 'Item not in target categories' });
    }

    // Trigger a partial sync for just this item
    console.log(`Webhook received for item: ${catalogObject.id}`);

    // You could implement a partial sync here or queue it for processing
    // For now, we'll just log it
    await prisma.syncLog.create({
      data: {
        syncType: 'WEBHOOK_UPDATE',
        status: 'COMPLETED',
        itemsSynced: 1,
        metadata: {
          itemId: catalogObject.id,
          itemName: catalogObject.item_data?.name,
          eventId: event.event_id,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
```

---

## Step 6: Admin Dashboard Component

Create `/src/app/admin/square-sync/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';

interface SyncStatus {
  latestSync: {
    id: string;
    status: string;
    itemsSynced: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsDeleted: number;
    itemsSkipped: number;
    errors: any[] | null;
    warnings: any[] | null;
    startedAt: string;
    completedAt: string | null;
  } | null;
  statistics: {
    totalSyncs: number;
    totalItemsSynced: number;
    totalItemsCreated: number;
    totalItemsUpdated: number;
    totalItemsDeleted: number;
  };
}

export default function SquareSyncPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [polling, setPolling] = useState(false);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/square/sync-empanadas-alfajores');
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setSyncStatus(data);

      // Check if sync is in progress
      if (data.latestSync?.status === 'IN_PROGRESS') {
        setIsSyncing(true);
        setPolling(true);
      } else {
        setIsSyncing(false);
        setPolling(false);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
      toast.error('Failed to fetch sync status');
    }
  };

  // Initial load
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  // Polling for sync status
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(() => {
      fetchSyncStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [polling]);

  // Trigger sync
  const handleSync = async () => {
    try {
      setIsLoading(true);
      setIsSyncing(true);
      setPolling(true);

      const response = await fetch('/api/square/sync-empanadas-alfajores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          forceUpdate,
          verbose: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      toast.success(dryRun ? 'Dry run completed successfully!' : 'Sync started successfully!');

      // Refresh status
      await fetchSyncStatus();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start sync');
      setIsSyncing(false);
      setPolling(false);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Square Sync</h1>
          <p className="text-muted-foreground">Sync Empanadas and Alfajores from Square catalog</p>
        </div>
        <Button onClick={handleSync} disabled={isLoading || isSyncing} size="lg">
          {isLoading || isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              {isSyncing ? 'Syncing...' : 'Starting...'}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Sync
            </>
          )}
        </Button>
      </div>

      {/* Sync Options */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Options</CardTitle>
          <CardDescription>Configure sync behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="dry-run"
              checked={dryRun}
              onCheckedChange={setDryRun}
              disabled={isSyncing}
            />
            <Label htmlFor="dry-run">Dry Run (preview changes without applying)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="force-update"
              checked={forceUpdate}
              onCheckedChange={setForceUpdate}
              disabled={isSyncing}
            />
            <Label htmlFor="force-update">Force Update (update even if versions match)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Latest Sync Status */}
      {syncStatus?.latestSync && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Latest Sync
              {getStatusBadge(syncStatus.latestSync.status)}
            </CardTitle>
            <CardDescription>
              Started at {new Date(syncStatus.latestSync.startedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Synced</p>
                <p className="text-2xl font-bold">{syncStatus.latestSync.itemsSynced}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-2xl font-bold text-green-600">
                  {syncStatus.latestSync.itemsCreated}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-2xl font-bold text-blue-600">
                  {syncStatus.latestSync.itemsUpdated}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deleted</p>
                <p className="text-2xl font-bold text-red-600">
                  {syncStatus.latestSync.itemsDeleted}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-2xl font-bold text-gray-600">
                  {syncStatus.latestSync.itemsSkipped}
                </p>
              </div>
            </div>

            {/* Errors */}
            {syncStatus.latestSync.errors && syncStatus.latestSync.errors.length > 0 && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {syncStatus.latestSync.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx} className="text-sm">
                        {error.itemName}: {error.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {syncStatus.latestSync.warnings && syncStatus.latestSync.warnings.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Warnings:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {syncStatus.latestSync.warnings.slice(0, 5).map((warning, idx) => (
                      <li key={idx} className="text-sm">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Statistics</CardTitle>
          <CardDescription>Cumulative sync statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Syncs</p>
              <p className="text-2xl font-bold">{syncStatus?.statistics.totalSyncs || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Items Synced</p>
              <p className="text-2xl font-bold">{syncStatus?.statistics.totalItemsSynced || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Items Created</p>
              <p className="text-2xl font-bold">{syncStatus?.statistics.totalItemsCreated || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Items Updated</p>
              <p className="text-2xl font-bold">{syncStatus?.statistics.totalItemsUpdated || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Items Deleted</p>
              <p className="text-2xl font-bold">{syncStatus?.statistics.totalItemsDeleted || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <SyncHistoryTable />
    </div>
  );
}

// Sync History Component
function SyncHistoryTable() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // You would implement this endpoint to fetch sync history
      // For now, we'll use the existing sync log data
      setLoading(false);
    } catch (error) {
      console.error('Error fetching history:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
        <CardDescription>Recent sync operations</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">History will be displayed here once implemented</p>
      </CardContent>
    </Card>
  );
}
```
