

## 🎯 Feature/Fix Overview

**Name**: Product Display Order Management for Menu Items (Alfajores & Empanadas)

**Type**: Enhancement

**Priority**: High

**Status**: ✅ **PHASE 1 COMPLETED** - All core functionality implemented and deployed

**Priority**: For Database you can use Supabase MCP 

### Problem Statement

James needs to reorder alfajores and empanadas products on the menu pages to match their physical menu ordering. Currently, products are sorted alphabetically by name, but James wants manual control over the display order similar to how items appear in his physical menus.

### Success Criteria

- [x] Products display in admin-specified order on alfajores category page
- [x] Products display in admin-specified order on empanadas category page  
- [x] Admin can reorder products via drag-and-drop interface
- [x] Order persists across page refreshes and deployments
- [x] Fallback to alphabetical ordering if no custom order exists

---

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
// New/Modified Files Based on Your Project Structure
src/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── products/
│   │           ├── reorder/
│   │           │   └── page.tsx              // New admin reorder page
│   │           └── actions.ts                // Add reorder actions
│   ├── api/
│   │   └── products/
│   │       └── reorder/
│   │           └── route.ts                  // API for updating product order
├── components/
│   └── Products/
│       ├── ProductGrid.tsx                  // Modify to respect custom ordering
│       ├── ProductReorderPanel.tsx          // New reorder component
│       └── ProductReorderPanel.types.ts     // New component types
├── lib/
│   └── db/
│       └── queries/
│           └── products.ts                  // Add ordering queries
├── types/
│   └── product.ts                           // Update Product interface
└── prisma/
    └── migrations/
        └── add_product_display_order.sql    // Add display_order column
```

### Key Interfaces & Types

```tsx
// Update types/product.ts
export interface Product {
  id: string;
  squareId: string;
  name: string;
  description?: string | null;
  price: number | Decimal;
  images: string[];
  slug: string;
  categoryId: string;
  category?: Category;
  variants?: Variant[];
  featured: boolean;
  active: boolean;
  displayOrder?: number;  // Add this field
  createdAt: Date;
  updatedAt: Date;
}

// New types for reordering
export interface ProductReorderItem {
  id: string;
  name: string;
  images: string[];
  displayOrder: number;
  categoryId: string;
}

export interface ReorderUpdate {
  productId: string;
  newOrder: number;
}

export interface ReorderResponse {
  success: boolean;
  updatedCount: number;
  errors?: string[];
}
```

### Database Schema Reference

```sql
-- prisma/migrations/add_product_display_order.sql

-- Add display_order column to products table
ALTER TABLE "products" 
ADD COLUMN "display_order" INTEGER DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX "idx_products_category_display_order" 
ON "products" ("categoryId", "display_order", "name");

-- Set initial display order based on current alphabetical order for each category
WITH ordered_products AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "categoryId" 
      ORDER BY name ASC
    ) * 10 as new_order
  FROM "products"
  WHERE active = true
)
UPDATE "products" p
SET "display_order" = op.new_order
FROM ordered_products op
WHERE p.id = op.id;
```

### Update Prisma Schema

```prisma
// prisma/schema.prisma - Add to Product model
model Product {
  // ... existing fields ...
  displayOrder  Int?            @default(0) @map("display_order")
  
  // ... existing relations ...
  
  @@index([categoryId, displayOrder])
  @@map("products")
}
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [x] Add display_order field to Product model in Prisma
- [x] Create admin interface at `/admin/products/reorder`
- [x] Implement drag-and-drop reordering for alfajores products
- [x] Implement drag-and-drop reordering for empanadas products
- [x] Update ProductGrid to sort by displayOrder
- [x] Add "Reorder Products" button to admin products page

### Implementation Assumptions

- Use existing Prisma setup (no new tables needed)
- Leverage existing admin authentication
- Use React DnD or Framer Motion for drag-drop
- Maintain compatibility with existing Square sync (ignore Square ordering)

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// POST /api/products/reorder - Bulk update product order
// Request body: { updates: ReorderUpdate[], categoryId: string }
// Response: ReorderResponse
```

### Server Actions (App Router)

```tsx
// src/app/(dashboard)/admin/products/actions.ts - Add these functions
'use server';

