# Product Archive Feature - Phase 2 Implementation Prompt

## Context

You are implementing Phase 2 of the Product Archive feature for a Next.js 14 (App Router) e-commerce application that integrates with Square. Phase 1 (backend/API) is complete. Now we need to build the Admin UI components to manage archived products following the established design patterns.

## What's Already Done (Phase 1)

✅ Database schema with `is_archived`, `archived_at`, `archived_reason` fields
✅ Square sync integration that respects `is_archived` status
✅ API endpoints for archive/restore operations at `/api/admin/products/[id]/archive`
✅ Archive handler functions with statistics in `@/lib/square/archive-handler`
✅ TypeScript types for archive functionality

## Design System Requirements

**IMPORTANT:** This application follows specific design patterns. You MUST:

1. **Use the Form Design System** for all UI components
2. **Follow Server Component patterns** with minimal client components
3. **Use URL state** for filters, pagination, and sorting
4. **Implement Server Actions** for all mutations
5. **Follow established file structure** and naming conventions

**Required Reading:**

- `/docs/ADMIN_COMPONENT_DESIGN_PATTERNS.md` - Contains all patterns to follow
- `/src/components/ui/form/README.md` - Form component documentation

## Your Task: Build Admin UI for Product Archive Management

### Architecture Overview

```
src/app/(dashboard)/admin/products/
├── page.tsx                              # Main products page (UPDATE)
├── archived/
│   └── page.tsx                          # Archived products page (NEW)
└── components/
    ├── ArchiveStatsDashboard.tsx         # Stats component (NEW)
    ├── ProductCard.tsx                   # Update existing or create new
    ├── ArchiveToggleButton.tsx           # Archive/restore button (NEW)
    ├── ArchiveFilter.tsx                 # Filter component (NEW)
    └── BulkArchiveModal.tsx              # Bulk operations (NEW)
```

---

## Implementation Details

### 1. Archive Statistics Dashboard Component

**File:** `src/app/(dashboard)/admin/products/components/ArchiveStatsDashboard.tsx`

**Purpose:** Display archive statistics overview with visual indicators

**Design Requirements:**

- Server Component (fetches data directly)
- Uses `FormSection` with `variant="amber"` and `icon={FormIcons.archive}`
- Grid layout with stat cards
- Color-coded badges for archive reasons

**Implementation:**

```typescript
// src/app/(dashboard)/admin/products/components/ArchiveStatsDashboard.tsx

import { getArchivedProductsCount } from '@/lib/square/archive-handler';
import { FormSection, FormGrid, FormIcons } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

export async function ArchiveStatsDashboard() {
  const stats = await getArchivedProductsCount();

  return (
    <FormSection
      title="Archive Statistics"
      description="Overview of archived products"
      icon={FormIcons.archive}
      variant="amber"
    >
      <div className="space-y-6">
        {/* Total Count */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm font-medium text-amber-900">Total Archived</div>
          <div className="text-3xl font-bold text-amber-700 mt-1">{stats.total}</div>
        </div>

        {/* By Reason */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Archive Reasons</h4>
          <FormGrid cols={3}>
            <StatCard
              label="Square Archived"
              count={stats.byReason.square_archived || 0}
              variant="blue"
            />
            <StatCard
              label="Removed from Square"
              count={stats.byReason.removed_from_square || 0}
              variant="yellow"
            />
            <StatCard
              label="Manual"
              count={stats.byReason.manual || 0}
              variant="green"
            />
          </FormGrid>
        </div>

        {/* By Category */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Category</h4>
            <div className="space-y-2">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}

function StatCard({
  label,
  count,
  variant
}: {
  label: string;
  count: number;
  variant: 'blue' | 'yellow' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[variant]}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{count}</div>
    </div>
  );
}
```

---

### 2. Archive Filter Component

**File:** `src/app/(dashboard)/admin/products/components/ArchiveFilter.tsx`

**Purpose:** Filter products by archive status (All, Active Only, Archived Only)

**Design Requirements:**

- Client Component (uses router hooks)
- Follows filter pattern from design guide
- Updates URL search params
- Styled with Tailwind (white background, rounded-xl, shadow-sm)

