# Quick Actions Design

This document describes the one-click operations that simplify common availability management tasks.

## Overview

Quick actions provide instant access to frequently used operations without navigating through the full wizard. They appear on the product detail page and within the availability management interface.

## Quick Action Buttons

### Primary Quick Actions

| Action         | Button Text        | Icon | Default Behavior                          |
| -------------- | ------------------ | ---- | ----------------------------------------- |
| Sell Out       | "Mark as Sold Out" | 🚫   | State: Not Available, Reason: Sold Out    |
| Coming Soon    | "Set Coming Soon"  | 🔜   | State: Not Available, Reason: Coming Soon |
| Make Available | "Make Available"   | ✓    | State: Available, removes restrictions    |
| Pre-Order      | "Set Up Pre-Order" | 📅   | Opens pre-order wizard                    |

### Secondary Quick Actions

| Action         | Button Text             | Icon | Default Behavior       |
| -------------- | ----------------------- | ---- | ---------------------- |
| Seasonal       | "Seasonal Availability" | 🍂   | Opens season picker    |
| Hide           | "Hide Product"          | 👁️‍🗨️   | State: Hidden          |
| Duplicate Rule | "Copy to Products..."   | 📋   | Opens product selector |

---

## Button Placement

### Product Detail Page (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Product: Beef Empanadas                                                        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌──────────────────────────┐   Product Details                                │
│  │                          │   ─────────────────                               │
│  │       [Product Image]    │   Name: Beef Empanadas                           │
│  │                          │   Price: $4.99                                    │
│  │                          │   Category: Empanadas                             │
│  │                          │   SKU: EMP-BEEF-001                               │
│  └──────────────────────────┘                                                  │
│                                                                                 │
│  Availability Status                                                            │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Current: 🟢 Available                                                          │
│  No restrictions • Customers can purchase normally                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │  [🚫 Mark Sold Out]  [🔜 Coming Soon]  [📅 Pre-Order]  [More ▼]        │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  [📆 View Full Calendar]  [⚙️ Advanced Settings]                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Quick Action Bar States

**When Available:**

```
[🚫 Mark Sold Out]  [🔜 Coming Soon]  [📅 Pre-Order]  [🍂 Seasonal]  [More ▼]
```

**When Not Available (Sold Out):**

```
[✓ Make Available]  [🔜 Coming Soon]  [📅 Pre-Order]  [👁️‍🗨️ Hide]  [More ▼]
```

**When Pre-Order:**

```
[✓ Make Available]  [🚫 End Pre-Order]  [✏️ Edit Pre-Order]  [More ▼]
```

**When Hidden:**

```
[✓ Make Visible]  [🗑️ Archive]  [More ▼]
```

---

## Quick Action Flows

### 1. Mark as Sold Out

**Trigger**: Click "Mark as Sold Out" button

**Immediate Confirmation Modal**:

