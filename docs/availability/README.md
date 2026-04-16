# Availability Management System - UX Redesign

This documentation outlines the proposed simplification of the Destino SF Availability Management system.

## Problem Statement

The current availability system has grown complex over time:

- **1,376-line form component** with 15+ configuration options
- **7 different states** (AVAILABLE, VIEW_ONLY, SOLD_OUT, COMING_SOON, PRE_ORDER, HIDDEN, RESTRICTED)
- **5 rule types** (ALWAYS_AVAILABLE, DATE_RANGE, SEASONAL, PRE_ORDER, TIME_BASED)
- **Complex interactions** between states, rules, priorities, and scheduling

This complexity makes it difficult for admins to:

- Quickly mark a product as sold out
- Set up seasonal availability (e.g., winter-only products)
- Configure pre-orders for holiday items
- Understand what rules affect a product on a given day

## Proposed Solution

Simplify the system while maintaining all current functionality through:

1. **Reduced States**: 7 states → 4 primary states
2. **Wizard-Based Creation**: Replace complex form with guided 3-step wizard
3. **Visual Calendar**: See availability at a glance with drag-to-create rules
4. **Quick Actions**: One-click common operations

## Documentation

| Document                                       | Description                                             |
| ---------------------------------------------- | ------------------------------------------------------- |
| [USE_CASES.md](./USE_CASES.md)                 | 5 most common availability scenarios with real examples |
| [SIMPLIFIED_STATES.md](./SIMPLIFIED_STATES.md) | New 4-state model replacing current 7 states            |
| [WIZARD_DESIGN.md](./WIZARD_DESIGN.md)         | 3-step wizard wireframes and flow                       |
| [CALENDAR_DESIGN.md](./CALENDAR_DESIGN.md)     | Visual calendar view design                             |
| [QUICK_ACTIONS.md](./QUICK_ACTIONS.md)         | One-click common operations                             |
| [MIGRATION.md](./MIGRATION.md)                 | Strategy for migrating existing rules                   |

## Quick Reference

### Current vs Proposed Comparison

| Aspect        | Current             | Proposed                                    |
| ------------- | ------------------- | ------------------------------------------- |
| States        | 7                   | 4                                           |
| Rule Types    | 5                   | 3 scheduling modes                          |
| Form Fields   | 15+ visible at once | 3-5 per wizard step                         |
| Quick Actions | None                | 4 one-click buttons                         |
| Calendar View | None                | Full month view                             |
| Rule Creation | ~8 clicks minimum   | 3 clicks (wizard) or 1 click (quick action) |

### New State Model Summary

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐     ┌─────────┐
│  Available  │     │  Pre-Order  │     │ Not Available │     │  Hidden │
│             │     │             │     │               │     │         │
│ Can purchase│     │ Future date │     │ View only     │     │ Not     │
│ normally    │     │ + deposit   │     │ with reason   │     │ shown   │
└─────────────┘     └─────────────┘     └───────────────┘     └─────────┘
```

### Scheduling Modes

- **Always**: No date restrictions
- **Date Range**: Specific start/end dates (e.g., Nov 20 - Dec 25)
- **Recurring**: Patterns like "every winter" or "weekends only"

## Design Principles

1. **Progressive Disclosure**: Show only relevant options based on previous choices
2. **Sensible Defaults**: Pre-fill common configurations
3. **Visual Feedback**: Calendar shows impact immediately
4. **Quick Recovery**: Easy to undo or modify rules
5. **Backward Compatible**: All existing rules continue to work

## Implementation Phases

### Phase 1: Documentation (This PR)

- Use case analysis
- State model design
- Wireframe descriptions
- Migration strategy

### Phase 2: Backend Simplification

- Create simplified API endpoints
- Add state mapping layer
- Maintain backward compatibility

### Phase 3: UI Implementation

- Build wizard component
- Build calendar view
- Add quick action buttons
- Update product detail page

### Phase 4: Migration

- Migrate existing rules to new model
- Deprecate legacy form
- Update admin documentation

## Related Files

Key files in the current implementation:

```
src/components/admin/products/availability/
├── AvailabilityManagement.tsx      # Main container (complex state management)
├── ProductAvailabilityForm.tsx     # 1,376-line form component
├── AvailabilityRulesList.tsx       # Current rule list view
└── AvailabilityScheduleView.tsx    # Basic schedule display

src/lib/products/
├── availability-engine.ts          # Core availability logic
└── availability-utils.ts           # Helper functions

prisma/schema.prisma
└── availability_rules model        # Database schema
```

## Success Metrics

After implementation, we expect:

- **50% reduction** in time to create a new rule
- **70% reduction** in support questions about availability
- **90% of operations** completable with quick actions or wizard
- **Zero functionality loss** from current system
