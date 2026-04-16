# Migration Strategy

This document outlines the strategy for migrating existing availability rules to the simplified model.

## Overview

The migration will:

1. Map existing 7 states to 4 simplified states
2. Convert 5 rule types to 3 scheduling modes
3. Preserve all existing functionality
4. Maintain backward compatibility during transition
5. Provide rollback capability

## Migration Phases

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Phase 1          Phase 2          Phase 3          Phase 4                     │
│  ────────         ────────         ────────         ────────                    │
│  Schema           Data             UI               Cleanup                      │
│  Update           Migration        Switch           Deprecation                  │
│                                                                                 │
│  Add new fields   Convert          Deploy new       Remove legacy               │
│  Keep legacy      existing         wizard +         fields after                │
│  fields           rules            calendar         6-month period              │
│                                                                                 │
│  Zero downtime    Automated        Feature flag     Cleanup                     │
│                   + manual         rollout          migration                   │
│                   review                                                        │
│                                                                                 │
│  ◀──── 1 day ────▶◀── 1 week ───▶◀── 2 weeks ──▶◀── 6 months ──▶             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Schema Update

### Database Changes

Add new fields to `availability_rules` table while preserving legacy fields:

```prisma
model AvailabilityRule {
  id              String   @id @default(cuid())
  productId       String
  product         Product  @relation(fields: [productId], references: [id])

  // === LEGACY FIELDS (keep for backward compatibility) ===
  ruleType        RuleType?            // ALWAYS_AVAILABLE, DATE_RANGE, etc.
  state           AvailabilityState?   // AVAILABLE, VIEW_ONLY, etc.
  priority        Int?
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

  // === NEW SIMPLIFIED FIELDS ===
  simplifiedState     SimplifiedState?    // AVAILABLE, PRE_ORDER, NOT_AVAILABLE, HIDDEN
  notAvailableReason  String?             // sold_out, coming_soon, seasonal, custom
  scheduleMode        ScheduleMode?       // ALWAYS, DATE_RANGE, RECURRING
  recurringType       RecurringType?      // SEASONAL, WEEKLY, CUSTOM
  recurringConfig     Json?               // Pattern-specific config
  deliveryDate        DateTime?           // For pre-orders
  depositEnabled      Boolean?
  depositAmount       Decimal?
  depositType         String?             // 'fixed' or 'percentage'
  maxOrders           Int?
  notifyEnabled       Boolean             @default(false)
  internalNotes       String?

  // === COMMON FIELDS ===
  message         String?
  isActive        Boolean              @default(true)
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  createdBy       String?

  // === MIGRATION TRACKING ===
  migrationStatus   MigrationStatus?    @default(PENDING)
  migratedAt        DateTime?
  migrationNotes    String?

  @@index([productId])
  @@index([migrationStatus])
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

enum MigrationStatus {
  PENDING
  AUTO_MIGRATED
  NEEDS_REVIEW
  MANUALLY_MIGRATED
  SKIPPED
}
```

### Migration Script: Add New Columns

```sql
-- Add new columns without dropping existing ones
ALTER TABLE availability_rules
ADD COLUMN simplified_state VARCHAR(50),
ADD COLUMN not_available_reason VARCHAR(100),
ADD COLUMN schedule_mode VARCHAR(50),
ADD COLUMN recurring_type VARCHAR(50),
ADD COLUMN recurring_config JSONB,
ADD COLUMN delivery_date TIMESTAMP,
ADD COLUMN deposit_enabled BOOLEAN,
ADD COLUMN deposit_amount DECIMAL(10,2),
ADD COLUMN deposit_type VARCHAR(20),
ADD COLUMN max_orders INTEGER,
ADD COLUMN notify_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN internal_notes TEXT,
ADD COLUMN migration_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN migrated_at TIMESTAMP,
ADD COLUMN migration_notes TEXT;

-- Add index for migration tracking
CREATE INDEX idx_availability_rules_migration ON availability_rules(migration_status);
```

---

## Phase 2: Data Migration

### Automatic Migration Rules

#### State Mapping

| Legacy State | →   | Simplified State | Reason               |
| ------------ | --- | ---------------- | -------------------- |
| AVAILABLE    | →   | AVAILABLE        | -                    |
| VIEW_ONLY    | →   | NOT_AVAILABLE    | custom ("View Only") |
| SOLD_OUT     | →   | NOT_AVAILABLE    | sold_out             |
| COMING_SOON  | →   | NOT_AVAILABLE    | coming_soon          |
| PRE_ORDER    | →   | PRE_ORDER        | -                    |
| HIDDEN       | →   | HIDDEN           | -                    |
| RESTRICTED   | →   | HIDDEN           | restricted           |

