# Admin Components Quick Reference

A quick-reference guide for common admin component patterns.

## Quick Start Templates

### New Admin Page

```bash
# File structure
src/app/(dashboard)/admin/[feature]/
├── page.tsx              # Main server component
├── actions.ts            # Server actions
└── components/
    ├── [Feature]Filters.tsx
    ├── [Feature]Table.tsx
    └── [Feature]TableWrapper.tsx
```

### Basic Page Template

```typescript
import { prisma } from '@/lib/db';
import { FormHeader, FormActions, FormButton, FormIcons } from '@/components/ui/form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FeaturePage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const items = await prisma.feature.findMany({
    // ... query
  });
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Feature Management"
        description="Manage features"
        backUrl="/admin"
      />
      
      <div className="space-y-8 mt-8">
        <FormActions>
          <FormButton href="/admin/features/new" leftIcon={FormIcons.plus}>
            Add Feature
          </FormButton>
        </FormActions>
        
        {/* Content */}
      </div>
    </div>
  );
}
```

---

## Common Imports

```typescript
// Form System
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

// Database
import { prisma } from '@/lib/db';

// Navigation
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

// Client Navigation
import { useRouter, useSearchParams } from 'next/navigation';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Pagination from '@/components/ui/pagination';

// Utils
import { logger } from '@/utils/logger';
```

---

## Form Design System

### Form Structure

```typescript
<FormContainer>
  <FormHeader title="Title" description="Description" backUrl="/admin" />
  
  <form className="space-y-10">
    <FormSection title="Section" icon={FormIcons.info}>
      <FormStack spacing={6}>
        <FormField label="Field">
          <FormInput name="field" />
        </FormField>
      </FormStack>
    </FormSection>
    
    <FormActions>
      <FormButton variant="secondary" href="/admin">Cancel</FormButton>
      <FormButton type="submit" leftIcon={FormIcons.save}>Save</FormButton>
    </FormActions>
  </form>
</FormContainer>
```

### FormSection Variants

```typescript
variant="default"  // Gray - General info
variant="blue"     // Blue - Integrations
variant="green"    // Green - Uploads/media
variant="purple"   // Purple - Settings
variant="amber"    // Amber - Warnings
variant="indigo"   // Indigo - Advanced
```

### FormIcons

```typescript
FormIcons.info      FormIcons.save      FormIcons.archive
FormIcons.user      FormIcons.refresh   FormIcons.truck
FormIcons.package   FormIcons.plus      FormIcons.image
FormIcons.check     FormIcons.warning   FormIcons.shield
```

---

## Server Actions

### Create Action

```typescript
'use server';

export async function createItemAction(formData: FormData) {
  const name = formData.get('name') as string;
  
  if (!name) {
    return { success: false, error: 'Name required' };
  }
  
  try {
    await prisma.item.create({ data: { name } });
    revalidatePath('/admin/items');
    redirect('/admin/items?status=success');
  } catch (error) {
    logger.error('Error:', error);
    return { success: false, error: 'Failed to create' };
  }
}
```

### Delete Action

```typescript
export async function deleteItemAction(formData: FormData) {
  'use server';
  
  const id = formData.get('id') as string;
  
  try {
    await prisma.item.delete({ where: { id } });
    revalidatePath('/admin/items');
    redirect('/admin/items?status=success&action=delete');
  } catch (error) {
    logger.error('Error:', error);
    redirect(`/admin/items?status=error&message=Failed to delete`);
  }
}
```

---

## Client Components

### Filter Component

```typescript
'use client';

export function ItemFilters({ currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    params.delete('page');
    router.push(`?${params.toString()}`);
  };
  
  return (
    <input
      defaultValue={currentSearch}
      onChange={(e) => handleChange('search', e.target.value)}
    />
  );
}
```

### Table Wrapper

```typescript
'use client';

export function TableWrapper({ items, onAction }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', key);
    params.set('direction', direction);
    router.push(`?${params.toString()}`);
  };
  
  return <Table items={items} onSort={handleSort} onAction={onAction} />;
}
```

---

## Common Patterns

### Status Badge

```typescript
function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-gray-100 text-gray-800',
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
    <div className="text-center py-12 bg-white rounded-xl border">
      <svg className="h-12 w-12 text-gray-400 mb-4 mx-auto" />
      <p className="font-medium text-gray-900 mb-1">No items found</p>
      <p className="text-sm text-gray-500">Get started by creating one.</p>
      <FormButton className="mt-4" href="/admin/items/new" leftIcon={FormIcons.plus}>
        Add Item
      </FormButton>
    </div>
  );
}
```

