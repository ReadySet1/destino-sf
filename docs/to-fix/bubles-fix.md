````markdown
# Fix Product Info Badges - Display & Admin Management

## Project Location

`/Users/ealanis/Development/current-projects/destino-sf`

## System Context

**Categories in Square/Database:**

- Multiple catering categories (CATERING- prefixed)
- **ALFAJORES** - 11 products
- **EMPANADAS** - 17 products (includes both empanadas AND salsas)
- Default

**The Issue:**
Square doesn't differentiate between empanadas and salsas within the EMPANADAS category. We need to add this distinction.

## Problem Overview

Product detail pages show info badges with:

1. **Incorrect text** - salsas showing empanada info
2. **Poor visibility** - light badges on orange background
3. **Unwanted quantity badges** - need to remove these

**Current State:**

- **Empanada products**: "Ready to Cook", "15-20 min", "4 pack"
- **Salsa products**: "Ready to Cook" ❌, "15-20 min" ❌, "1 pack" ❌
- **Alfajores products**: "Ready to Eat", "2 weeks fresh", "6-pack combo"

## Requirements

### Part 1: Database Schema Update

Add a `product_type` field to distinguish products within the EMPANADAS category:

```typescript
type ProductType = 'empanada' | 'salsa' | 'alfajor' | 'other';

interface Product {
  id: string;
  name: string;
  category: string; // From Square: 'EMPANADAS', 'ALFAJORES', etc.
  product_type: ProductType; // NEW FIELD - determines badge behavior
  // ... existing fields
}
```
````

**Migration needed:**

```sql
-- Add product_type column
ALTER TABLE products
  ADD COLUMN product_type VARCHAR(50) DEFAULT 'other';

-- Set product types based on category
UPDATE products
  SET product_type = 'alfajor'
  WHERE category = 'ALFAJORES';

UPDATE products
  SET product_type = 'empanada'
  WHERE category = 'EMPANADAS' AND name NOT ILIKE '%salsa%';

UPDATE products
  SET product_type = 'salsa'
  WHERE category = 'EMPANADAS' AND name ILIKE '%salsa%';
```

**Note:** Initial population uses name matching for salsas. Admin can correct any mis-categorized products later.

### Part 2: Fix Badge Display

#### Remove Quantity Badges

Remove all quantity/pack size badges (4 pack, 6-pack combo, 1 pack, etc.)

#### Correct Badge Content by Product Type

**Empanada products** (product_type = 'empanada'):

- Badge 1: "Ready to Cook"
- Badge 2: "15-20 min"

**Salsa products** (product_type = 'salsa'):

- Badge 1: "Ready to Use"
- Badge 2: "Refrigerate After Opening"

**Alfajor products** (product_type = 'alfajor'):

- Badge 1: "Ready to Eat"
- Badge 2: "Stays Fresh 2 Weeks"

#### Fix Badge Visibility

Current badges are barely visible (light peach on orange background).

- **Requirement**: WCAG AA contrast ratio (4.5:1 minimum)
- **Suggested approaches**:
  - White/light background with dark text
  - Dark orange/brown background with white text
  - Use existing design system colors if available
- Make badges clearly stand out

### Part 3: Admin Interface for Badge Management

Create/enhance admin UI at `/admin/products` to:

1. Manage badges per product type
2. Set individual product's product_type

#### 3A: Product Type Badge Manager

```
┌─────────────────────────────────────────┐
│  Product Type Badge Settings            │
├─────────────────────────────────────────┤
│                                         │
│  Product Type: [Empanadas ▼]            │
│                 - Empanadas             │
│                 - Salsas                │
│                 - Alfajores             │
│                 - Other                 │
│                                         │
│  Badge 1: [Ready to Cook          ]     │
│  Badge 2: [15-20 min              ]     │
│                                         │
│  [Save Changes]                         │
│                                         │
├─────────────────────────────────────────┤
│  Preview:                               │
│  ┌──────────────┐ ┌──────────────┐    │
│  │Ready to Cook │ │ 15-20 min    │    │
│  └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────┘
```

**Features:**

- Dropdown to select product type
- Two text input fields (max 30 chars each)
- Live preview with actual badge styling
- Save updates all products with that product_type
- Success/error messages

#### 3B: Individual Product Type Assignment

In existing product edit screen (like the Square screenshot), add:

```
Product Type
[Empanada ▼]  // Dropdown: empanada, salsa, alfajor, other
```

This allows manually correcting any mis-categorized products from the initial migration.

## Data Structure

### Product Type Badges Table