#### Rule Type Mapping

| Legacy Rule Type | →   | Schedule Mode | Recurring Type |
| ---------------- | --- | ------------- | -------------- |
| ALWAYS_AVAILABLE | →   | ALWAYS        | -              |
| DATE_RANGE       | →   | DATE_RANGE    | -              |
| SEASONAL         | →   | RECURRING     | SEASONAL       |
| PRE_ORDER        | →   | DATE_RANGE    | -              |
| TIME_BASED       | →   | RECURRING     | WEEKLY         |

### Migration Script

```typescript
// src/scripts/migrate-availability-rules.ts

import { prisma } from '@/lib/db-unified';

interface MigrationResult {
  total: number;
  autoMigrated: number;
  needsReview: number;
  errors: number;
}

async function migrateAvailabilityRules(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    autoMigrated: 0,
    needsReview: 0,
    errors: 0,
  };

  // Get all unmigrated rules
  const rules = await prisma.availabilityRule.findMany({
    where: {
      migrationStatus: 'PENDING',
    },
  });

  result.total = rules.length;

  for (const rule of rules) {
    try {
      const migrated = await migrateRule(rule);

      if (migrated.needsReview) {
        result.needsReview++;
      } else {
        result.autoMigrated++;
      }
    } catch (error) {
      console.error(`Failed to migrate rule ${rule.id}:`, error);
      result.errors++;

      await prisma.availabilityRule.update({
        where: { id: rule.id },
        data: {
          migrationStatus: 'NEEDS_REVIEW',
          migrationNotes: `Error: ${error.message}`,
        },
      });
    }
  }

  return result;
}

async function migrateRule(rule: AvailabilityRule): Promise<{ needsReview: boolean }> {
  let needsReview = false;
  const migrationNotes: string[] = [];

  // Map state
  const { simplifiedState, notAvailableReason } = mapState(rule.state);

  // Map rule type to schedule mode
  const { scheduleMode, recurringType, recurringConfig } = mapRuleType(rule);

  // Handle pre-order specific fields
  let preOrderFields = {};
  if (rule.ruleType === 'PRE_ORDER' && rule.preOrderConfig) {
    preOrderFields = extractPreOrderConfig(rule.preOrderConfig);
  }

  // Check for edge cases that need review
  if (rule.priority && rule.priority > 10) {
    needsReview = true;
    migrationNotes.push(`High priority rule (${rule.priority}) - verify no conflicts`);
  }

  if (rule.ruleType === 'TIME_BASED' && rule.daysOfWeek?.length === 0) {
    needsReview = true;
    migrationNotes.push('Time-based rule with no days selected');
  }

  // Update the rule
  await prisma.availabilityRule.update({
    where: { id: rule.id },
    data: {
      simplifiedState,
      notAvailableReason,
      scheduleMode,
      recurringType,
      recurringConfig,
      ...preOrderFields,
      migrationStatus: needsReview ? 'NEEDS_REVIEW' : 'AUTO_MIGRATED',
      migratedAt: new Date(),
      migrationNotes: migrationNotes.join('; ') || null,
    },
  });

  return { needsReview };
}

function mapState(legacyState: string): {
  simplifiedState: string;
  notAvailableReason: string | null;
} {
  const mapping: Record<string, { state: string; reason: string | null }> = {
    AVAILABLE: { state: 'AVAILABLE', reason: null },
    VIEW_ONLY: { state: 'NOT_AVAILABLE', reason: 'custom' },
    SOLD_OUT: { state: 'NOT_AVAILABLE', reason: 'sold_out' },
    COMING_SOON: { state: 'NOT_AVAILABLE', reason: 'coming_soon' },
    PRE_ORDER: { state: 'PRE_ORDER', reason: null },
    HIDDEN: { state: 'HIDDEN', reason: null },
    RESTRICTED: { state: 'HIDDEN', reason: 'restricted' },
  };

  const result = mapping[legacyState] || { state: 'AVAILABLE', reason: null };
  return {
    simplifiedState: result.state,
    notAvailableReason: result.reason,
  };
}

function mapRuleType(rule: AvailabilityRule): {
  scheduleMode: string;
  recurringType: string | null;
  recurringConfig: object | null;
} {
  switch (rule.ruleType) {
    case 'ALWAYS_AVAILABLE':
      return { scheduleMode: 'ALWAYS', recurringType: null, recurringConfig: null };

    case 'DATE_RANGE':
    case 'PRE_ORDER':
      return { scheduleMode: 'DATE_RANGE', recurringType: null, recurringConfig: null };

    case 'SEASONAL':
      return {
        scheduleMode: 'RECURRING',
        recurringType: 'SEASONAL',
        recurringConfig: {
          startMonth: rule.startMonth,
          startDay: rule.startDay,
          endMonth: rule.endMonth,
          endDay: rule.endDay,
          repeatsYearly: rule.repeatsYearly ?? true,
        },
      };

    case 'TIME_BASED':
      return {
        scheduleMode: 'RECURRING',
        recurringType: 'WEEKLY',
        recurringConfig: {
          daysOfWeek: rule.daysOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          timezone: rule.timezone,
        },
      };

    default:
      return { scheduleMode: 'ALWAYS', recurringType: null, recurringConfig: null };
  }
}

function extractPreOrderConfig(config: any): object {
  return {
    deliveryDate: config.deliveryDate ? new Date(config.deliveryDate) : null,
    depositEnabled: config.depositRequired ?? false,
    depositAmount: config.depositAmount ?? null,
    depositType: config.depositType ?? null,
    maxOrders: config.maxQuantity ?? null,
  };
}

// Run migration
migrateAvailabilityRules()
  .then(result => {
    console.log('Migration complete:', result);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

### Manual Review Queue

Rules flagged for review appear in admin dashboard:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Migration Review Queue (12 rules need attention)                               │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Rule ID: rule_abc123                                                   │   │
│  │  Product: Holiday Empanada Box                                          │   │
│  │                                                                         │   │
│  │  Issue: High priority rule (priority: 50) - verify no conflicts         │   │
│  │                                                                         │   │
│  │  Legacy Config:                    →    Proposed Migration:             │   │
│  │  State: PRE_ORDER                       State: PRE_ORDER                │   │
│  │  Rule Type: PRE_ORDER                   Schedule: DATE_RANGE            │   │
│  │  Priority: 50                           (implicit priority)              │   │
│  │  Dates: Nov 1 - Nov 20                  Dates: Nov 1 - Nov 20           │   │
│  │                                                                         │   │
│  │  [Approve Migration]  [Edit & Migrate]  [Skip (Keep Legacy)]           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Rule ID: rule_def456                                                   │   │
│  │  Product: Fresh Empanadas                                               │   │
│  │                                                                         │   │
│  │  Issue: Time-based rule with no days selected                           │   │
│  │                                                                         │   │
│  │  [Approve Migration]  [Edit & Migrate]  [Delete Rule]                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: UI Switch

### Feature Flag Rollout

```typescript
// src/lib/feature-flags.ts