### Loading Skeleton

```typescript
import { Skeleton } from '@/components/ui/skeleton';

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded" />
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

## Database Queries

### Basic Query

```typescript
const items = await prisma.item.findMany({
  where: {
    name: { contains: search, mode: 'insensitive' },
    active: true,
  },
  include: {
    category: true,
  },
  orderBy: {
    createdAt: 'desc',
  },
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

### Count with Same Where

```typescript
const where = { active: true };

const [items, totalCount] = await Promise.all([
  prisma.item.findMany({ where }),
  prisma.item.count({ where }),
]);
```

### Complex Where Clause

```typescript
const where: any = {};

if (search) {
  where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
  ];
}

if (status !== 'all') {
  where.active = status === 'active';
}
```

---

## TypeScript Types

### Page Props

```typescript
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
  }>;
};
```

### Component Props

```typescript
interface ItemTableProps {
  items: ItemData[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onDelete?: (formData: FormData) => Promise<void>;
}
```

### Data Types

```typescript
interface ItemData {
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
```

---

## Styling Quick Reference

### Container Spacing

```typescript
className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
```

### Card/Section

```typescript
className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
```

### Button Variants

```typescript
variant="default"     // Primary indigo
variant="secondary"   // Gray outline
variant="destructive" // Red
variant="outline"     // Outline
variant="ghost"       // Transparent
```

### Grid Layouts

```typescript
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

### Responsive Classes

```typescript
className="hidden md:block"           // Hide on mobile
className="block md:hidden"           // Show only on mobile
className="text-sm md:text-base"     // Responsive text
className="px-4 sm:px-6 lg:px-8"     // Responsive padding
```

---

## Validation

### Server-Side

```typescript
const name = (formData.get('name') as string || '').trim();

if (!name) {
  return { success: false, error: 'Name required' };
}

if (name.length < 3 || name.length > 100) {
  return { success: false, error: 'Name must be 3-100 chars' };
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return { success: false, error: 'Invalid email' };
}
```

---

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const result = await operation();
  revalidatePath('/admin/items');
  redirect('/admin/items?status=success');
} catch (error) {
  logger.error('Operation failed:', error);
  
  // Check for redirect errors (these are normal)
  if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
    throw error;
  }
  
  redirect(`/admin/items?status=error&message=${encodeURIComponent('Failed')}`);
}
```

---

## Common Utility Functions

### Format Currency

```typescript
const formatted = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amount);
```

### Format Date

```typescript
import { formatDistance, format } from 'date-fns';

const relative = formatDistance(date, new Date(), { addSuffix: true });
const formatted = format(date, 'MMM d, yyyy h:mm a');
```

### Decimal to Number

```typescript
const decimalToNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  return parseFloat(String(value)) || 0;
};
```

---

## Accessibility

### ARIA Labels

```typescript
<button aria-label="Close menu" aria-expanded={isOpen}>
  <Icon />
</button>

<nav aria-label="Main navigation">
  <Link href="/admin">Dashboard</Link>
</nav>
```

### Keyboard Navigation

```typescript
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  onClick={handleClick}
>
  Click me
</div>
```

### Screen Reader Only

```typescript
<span className="sr-only">Loading...</span>
```

---

## Performance

### Dynamic Import

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

### Suspense

```typescript
import { Suspense } from 'react';

<Suspense fallback={<LoadingSkeleton />}>
  <DataComponent />
</Suspense>
```

### Memoization

```typescript
import { useMemo } from 'react';

const sorted = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

---

## Checklist

**Every admin page should have:**

- [ ] `export const dynamic = 'force-dynamic'`
- [ ] `export const revalidate = 0`
- [ ] TypeScript types for all props
- [ ] `await searchParams` before use
- [ ] Input validation and sanitization
- [ ] Error handling with try-catch
- [ ] Empty state component
- [ ] Loading state with Suspense
- [ ] Responsive design (mobile-first)
- [ ] ARIA labels for accessibility
- [ ] FormHeader with back button
- [ ] Pagination for long lists
- [ ] Filters for searching/sorting
- [ ] Server actions for mutations
- [ ] Revalidation after changes

---

**See also:**
- [Complete Design Patterns Guide](./ADMIN_COMPONENT_DESIGN_PATTERNS.md)
- [Form System Documentation](/src/components/ui/form/README.md)


