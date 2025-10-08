# Add Enable/Disable Toggle for Product Availability Rules - UPDATED PLAN

## Current State Analysis

### ✅ Already Implemented

1. **Database Schema** - Migration `20250930000000_add_availability_system_tables` created:
   - `availability_rules` table with per-product rules
   - Each rule has `productId`, `enabled` boolean, `priority` fields
   - Soft delete with `deletedAt` field
   - Foreign keys to `products` and `profiles`

2. **Prisma Schema** - `AvailabilityRule` model exists:
   ```prisma
   model AvailabilityRule {
     id                String      @id @default(uuid())
     productId         String      // Already per-product!
     enabled           Boolean     @default(true)
     priority          Int         @default(0)
     // ... other fields
   }
   ```

3. **TypeScript Types** - Complete types in `src/types/availability.ts`:
   - `AvailabilityRule` interface with Zod schema
   - `AvailabilityState` enum
   - `RuleType` enum
   - All config schemas (seasonal, pre-order, view-only, time restrictions)

4. **API Endpoints** - Full CRUD in `src/app/api/availability/`:
   - `GET/POST /api/availability` - List/create rules
   - `GET/PUT/DELETE /api/availability/[id]` - Single rule operations
   - `POST /api/availability/bulk` - Bulk operations (already exists!)

5. **Database Queries** - `AvailabilityQueries` class in `src/lib/db/availability-queries.ts`:
   - `getProductRules(productId)` - Get all rules for a product
   - `getMultipleProductRules(productIds)` - Batch fetch
   - `updateRule(ruleId, updates, userId)` - Update single rule
   - `bulkUpdateRules(updates, userId)` - Bulk update (already exists!)

6. **Products Table** - `src/app/(dashboard)/admin/products/page.tsx`:
   - Shows evaluated availability state with badges
   - Displays rule count: `{appliedRulesCount} rule(s)`
   - Uses `AvailabilityEngine.evaluateMultipleProducts()`

7. **Form Component** - `AvailabilityForm` exists for creating/editing rules

### ❌ What's Missing (Actual Work Needed)

The current system shows availability state in the products table, but **no interactive toggle UI**. Rules can only be managed through dedicated availability pages, not directly from the products table.

## What We Need to Build

### 1. Interactive Toggle UI in Products Table

**Goal:** Make the "Availability" column interactive with a popover showing all rules with toggle switches.

**Current behavior:**
```tsx
// Line 490-536 in products/page.tsx
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex flex-wrap gap-1 pointer-events-none">
    {/* Static badges showing state and rule count */}
  </div>
</td>
```

**Desired behavior:**
```tsx
<td className="px-6 py-4 whitespace-nowrap">
  <RuleQuickToggle
    productId={product.id}
    currentState={product.evaluatedAvailability.currentState}
    rulesCount={product.evaluatedAvailability.appliedRulesCount}
  />
</td>
```

### 2. New Component: `RuleQuickToggle`

**File:** `src/components/admin/products/RuleQuickToggle.tsx`

**Features:**
- Shows button with current state badge + rule count
- Clicking opens a Popover with:
  - List of all rules for this product
  - Toggle switch for each rule (enabled/disabled)
  - Visual indicator of active/inactive state
  - Quick "Enable All" / "Disable All" buttons
  - Link to full availability management page
- Optimistic UI updates (toggle immediately, revert on error)
- Toast notifications for success/error

**API Integration:**
- Fetch rules: `GET /api/availability?productId={id}`
- Toggle rule: `PUT /api/availability/{ruleId}` with `{ enabled: true/false }`
- Uses existing endpoints - NO NEW API NEEDED!

### 3. Bulk Selection & Operations

**Goal:** Select multiple products and toggle rules in bulk

**New Component:** `src/components/admin/products/BulkRuleActions.tsx`

**Features:**
- Checkbox selection in table rows
- Bulk action bar when products selected
- "Manage Rules" button opens modal with:
  - Dropdown to select which rule to toggle
  - Enable/Disable radio buttons
  - Apply to all selected products
- Uses existing `POST /api/availability/bulk` endpoint

### 4. Enhanced Products Table

**File:** `src/app/(dashboard)/admin/products/page.tsx`

**Changes needed:**
1. Add checkbox column for bulk selection
2. Replace static availability badges with `<RuleQuickToggle />`
3. Add bulk action bar component
4. Client-side state management for selected products
5. Optimistic updates for instant UI feedback

