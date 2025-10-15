# Product Archive Feature - Phase 3 Implementation Prompt

## Context

You are implementing Phase 3 (Analytics & Automation) of the Product Archive feature for a Next.js 14 (App Router) e-commerce application. Phases 1 and 2 are complete with full backend API and admin UI functionality.

## What's Already Done

### Phase 1 (Backend/API) - ✅ COMPLETE

- Database schema with archive fields
- Square sync integration
- REST API endpoints for archive/restore
- Archive statistics functions

### Phase 2 (Admin UI) - ✅ COMPLETE

- Archive statistics dashboard
- Product cards with archive status
- Archive/restore toggle buttons
- Dedicated archived products page
- Archive filter component
- Toast notifications

## Your Task: Build Analytics & Automation Features

Phase 3 focuses on advanced features that provide deeper insights and automate archive management.

---

## Feature 1: Bulk Archive Operations

### Purpose

Allow admins to archive/restore multiple products simultaneously.

### Implementation

#### 1.1 Bulk Archive Modal Component

**File:** `src/app/(dashboard)/admin/products/components/BulkArchiveModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Loader2 } from 'lucide-react';

interface BulkArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Array<{
    id: string;
    name: string;
    isArchived: boolean;
  }>;
  onComplete: () => void;
  action: 'archive' | 'restore';
}

export function BulkArchiveModal({
  open,
  onOpenChange,
  selectedProducts,
  onComplete,
  action
}: BulkArchiveModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const router = useRouter();

  const handleBulkAction = async () => {
    setIsLoading(true);
    setProgress({ current: 0, total: selectedProducts.length });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ product: string; error: string }>
    };

    for (let i = 0; i < selectedProducts.length; i++) {
      const product = selectedProducts[i];
      setProgress({ current: i + 1, total: selectedProducts.length });

      try {
        const response = await fetch(`/api/admin/products/${product.id}/archive`, {
          method: action === 'archive' ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed');
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: product.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setIsLoading(false);

    // Show results
    if (results.failed === 0) {
      toast.success(
        `Successfully ${action === 'archive' ? 'archived' : 'restored'} ${results.success} product(s)`
      );
    } else {
      toast.error(
        `Completed with errors: ${results.success} succeeded, ${results.failed} failed`
      );

      // Log detailed errors
      console.error('Bulk operation errors:', results.errors);
    }

    router.refresh();
    onComplete();
    onOpenChange(false);
  };

  const Icon = action === 'archive' ? Archive : ArchiveRestore;
  const actionLabel = action === 'archive' ? 'Archive' : 'Restore';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              Bulk {actionLabel} Products
            </span>
          </DialogTitle>
          <DialogDescription>
            You are about to {action} <strong>{selectedProducts.length}</strong> product(s).
            This action will update all selected products.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">
                Processing {progress.current} of {progress.total}...
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkAction}
            disabled={isLoading}
            className={action === 'archive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                {actionLabel} {selectedProducts.length} Product(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 1.2 Add Selection to Product Cards

Update `ProductCard.tsx` to support checkbox selection:

```typescript
// Add to ProductCard.tsx

interface ProductCardProps {
  // ... existing props
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function ProductCard({
  product,
  showArchiveButton = true,
  selectable = false,
  selected = false,
  onSelectionChange
}: ProductCardProps) {
  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Selection checkbox */}
      {selectable && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectionChange?.(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Rest of card... */}
    </div>
  );
}
```

#### 1.3 Add Bulk Actions to Main Page

Update `page.tsx` to include bulk selection:

```typescript
// Add to page.tsx (client wrapper needed)

'use client';

import { useState } from 'react';
import { BulkArchiveModal } from './components/BulkArchiveModal';

