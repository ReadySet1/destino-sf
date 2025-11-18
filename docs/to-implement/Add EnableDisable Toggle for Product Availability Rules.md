# Add Enable/Disable Toggle for Product Availability Rules

## Context

We have an availability management system for products where users can create rules (like "Christmas Pre-Order"). Currently, users can manage rules globally, but we need the ability to enable/disable rules at the product level directly from the products overview table.

## Requirements

### 1. Database Schema Changes

Add a junction table to track rule status per product:

```sql
CREATE TABLE product_availability_rule_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES availability_rules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(product_id, rule_id)
);

CREATE INDEX idx_product_rule_status_product ON product_availability_rule_status(product_id);
CREATE INDEX idx_product_rule_status_rule ON product_availability_rule_status(rule_id);
```

### 2. TypeScript Types

Create types in `types/availability.ts`:

```typescript
export interface AvailabilityRule {
  id: string;
  name: string;
  type: 'date_range' | 'time_based' | 'seasonal' | 'pre_order';
  state: 'hidden' | 'available' | 'view_only';
  priority: number;
  status: 'enabled' | 'disabled';
  config: Record<string, any>;
}

export interface ProductRuleStatus {
  productId: string;
  ruleId: string;
  isEnabled: boolean;
  updatedAt: Date;
}

export interface ProductWithRules {
  id: string;
  name: string;
  category: string;
  price: number;
  currentStatus: string;
  activeRules: AvailabilityRule[];
}
```

### 3. Backend API Endpoints

Create `/app/api/products/[productId]/availability-rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all rules for a product with their enabled status
export async function GET(request: NextRequest, { params }: { params: { productId: string } }) {
  // Query to get all rules and their status for this product
  // JOIN with product_availability_rule_status
}

// PATCH - Toggle rule status for a product
export async function PATCH(request: NextRequest, { params }: { params: { productId: string } }) {
  const { ruleId, isEnabled } = await request.json();

  // Upsert into product_availability_rule_status
  // Return updated status
}
```

Create `/app/api/products/[productId]/availability-rules/bulk-toggle/route.ts`:

```typescript
// POST - Enable/disable multiple rules at once
export async function POST(request: NextRequest, { params }: { params: { productId: string } }) {
  const { ruleIds, isEnabled } = await request.json();

  // Bulk upsert for multiple rules
  // Use transaction for data integrity
}
```

### 4. Frontend Components

#### A. Modify the Products Table

In the "Active Rules" column, add an interactive dropdown/popover:

```typescript
// components/products/RuleStatusToggle.tsx
interface RuleStatusToggleProps {
  productId: string;
  rules: AvailabilityRule[];
  onToggle: (ruleId: string, isEnabled: boolean) => Promise<void>;
}

export function RuleStatusToggle({ productId, rules, onToggle }: RuleStatusToggleProps) {
  // Show a button with rule count
  // On click, show popover with list of rules and toggle switches
  // Each toggle should call onToggle
}
```

#### B. Add Bulk Actions

In the products table, add checkbox selection and bulk actions:

```typescript
// components/products/BulkRuleActions.tsx
interface BulkRuleActionsProps {
  selectedProducts: string[];
  onBulkToggle: (productIds: string[], ruleId: string, isEnabled: boolean) => Promise<void>;
}

// Allow selecting a rule and enabling/disabling it for all selected products
```

### 5. UI/UX Requirements

**In the Products Overview Table:**

- Change "Active Rules" column to show a button: "X rules" (where X is the count)
- On click, show a popover/dropdown with:
  - List of all available rules for this product
  - Toggle switch next to each rule (showing enabled/disabled state)
  - Visual indicator for which rules are currently active
  - Quick "Enable All" / "Disable All" buttons

**Bulk Actions:**

- Add checkboxes to select multiple products
- Show bulk action bar when products are selected
- Add "Manage Rules" bulk action that opens a modal:
  - Select which rule to enable/disable
  - Apply to all selected products

**Visual Feedback:**

- Optimistic UI updates (toggle immediately, revert on error)
- Toast notifications for success/error
- Loading states during API calls
- Highlight recently changed rules

### 6. Business Logic

**Rule Application Priority:**

- When multiple rules are enabled, apply by priority number
- Rules with state="hidden" should hide the product even if lower priority rules say "available"
- Document the evaluation order in code comments

**Validation:**

- Prevent disabling all rules if product requires at least one active rule
- Check for conflicting rules (e.g., two rules with same priority)
- Validate user permissions before allowing toggle

### 7. Additional Features

**History Tracking:**

- Log all rule enable/disable actions
- Show audit trail: who changed what and when
- Add "History" button to view changes

**Smart Defaults:**

- New products should inherit organization's default rules
- Option to apply rule templates by category

## Implementation Steps

1. Create database migration for the new table
2. Implement backend API routes with proper error handling
3. Create TypeScript types and API client functions
4. Build RuleStatusToggle component with popover UI
5. Integrate toggle functionality into products table
6. Add bulk actions for multiple products
7. Implement optimistic updates and error handling
8. Add audit logging
9. Write unit tests for rule evaluation logic
10. Write integration tests for API endpoints
11. Update documentation

## Testing Scenarios

- Toggle rule on/off for single product
- Bulk enable/disable for multiple products
- Verify rule priority is respected
- Test conflicting rules handling
- Verify audit trail is recorded
- Test optimistic UI with failed API calls
- Validate permissions enforcement

## Success Criteria

- Users can easily toggle rules on/off per product without navigating away
- Bulk operations work efficiently for 100+ products
- UI updates feel instant (optimistic updates)
- All changes are properly logged
- No loss of existing rule configurations