export const FEATURES = {
  SIMPLIFIED_AVAILABILITY: {
    // Rollout stages
    stages: {
      INTERNAL: ['admin@destinosf.com', 'dev@destinosf.com'],
      BETA: 0.1, // 10% of admins
      GENERAL: 0.5, // 50% of admins
      FULL: 1.0, // Everyone
    },
    currentStage: 'INTERNAL',
  },
};

export function useSimplifiedAvailability(userId: string): boolean {
  const feature = FEATURES.SIMPLIFIED_AVAILABILITY;
  const stage = feature.stages[feature.currentStage];

  if (Array.isArray(stage)) {
    // Internal testing - specific users
    return stage.includes(userId);
  }

  // Percentage rollout
  const hash = hashUserId(userId);
  return hash < stage;
}
```

### Dual-Mode Support

During transition, both UIs are available:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Availability Management                                                        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  ✨ New simplified availability editor is available!                    │   │
│  │                                                                         │   │
│  │  [Try New Editor]                           [Keep Using Classic]        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ... current UI ...                                                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Fallback Mechanism

If issues detected, automatic fallback:

```typescript
// src/components/admin/products/availability/AvailabilityManager.tsx

function AvailabilityManager({ productId }: Props) {
  const { useSimplified, fallbackReason } = useAvailabilityEditorMode();
  const [manualFallback, setManualFallback] = useState(false);

  // Check for unmigrated rules
  const { data: rules } = useProductRules(productId);
  const hasUnmigratedRules = rules?.some(r => r.migrationStatus === 'PENDING');

  if (hasUnmigratedRules || manualFallback || fallbackReason) {
    return (
      <LegacyAvailabilityForm
        productId={productId}
        fallbackReason={fallbackReason || 'unmigrated_rules'}
        onRequestNewEditor={() => setManualFallback(false)}
      />
    );
  }

  return (
    <SimplifiedAvailabilityEditor
      productId={productId}
      onError={() => setManualFallback(true)}
    />
  );
}
```

---

## Phase 4: Cleanup

### Deprecation Timeline

| Milestone          | Timeframe | Action                              |
| ------------------ | --------- | ----------------------------------- |
| Migration Complete | Week 2    | All rules migrated to new schema    |
| New UI Default     | Week 4    | New editor is default for all users |
| Legacy UI Warning  | Month 2   | Warning banner on legacy UI         |
| Legacy UI Removal  | Month 4   | Legacy UI removed                   |
| Schema Cleanup     | Month 6   | Remove legacy columns               |

### Schema Cleanup Migration

After 6-month transition period:

```sql
-- Verify all rules are migrated
SELECT COUNT(*) FROM availability_rules
WHERE migration_status != 'AUTO_MIGRATED'
  AND migration_status != 'MANUALLY_MIGRATED';