**Implementation:**

```typescript
// src/app/(dashboard)/admin/products/components/ArchiveFilter.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Archive, Check } from 'lucide-react';

interface ArchiveFilterProps {
  currentFilter: string;
}

export function ArchiveFilter({ currentFilter }: ArchiveFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams);

    if (filter && filter !== 'all') {
      params.set('archived', filter);
    } else {
      params.delete('archived');
    }
    params.delete('page'); // Reset to page 1

    router.push(`?${params.toString()}`);
  };

  const filters = [
    { value: 'all', label: 'All Products', icon: null },
    { value: 'active', label: 'Active Only', icon: Check },
    { value: 'archived', label: 'Archived Only', icon: Archive },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Status:</span>
        <div className="flex gap-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = currentFilter === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {filter.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Archive Toggle Button Component

**File:** `src/app/(dashboard)/admin/products/components/ArchiveToggleButton.tsx`

**Purpose:** Single button to archive or restore a product with confirmation

**Design Requirements:**

- Client Component (uses state)
- Uses shadcn/ui AlertDialog for confirmation
- Shows loading state during API call
- Toast notifications for feedback
- Follows button styling from design system

**Implementation:**

```typescript
// src/app/(dashboard)/admin/products/components/ArchiveToggleButton.tsx
'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ArchiveToggleButtonProps {
  productId: string;
  productName: string;
  isArchived: boolean;
  variant?: 'default' | 'icon';
  onSuccess?: () => void;
}

export function ArchiveToggleButton({
  productId,
  productName,
  isArchived,
  variant = 'default',
  onSuccess
}: ArchiveToggleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  const handleToggleArchive = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/products/${productId}/archive`, {
        method: isArchived ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update archive status');
      }

      toast.success(data.message);
      router.refresh(); // Refresh server component data
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setShowDialog(false);
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          {isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>

        <ConfirmDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          onConfirm={handleToggleArchive}
          isLoading={isLoading}
          isArchived={isArchived}
          productName={productName}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={isArchived ? 'outline' : 'destructive'}
        size="sm"
        onClick={() => setShowDialog(true)}
        disabled={isLoading}
      >
        {isArchived ? (
          <>
            <ArchiveRestore className="h-4 w-4 mr-2" />
            Restore
          </>
        ) : (
          <>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </>
        )}
      </Button>

      <ConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleToggleArchive}
        isLoading={isLoading}
        isArchived={isArchived}
        productName={productName}
      />
    </>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  isArchived,
  productName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  isArchived: boolean;
  productName: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived ? 'Restore Product?' : 'Archive Product?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived ? (
              <>
                This will restore <strong>"{productName}"</strong> and make it available for purchase again.
              </>
            ) : (
              <>
                This will archive <strong>"{productName}"</strong> and hide it from customers.
                You can restore it later if needed.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isArchived ? '' : 'bg-red-600 hover:bg-red-700'}
          >
            {isLoading ? 'Processing...' : isArchived ? 'Restore' : 'Archive'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### 4. Enhanced Product Card with Archive Badge

**File:** `src/app/(dashboard)/admin/products/components/ProductCard.tsx`

**Purpose:** Display product with archive status badge and metadata

**Design Requirements:**

- Shows archive badge only when product is archived
- Displays archive reason and timestamp
- Visual dimming for archived products (opacity + grayscale)
- Includes archive/restore button

**Implementation:**

```typescript
// src/app/(dashboard)/admin/products/components/ProductCard.tsx

import { Badge } from '@/components/ui/badge';
import { ArchiveToggleButton } from './ArchiveToggleButton';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    squareId: string;
    active: boolean;
    isArchived: boolean;
    archivedAt: Date | null;
    archivedReason: string | null;
    category?: {
      name: string;
    } | null;
    image?: string | null;
    price?: number | null;
  };
  showArchiveButton?: boolean;
}