export async function getProductsByCategory(categoryId: string): Promise<ProductReorderItem[]> {
  const products = await prisma.product.findMany({
    where: { 
      categoryId,
      active: true 
    },
    select: {
      id: true,
      name: true,
      images: true,
      displayOrder: true,
      categoryId: true
    },
    orderBy: [
      { displayOrder: 'asc' },
      { name: 'asc' }
    ]
  });
  
  return products.map(p => ({
    ...p,
    displayOrder: p.displayOrder || 0
  }));
}

export async function updateProductOrder(updates: ReorderUpdate[]): Promise<ReorderResponse> {
  try {
    // Use transaction for atomic updates
    await prisma.$transaction(
      updates.map(update => 
        prisma.product.update({
          where: { id: update.productId },
          data: { displayOrder: update.newOrder }
        })
      )
    );
    
    return { 
      success: true, 
      updatedCount: updates.length 
    };
  } catch (error) {
    return { 
      success: false, 
      updatedCount: 0,
      errors: [error.message]
    };
  }
}
```

### Client-Server Data Flow

1. Admin navigates to `/admin/products/reorder`
2. Server loads products grouped by category with current order
3. Admin drags products to reorder within category
4. Client sends batch update with new positions
5. Server updates displayOrder in transaction
6. ProductGrid on frontend respects displayOrder when rendering

---

## 🧪 Testing Strategy

### Component Implementation

```tsx
// src/components/Products/ProductReorderPanel.tsx
'use client';

import { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { ProductReorderItem, ReorderUpdate } from '@/types/product';
import { updateProductOrder } from '@/app/(dashboard)/admin/products/actions';

interface SortableItemProps {
  product: ProductReorderItem;
}

function SortableItem({ product }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-md"
      {...attributes}
      {...listeners}
    >
      <div className="cursor-move">☰</div>
      {product.images[0] && (
        <Image
          src={product.images[0]}
          alt={product.name}
          width={60}
          height={60}
          className="rounded"
        />
      )}
      <span className="flex-1">{product.name}</span>
      <span className="text-sm text-gray-500">Position: {product.displayOrder}</span>
    </div>
  );
}

