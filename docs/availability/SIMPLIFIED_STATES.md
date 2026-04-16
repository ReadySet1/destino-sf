# Simplified State Model

This document proposes reducing the availability state model from 7 states + 5 rule types to 4 states + 3 scheduling modes.

## Current State Model

### Current States (7)

| State       | Description             | Customer Experience                   |
| ----------- | ----------------------- | ------------------------------------- |
| AVAILABLE   | Normal purchase         | Add to cart, checkout                 |
| VIEW_ONLY   | Can see, can't buy      | "View Only" badge, no cart button     |
| SOLD_OUT    | Temporarily unavailable | "Sold Out" badge, optional notify     |
| COMING_SOON | Future availability     | "Coming Soon" badge, optional notify  |
| PRE_ORDER   | Advance purchase        | "Pre-Order" button, deposit may apply |
| HIDDEN      | Not visible             | Product not shown                     |
| RESTRICTED  | Limited access          | Requires auth/conditions              |

### Current Rule Types (5)

| Rule Type        | Description          | Configuration                               |
| ---------------- | -------------------- | ------------------------------------------- |
| ALWAYS_AVAILABLE | No time restrictions | Just state                                  |
| DATE_RANGE       | Specific dates       | Start date, end date                        |
| SEASONAL         | Recurring months     | Start month/day, end month/day, yearly flag |
| PRE_ORDER        | Advance ordering     | Order window, delivery date, deposit config |
| TIME_BASED       | Hours of operation   | Days of week, start/end time, timezone      |

### Problems with Current Model

1. **State overlap**: VIEW_ONLY, SOLD_OUT, COMING_SOON have nearly identical behavior
2. **Rule type confusion**: ALWAYS_AVAILABLE sounds like it means "available" but just means "no date restriction"
3. **Combinatorial complexity**: 7 states × 5 rule types = 35 potential combinations
4. **Semantic confusion**: SEASONAL rule type vs "seasonal product" (a business concept)
5. **Priority conflicts**: Multiple rules can apply, priority system is non-intuitive

---

## Proposed State Model

### New States (4)

| State             | Replaces                         | Customer Experience               | Admin Concept                        |
| ----------------- | -------------------------------- | --------------------------------- | ------------------------------------ |
| **Available**     | AVAILABLE                        | Normal purchase flow              | "Customers can buy this"             |
| **Pre-Order**     | PRE_ORDER                        | Future delivery, optional deposit | "Customers order now, receive later" |
| **Not Available** | VIEW_ONLY, SOLD_OUT, COMING_SOON | See but can't buy                 | "Show but don't sell"                |
| **Hidden**        | HIDDEN, RESTRICTED               | Not shown                         | "Don't show at all"                  |

### New Scheduling Modes (3)

| Mode           | Replaces              | Description                  | Use Case                             |
| -------------- | --------------------- | ---------------------------- | ------------------------------------ |
| **Always**     | ALWAYS_AVAILABLE      | No date/time restrictions    | Default, permanently available       |
| **Date Range** | DATE_RANGE            | Specific start and end dates | Holiday promotions, limited releases |
| **Recurring**  | SEASONAL + TIME_BASED | Patterns that repeat         | Seasonal products, business hours    |

---

## State Definitions

### 1. Available

**Meaning**: Customers can add to cart and purchase normally.

**Configuration Options**:

- Scheduling mode (Always, Date Range, Recurring)
- Optional message (e.g., "Fresh baked daily!")
- Optional quantity limits

**Customer Experience**:

```
┌─────────────────────────────────────┐
│  [Product Image]                    │
│                                     │
│  Product Name                       │
│  $12.99                            │
│                                     │
│  [Add to Cart]                      │
│                                     │
└─────────────────────────────────────┘
```

### 2. Pre-Order

**Meaning**: Customers can order now for future delivery/pickup.

**Configuration Options**:

- Order window (when can they order?)
- Delivery/pickup date
- Deposit settings (optional)
  - Amount (fixed or percentage)
  - When remainder is due
- Maximum orders (optional)
- Pre-order message (smart default based on delivery date)

**Customer Experience**:

```
┌─────────────────────────────────────┐
│  [Product Image]                    │
│                                     │
│  Product Name                       │
│  $12.99                            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🗓 Pre-Order for Dec 15     │   │
│  │ 50% deposit required        │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Pre-Order Now]                    │
│                                     │
└─────────────────────────────────────┘
```

### 3. Not Available

**Meaning**: Product is visible but cannot be purchased.

**Reason Sub-Types** (replaces separate states):

| Reason                  | Badge           | Default Message           | Notify Option |
| ----------------------- | --------------- | ------------------------- | ------------- |
| Sold Out                | "Sold Out"      | "Currently sold out"      | Yes           |
| Coming Soon             | "Coming Soon"   | "Coming soon!"            | Yes           |
| Seasonal                | "Out of Season" | "Available in [season]"   | Yes           |
| Temporarily Unavailable | "Unavailable"   | "Temporarily unavailable" | No            |
| Custom                  | Custom text     | Custom message            | Optional      |