## Implementation Plan

### Phase 1: Core Toggle Component (MVP)
**Priority: HIGH - User's immediate need**

1. ✅ Verify existing API endpoints work for toggle operations
2. Create `RuleQuickToggle.tsx` component:
   - Button with popover UI (Radix UI Popover)
   - Fetch rules on popover open
   - Individual toggle switches
   - Optimistic updates
3. Integrate into products table
4. Test toggle functionality

**Files to create/modify:**
- `src/components/admin/products/RuleQuickToggle.tsx` (NEW)
- `src/app/(dashboard)/admin/products/page.tsx` (MODIFY - replace badges)

### Phase 2: Bulk Operations
**Priority: MEDIUM**

1. Add checkbox column to products table
2. Create `BulkRuleActions.tsx` component
3. Create bulk toggle modal
4. Wire up existing bulk API endpoint
5. Add selection state management

**Files to create/modify:**
- `src/components/admin/products/BulkRuleActions.tsx` (NEW)
- `src/components/admin/products/BulkRuleModal.tsx` (NEW)
- `src/app/(dashboard)/admin/products/page.tsx` (MODIFY - add checkboxes)

### Phase 3: Polish & Enhancements
**Priority: LOW**

1. Add audit logging for toggle actions
2. Add keyboard shortcuts (e.g., 'e' to enable, 'd' to disable)
3. Add "History" view to see toggle changes
4. Performance optimization for large product lists
5. Add loading skeletons

## Key Architecture Decisions

### ✅ No New Database Tables Needed
The plan's suggested `product_availability_rule_status` junction table is **NOT needed** because:
- Rules are already per-product (have `productId`)
- Rules already have `enabled` boolean
- Current schema supports the feature

### ✅ No New API Endpoints Needed
Existing endpoints already support everything we need:
- `GET /api/availability?productId={id}` - Get product's rules
- `PUT /api/availability/{ruleId}` - Toggle `enabled` field
- `POST /api/availability/bulk` - Bulk updates

We just need to **use** these endpoints from the products table!

### ✅ Reuse Existing Components
- Use Radix UI `Popover` for dropdown
- Use existing `Switch` component for toggles
- Use existing `Badge` components for state display
- Use existing `Button` components
- Follow existing patterns from `AvailabilityForm.tsx`

## Success Criteria

1. **Quick Toggle Works**
   - Click "X rules" button → popover opens
   - Toggle switch → rule enabled/disabled immediately
   - UI updates optimistically (instant feedback)
   - Error handling with toast notifications

2. **Bulk Operations Work**
   - Select multiple products via checkboxes
   - Bulk action bar appears with count
   - Can enable/disable a rule for all selected products
   - Changes apply in single transaction

3. **Performance**
   - Popover loads rules in <500ms
   - Toggle operation feels instant (optimistic UI)
   - No table re-render flicker
   - Works smoothly with 100+ products

4. **User Experience**
   - Clear visual feedback for enabled/disabled states
   - Loading states during API calls
   - Error messages are actionable
   - No navigation away from products table needed

## Testing Checklist

- [ ] Toggle single rule on/off
- [ ] Toggle multiple rules for one product
- [ ] Bulk enable/disable for multiple products
- [ ] Error handling when API fails
- [ ] Optimistic UI reverts on error
- [ ] Rule priority is respected (highest priority wins)
- [ ] Evaluated state updates after toggle
- [ ] Audit trail is recorded
- [ ] Performance with 100+ products
- [ ] Concurrent toggles don't conflict

## Migration Path

**No database migrations needed!** Just UI changes:

1. Deploy new components alongside existing UI
2. Feature can be developed in feature branch
3. No breaking changes to existing availability system
4. Backward compatible - existing rules continue working

## Files Summary

### New Files (3)
1. `src/components/admin/products/RuleQuickToggle.tsx`
2. `src/components/admin/products/BulkRuleActions.tsx`
3. `src/components/admin/products/BulkRuleModal.tsx`

### Modified Files (1)
1. `src/app/(dashboard)/admin/products/page.tsx`

### No Changes Needed
- Database schema ✅
- API routes ✅
- Types ✅
- Database queries ✅

---

**Total Estimated Effort:** 4-6 hours
- Phase 1 (MVP): 2-3 hours
- Phase 2 (Bulk): 1-2 hours
- Phase 3 (Polish): 1 hour