export function ProductsWithBulkActions({ products }: { products: Product[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'archive' | 'restore'>('archive');

  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const allArchived = selectedProducts.every(p => p.isArchived);
  const allActive = selectedProducts.every(p => !p.isArchived);

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleOpenBulkModal = (action: 'archive' | 'restore') => {
    setBulkAction(action);
    setShowBulkModal(true);
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-indigo-900">
                {selectedIds.size} product(s) selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>

            <div className="flex gap-2">
              {!allArchived && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleOpenBulkModal('archive')}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Selected
                </Button>
              )}

              {!allActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenBulkModal('restore')}
                >
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore Selected
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Select All Checkbox */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={selectedIds.size === products.length && products.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          Select All
        </label>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            selectable={true}
            selected={selectedIds.has(product.id)}
            onSelectionChange={(selected) => {
              const newSelected = new Set(selectedIds);
              if (selected) {
                newSelected.add(product.id);
              } else {
                newSelected.delete(product.id);
              }
              setSelectedIds(newSelected);
            }}
          />
        ))}
      </div>

      {/* Bulk Modal */}
      <BulkArchiveModal
        open={showBulkModal}
        onOpenChange={setShowBulkModal}
        selectedProducts={selectedProducts}
        onComplete={() => setSelectedIds(new Set())}
        action={bulkAction}
      />
    </>
  );
}
```

---

## Feature 2: Archive History Audit Trail

### Purpose

Track who archived/restored products and when, creating an audit trail.

### Implementation

#### 2.1 Database Schema Update

Add archive history table:

```prisma
// prisma/schema.prisma

model ArchiveHistory {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  action      String   // 'archived' or 'restored'
  reason      String?  // Archive reason (for archive actions)
  performedBy String?  // User ID or 'system'
  metadata    Json?    // Additional context
  createdAt   DateTime @default(now())

  @@index([productId])
  @@index([createdAt])
}

// Add to Product model
model Product {
  // ... existing fields
  archiveHistory ArchiveHistory[]
}
```

Migration:

```sql
-- prisma/migrations/YYYYMMDDHHMMSS_add_archive_history/migration.sql

CREATE TABLE "ArchiveHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchiveHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ArchiveHistory_productId_idx" ON "ArchiveHistory"("productId");
CREATE INDEX "ArchiveHistory_createdAt_idx" ON "ArchiveHistory"("createdAt");
```

#### 2.2 Update Archive API to Log History

```typescript
// src/app/api/admin/products/[id]/archive/route.ts