```sql
CREATE TABLE product_type_badges (
  id SERIAL PRIMARY KEY,
  product_type VARCHAR(50) UNIQUE NOT NULL,
  badge1 VARCHAR(100) NOT NULL,
  badge2 VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed initial data
INSERT INTO product_type_badges (product_type, badge1, badge2) VALUES
  ('empanada', 'Ready to Cook', '15-20 min'),
  ('salsa', 'Ready to Use', 'Refrigerate After Opening'),
  ('alfajor', 'Ready to Eat', 'Stays Fresh 2 Weeks'),
  ('other', 'Premium Quality', 'Handcrafted');
```

### TypeScript Types

```typescript
type ProductType = 'empanada' | 'salsa' | 'alfajor' | 'other';

interface ProductTypeBadges {
  product_type: ProductType;
  badge1: string;
  badge2: string;
  updated_at: Date;
}

interface Product {
  id: string;
  name: string;
  category: string; // Square category name
  product_type: ProductType; // NEW - determines badges
  description: string;
  price: number;
  // ... other existing fields
}
```

## API Endpoints

### For Badge Management

**GET `/api/admin/product-type-badges`**

- Returns all product type badges
- Response: `ProductTypeBadges[]`

**GET `/api/admin/product-type-badges/:type`**

- Returns badges for specific type
- Response: `ProductTypeBadges`

**PUT `/api/admin/product-type-badges`**

- Updates badges for a product type
- Body: `{ product_type: string, badge1: string, badge2: string }`
- Response: `{ success: boolean, data: ProductTypeBadges }`

### For Product Type Assignment

**PATCH `/api/admin/products/:id/product-type`**

- Updates individual product's product_type
- Body: `{ product_type: ProductType }`
- Response: `{ success: boolean, data: Product }`

## Implementation Steps

1. **Audit existing codebase**
   - Locate product detail page component
   - Find where badges are currently rendered
   - Identify product data model/schema
   - Check if admin product edit page exists

2. **Database migration**
   - Add `product_type` column to products table
   - Create `product_type_badges` table
   - Run initial data population (empanada/salsa classification)
   - Seed default badge values

3. **Update product detail page**
   - Fetch product with product_type
   - Fetch badges for that product_type
   - Remove quantity badge rendering
   - Apply new badge styling for visibility
   - Update TypeScript types

4. **Create badge management admin UI**
   - New page/section at `/admin/products` or `/admin/badges`
   - Product type selector dropdown
   - Badge input fields with validation
   - Live preview component
   - API integration for CRUD

5. **Enhance product edit page**
   - Add product_type dropdown to existing edit form
   - Update product save logic
   - Show current badges for selected type (read-only preview)

6. **Testing**
   - Verify empanadas show correct badges
   - Verify salsas show correct badges
   - Verify alfajores show correct badges
   - Test admin badge updates propagate
   - Test individual product type changes
   - Check badge visibility/contrast
   - Test on mobile/responsive

## Files to Check/Create

**Existing (likely):**

- `/app/products/[slug]/page.tsx` - Product detail page
- `/app/admin/products/page.tsx` - Admin products list
- `/app/admin/products/[id]/page.tsx` - Product edit page
- `/lib/types/product.ts` - Product TypeScript types
- `/app/api/products/route.ts` - Product API endpoints

**To Create:**

- Database migration file for schema changes
- `/app/admin/badges/page.tsx` - Badge management UI (or add to existing admin)
- `/app/api/admin/product-type-badges/route.ts` - Badge CRUD API
- `/components/ProductBadge.tsx` - Badge display component (if not exists)
- `/components/admin/BadgePreview.tsx` - Admin preview component

## Success Criteria

- ✅ Database has `product_type` field on products
- ✅ Database has `product_type_badges` table
- ✅ Empanadas show: "Ready to Cook" + "15-20 min"
- ✅ Salsas show: "Ready to Use" + "Refrigerate After Opening"
- ✅ Alfajores show: "Ready to Eat" + "Stays Fresh 2 Weeks"
- ✅ No quantity badges displayed
- ✅ Badges are clearly visible (proper contrast)
- ✅ Admin can edit badges per product type
- ✅ Admin can change individual product's type
- ✅ Changes reflect immediately on frontend
- ✅ Type-safe TypeScript implementation
- ✅ Proper error handling and validation
- ✅ Mobile responsive

## Edge Cases to Handle

- Products with no product_type set (default to 'other')
- Square sync: new products should default to appropriate type based on category
- Character limits on badge text (suggest 30 char max)
- What if a product needs custom badges? (Future: add product-level override)
- Validation: badge fields cannot be empty

## Future Enhancements (Not in Scope)

- Per-product badge override (for special cases)
- More than 2 badges per product
- Badge icons/colors per type
- Bulk product type assignment
- A/B testing different badge text

```

```
