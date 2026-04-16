# Visual Calendar Design

This document describes the calendar view for visualizing and managing product availability.

## Overview

The calendar provides an at-a-glance view of a product's availability over time, replacing the text-based rule list with an intuitive visual interface.

## Key Features

1. **Month View**: See availability status for each day
2. **Color-Coded Days**: Instantly understand product state
3. **Click to View/Edit**: Select any day to see/modify rules
4. **Drag to Create**: Create date-range rules by dragging
5. **Pattern Indicators**: Visual markers for recurring rules
6. **Today Summary**: Quick view of current status

---

## Calendar Layout

### Main Calendar View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Beef Empanadas - Availability Calendar                                         │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ◀  December 2024  ▶                                    [Today] [+ New Rule]   │
│                                                                                 │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                                   │
│  │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │                                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                                   │
│  │  1  │  2  │  3  │  4  │  5  │  6  │  7  │                                   │
│  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │                                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                                   │
│  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │                                   │
│  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │                                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                                   │
│  │ 15  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21  │                                   │
│  │ 🔵  │ 🔵  │ 🔵  │ 🔵  │ 🔵  │ 🔵  │ 🔵  │  ← Pre-Order Period              │
│  │ PRE │ PRE │ PRE │ PRE │ PRE │ PRE │ PRE │                                   │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                                   │
│  │ 22  │ 23  │ 24  │ 25  │ 26  │ 27  │ 28  │                                   │
│  │ 🔵  │ 🔵  │ 🟡  │ 🟡  │ 🟢  │ 🟢  │ 🟢  │                                   │
│  │ PRE │ PRE │ SO  │ SO  │     │     │     │  ← 24-25: Sold Out               │
│  ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                                   │
│  │ 29  │ 30  │ 31  │     │     │     │     │                                   │
│  │ 🟢  │ 🟢  │ 🟢  │     │     │     │     │                                   │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                                   │
│                                                                                 │
│  Legend: 🟢 Available  🔵 Pre-Order  🟡 Not Available  ⬜ Hidden                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Color Coding

