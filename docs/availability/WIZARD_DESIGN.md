# Wizard-Based Rule Creator Design

This document describes the 3-step wizard that replaces the current 1,376-line `ProductAvailabilityForm.tsx` component.

## Design Principles

1. **Progressive Disclosure**: Only show relevant fields based on previous selections
2. **Sensible Defaults**: Pre-fill common configurations
3. **Visual Feedback**: Show preview of how product will appear
4. **Easy Navigation**: Back/forward buttons, clickable step indicators
5. **Validation**: Inline validation with clear error messages

---

## Wizard Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Step 1              Step 2              Step 3                    │
│   ●─────────────────○─────────────────○                            │
│   What's the goal?   When?             Details                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Step 1**: Select the goal (state)
**Step 2**: Select when this applies (scheduling mode)
**Step 3**: Configure details (context-aware based on Steps 1-2)

---

## Step 1: What's the Goal?

### Purpose

Help admin quickly identify what they want to achieve without worrying about technical terminology.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Beef Empanadas                               │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  What would you like to do?                                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Make this product available for purchase                   │   │
│  │   Customers can add to cart and checkout normally            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Set up pre-orders                                          │   │
│  │   Customers order now, receive on a future date              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Show product but don't allow purchase                      │   │
│  │   Product is visible but customers can't buy                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Hide product from storefront                               │   │
│  │   Product won't appear anywhere on the site                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                              [Cancel]  [Next →]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Selection Details

| Option                        | Maps To              | Description            |
| ----------------------------- | -------------------- | ---------------------- |
| Available for purchase        | state: AVAILABLE     | Normal buy flow        |
| Set up pre-orders             | state: PRE_ORDER     | Advance ordering       |
| Show but don't allow purchase | state: NOT_AVAILABLE | View-only modes        |
| Hide from storefront          | state: HIDDEN        | Invisible to customers |

### Behavior

- Radio button selection (single choice)
- Selection highlights the chosen card
- "Next" button enabled only when selection made
- Selection persists if user navigates back

---

## Step 2: When Should This Apply?

### Purpose

Determine the scheduling mode for the rule.