**Configuration Options**:

- Reason (dropdown)
- Custom message (optional, overrides default)
- Enable notification signup (optional)
- Expected availability date (optional, for messaging)

**Customer Experience**:

```
┌─────────────────────────────────────┐
│  [Product Image]                    │
│                                     │
│  Product Name              SOLD OUT │
│  $12.99                            │
│                                     │
│  Currently sold out.                │
│                                     │
│  [Notify Me When Available]         │
│                                     │
└─────────────────────────────────────┘
```

### 4. Hidden

**Meaning**: Product is not visible to customers.

**Configuration Options**:

- Reason (for admin reference only)
- Internal notes

**Reason Sub-Types**:

- Discontinued
- Draft/Unpublished
- Restricted (requires login/conditions)
- Archive

**Customer Experience**: Product does not appear in catalog, search, or direct URL.

---

## Scheduling Mode Definitions

### 1. Always

**Meaning**: The state applies indefinitely with no date restrictions.

**Configuration**: None required.

**Use Cases**:

- Permanently available products
- Discontinued products (Hidden + Always)
- Default availability

### 2. Date Range

**Meaning**: The state applies during a specific time window.

**Configuration**:

- Start date (required)
- Start time (optional, defaults to 12:00 AM)
- End date (required)
- End time (optional, defaults to 11:59 PM)

**Use Cases**:

- Holiday promotions
- Limited-time offers
- Pre-order windows

**Smart Features**:

- Holiday presets (Thanksgiving week, Christmas season, etc.)
- "Until further notice" option (no end date)
- Timezone handling

### 3. Recurring

**Meaning**: The state applies on a repeating pattern.

**Configuration Options**:

**Pattern Type A - Seasonal** (month-based):

- Season preset: Winter (Nov-Feb), Spring (Mar-May), Summer (Jun-Aug), Fall (Sep-Oct)
- OR custom months: Select start/end month
- Repeats yearly: Always true for seasonal

**Pattern Type B - Weekly** (day/time-based):

- Days of week: Checkboxes or "Weekdays" / "Weekends" presets
- Time window: Start time, end time
- Timezone: Auto-detected, can override

**Pattern Type C - Custom**:

- Advanced cron-like scheduling (power users only)
- Hidden behind "Advanced" toggle

**Use Cases**:

- Seasonal products (Pattern A)
- Business hours (Pattern B)
- "Weekend specials" (Pattern B)
- Complex schedules (Pattern C)

---

## State Transition Diagram

```
                    ┌─────────────────┐
                    │                 │
                    │     Hidden      │
                    │                 │
                    └────────┬────────┘
                             │
                             │ "Make Visible"
                             ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Not Available  │◄───│    Available    │───►│   Pre-Order     │
│                 │    │                 │    │                 │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                                │
                                │ "Hide"
                                ▼
                    ┌─────────────────┐
                    │                 │
                    │     Hidden      │
                    │                 │
                    └─────────────────┘
```

**Common Transitions**:

- Available → Not Available (Sold Out): Product runs out
- Not Available → Available: Product restocked
- Available → Pre-Order: Switch to advance ordering
- Pre-Order → Available: Pre-order window closes, normal sale begins
- Any → Hidden: Remove from catalog

---

## Mapping Current to New

### State Mapping

| Current State | New State     | New Reason           |
| ------------- | ------------- | -------------------- |
| AVAILABLE     | Available     | -                    |
| VIEW_ONLY     | Not Available | Custom ("View Only") |
| SOLD_OUT      | Not Available | Sold Out             |
| COMING_SOON   | Not Available | Coming Soon          |
| PRE_ORDER     | Pre-Order     | -                    |
| HIDDEN        | Hidden        | -                    |
| RESTRICTED    | Hidden        | Restricted           |

### Rule Type Mapping

| Current Rule Type | New Scheduling Mode                         |
| ----------------- | ------------------------------------------- |
| ALWAYS_AVAILABLE  | Always                                      |
| DATE_RANGE        | Date Range                                  |
| SEASONAL          | Recurring (Seasonal pattern)                |
| PRE_ORDER         | Date Range (order window) + Pre-Order state |
| TIME_BASED        | Recurring (Weekly pattern)                  |

---

## Priority Simplification

### Current System

- Numeric priority (1-100)
- Higher number = higher priority
- Multiple rules can exist, highest priority wins
- Confusing when rules conflict

### New System

**Implicit Priority by Specificity**:

1. Date Range rules override Recurring rules
2. Recurring rules override Always rules
3. More specific date ranges override broader ones
4. If true conflict: Most recently created wins (with warning)

**Visual Conflict Resolution**:

- Calendar view shows which rule applies on each day
- Creating overlapping rules shows warning with options:
  - "Replace existing rule"
  - "Add exception" (new rule only applies to specific dates)
  - "Cancel"

**Example**:

```
Rule 1: Available (Always)
Rule 2: Not Available - Seasonal (Winter: Nov-Feb)
Rule 3: Available - Date Range (Dec 15-25 holiday sale)

Result:
- Mar-Oct: Available (Rule 1)
- Nov 1-Dec 14: Not Available (Rule 2, more specific than Rule 1)
- Dec 15-25: Available (Rule 3, date range overrides seasonal)
- Dec 26-Feb 28: Not Available (Rule 2)
```

---

## Database Schema Changes

### Current Schema (simplified)

```prisma
model AvailabilityRule {
  id              String   @id
  productId       String
  ruleType        RuleType
  state           AvailabilityState
  priority        Int
  startDate       DateTime?
  endDate         DateTime?
  startMonth      Int?
  startDay        Int?
  endMonth        Int?
  endDay          Int?
  repeatsYearly   Boolean?
  daysOfWeek      Int[]
  startTime       String?
  endTime         String?
  timezone        String?
  preOrderConfig  Json?
  message         String?
  // ... more fields
}
```

### Proposed Schema

```prisma
model AvailabilityRule {
  id              String   @id
  productId       String
  product         Product  @relation(...)

  // Simplified state
  state           SimplifiedState  // AVAILABLE, PRE_ORDER, NOT_AVAILABLE, HIDDEN
  notAvailableReason String?       // Only for NOT_AVAILABLE: sold_out, coming_soon, seasonal, custom

  // Unified scheduling
  scheduleMode    ScheduleMode     // ALWAYS, DATE_RANGE, RECURRING

  // Date Range mode
  startDateTime   DateTime?
  endDateTime     DateTime?

  // Recurring mode
  recurringType   RecurringType?   // SEASONAL, WEEKLY, CUSTOM
  recurringConfig Json?            // Pattern-specific config

  // Pre-Order specific (only when state = PRE_ORDER)
  deliveryDate    DateTime?
  depositEnabled  Boolean?
  depositAmount   Decimal?
  depositType     String?          // 'fixed' or 'percentage'
  maxOrders       Int?

  // Common
  message         String?
  notifyEnabled   Boolean          @default(false)
  internalNotes   String?

  // Metadata
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  createdBy       String?

  // Legacy mapping (for migration)
  legacyRuleId    String?          @unique
}

enum SimplifiedState {
  AVAILABLE
  PRE_ORDER
  NOT_AVAILABLE
  HIDDEN
}

enum ScheduleMode {
  ALWAYS
  DATE_RANGE
  RECURRING
}

enum RecurringType {
  SEASONAL
  WEEKLY
  CUSTOM
}
```

---

## API Changes

### Current Endpoint

```
POST /api/admin/products/[id]/availability
{
  "ruleType": "SEASONAL",
  "state": "AVAILABLE",
  "priority": 10,
  "startMonth": 11,
  "startDay": 1,
  "endMonth": 2,
  "endDay": 28,
  "repeatsYearly": true,
  "message": "Winter special!"
}
```

### Proposed Endpoint

```
POST /api/admin/products/[id]/availability
{
  "state": "AVAILABLE",
  "scheduleMode": "RECURRING",
  "recurringType": "SEASONAL",
  "recurringConfig": {
    "season": "winter"  // OR custom: { startMonth: 11, endMonth: 2 }
  },
  "message": "Winter special!"
}
```

**Simplified payloads by use case**:

```typescript
// Make available now (simplest)
{ "state": "AVAILABLE" }

// Mark as sold out
{
  "state": "NOT_AVAILABLE",
  "notAvailableReason": "sold_out"
}

// Set up pre-order
{
  "state": "PRE_ORDER",
  "scheduleMode": "DATE_RANGE",
  "startDateTime": "2024-11-01T00:00:00Z",
  "endDateTime": "2024-11-20T23:59:59Z",
  "deliveryDate": "2024-11-27T00:00:00Z",
  "depositEnabled": true,
  "depositAmount": 50,
  "depositType": "percentage"
}

// Seasonal availability
{
  "state": "AVAILABLE",
  "scheduleMode": "RECURRING",
  "recurringType": "SEASONAL",
  "recurringConfig": { "season": "winter" }
}
```

---

## Summary

| Aspect               | Current    | Proposed                | Reduction |
| -------------------- | ---------- | ----------------------- | --------- |
| States               | 7          | 4                       | 43%       |
| Rule Types           | 5          | 3 scheduling modes      | 40%       |
| Priority Values      | 1-100      | Implicit by specificity | 100%      |
| Form Fields          | 15+        | 3-8 per flow            | ~50%      |
| Typical Payload Size | 10+ fields | 2-6 fields              | ~50%      |

The new model maintains **100% functional parity** with the current system while significantly reducing complexity for the admin user.