```
┌─────────────────────────────────────────────────────────┐
│  Mark as Sold Out                               [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Beef Empanadas will be shown as "Sold Out"             │
│                                                         │
│  Customers will see the product but cannot purchase.    │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Preview:                                          │ │
│  │  ┌────────────────────────────┐                   │ │
│  │  │ Beef Empanadas   SOLD OUT  │                   │ │
│  │  │ $4.99                      │                   │ │
│  │  │ Currently sold out.        │                   │ │
│  │  │ [Notify Me]                │                   │ │
│  │  └────────────────────────────┘                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ☑ Allow customers to sign up for restock notification  │
│                                                         │
│  Optional message:                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Currently sold out. Check back soon!              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                              [Cancel]  [Mark Sold Out]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**API Call**:

```json
POST /api/admin/products/{id}/availability/quick-action
{
  "action": "sold_out",
  "notifyEnabled": true,
  "message": "Currently sold out. Check back soon!"
}
```

**Result**: Creates rule with state NOT_AVAILABLE, reason: sold_out

---

### 2. Set Coming Soon

**Trigger**: Click "Coming Soon" button

**Confirmation Modal**:

```
┌─────────────────────────────────────────────────────────┐
│  Set as Coming Soon                             [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Beef Empanadas will be shown as "Coming Soon"          │
│                                                         │
│  Expected availability date (optional):                 │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [January 15, 2025          📅]                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ☑ Allow customers to sign up for launch notification   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Preview:                                          │ │
│  │  ┌─────────────────────────────┐                  │ │
│  │  │ Beef Empanadas  COMING SOON │                  │ │
│  │  │ $4.99                       │                  │ │
│  │  │ Coming January 15!          │                  │ │
│  │  │ [Notify Me When Available]  │                  │ │
│  │  └─────────────────────────────┘                  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                            [Cancel]  [Set Coming Soon]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Smart Behavior**:

- If expected date provided, auto-generates message: "Coming [date]!"
- If no date, default message: "Coming soon!"
- Optional: Auto-transition to Available on expected date

---

### 3. Make Available

**Trigger**: Click "Make Available" button

**Two Modes**:

#### Mode A: Remove Current Restriction (Simple)

When product has a temporary restriction (sold out, coming soon):

```
┌─────────────────────────────────────────────────────────┐
│  Make Available                                 [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Remove "Sold Out" status from Beef Empanadas?          │
│                                                         │
│  The product will become available for purchase         │
│  immediately.                                           │
│                                                         │
│  Current rule to remove:                                │
│  ┌───────────────────────────────────────────────────┐ │
│  │  🚫 Sold Out (created Dec 1, 2024)               │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                       [Cancel]  [Make Available Now]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Mode B: Override Scheduled Restriction

When product has future-dated or recurring restrictions:

```
┌─────────────────────────────────────────────────────────┐
│  Make Available                                 [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⚠️ This product has scheduled restrictions:            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  🍂 Seasonal: Out of Season (Mar-Oct)             │ │
│  │  📅 Holiday Closure (Dec 24-25)                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  How would you like to proceed?                         │
│                                                         │
│  ○ Make available NOW (until next scheduled change)     │
│  ○ Remove ALL restrictions (make always available)      │
│  ○ Add exception for specific dates                     │
│                                                         │
│                              [Cancel]  [Apply Changes]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Set Up Pre-Order

**Trigger**: Click "Pre-Order" button

**Opens Quick Pre-Order Flow** (simplified wizard):

```
┌─────────────────────────────────────────────────────────┐
│  Set Up Pre-Order                               [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Quick setup for: Beef Empanadas                        │
│                                                         │
│  When will customers receive their order?               │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Delivery/Pickup Date: [December 25, 2024    📅]   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Quick picks: [Thanksgiving] [Christmas] [Valentine's]  │
│                                                         │
│  Order cutoff (when do pre-orders close?):              │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [5] days before delivery  (Dec 20)                │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ☐ Require deposit                                      │
│  ☐ Limit number of orders                               │
│                                                         │
│  [More options...]                                      │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Preview:                                               │
│  ┌────────────────────────────┐                        │
│  │ Beef Empanadas             │                        │
│  │ $4.99                      │                        │
│  │ 🗓 Pre-order for Dec 25    │                        │
│  │ Order by Dec 20            │                        │
│  │ [Pre-Order Now]            │                        │
│  └────────────────────────────┘                        │
│                                                         │
│                        [Cancel]  [Enable Pre-Orders]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Smart Defaults**:

- Order window opens immediately
- Cutoff defaults to 5 days before delivery
- No deposit by default (simplest flow)
- Message auto-generated from dates

**"More options" expands to show**:

- Deposit configuration
- Order limit
- Custom message
- Full wizard link

---

### 5. Seasonal Availability

**Trigger**: Click "Seasonal" button

**Season Picker**:

```
┌─────────────────────────────────────────────────────────┐
│  Seasonal Availability                          [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  When is Beef Empanadas available?                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ Winter Only (November - February)            │   │
│  │    Available: Nov 1 - Feb 28                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ Spring/Summer (March - August)               │   │
│  │    Available: Mar 1 - Aug 31                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ Fall Only (September - November)             │   │
│  │    Available: Sep 1 - Nov 30                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ○ Custom months...                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  What happens outside the season?                       │
│  ○ Show as "Out of Season" (can sign up for notify)    │
│  ○ Hide product completely                              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  Year Preview:                                          │
│  Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec        │
│  ███ ███ ░░░ ░░░ ░░░ ░░░ ░░░ ░░░ ░░░ ░░░ ███ ███       │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│                          [Cancel]  [Set Seasonal]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Custom Months Expansion**:

```
┌───────────────────────────────────────────────────────┐
│  Select available months:                             │
│                                                       │
│  [Jan] [Feb] [Mar] [Apr] [May] [Jun]                 │
│   ✓     ✓     ○     ○     ○     ○                    │
│                                                       │
│  [Jul] [Aug] [Sep] [Oct] [Nov] [Dec]                 │
│   ○     ○     ○     ○     ✓     ✓                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

### 6. Hide Product

**Trigger**: Click "Hide" from "More" menu

**Confirmation**:

```
┌─────────────────────────────────────────────────────────┐
│  Hide Product                                   [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⚠️ Beef Empanadas will be hidden from the storefront   │
│                                                         │
│  The product will NOT appear:                           │
│  • In the catalog                                       │
│  • In search results                                    │
│  • Via direct URL                                       │
│                                                         │
│  Why are you hiding this product?                       │
│  ○ Work in progress / Draft                             │
│  ○ Discontinued                                         │
│  ○ Temporary removal                                    │
│  ○ Archive (keep for records)                           │
│                                                         │
│  Internal notes (optional):                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                           [Cancel]  [Hide Product]      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Bulk Quick Actions

For applying actions to multiple products:

### Product List Selection

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Products (3 selected)                                                          │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Bulk Actions: [🚫 Sold Out] [🔜 Coming Soon] [✓ Available] [👁️‍🗨️ Hide] [More]   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ☑  Beef Empanadas                    $4.99    🟢 Available             │   │
│  │ ☑  Chicken Empanadas                 $4.99    🟢 Available             │   │
│  │ ☐  Veggie Empanadas                  $4.49    🟢 Available             │   │
│  │ ☑  Chorizo Empanadas                 $4.99    🟢 Available             │   │
│  │ ☐  Spinach Empanadas                 $4.49    🟡 Sold Out              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Bulk Action Confirmation

```
┌─────────────────────────────────────────────────────────┐
│  Bulk: Mark as Sold Out                         [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Mark 3 products as Sold Out:                           │
│                                                         │
│  • Beef Empanadas                                       │
│  • Chicken Empanadas                                    │
│  • Chorizo Empanadas                                    │
│                                                         │
│  ☑ Allow notification signup                            │
│                                                         │
│  Message (applied to all):                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Currently sold out. Check back soon!              │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│                    [Cancel]  [Mark 3 Products Sold Out] │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

| Shortcut | Action           | Context             |
| -------- | ---------------- | ------------------- |
| `S`      | Mark Sold Out    | Product detail page |
| `C`      | Set Coming Soon  | Product detail page |
| `A`      | Make Available   | Product detail page |
| `P`      | Set Up Pre-Order | Product detail page |
| `H`      | Hide Product     | Product detail page |
| `Esc`    | Close modal      | Any modal open      |
| `Enter`  | Confirm action   | Modal focused       |

---

## API Endpoints

### Quick Action Endpoint

```
POST /api/admin/products/{productId}/availability/quick-action

Request Body:
{
  "action": "sold_out" | "coming_soon" | "available" | "hide",
  "notifyEnabled"?: boolean,
  "message"?: string,
  "expectedDate"?: string,  // ISO date
  "reason"?: string,        // For hide action
  "notes"?: string          // Internal notes
}

Response:
{
  "success": true,
  "rule": {
    "id": "rule_123",
    "state": "NOT_AVAILABLE",
    "reason": "sold_out",
    ...
  },
  "previousRule"?: { ... },  // Rule that was replaced
  "productStatus": {
    "currentState": "NOT_AVAILABLE",
    "effectiveUntil": null
  }
}
```

### Bulk Quick Action

```
POST /api/admin/products/availability/bulk-quick-action

Request Body:
{
  "productIds": ["prod_1", "prod_2", "prod_3"],
  "action": "sold_out",
  "notifyEnabled": true,
  "message": "Currently sold out."
}

Response:
{
  "success": true,
  "results": [
    { "productId": "prod_1", "success": true, "ruleId": "rule_1" },
    { "productId": "prod_2", "success": true, "ruleId": "rule_2" },
    { "productId": "prod_3", "success": true, "ruleId": "rule_3" }
  ],
  "failedCount": 0
}
```

---

## Component Structure

```
src/components/admin/products/availability/quick-actions/
├── QuickActionBar.tsx            # Button row container
├── QuickActionButton.tsx         # Individual action button
├── modals/
│   ├── SoldOutModal.tsx         # Sold out confirmation
│   ├── ComingSoonModal.tsx      # Coming soon with date
│   ├── MakeAvailableModal.tsx   # Make available options
│   ├── PreOrderQuickModal.tsx   # Simplified pre-order
│   ├── SeasonalPickerModal.tsx  # Season selection
│   └── HideProductModal.tsx     # Hide confirmation
├── bulk/
│   ├── BulkActionBar.tsx        # Bulk selection actions
│   └── BulkConfirmModal.tsx     # Bulk confirmation
└── hooks/
    ├── useQuickAction.ts        # Action execution logic
    └── useBulkAction.ts         # Bulk action logic
```

---

## Success Feedback

After quick action completes:

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Beef Empanadas marked as Sold Out                    │
│                                                         │
│  [Undo]                                    Auto-dismiss │
└─────────────────────────────────────────────────────────┘
```

**Undo capability**:

- Available for 10 seconds after action
- Restores previous state
- Works for single and bulk actions