### Wireframe (for Available/Not Available)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Beef Empanadas                               │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  When should this apply?                                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Always                                                     │   │
│  │   No date restrictions - applies indefinitely                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Specific dates                                             │   │
│  │   Only during a specific time window                         │   │
│  │                                                              │   │
│  │   ┌─────────────────┐    ┌─────────────────┐                │   │
│  │   │ Start: Dec 1    │    │ End: Dec 25     │                │   │
│  │   └─────────────────┘    └─────────────────┘                │   │
│  │                                                              │   │
│  │   Quick picks: [Thanksgiving] [Christmas] [Valentine's]      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Recurring pattern                                          │   │
│  │   Repeats on a schedule (seasonal, weekly, etc.)             │   │
│  │                                                              │   │
│  │   Pattern: [Seasonal ▼]                                      │   │
│  │                                                              │   │
│  │   Season: [Winter (Nov-Feb) ▼]                               │   │
│  │                                                              │   │
│  │   Or: [Custom months...]                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                    [← Back]  [Cancel]  [Next →]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Wireframe (for Pre-Order - Modified)

For Pre-Order, Step 2 focuses on the order window and delivery date:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Thanksgiving Empanada Box                    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Pre-Order Timing                                                   │
│                                                                     │
│  When can customers place pre-orders?                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  From: [Nov 1, 2024    ]  To: [Nov 20, 2024   ]             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  When will customers receive their order?                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Delivery/Pickup Date: [Nov 27, 2024  ]                     │   │
│  │                                                              │   │
│  │  ☑ Allow range of pickup days                                │   │
│  │    Through: [Nov 28, 2024  ]                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Quick picks: [Thanksgiving] [Christmas] [Valentine's Day]          │
│                                                                     │
│                                    [← Back]  [Cancel]  [Next →]     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Holiday Quick Picks

When a holiday is selected, auto-fill dates:

| Holiday         | Order Window   | Delivery Date |
| --------------- | -------------- | ------------- |
| Thanksgiving    | Nov 1 - Nov 20 | Nov 27-28     |
| Christmas       | Dec 1 - Dec 20 | Dec 23-24     |
| Valentine's Day | Feb 1 - Feb 12 | Feb 14        |
| Easter          | Mar 15 - Apr 1 | Easter Sunday |
| Mother's Day    | Apr 20 - May 8 | Mother's Day  |

### Recurring Pattern Options

**Pattern Type Dropdown**:

- Seasonal (month-based)
- Weekly (day/time-based)
- Custom (advanced)

**Seasonal Presets**:

- Winter (Nov - Feb)
- Spring (Mar - May)
- Summer (Jun - Aug)
- Fall (Sep - Oct)
- Custom months...

**Weekly Builder** (shows if "Weekly" selected):

```
┌─────────────────────────────────────────────────────────────────┐
│  Which days?                                                     │
│                                                                  │
│  [Weekdays] [Weekends] [Every day]  (preset buttons)            │
│                                                                  │
│  [M] [T] [W] [T] [F] [S] [S]  (or pick individually)            │
│   ✓   ✓   ✓   ✓   ✓   ○   ○                                     │
│                                                                  │
│  What hours?                                                     │
│                                                                  │
│  From: [10:00 AM ▼]  To: [6:00 PM ▼]                           │
│                                                                  │
│  ☐ Different hours for different days (advanced)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 3: Additional Settings

### Purpose

Configure context-specific details based on selections in Steps 1-2.

### Dynamic Content

Step 3 content varies based on the path through the wizard:

#### Path: Available (Always)

Minimal configuration needed:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Beef Empanadas                               │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Almost done! Any additional settings?                              │
│                                                                     │
│  Message to display (optional)                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  e.g., "Fresh baked daily!" or "Limited quantities"          │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Preview                                                            │
│  ┌──────────────────────────────────┐                              │
│  │  [Image]                         │                              │
│  │  Beef Empanadas                  │                              │
│  │  $4.99                           │                              │
│  │                                  │                              │
│  │  [Add to Cart]                   │                              │
│  └──────────────────────────────────┘                              │
│                                                                     │
│                                    [← Back]  [Cancel]  [Save]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Path: Pre-Order

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Thanksgiving Empanada Box                    │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Pre-Order Settings                                                 │
│                                                                     │
│  Deposit Requirement                                                │
│  ○ No deposit required (full payment at checkout)                   │
│  ● Require deposit                                                  │
│                                                                     │
│    Amount: [50] [% ▼]    (e.g., 50% or $25.00)                     │
│                                                                     │
│  Order Limits                                                       │
│  ☐ Limit number of pre-orders                                       │
│    Maximum orders: [____]                                           │
│                                                                     │
│  Pre-Order Message                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pre-order now for Thanksgiving pickup (Nov 27-28)!          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [Reset to default]                                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Preview                                                            │
│  ┌──────────────────────────────────┐                              │
│  │  [Image]                         │                              │
│  │  Thanksgiving Empanada Box       │                              │
│  │  $49.99                          │                              │
│  │                                  │                              │
│  │  ┌────────────────────────────┐  │                              │
│  │  │ 🗓 Pre-order for Nov 27-28 │  │                              │
│  │  │ 50% deposit ($24.99)       │  │                              │
│  │  └────────────────────────────┘  │                              │
│  │                                  │                              │
│  │  [Pre-Order Now]                 │                              │
│  └──────────────────────────────────┘                              │
│                                                                     │
│                                    [← Back]  [Cancel]  [Save]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Path: Not Available

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Summer Salad Box                             │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Why is this product not available?                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Sold Out                                                   │   │
│  │   Temporarily out of stock                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ● Coming Soon                                                │   │
│  │   New product launching soon                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Out of Season                                              │   │
│  │   Seasonal product not currently available                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Other reason                                               │   │
│  │   Custom explanation                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Display Message                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Coming Summer 2025!                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  [Reset to default]                                                 │
│                                                                     │
│  ☑ Allow customers to sign up for notifications                     │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  Preview                                                            │
│  ┌──────────────────────────────────┐                              │
│  │  [Image]                         │                              │
│  │  Summer Salad Box   COMING SOON  │                              │
│  │  $12.99                          │                              │
│  │                                  │                              │
│  │  Coming Summer 2025!             │                              │
│  │                                  │                              │
│  │  [Notify Me When Available]      │                              │
│  └──────────────────────────────────┘                              │
│                                                                     │
│                                    [← Back]  [Cancel]  [Save]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Path: Hidden

```
┌─────────────────────────────────────────────────────────────────────┐
│  Set Availability for: Discontinued Item                            │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Why is this product hidden?                                        │
│                                                                     │
│  ○ Work in progress / Draft                                         │
│  ● Discontinued                                                     │
│  ○ Restricted (requires special access)                             │
│  ○ Archive                                                          │
│                                                                     │
│  Internal Notes (only visible to admins)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Removed from menu as of Jan 2025. Keep for order history.   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚠️  This product will not appear anywhere on the customer site.    │
│                                                                     │
│                                    [← Back]  [Cancel]  [Save]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Field Visibility Matrix

| Step 1 Selection | Step 2 Options                        | Step 3 Fields            |
| ---------------- | ------------------------------------- | ------------------------ |
| Available        | Always, Date Range, Recurring         | Message                  |
| Pre-Order        | Date picker (order window + delivery) | Deposit, Limits, Message |
| Not Available    | Always, Date Range, Recurring         | Reason, Message, Notify  |
| Hidden           | Always, Date Range                    | Reason (internal), Notes |

---

## Validation Rules

### Step 1

- Selection required before proceeding

### Step 2

**Date Range**:

- End date must be after start date
- Start date can't be in the past (warning, not blocking)
- Show calendar conflict warning if overlapping existing rules

**Recurring - Seasonal**:

- At least one month must be selected

**Recurring - Weekly**:

- At least one day must be selected
- Start time must be before end time

**Pre-Order**:

- Order window end must be before delivery date
- Delivery date must be in the future

### Step 3

**Pre-Order Deposit**:

- Amount must be > 0 if enabled
- Percentage must be ≤ 100

**Message**:

- Max 200 characters
- No required minimum

---

## Component Structure

```
src/components/admin/products/availability/wizard/
├── AvailabilityWizard.tsx          # Main wizard container
├── WizardProgress.tsx              # Step indicator
├── steps/
│   ├── GoalStep.tsx               # Step 1
│   ├── ScheduleStep.tsx           # Step 2
│   ├── DetailsStep.tsx            # Step 3 router
│   ├── AvailableDetails.tsx       # Step 3 for Available
│   ├── PreOrderDetails.tsx        # Step 3 for Pre-Order
│   ├── NotAvailableDetails.tsx    # Step 3 for Not Available
│   └── HiddenDetails.tsx          # Step 3 for Hidden
├── inputs/
│   ├── DateRangePicker.tsx        # Date range selector
│   ├── SeasonPicker.tsx           # Season selector
│   ├── WeeklySchedule.tsx         # Day/time grid
│   ├── HolidayQuickPicks.tsx      # Holiday preset buttons
│   └── DepositConfig.tsx          # Deposit settings
├── preview/
│   └── ProductPreview.tsx         # Live preview component
└── hooks/
    ├── useWizardState.ts          # Wizard state management
    └── useAvailabilityPreview.ts  # Preview generation
```

---

## State Management

```typescript
interface WizardState {
  currentStep: 1 | 2 | 3;

  // Step 1
  goal: 'available' | 'preorder' | 'not_available' | 'hidden' | null;

  // Step 2
  scheduleMode: 'always' | 'date_range' | 'recurring' | null;
  dateRange?: {
    start: Date;
    end: Date;
  };
  recurring?: {
    type: 'seasonal' | 'weekly' | 'custom';
    config: SeasonalConfig | WeeklyConfig | CustomConfig;
  };

  // Step 3 (varies by goal)
  message?: string;

  // Pre-Order specific
  preOrder?: {
    orderWindowStart: Date;
    orderWindowEnd: Date;
    deliveryDate: Date;
    deliveryDateEnd?: Date; // For range
    depositEnabled: boolean;
    depositAmount?: number;
    depositType?: 'fixed' | 'percentage';
    maxOrders?: number;
  };

  // Not Available specific
  notAvailable?: {
    reason: 'sold_out' | 'coming_soon' | 'out_of_season' | 'custom';
    customReason?: string;
    notifyEnabled: boolean;
  };

  // Hidden specific
  hidden?: {
    reason: 'draft' | 'discontinued' | 'restricted' | 'archive';
    internalNotes?: string;
  };
}
```

---

## Accessibility

- All form inputs have labels
- Step progress announced to screen readers
- Keyboard navigation: Tab through fields, Enter to proceed
- Focus trapped within wizard modal
- Error messages associated with fields via aria-describedby
- Color not used as only indicator (icons + text for states)

---

## Responsive Design

### Desktop (> 768px)

- Full wizard layout as shown
- Preview panel on right side

### Tablet (768px)

- Stacked layout
- Preview below form

### Mobile (< 768px)

- Full-width cards
- Preview collapsed by default (expandable)
- Larger touch targets (48px minimum)