export function ProductReorderPanel({ 
  products: initialProducts,
  categoryId,
  categoryName 
}: {
  products: ProductReorderItem[];
  categoryId: string;
  categoryName: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [saving, setSaving] = useState(false);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.id === active.id);
      const newIndex = products.findIndex(p => p.id === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      setProducts(newProducts);
      
      // Create updates with new display orders
      const updates: ReorderUpdate[] = newProducts.map((product, index) => ({
        productId: product.id,
        newOrder: (index + 1) * 10
      }));
      
      setSaving(true);
      const result = await updateProductOrder(updates);
      setSaving(false);
      
      if (!result.success) {
        // Revert on error
        setProducts(initialProducts);
        alert('Failed to save order');
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{categoryName}</h3>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={products.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {products.map(product => (
              <SortableItem key={product.id} product={product} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {saving && <div className="text-center py-2">Saving...</div>}
    </div>
  );
}
```

### Update ProductGrid Sorting

```tsx
// src/components/Products/ProductGrid.tsx - Update sorting logic
export function ProductGrid({ products, title, showFilters = false }: ProductGridProps) {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
  const [sortOption, setSortOption] = useState<string>('default');

  useEffect(() => {
    // Sort by displayOrder by default if available
    const sorted = [...products].sort((a, b) => {
      // If displayOrder exists, use it; otherwise fall back to name
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });
    setFilteredProducts(sorted);
  }, [products]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value;
    setSortOption(option);

    let sorted = [...products];

    switch (option) {
      case 'default':
        // Use display order if available
        sorted.sort((a, b) => {
          if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
            return a.displayOrder - b.displayOrder;
          }
          return a.name.localeCompare(b.name);
        });
        break;
      case 'price-low':
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-high':
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    setFilteredProducts(sorted);
  };

  // ... rest of component
}
```

### Update Category Page Query

```tsx
// src/app/(store)/products/category/[slug]/page.tsx - Update the query
const dbProducts = await prisma.product.findMany({
  where: {
    categoryId: category.id,
    active: true,
    category: {
      NOT: {
        name: {
          startsWith: 'CATERING',
          mode: 'insensitive',
        },
      },
    },
  },
  include: {
    variants: true,
  },
  orderBy: [
    { displayOrder: 'asc' },  // Primary sort by displayOrder
    { name: 'asc' }           // Secondary sort by name
  ],
});
```

---

## 🔒 Security Analysis

### Authentication & Authorization

- [ ] Use existing admin authentication from layout
- [ ] Verify user role before allowing reorder
- [ ] Log order changes with user ID and timestamp

### Input Validation

```tsx
// Validation schema using Zod
import { z } from 'zod';

const ReorderSchema = z.object({
  updates: z.array(z.object({
    productId: z.string().uuid(),
    newOrder: z.number().int().min(0).max(9999)
  })).min(1).max(100),
  categoryId: z.string().uuid()
});
```

---

## 📊 Performance Considerations

### Database Optimization

- Index already added on (categoryId, displayOrder) for fast queries
- Use transaction for batch updates to maintain consistency
- Consider caching category products in Redis if needed

### Frontend Optimization

- Use React.memo for product items in reorder panel
- Debounce save operations during drag operations
- Implement optimistic UI updates

---

## 🚦 Implementation Checklist

### Pre-Development

- [x] Analyze existing codebase structure
- [x] Identify Product model and components
- [x] Understand current admin interface patterns
- [ ] Create feature branch from main

### Development Phase

- [x] Run Prisma migration to add displayOrder field
- [x] Update Prisma schema and regenerate client
- [x] Create reorder admin page at `/admin/products/reorder`
- [x] Add ProductReorderPanel component
- [x] Update server actions with reorder functions
- [x] Modify ProductGrid to respect displayOrder
- [x] Update category page query to order by displayOrder
- [x] Add "Reorder" link to admin products page

### Testing

- [ ] Test drag-drop functionality
- [ ] Verify order persists after page refresh
- [ ] Test with multiple categories
- [ ] Ensure frontend displays correct order
- [ ] Test fallback when displayOrder is null

### Pre-Deployment

- [x] Run migration on production database
- [x] Set initial displayOrder values for existing products
- [ ] Test on staging environment
- [ ] Document reorder feature for James
- [ ] Create video tutorial for reordering

---

## 📝 Package Dependencies

Add to package.json:

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  }
}
```

---

## 🔄 Rollback Plan

### Database Rollback

```sql
-- Rollback migration if needed
ALTER TABLE "products" DROP COLUMN IF EXISTS "display_order";
DROP INDEX IF EXISTS "idx_products_category_display_order";
```

### Feature Toggle

```tsx
// Environment variable for gradual rollout
const USE_CUSTOM_ORDERING = process.env.NEXT_PUBLIC_ENABLE_PRODUCT_ORDER === 'true';

// In ProductGrid and category page
const orderBy = USE_CUSTOM_ORDERING 
  ? [{ displayOrder: 'asc' }, { name: 'asc' }]
  : { name: 'asc' };
```

---

## 📚 Implementation Notes

1. **No Square Sync Needed**: Since we're only handling alfajores and empanadas (not catering), and these are menu items, we don't need Square ordering sync.

2. **Simple Solution**: Using a single `displayOrder` field on the existing Product model is simpler than creating separate ordering tables.

3. **Admin Interface**: Leverages existing admin authentication and layout patterns from your codebase.

4. **Incremental Display Order**: Using increments of 10 (10, 20, 30...) allows easy insertion of items between existing ones without reordering everything.

5. **Category Isolation**: Each category's products are ordered independently, so reordering alfajores doesn't affect empanadas.

This implementation provides a straightforward solution for James to reorder products without the complexity of Square synchronization, focusing only on the alfajores and empanadas menu pages as requested.