-- If count is 0, proceed with cleanup

-- Remove legacy columns
ALTER TABLE availability_rules
DROP COLUMN rule_type,
DROP COLUMN state,
DROP COLUMN priority,
DROP COLUMN start_month,
DROP COLUMN start_day,
DROP COLUMN end_month,
DROP COLUMN end_day,
DROP COLUMN repeats_yearly,
DROP COLUMN days_of_week,
DROP COLUMN start_time,
DROP COLUMN end_time,
DROP COLUMN timezone,
DROP COLUMN pre_order_config;

-- Rename new columns to standard names
ALTER TABLE availability_rules
RENAME COLUMN simplified_state TO state;

-- Remove migration tracking columns
ALTER TABLE availability_rules
DROP COLUMN migration_status,
DROP COLUMN migrated_at,
DROP COLUMN migration_notes;

-- Drop old enums
DROP TYPE IF EXISTS rule_type;
DROP TYPE IF EXISTS availability_state;
```

---

## Rollback Plan

### Immediate Rollback (Phase 2-3)

If critical issues discovered during data migration or UI switch:

```typescript
// src/scripts/rollback-migration.ts

async function rollbackMigration() {
  // 1. Disable feature flag
  await setFeatureFlag('SIMPLIFIED_AVAILABILITY', 'DISABLED');

  // 2. Clear migrated data (new columns remain but aren't used)
  await prisma.availabilityRule.updateMany({
    where: {
      migrationStatus: { not: 'PENDING' },
    },
    data: {
      migrationStatus: 'PENDING',
      simplifiedState: null,
      notAvailableReason: null,
      scheduleMode: null,
      recurringType: null,
      recurringConfig: null,
      migratedAt: null,
    },
  });

  // 3. Legacy columns still contain original data
  console.log('Rollback complete - system using legacy schema');
}
```

### Data Preservation

Throughout migration, original data is preserved:

- Legacy columns remain populated
- New columns are additive
- No data deletion until Phase 4 cleanup
- Full audit trail in `migrationNotes`

---

## Verification Checklist

### Pre-Migration

- [ ] Backup database
- [ ] Verify all legacy states are documented
- [ ] Test migration script on staging
- [ ] Identify products with complex rules
- [ ] Notify admin users of upcoming changes

### During Migration

- [ ] Monitor migration progress
- [ ] Review flagged rules promptly
- [ ] Test availability engine with migrated rules
- [ ] Verify customer-facing behavior unchanged
- [ ] Check for performance regressions

### Post-Migration

- [ ] All rules have `migration_status != PENDING`
- [ ] No errors in application logs
- [ ] Product availability matches pre-migration state
- [ ] Admin users can edit rules with new UI
- [ ] Calendar view displays correctly
- [ ] Quick actions function properly

### Pre-Cleanup

- [ ] 6-month transition period elapsed
- [ ] No users on legacy UI
- [ ] No rules with `migration_status = PENDING`
- [ ] Backup of legacy column data
- [ ] Stakeholder approval for final cleanup

---

## Support Resources

### Admin Documentation

Update documentation to cover:

- New state model explanation
- Wizard walkthrough
- Calendar view guide
- Quick actions reference
- Migration FAQ

### Troubleshooting

Common migration issues:

| Issue                         | Resolution                                 |
| ----------------------------- | ------------------------------------------ |
| Rule not showing in new UI    | Check `migration_status` field             |
| Unexpected availability state | Compare legacy vs simplified state mapping |
| Calendar shows wrong status   | Verify `scheduleMode` is correctly set     |
| Pre-order settings lost       | Check `preOrderConfig` extraction          |

### Monitoring Queries

```sql
-- Migration progress
SELECT migration_status, COUNT(*)
FROM availability_rules
GROUP BY migration_status;

-- Rules with issues
SELECT id, product_id, migration_notes
FROM availability_rules
WHERE migration_status = 'NEEDS_REVIEW';

-- Products with multiple rules (potential conflicts)
SELECT product_id, COUNT(*) as rule_count
FROM availability_rules
WHERE is_active = true
GROUP BY product_id
HAVING COUNT(*) > 2;
```