export function ProductCard({ product, showArchiveButton = true }: ProductCardProps) {
  const isArchived = product.isArchived;

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all
        ${isArchived ? 'opacity-60 grayscale' : ''}
      `}
    >
      {/* Archive Badge - Top Right */}
      {isArchived && (
        <div className="absolute top-2 right-2 z-10">
          <ArchiveBadge reason={product.archivedReason} />
        </div>
      )}

      <div className="flex gap-4">
        {/* Product Image */}
        {product.image && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate">
            {product.name}
          </h3>

          {product.category && (
            <p className="text-sm text-gray-500 mt-1">{product.category.name}</p>
          )}

          {product.price && (
            <p className="text-lg font-medium text-gray-900 mt-2">
              ${(product.price / 100).toFixed(2)}
            </p>
          )}

          {/* Archive Metadata */}
          {isArchived && product.archivedAt && (
            <div className="mt-3 text-xs text-gray-500">
              Archived {formatDistanceToNow(product.archivedAt, { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Actions */}
        {showArchiveButton && (
          <div className="flex-shrink-0">
            <ArchiveToggleButton
              productId={product.id}
              productName={product.name}
              isArchived={isArchived}
              variant="icon"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ArchiveBadge({ reason }: { reason: string | null }) {
  const badges = {
    square_archived: { label: 'Square Archived', color: 'bg-blue-100 text-blue-800' },
    removed_from_square: { label: 'Removed', color: 'bg-yellow-100 text-yellow-800' },
    manual: { label: 'Manually Archived', color: 'bg-green-100 text-green-800' },
  };

  const badge = badges[reason as keyof typeof badges] || badges.manual;

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
      Archived
    </span>
  );
}
```

---

### 5. Archived Products Page

**File:** `src/app/(dashboard)/admin/products/archived/page.tsx`

**Purpose:** Dedicated page showing only archived products with restore functionality

**Design Requirements:**

- Server Component following established patterns
- Pagination support (20 per page)
- Filter by archive reason
- Search within archived products
- Link back to main products page

**Implementation:**

```typescript
// src/app/(dashboard)/admin/products/archived/page.tsx

import { prisma } from '@/lib/db';
import { FormHeader, FormActions, FormButton, FormIcons } from '@/components/ui/form';
import { ArchiveStatsDashboard } from '../components/ArchiveStatsDashboard';
import { ProductCard } from '../components/ProductCard';
import Pagination from '@/components/ui/pagination';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Archived Products',
  description: 'Manage archived products',
};

type ArchivedProductsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    reason?: string;
  }>;
};

export default async function ArchivedProductsPage({ searchParams }: ArchivedProductsPageProps) {
  const params = await searchParams;

  const currentPage = Math.max(1, Number(params?.page || 1));
  const searchQuery = (params?.search || '').trim();
  const reasonFilter = params?.reason || 'all';
  const itemsPerPage = 20;

  // Build where clause
  const where: any = {
    isArchived: true,
  };

  if (searchQuery) {
    where.name = {
      contains: searchQuery,
      mode: 'insensitive'
    };
  }

  if (reasonFilter !== 'all') {
    where.archivedReason = reasonFilter;
  }

  // Fetch archived products
  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      archivedAt: 'desc'
    },
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });

  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Archived Products"
        description="View and restore archived products"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <div className="space-y-8 mt-8">
        {/* Statistics Dashboard */}
        <ArchiveStatsDashboard />

        {/* Actions */}
        <FormActions>
          <FormButton
            variant="secondary"
            href="/admin/products"
            leftIcon={FormIcons.package}
          >
            View Active Products
          </FormButton>
        </FormActions>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <SearchInput currentSearch={searchQuery} />

            {/* Reason Filter */}
            <ReasonFilter currentReason={reasonFilter} />
          </div>
        </div>

        {/* Products List */}
        {products.length === 0 ? (
          <EmptyArchivedState hasFilters={!!searchQuery || reasonFilter !== 'all'} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showArchiveButton={true}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={params}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SearchInput({ currentSearch }: { currentSearch: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        name="search"
        placeholder="Search archived products..."
        defaultValue={currentSearch}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

function ReasonFilter({ currentReason }: { currentReason: string }) {
  return (
    <select
      name="reason"
      value={currentReason}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
    >
      <option value="all">All Reasons</option>
      <option value="square_archived">Square Archived</option>
      <option value="removed_from_square">Removed from Square</option>
      <option value="manual">Manually Archived</option>
    </select>
  );
}

function EmptyArchivedState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col items-center">
        <Archive className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-base font-medium text-gray-900 mb-1">
          {hasFilters ? 'No archived products match your filters' : 'No archived products'}
        </p>
        <p className="text-sm text-gray-500">
          {hasFilters ? 'Try adjusting your search criteria' : 'Archived products will appear here'}
        </p>
      </div>
    </div>
  );
}
```

---

### 6. Update Main Products Page

**File:** `src/app/(dashboard)/admin/products/page.tsx` (MODIFY EXISTING)

**Changes Required:**

1. Add archive filter component
2. Update where clause to respect archive filter
3. Add link to archived products page
4. Show archive count badge

**Implementation:**

```typescript
// Add to existing page.tsx

import { ArchiveFilter } from './components/ArchiveFilter';

// In the component:
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  // Add archive filter parsing
  const archivedFilter = params?.archived || 'all';

  // Update where clause
  const where: any = {};

  // Archive filter logic
  if (archivedFilter === 'active') {
    where.active = true;
    where.isArchived = false;
  } else if (archivedFilter === 'archived') {
    where.isArchived = true;
  }
  // If 'all', no filter applied

  // Rest of existing logic...

  // Get archived count for badge
  const archivedCount = await prisma.product.count({
    where: { isArchived: true }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Existing FormHeader */}

      <div className="space-y-8 mt-8">
        {/* Existing FormActions - ADD archived link */}
        <FormActions>
          <FormButton
            href="/admin/products/new"
            leftIcon={FormIcons.plus}
          >
            Add Product
          </FormButton>

          {archivedCount > 0 && (
            <FormButton
              variant="secondary"
              href="/admin/products/archived"
              leftIcon={FormIcons.archive}
            >
              View Archived ({archivedCount})
            </FormButton>
          )}
        </FormActions>

        {/* ADD Archive Filter */}
        <ArchiveFilter currentFilter={archivedFilter} />

        {/* Rest of existing content... */}
      </div>
    </div>
  );
}
```

---

## File Structure Summary

```
src/
├── app/(dashboard)/admin/products/
│   ├── page.tsx                              # ✏️ UPDATE (add filter + archived link)
│   ├── archived/
│   │   └── page.tsx                          # ✨ NEW (archived products page)
│   └── components/
│       ├── ArchiveStatsDashboard.tsx         # ✨ NEW (server component)
│       ├── ProductCard.tsx                   # ✨ NEW or UPDATE existing
│       ├── ArchiveToggleButton.tsx           # ✨ NEW (client component)
│       └── ArchiveFilter.tsx                 # ✨ NEW (client component)
└── lib/square/
    └── archive-handler.ts                    # ✅ EXISTS (Phase 1)
```

---

## TypeScript Types

Add these types to your existing types file or create a new one:

```typescript
// src/types/product-archive.ts

export interface ArchiveStats {
  total: number;
  byCategory: Record<string, number>;
  byReason: Record<string, number>;
}

export interface ArchivedProduct {
  id: string;
  name: string;
  squareId: string;
  active: boolean;
  isArchived: boolean;
  archivedAt: Date | null;
  archivedReason: 'square_archived' | 'removed_from_square' | 'manual' | null;
  category?: {
    id: string;
    name: string;
  } | null;
  image?: string | null;
  price?: number | null;
}

export type ArchiveFilter = 'all' | 'active' | 'archived';
export type ArchiveReason = 'all' | 'square_archived' | 'removed_from_square' | 'manual';
```

---

## Design System Compliance Checklist

Before implementing, ensure you're following these patterns:

### Server Components

- ✅ Use `export const dynamic = 'force-dynamic'`
- ✅ Use `export const revalidate = 0`
- ✅ Await `searchParams` (Next.js 15 requirement)
- ✅ Fetch data directly in component
- ✅ Pass data to client components as props

### Form Design System

- ✅ Use `FormHeader` for page titles
- ✅ Use `FormActions` for action buttons
- ✅ Use `FormButton` instead of plain buttons
- ✅ Use `FormSection` with appropriate variants
- ✅ Use `FormGrid` for responsive layouts
- ✅ Use `FormIcons` for consistent icons

### Client Components

- ✅ Mark with `'use client'` directive
- ✅ Use `useRouter` and `useSearchParams` for navigation
- ✅ Handle loading states
- ✅ Show toast notifications for feedback
- ✅ Implement error boundaries

### Styling

- ✅ Use Tailwind utility classes
- ✅ Follow color scheme: white cards, rounded-xl, shadow-sm
- ✅ Responsive design: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- ✅ Consistent spacing: space-y-8, gap-4, p-6
- ✅ Archive-specific: amber colors for archive warnings

### URL State

- ✅ Store filters in URL search params
- ✅ Reset to page 1 when filters change
- ✅ Use `router.push()` to update URL
- ✅ Parse params server-side for SSR

---

## Testing Checklist

After implementation, verify:

### Functionality

- [ ] Archive button successfully archives a product
- [ ] Restore button successfully restores a product
- [ ] Archive filter shows/hides correct products
- [ ] Search works on archived products page
- [ ] Reason filter correctly filters archived products
- [ ] Pagination works on archived page

### UI/UX

- [ ] Archive badge appears on archived products
- [ ] Archive statistics display correct data
- [ ] Confirmation dialogs appear before archiving
- [ ] Toast notifications show success/error messages
- [ ] Loading states display during API calls
- [ ] Archived products have visual dimming effect

### Navigation

- [ ] "View Archived" button shows count badge
- [ ] Back buttons work correctly
- [ ] URL state persists filters/pagination
- [ ] Browser back/forward buttons work

### Responsive Design

- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Grid layouts adapt appropriately

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Focus states visible
- [ ] Color contrast meets WCAG standards

---

## Implementation Order

Implement in this order for best results:

1. **Start:** `ArchiveStatsDashboard.tsx` (establishes visual pattern)
2. **Then:** `ArchiveFilter.tsx` (simple client component)
3. **Then:** `ArchiveToggleButton.tsx` (core functionality)
4. **Then:** `ProductCard.tsx` (visual component)
5. **Then:** `archived/page.tsx` (full page)
6. **Finally:** Update `page.tsx` (integrate into existing)

---

## Example Usage

Once implemented, the workflow will be:

### For Admins:

1. Navigate to `/admin/products`
2. See "View Archived (5)" button if products are archived
3. Click filter to show "Active Only" or "Archived Only"
4. Click archive icon on product card
5. Confirm in dialog
6. See toast notification
7. Product disappears from active list
8. Visit `/admin/products/archived` to view all archived
9. Click restore to bring product back

### For Developers:

```typescript
// Query active products only
const activeProducts = await prisma.product.findMany({
  where: {
    active: true,
    isArchived: false, // Always exclude archived
  },
});

// Query all products for admin view
const allProducts = await prisma.product.findMany({
  where: {
    // Archive filter based on user selection
  },
});
```

---

## Success Criteria

Phase 2 is complete when:

1. ✅ Archive statistics dashboard displays accurate data
2. ✅ Products can be archived/restored with single click
3. ✅ Archive status clearly visible on product cards
4. ✅ Dedicated archived products page functional
5. ✅ Archive filter works on main products page
6. ✅ All components follow design system patterns
7. ✅ Responsive design works on all screen sizes
8. ✅ Toast notifications provide clear feedback
9. ✅ Error states handled gracefully
10. ✅ URL state persists across navigation

---

## Next Phase Preview (Phase 3)

After Phase 2, consider:

- Archive analytics with time-series charts
- Automated archive rules (inactive 90+ days)
- Email/Slack notifications for archive events
- Archive history audit trail
- Bulk operations for multiple products

---

## Questions Before Starting?

Consider checking:

1. Does `ProductCard` component already exist? If so, enhance it
2. Is there a preferred toast notification library? (Likely sonner)
3. Are there existing filter components to follow as patterns?
4. What's the current admin sidebar navigation structure?

**Ready to implement!** Start with `ArchiveStatsDashboard.tsx` and work through the implementation order above.