| Color            | State         | CSS Class       | Badge Text |
| ---------------- | ------------- | --------------- | ---------- |
| Green (#22c55e)  | Available     | `bg-green-500`  | (none)     |
| Blue (#3b82f6)   | Pre-Order     | `bg-blue-500`   | PRE        |
| Yellow (#eab308) | Not Available | `bg-yellow-500` | SO/CS/OS\* |
| Gray (#9ca3af)   | Hidden        | `bg-gray-400`   | -          |

\*Badge abbreviations: SO = Sold Out, CS = Coming Soon, OS = Out of Season

### Visual Indicators

**Date Range Rules**:

```
┌─────────────────────────────────┐
│ 15  │ 16  │ 17  │ 18  │ 19  │
│ ████████████████████████████│  ← Continuous bar shows date range
│ 🔵  │ 🔵  │ 🔵  │ 🔵  │ 🔵  │
└─────────────────────────────────┘
```

**Recurring Rules**:

```
┌─────┐
│  5  │
│ 🟢  │
│ 🔄  │  ← Small icon indicates recurring pattern
└─────┘
```

**Multiple Rules Affecting Same Day**:

```
┌─────┐
│ 12  │
│ 🟢  │
│ ⚠️2 │  ← Warning: 2 rules apply (click to resolve)
└─────┘
```

---

## Day Detail Panel

When a day is clicked, show a detail panel:

### Single Rule View

```
┌─────────────────────────────────────────────────────────┐
│  December 15, 2024                              [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Status: 🔵 Pre-Order                                   │
│                                                         │
│  Active Rule:                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Pre-Order Period                                  │ │
│  │  Dec 15 - Dec 23, 2024                            │ │
│  │  Delivery: Dec 25-26                              │ │
│  │  50% deposit required                             │ │
│  │                                                    │ │
│  │  [Edit Rule]  [Delete Rule]                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [+ Add Exception for This Day]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Multiple Rules View

```
┌─────────────────────────────────────────────────────────┐
│  December 15, 2024                              [Close] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⚠️ Multiple rules apply to this date                   │
│                                                         │
│  Effective Status: 🔵 Pre-Order (Rule #2 wins)          │
│                                                         │
│  Rules (in priority order):                             │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 1. Always Available (base rule)          Priority │ │
│  │    🟢 Available - No restrictions         Lower   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ 2. Holiday Pre-Order ✓ (active)          WINNER  │ │
│  │    🔵 Pre-Order - Dec 15-23              Higher   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Resolve Conflict...]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Drag to Create

### Creating Date Range Rules

```
Step 1: Click and hold on start date

┌─────┬─────┬─────┬─────┬─────┐
│ 10  │ 11  │ 12  │ 13  │ 14  │
│ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │
│[===]│     │     │     │     │  ← Start point highlighted
└─────┴─────┴─────┴─────┴─────┘

Step 2: Drag to end date

┌─────┬─────┬─────┬─────┬─────┐
│ 10  │ 11  │ 12  │ 13  │ 14  │
│ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │
│[=====SELECTION RANGE======]│  ← Visual feedback during drag
└─────┴─────┴─────┴─────┴─────┘

Step 3: Release - Quick action menu appears

┌─────┬─────┬─────┬─────┬─────┐
│ 10  │ 11  │ 12  │ 13  │ 14  │
│ 🟢  │ 🟢  │ 🟢  │ 🟢  │ 🟢  │
│[===== Dec 10-14 ==========]│
└─────┴─────┴─────┴─────┴─────┘
        │
        ▼
┌─────────────────────────┐
│ Create rule for Dec 10-14│
│ ─────────────────────── │
│ [🟢 Available]           │
│ [🔵 Pre-Order]           │
│ [🟡 Not Available]       │
│ [⬜ Hidden]              │
│ ─────────────────────── │
│ [More options...]        │
│ [Cancel]                 │
└─────────────────────────┘
```

### Touch Device Support

On touch devices:

1. Long-press to start selection
2. Drag finger to select range
3. Release to show menu
4. Alternatively: Tap start date, tap "Select Range", tap end date

---

## Year Overview

For seasonal products, show a condensed year view:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  2024 Overview                                               [Switch to Month] │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  Jan ████████████████████████████████ Available                                │
│  Feb ████████████████████████████████ Available                                │
│  Mar ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Apr ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  May ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Jun ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Jul ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Aug ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Sep ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Oct ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Out of Season                            │
│  Nov ████████████████████████████████ Available                                │
│  Dec ████████████▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ Available + Pre-Order period            │
│                                                                                 │
│  Click any month to expand                                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Today Summary Panel

Always visible sidebar showing current status:

```
┌─────────────────────────────────┐
│  Today's Status                 │
│  ─────────────────────────────  │
│                                 │
│  🟢 Available                   │
│                                 │
│  No special rules active        │
│                                 │
│  Quick Actions:                 │
│  [Mark Sold Out]                │
│  [Set Pre-Order]                │
│  [Hide Product]                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Upcoming Changes:              │
│                                 │
│  Dec 15: Pre-Order begins       │
│  Dec 24: Not available          │
│  Dec 26: Available again        │
│                                 │
└─────────────────────────────────┘
```

---

## Active Rules List

Below calendar, show list of all active rules:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Active Rules (3)                                              [+ Add Rule]     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📅 Always Available (Base Rule)                                        │   │
│  │  🟢 Available • No date restrictions                                    │   │
│  │  Created: Nov 1, 2024                                [Edit] [Delete]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🎄 Holiday Pre-Order                                                   │   │
│  │  🔵 Pre-Order • Dec 15-23, 2024 → Delivery Dec 25-26                   │   │
│  │  50% deposit • Max 100 orders                                           │   │
│  │  Created: Nov 15, 2024                               [Edit] [Delete]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🚫 Christmas Day Closure                                               │   │
│  │  🟡 Not Available (Sold Out) • Dec 24-25, 2024                         │   │
│  │  Message: "Closed for the holiday!"                                     │   │
│  │  Created: Nov 15, 2024                               [Edit] [Delete]    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Week View (Time-Based Rules)

For products with hourly availability:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Week View - Business Hours                                    [Switch to Month]│
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│        │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │                      │
│  ──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤                      │
│  6 AM  │      │      │      │      │      │      │      │                      │
│  7 AM  │      │      │      │      │      │      │      │                      │
│  8 AM  │      │      │      │      │      │      │      │                      │
│  9 AM  │ ████ │ ████ │ ████ │ ████ │ ████ │      │      │                      │
│  10 AM │ ████ │ ████ │ ████ │ ████ │ ████ │ ████ │      │ ← Available          │
│  11 AM │ ████ │ ████ │ ████ │ ████ │ ████ │ ████ │      │                      │
│  12 PM │ ████ │ ████ │ ████ │ ████ │ ████ │ ████ │      │                      │
│  1 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │ ████ │      │                      │
│  2 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │ ░░░░ │      │ ← Sat ends at 2pm   │
│  3 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │      │      │                      │
│  4 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │      │      │                      │
│  5 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │      │      │                      │
│  6 PM  │ ████ │ ████ │ ████ │ ████ │ ████ │      │      │                      │
│  7 PM  │      │      │      │      │      │      │      │                      │
│  8 PM  │      │      │      │      │      │      │      │                      │
│  ──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘                      │
│                                                                                 │
│  Legend: ████ Available  ░░░░ Partially available                              │
│                                                                                 │
│  Drag to paint hours • Click to toggle • Hold Shift to select range            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Layout

### Calendar (Condensed)

```
┌──────────────────────────────────┐
│  December 2024      ◀  ▶  [+]   │
│  ────────────────────────────── │
│                                  │
│  S   M   T   W   T   F   S      │
│  1   2   3   4   5   6   7      │
│  🟢  🟢  🟢  🟢  🟢  🟢  🟢     │
│                                  │
│  8   9  10  11  12  13  14      │
│  🟢  🟢  🟢  🟢  🟢  🟢  🟢     │
│                                  │
│  15  16  17  18  19  20  21     │
│  🔵  🔵  🔵  🔵  🔵  🔵  🔵     │
│                                  │
│  22  23  24  25  26  27  28     │
│  🔵  🔵  🟡  🟡  🟢  🟢  🟢     │
│                                  │
│  29  30  31                      │
│  🟢  🟢  🟢                      │
│                                  │
│  ────────────────────────────── │
│                                  │
│  Today: 🟢 Available             │
│                                  │
│  [Quick Actions ▼]               │
│                                  │
└──────────────────────────────────┘
```

### Day Detail (Bottom Sheet)

```
┌──────────────────────────────────┐
│  ═══════════════════════════════ │  ← Drag handle
│                                  │
│  December 15, 2024               │
│  ────────────────────────────── │
│                                  │
│  Status: 🔵 Pre-Order            │
│                                  │
│  Pre-Order Period                │
│  Dec 15-23 → Delivery Dec 25-26  │
│  50% deposit required            │
│                                  │
│  ────────────────────────────── │
│                                  │
│  [Edit Rule]      [Delete Rule]  │
│                                  │
│  [Add Exception]                 │
│                                  │
└──────────────────────────────────┘
```

---

## Component Structure

```
src/components/admin/products/availability/calendar/
├── AvailabilityCalendar.tsx       # Main calendar container
├── CalendarHeader.tsx             # Month navigation, view toggles
├── MonthView.tsx                  # Month grid
├── WeekView.tsx                   # Week/hourly grid
├── YearOverview.tsx               # Year-at-glance view
├── CalendarDay.tsx                # Individual day cell
├── DayDetailPanel.tsx             # Clicked day details
├── TodaySummary.tsx               # Current status sidebar
├── RulesList.tsx                  # Active rules list
├── DragSelection.tsx              # Drag-to-create overlay
├── CalendarLegend.tsx             # Color legend
└── hooks/
    ├── useCalendarState.ts        # View state management
    ├── useDragSelection.ts        # Drag interaction
    └── useAvailabilityData.ts     # Fetch/compute availability
```

---

## Data Model

```typescript
interface CalendarDay {
  date: Date;
  effectiveState: SimplifiedState;
  effectiveReason?: string;
  activeRules: AvailabilityRule[];
  hasConflict: boolean;
  isRecurring: boolean;
  message?: string;
}

interface CalendarViewState {
  viewMode: 'month' | 'week' | 'year';
  currentDate: Date; // First day of visible period
  selectedDate: Date | null;
  dragSelection: {
    start: Date | null;
    end: Date | null;
    isActive: boolean;
  };
}

interface CalendarData {
  productId: string;
  days: CalendarDay[];
  rules: AvailabilityRule[];
  todayStatus: CalendarDay;
  upcomingChanges: {
    date: Date;
    fromState: SimplifiedState;
    toState: SimplifiedState;
    rule: AvailabilityRule;
  }[];
}
```

---

## Performance Considerations

1. **Virtual Scrolling**: For year view, only render visible months
2. **Memoization**: Cache day computations, recompute on rule changes
3. **Batch Updates**: When dragging, debounce API calls
4. **Prefetch**: Load adjacent months while viewing current month
5. **Server Computation**: Complex rule resolution done server-side, cached

---

## Accessibility

- Calendar grid uses `role="grid"` with proper row/cell roles
- Arrow key navigation between days
- Screen reader announces day status on focus
- Drag interaction has keyboard alternative (Shift+Click range)
- Color coding has text labels for color-blind users
- High contrast mode supported