import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Archive product (existing logic)
  const product = await prisma.product.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedReason: 'manual',
      active: false,
    },
  });

  // Log to history
  await prisma.archiveHistory.create({
    data: {
      productId: id,
      action: 'archived',
      reason: 'manual',
      performedBy: user?.id || 'system',
      metadata: {
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: `Product "${product.name}" has been archived`,
    product,
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Restore product (existing logic)
  const product = await prisma.product.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null,
      archivedReason: null,
      active: true,
    },
  });

  // Log to history
  await prisma.archiveHistory.create({
    data: {
      productId: id,
      action: 'restored',
      performedBy: user?.id || 'system',
      metadata: {
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return NextResponse.json({
    success: true,
    message: `Product "${product.name}" has been restored`,
    product,
  });
}
```

#### 2.3 Archive History Viewer Component

```typescript
// src/app/(dashboard)/admin/products/components/ArchiveHistoryPanel.tsx

import { prisma } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { Archive, ArchiveRestore, User } from 'lucide-react';

interface ArchiveHistoryPanelProps {
  productId: string;
}

export async function ArchiveHistoryPanel({ productId }: ArchiveHistoryPanelProps) {
  const history = await prisma.archiveHistory.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No archive history available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Archive History</h4>
      <div className="space-y-2">
        {history.map((entry) => {
          const Icon = entry.action === 'archived' ? Archive : ArchiveRestore;
          const metadata = entry.metadata as any;

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 text-sm p-3 bg-gray-50 rounded-lg"
            >
              <Icon className="h-4 w-4 mt-0.5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-gray-900">
                  Product was <strong>{entry.action}</strong>
                  {entry.reason && (
                    <span className="text-gray-600"> (Reason: {entry.reason})</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1 text-gray-500">
                  {metadata?.userEmail && (
                    <>
                      <User className="h-3 w-3" />
                      <span>{metadata.userEmail}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDistanceToNow(entry.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Feature 3: Archive Analytics Dashboard

### Purpose

Visualize archive trends over time with charts and metrics.

### Implementation

#### 3.1 Archive Analytics Page

```typescript
// src/app/(dashboard)/admin/products/analytics/page.tsx

import { prisma } from '@/lib/db';
import { FormHeader } from '@/components/ui/form';
import { ArchiveTrendsChart } from '../components/ArchiveTrendsChart';
import { ArchiveMetrics } from '../components/ArchiveMetrics';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ArchiveAnalyticsPage() {
  // Get last 6 months of data
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

  // Archive history by month
  const historyByMonth = await prisma.archiveHistory.groupBy({
    by: ['action'],
    where: {
      createdAt: {
        gte: sixMonthsAgo
      }
    },
    _count: true,
  });

  // Current archive stats
  const totalArchived = await prisma.product.count({
    where: { isArchived: true }
  });

  const totalActive = await prisma.product.count({
    where: { isArchived: false, active: true }
  });

  // Archive rate (archived in last 30 days)
  const thirtyDaysAgo = subMonths(new Date(), 1);
  const recentlyArchived = await prisma.product.count({
    where: {
      isArchived: true,
      archivedAt: {
        gte: thirtyDaysAgo
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Archive Analytics"
        description="Insights into product archiving trends"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <div className="space-y-8 mt-8">
        {/* Key Metrics */}
        <ArchiveMetrics
          totalArchived={totalArchived}
          totalActive={totalActive}
          recentlyArchived={recentlyArchived}
        />

        {/* Trends Chart */}
        <ArchiveTrendsChart />

        {/* Additional insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TopArchivedCategories />
          <ArchiveReasonBreakdown />
        </div>
      </div>
    </div>
  );
}
```

#### 3.2 Archive Metrics Component

```typescript
// src/app/(dashboard)/admin/products/components/ArchiveMetrics.tsx

import { TrendingDown, TrendingUp, Archive, Package } from 'lucide-react';

interface ArchiveMetricsProps {
  totalArchived: number;
  totalActive: number;
  recentlyArchived: number;
}

export function ArchiveMetrics({
  totalArchived,
  totalActive,
  recentlyArchived
}: ArchiveMetricsProps) {
  const total = totalArchived + totalActive;
  const archiveRate = total > 0 ? (totalArchived / total) * 100 : 0;

  const metrics = [
    {
      label: 'Total Archived',
      value: totalArchived,
      icon: Archive,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      label: 'Active Products',
      value: totalActive,
      icon: Package,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Archive Rate',
      value: `${archiveRate.toFixed(1)}%`,
      icon: TrendingDown,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Archived (30 days)',
      value: recentlyArchived,
      icon: TrendingUp,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
              </div>
              <div className={`${metric.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Feature 4: Automated Archive Rules

### Purpose

Automatically archive products based on inactivity rules.

### Implementation

#### 4.1 Archive Rules Configuration

```typescript
// src/lib/archive-rules.ts

export interface ArchiveRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    daysInactive?: number;
    noOrdersSince?: number; // days
    categoryIds?: string[];
  };
  action: 'archive' | 'notify';
}

export const defaultArchiveRules: ArchiveRule[] = [
  {
    id: 'inactive-90-days',
    name: 'Inactive for 90 Days',
    description: 'Archive products with no orders in the last 90 days',
    enabled: false,
    conditions: {
      noOrdersSince: 90,
    },
    action: 'archive',
  },
  {
    id: 'seasonal-products',
    name: 'Seasonal Products Auto-Archive',
    description: 'Archive seasonal products after their season',
    enabled: false,
    conditions: {
      categoryIds: [], // Would be populated with seasonal category IDs
      daysInactive: 30,
    },
    action: 'archive',
  },
];
```

#### 4.2 Auto-Archive Cron Job

```typescript
// src/app/api/cron/auto-archive/route.ts

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find products with no orders in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const candidateProducts = await prisma.product.findMany({
      where: {
        isArchived: false,
        active: true,
        // Has no orders in last 90 days
        orderItems: {
          none: {
            order: {
              createdAt: {
                gte: ninetyDaysAgo,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    // Archive products
    const results = [];
    for (const product of candidateProducts) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            isArchived: true,
            archivedAt: new Date(),
            archivedReason: 'auto_archived_inactive',
            active: false,
          },
        });

        // Log to history
        await prisma.archiveHistory.create({
          data: {
            productId: product.id,
            action: 'archived',
            reason: 'auto_archived_inactive',
            performedBy: 'system',
            metadata: {
              rule: 'inactive-90-days',
              daysInactive: 90,
            },
          },
        });

        results.push({ id: product.id, name: product.name, success: true });
        logger.info(`Auto-archived product: ${product.name}`);
      } catch (error) {
        logger.error(`Failed to auto-archive product ${product.id}:`, error);
        results.push({ id: product.id, name: product.name, success: false, error });
      }
    }

    return NextResponse.json({
      success: true,
      archived: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    logger.error('Auto-archive cron failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 4.3 Archive Rules Management UI

```typescript
// src/app/(dashboard)/admin/products/settings/page.tsx

import { FormHeader, FormSection, FormStack, FormField } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { defaultArchiveRules } from '@/lib/archive-rules';

export default function ArchiveSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Archive Settings"
        description="Configure automatic archive rules"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <div className="mt-8">
        <FormSection
          title="Automatic Archive Rules"
          description="Rules that automatically archive products based on criteria"
          variant="purple"
        >
          <FormStack spacing={6}>
            {defaultArchiveRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{rule.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Action: <strong className="text-gray-700">{rule.action}</strong>
                  </div>
                </div>
                <Switch defaultChecked={rule.enabled} />
              </div>
            ))}
          </FormStack>
        </FormSection>
      </div>
    </div>
  );
}
```

---

## Feature 5: Email/Slack Notifications

### Purpose

Notify admins when products are auto-archived or reach archive thresholds.

### Implementation

#### 5.1 Notification Service

```typescript
// src/lib/notifications/archive-notifications.ts

import { logger } from '@/utils/logger';

interface ArchiveNotification {
  type: 'product_archived' | 'bulk_archived' | 'auto_archive_summary';
  data: {
    productNames?: string[];
    count?: number;
    reason?: string;
    performedBy?: string;
  };
}

export async function sendArchiveNotification(notification: ArchiveNotification) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    logger.warn('Slack webhook URL not configured');
    return;
  }

  let message = '';

  switch (notification.type) {
    case 'product_archived':
      message = `🗄️ Product archived: *${notification.data.productNames?.[0]}*\nReason: ${notification.data.reason}`;
      break;
    case 'bulk_archived':
      message = `🗄️ Bulk archive: *${notification.data.count}* products archived by ${notification.data.performedBy}`;
      break;
    case 'auto_archive_summary':
      message = `🤖 Auto-archive complete: *${notification.data.count}* products archived due to inactivity`;
      break;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    logger.error('Failed to send Slack notification:', error);
  }
}
```

#### 5.2 Integrate Notifications into Archive Actions

```typescript
// Update archive API route

import { sendArchiveNotification } from '@/lib/notifications/archive-notifications';

// After successful archive
await sendArchiveNotification({
  type: 'product_archived',
  data: {
    productNames: [product.name],
    reason: 'manual',
    performedBy: user?.email || 'system',
  },
});
```

---

## Implementation Checklist

### Phase 3.1: Bulk Operations

- [ ] Create `BulkArchiveModal.tsx` component
- [ ] Add selection checkboxes to `ProductCard.tsx`
- [ ] Create bulk actions wrapper component
- [ ] Add "Select All" functionality
- [ ] Implement progress tracking
- [ ] Test bulk archive/restore flow

### Phase 3.2: Archive History

- [ ] Create database migration for `ArchiveHistory` table
- [ ] Update archive API to log history
- [ ] Create `ArchiveHistoryPanel.tsx` component
- [ ] Add history viewer to product detail page
- [ ] Test history logging

### Phase 3.3: Analytics Dashboard

- [ ] Create `/analytics` page
- [ ] Implement `ArchiveMetrics.tsx` component
- [ ] Add trends visualization (consider recharts library)
- [ ] Create category breakdown views
- [ ] Test analytics calculations

### Phase 3.4: Automated Rules

- [ ] Create archive rules configuration
- [ ] Implement cron job API route
- [ ] Create settings page for rule management
- [ ] Set up Vercel cron (or similar)
- [ ] Test auto-archive logic

### Phase 3.5: Notifications

- [ ] Create notification service
- [ ] Set up Slack webhook (if applicable)
- [ ] Integrate notifications into archive actions
- [ ] Add email notifications (optional)
- [ ] Test notification delivery

---

## Success Criteria

Phase 3 is complete when:

1. ✅ Admins can select and bulk archive/restore multiple products
2. ✅ Archive history is tracked and viewable
3. ✅ Analytics dashboard shows archive trends
4. ✅ Automated archive rules can be configured
5. ✅ Notifications are sent for archive events
6. ✅ All features follow established design patterns
7. ✅ Performance is acceptable (bulk operations don't timeout)
8. ✅ Error handling is robust

---

## Next Steps After Phase 3

Future enhancements could include:

- Advanced analytics with custom date ranges
- Export archive reports to CSV/PDF
- Archive scheduling (archive at specific date/time)
- Restore approval workflow
- Archive quotas and limits
- Archive cost analysis

---

**Ready to implement Phase 3!** Start with bulk operations as they provide immediate value to admins managing many products.
