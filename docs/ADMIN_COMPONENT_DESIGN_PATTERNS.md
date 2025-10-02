# Admin Component Design Patterns

A comprehensive guide to creating admin components following the established patterns in this Next.js 14 (App Router) application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Page Structure](#page-structure)
3. [Component Patterns](#component-patterns)
4. [Form Design System](#form-design-system)
5. [Data Fetching](#data-fetching)
6. [State Management](#state-management)
7. [UI Components](#ui-components)
8. [Best Practices](#best-practices)

---

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: Prisma ORM with PostgreSQL
- **Authentication**: Supabase Auth
- **State**: React Server Components + Client Components
- **Type Safety**: TypeScript with strict mode

### Directory Structure

```
src/app/(dashboard)/admin/
├── layout.tsx                    # Admin layout with sidebar
├── layout-server.tsx             # Server-side auth helpers
├── components/
│   └── AdminSidebar.tsx         # Navigation sidebar
└── [feature]/
    ├── page.tsx                 # Main page (Server Component)
    ├── actions.ts               # Server Actions
    └── components/              # Feature-specific components
        ├── [Feature]Filters.tsx      # Client Component
        ├── [Feature]Table.tsx        # Client Component
        └── [Feature]TableWrapper.tsx # Client wrapper
```

---

## Page Structure

### 1. Server Component Pattern (Main Page)

Every admin page should follow this structure:

```typescript
// src/app/(dashboard)/admin/[feature]/page.tsx

import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import Pagination from '@/components/ui/pagination';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Metadata
export const metadata = {
  title: 'Feature Management',
  description: 'Manage features',
};

// Type definitions
type FeaturePageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    // ... other filters
  }>;
};

export default async function FeaturePage({ searchParams }: FeaturePageProps) {
  // 1. Await searchParams
  const params = await searchParams;
  
  // 2. Parse and validate parameters
  const currentPage = Math.max(1, Number(params?.page || 1));
  const searchQuery = (params?.search || '').trim();
  
  // 3. Fetch data from database
  const items = await prisma.feature.findMany({
    where: {
      // Build filters
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });
  
  // 4. Get total count for pagination
  const totalCount = await prisma.feature.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  // 5. Define server actions
  async function handleAction(formData: FormData) {
    'use server';
    // Action logic
  }
  
  // 6. Render UI
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Feature Management"
        description="Manage your features"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />
      
      <div className="space-y-8 mt-8">
        {/* Action buttons */}
        <FormActions>
          <FormButton
            href="/admin/features/new"
            leftIcon={FormIcons.plus}
          >
            Add Feature
          </FormButton>
        </FormActions>
        
        {/* Filters */}
        <FeatureFilters
          currentSearch={searchQuery}
          // ... pass other filters
        />
        
        {/* Content */}
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <FeatureTableWrapper
              items={items}
              onAction={handleAction}
            />
            
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
```

### 2. Key Page Requirements

**Always include:**
- ✅ `export const dynamic = 'force-dynamic'`
- ✅ `export const revalidate = 0`
- ✅ Proper TypeScript types for props
- ✅ `await searchParams` (Next.js 15 requirement)
- ✅ Input validation and sanitization
- ✅ Error boundaries
- ✅ Empty states
- ✅ Loading states (Suspense)

---

## Component Patterns

### 1. Client Component Wrapper Pattern

Use this pattern to separate server logic from client interactivity:

```typescript
// components/FeatureTableWrapper.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FeatureTable } from './FeatureTable';

interface FeatureTableWrapperProps {
  items: FeatureData[];
  onAction: (formData: FormData) => Promise<void>;
}

export function FeatureTableWrapper({ items, onAction }: FeatureTableWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', key);
    params.set('direction', direction);
    router.push(`?${params.toString()}`);
  };
  
  return (
    <FeatureTable
      items={items}
      onSort={handleSort}
      onAction={onAction}
    />
  );
}
```

### 2. Filter Component Pattern

```typescript
// components/FeatureFilters.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormInput } from '@/components/ui/form';
import { Search } from 'lucide-react';

interface FeatureFiltersProps {
  currentSearch: string;
  currentStatus?: string;
}

export function FeatureFilters({ currentSearch, currentStatus }: FeatureFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams);
    const value = e.target.value;
    
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.delete('page'); // Reset to page 1
    
    router.push(`?${params.toString()}`);
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    const value = e.target.value;
    
    if (value && value !== 'all') {
      params.set('status', value);
    } else {
      params.delete('status');
    }
    params.delete('page');
    
    router.push(`?${params.toString()}`);
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            defaultValue={currentSearch}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        {/* Status Filter */}
        <select
          value={currentStatus}
          onChange={handleStatusChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}
```

### 3. Responsive Table Pattern

```typescript
// components/FeatureTable.tsx
'use client';

import { ResponsiveTable, TableColumn } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FeatureTableProps {
  items: FeatureData[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onAction?: (formData: FormData) => Promise<void>;
}

export function FeatureTable({ items, onSort, onAction }: FeatureTableProps) {
  const columns: TableColumn<FeatureData>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => (
        <div className="font-medium text-gray-900">{item.name}</div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item) => (
        <Badge variant={item.active ? 'success' : 'secondary'}>
          {item.active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </div>
      ),
    },
  ];
  
  return (
    <ResponsiveTable
      data={items}
      columns={columns}
      onSort={onSort}
    />
  );
}
```

---

## Form Design System

### Using the Form Components

The application has a comprehensive form design system. **Always use these components for consistency:**

```typescript
import {
  FormContainer,
  FormHeader,
  FormSection,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormGrid,
  FormStack,
  FormActions,
  FormButton,
  FormIcons
} from '@/components/ui/form';
```

### Form Page Example

```typescript
export default function EditFeaturePage() {
  return (
    <FormContainer>
      <FormHeader
        title="Edit Feature"
        description="Update feature information"
        backUrl="/admin/features"
        backLabel="Back to Features"
      />
      
      <form className="space-y-10">
        {/* Basic Information Section */}
        <FormSection
          title="Basic Information"
          description="Essential feature details"
          icon={FormIcons.info}
          variant="default"
        >
          <FormStack spacing={6}>
            <FormField label="Feature Name" required>
              <FormInput
                name="name"
                placeholder="Enter feature name"
              />
            </FormField>
            
            <FormField label="Description">
              <FormTextarea
                name="description"
                placeholder="Describe the feature..."
                rows={4}
              />
            </FormField>
            
            <FormGrid cols={2}>
              <FormField label="Category">
                <FormSelect name="category">
                  <option value="">Select category</option>
                  <option value="1">Category 1</option>
                </FormSelect>
              </FormField>
              
              <FormField label="Priority">
                <FormSelect name="priority">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </FormSelect>
              </FormField>
            </FormGrid>
          </FormStack>
        </FormSection>
        
        {/* Settings Section */}
        <FormSection
          title="Settings"
          description="Feature configuration"
          icon={FormIcons.check}
          variant="purple"
        >
          <FormGrid cols={2}>
            <FormCheckbox
              name="active"
              label="Active"
              description="Feature is enabled"
            />
            <FormCheckbox
              name="featured"
              label="Featured"
              description="Show prominently"
            />
          </FormGrid>
        </FormSection>
        
        {/* Action Buttons */}
        <FormActions>
          <FormButton variant="secondary" href="/admin/features">
            Cancel
          </FormButton>
          <FormButton type="submit" leftIcon={FormIcons.save}>
            Save Changes
          </FormButton>
        </FormActions>
      </form>
    </FormContainer>
  );
}
```

### FormSection Variants

Use color-coded sections to organize content:

- **`default`** (Gray) - General information
- **`blue`** - Integrations, external services
- **`green`** - Uploads, media, files
- **`purple`** - Settings, configuration
- **`amber`** - Warnings, important notes
- **`indigo`** - Advanced features

### Available FormIcons

```typescript
FormIcons.info       // Information/details
FormIcons.user       // User/profile
FormIcons.package    // Products/inventory
FormIcons.truck      // Shipping/delivery
FormIcons.image      // Media/images
FormIcons.check      // Success/confirmation
FormIcons.warning    // Warnings/alerts
FormIcons.shield     // Security
FormIcons.save       // Save action
FormIcons.refresh    // Sync/refresh
FormIcons.plus       // Add/create
FormIcons.archive    // Archive
```

---

## Data Fetching

### Server Component Data Fetching

```typescript
export default async function FeaturePage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Build where clause
  const where: any = {};
  
  if (params.search) {
    where.name = {
      contains: params.search,
      mode: 'insensitive'
    };
  }
  
  if (params.status && params.status !== 'all') {
    where.active = params.status === 'active';
  }
  
  // Fetch with error handling
  try {
    const items = await prisma.feature.findMany({
      where,
      include: {
        category: true,
        // ... related data
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
    });
    
    return items;
  } catch (error) {
    logger.error('Error fetching features:', error);
    throw error;
  }
}
```

### Server Actions Pattern

```typescript
// actions.ts
'use server';

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createFeatureAction(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  // Validate
  if (!name) {
    return { success: false, error: 'Name is required' };
  }
  
  try {
    const feature = await prisma.feature.create({
      data: {
        name,
        description,
      }
    });
    
    // Revalidate the cache
    revalidatePath('/admin/features');
    
    // Redirect to the new feature
    redirect(`/admin/features/${feature.id}`);
  } catch (error) {
    logger.error('Error creating feature:', error);
    return {
      success: false,
      error: 'Failed to create feature'
    };
  }
}

export async function deleteFeatureAction(formData: FormData) {
  'use server';
  
  const id = formData.get('id') as string;
  
  try {
    await prisma.feature.delete({
      where: { id }
    });
    
    revalidatePath('/admin/features');
    redirect('/admin/features?status=success&action=delete');
  } catch (error) {
    logger.error('Error deleting feature:', error);
    redirect(`/admin/features?status=error&message=${encodeURIComponent('Failed to delete')}`);
  }
}
```

---

## State Management

### URL State Pattern

Use URL search params for filters, pagination, sorting:

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilterComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    
    // Reset to page 1 when filters change
    params.delete('page');
    
    router.push(`?${params.toString()}`);
  };
  
  return (
    <input
      onChange={(e) => updateFilter('search', e.target.value)}
      defaultValue={searchParams.get('search') || ''}
    />
  );
}
```

### Client State Pattern

For UI-only state, use React hooks:

```typescript
'use client';

import { useState } from 'react';

export function FeatureCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      
      {isExpanded && (
        <div>Details...</div>
      )}
    </div>
  );
}
```

---

## UI Components

### Status Badges

```typescript
import { Badge } from '@/components/ui/badge';

// Color-coded status badges
function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
```

### Empty State

```typescript
function EmptyState() {
  return (
    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col items-center">
        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-base font-medium text-gray-900 mb-1">No items found</p>
        <p className="text-sm text-gray-500">Get started by creating a new item.</p>
        <FormButton
          className="mt-4"
          href="/admin/features/new"
          leftIcon={FormIcons.plus}
        >
          Add Item
        </FormButton>
      </div>
    </div>
  );
}
```

### Loading Skeleton

```typescript
import { Skeleton } from '@/components/ui/skeleton';

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. TypeScript

**Always define proper types:**

```typescript
// Define data types
interface FeatureData {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  category: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Define props interfaces
interface FeaturePageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

// Use utility types
type FeatureFormData = Omit<FeatureData, 'id' | 'createdAt' | 'updatedAt'>;
```

### 2. Error Handling

```typescript
// Server Component
try {
  const data = await fetchData();
  return <Component data={data} />;
} catch (error) {
  logger.error('Error:', error);
  return <ErrorDisplay error={error} />;
}

// Server Action
try {
  await performAction();
  revalidatePath('/admin/features');
  redirect('/admin/features?status=success');
} catch (error) {
  logger.error('Action failed:', error);
  redirect(`/admin/features?status=error&message=${encodeURIComponent(error.message)}`);
}
```

### 3. Accessibility

```typescript
// Use semantic HTML
<nav aria-label="Main navigation">
  <button aria-label="Open menu" aria-expanded={isOpen}>
    Menu
  </button>
</nav>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Click me
</div>

// Screen reader text
<span className="sr-only">Loading...</span>
```

### 4. Performance

```typescript
// Use dynamic imports for heavy components
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

// Memoize expensive computations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// Use Suspense boundaries
<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>
```

### 5. Data Validation

```typescript
// Server-side validation
export async function createAction(formData: FormData) {
  const name = (formData.get('name') as string || '').trim();
  const email = (formData.get('email') as string || '').trim();
  
  // Validate required fields
  if (!name) {
    return { success: false, error: 'Name is required' };
  }
  
  // Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }
  
  // Validate length
  if (name.length < 3 || name.length > 100) {
    return { success: false, error: 'Name must be 3-100 characters' };
  }
  
  // Continue with action...
}
```

### 6. Responsive Design

```typescript
// Use Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
</div>

// Hide columns on mobile
<th className="hidden md:table-cell">Desktop Only</th>

// Responsive padding
<div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
  Content
</div>
```

---

## Complete Example: Feature Management

Here's a complete example implementing all patterns:

### Page (Server Component)

```typescript
// src/app/(dashboard)/admin/features/page.tsx

import { prisma } from '@/lib/db';
import { FormHeader, FormActions, FormButton, FormIcons } from '@/components/ui/form';
import { FeatureFilters } from './components/FeatureFilters';
import { FeatureTableWrapper } from './components/FeatureTableWrapper';
import Pagination from '@/components/ui/pagination';
import { deleteFeatureAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type FeaturePageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
};

export default async function FeaturesPage({ searchParams }: FeaturePageProps) {
  const params = await searchParams;
  
  const currentPage = Math.max(1, Number(params?.page || 1));
  const searchQuery = (params?.search || '').trim();
  const statusFilter = params?.status || 'all';
  const itemsPerPage = 20;
  
  // Build where clause
  const where: any = {};
  
  if (searchQuery) {
    where.name = {
      contains: searchQuery,
      mode: 'insensitive'
    };
  }
  
  if (statusFilter !== 'all') {
    where.active = statusFilter === 'active';
  }
  
  // Fetch data
  const features = await prisma.feature.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: (currentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });
  
  const totalCount = await prisma.feature.count({ where });
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Feature Management"
        description="Manage application features"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />
      
      <div className="space-y-8 mt-8">
        <FormActions>
          <FormButton
            href="/admin/features/new"
            leftIcon={FormIcons.plus}
          >
            Add Feature
          </FormButton>
        </FormActions>
        
        <FeatureFilters
          currentSearch={searchQuery}
          currentStatus={statusFilter}
        />
        
        {features.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <FeatureTableWrapper
              features={features}
              onDelete={deleteFeatureAction}
            />
            
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
```

### Actions

```typescript
// src/app/(dashboard)/admin/features/actions.ts

'use server';

import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteFeatureAction(formData: FormData) {
  const id = formData.get('id') as string;
  
  if (!id) {
    return { success: false, error: 'ID is required' };
  }
  
  try {
    await prisma.feature.delete({
      where: { id }
    });
    
    revalidatePath('/admin/features');
    redirect('/admin/features?status=success&action=delete');
  } catch (error) {
    logger.error('Error deleting feature:', error);
    redirect(`/admin/features?status=error&message=${encodeURIComponent('Failed to delete feature')}`);
  }
}
```

### Client Components

```typescript
// components/FeatureTableWrapper.tsx

'use client';

import { FeatureTable } from './FeatureTable';

interface FeatureTableWrapperProps {
  features: any[];
  onDelete: (formData: FormData) => Promise<void>;
}

export function FeatureTableWrapper({ features, onDelete }: FeatureTableWrapperProps) {
  return <FeatureTable features={features} onDelete={onDelete} />;
}
```

---

## Summary Checklist

When creating a new admin component, ensure:

- ✅ Server Components for data fetching
- ✅ Client Components only when needed (interactivity)
- ✅ Form Design System components used
- ✅ Proper TypeScript types defined
- ✅ URL state for filters/pagination
- ✅ Server Actions for mutations
- ✅ Error handling implemented
- ✅ Empty states added
- ✅ Loading states with Suspense
- ✅ Responsive design (mobile-first)
- ✅ Accessibility features (ARIA, keyboard)
- ✅ Consistent spacing and colors
- ✅ Validation on both client and server
- ✅ Logging for debugging
- ✅ Revalidation after mutations

---

**For more details, see:**
- [Form Design System README](/src/components/ui/form/README.md)
- [API Design Patterns](./api-design.md)
- [Database Patterns](./database-patterns.md)

