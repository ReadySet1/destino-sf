I'll analyze your codebase structure and update the Master Fix Plan to align with your actual implementation. Let me explore your project structure first.Let me get a more focused view of the project structure:Now let me check the existing availability implementation:Let me check the Prisma schema:Let me check the existing admin interface for products:Let me look for admin pages in the app/(dashboard) directory:Let me check the current product editing page:Let me check the types and existing product management components:Now let me check the existing UI components:Now let me check the existing store/cart implementation:Let me check the AddToCartButton component to understand the current implementation:Now let me check how products are displayed in the store:Based on my analysis of your codebase, here's the updated Master Fix Plan aligned with your actual implementation:

# Master Fix Planning Template v2.0 - Destino SF

## 🎯 Feature/Fix Overview

**Name**: Product Availability & Personalization Control System - Full Platform Revamp

**Type**: Enhancement / Refactor

**Priority**: High

**Estimated Complexity**: Large (1-2 weeks)

**Sprint/Milestone**: Q1_2025_AVAILABILITY_REVAMP

### Problem Statement
Current availability system relies on Square item naming conventions and basic database flags. Users need comprehensive in-platform controls for product availability, seasonal scheduling, pre-orders, and purchase restrictions without depending on Square's advanced tags or naming patterns. The system should provide date pickers, visual timeline management, and bulk operations.

### Success Criteria
- [ ] Full availability control within the ecommerce platform (independent of Square naming)
- [ ] Date picker interfaces using existing `react-day-picker` and UI components
- [ ] Multiple availability states (visible/hidden, purchasable/view-only, pre-order, coming-soon)
- [ ] Seasonal item automation with custom date ranges
- [ ] Bulk availability management for multiple products
- [ ] Real-time preview of availability changes
- [ ] Migration path from current Square-based system
- [ ] Integration with existing Prisma models and Next.js 15 app router

### Dependencies
- **Blocked by**: None
- **Blocks**: Future inventory management features
- **Related**: Current Square sync implementation (`src/app/api/square/sync`), existing availability fields in Prisma schema

---

## 📋 Planning Phase

### 1. Code Structure & References

#### File Structure (Aligned with Your Codebase)
```tsx
src/
├── app/
│   ├── api/
│   │   └── availability/
│   │       ├── route.ts                    // CRUD operations for availability rules
│   │       ├── preview/route.ts            // Preview availability changes
│   │       ├── bulk/route.ts               // Bulk operations endpoint
│   │       └── migrate/route.ts            // Migration from Square-based rules
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── products/
│   │           ├── availability/
│   │           │   ├── page.tsx            // Main availability management page
│   │           │   ├── [productId]/page.tsx // Individual product availability
│   │           │   └── bulk/page.tsx       // Bulk availability editor
│   │           └── components/
│   │               ├── AvailabilityManager.tsx
│   │               ├── AvailabilityCalendar.tsx
│   │               └── DateRangePicker.tsx
├── components/
│   ├── admin/
│   │   └── availability/
│   │       ├── AvailabilityForm.tsx       // Main form component
│   │       ├── AvailabilityTimeline.tsx   // Visual timeline view
│   │       ├── SeasonalRuleBuilder.tsx    // Seasonal rules interface
│   │       ├── PreOrderSettings.tsx       // Pre-order configuration
│   │       └── PurchaseRestrictions.tsx   // Purchase control settings
│   └── store/
│       ├── AvailabilityBadge.tsx          // Customer-facing availability indicator
│       └── PreOrderButton.tsx             // Enhanced AddToCart for pre-orders
├── hooks/
│   ├── useAvailability.ts                 // Main availability hook
│   ├── useAvailabilityPreview.ts          // Preview mode hook
│   └── useSeasonalRules.ts                // Seasonal automation hook
├── lib/
│   ├── availability/
│   │   ├── engine.ts                      // Rule evaluation engine
│   │   ├── scheduler.ts                   // Automated scheduling service
│   │   ├── migrator.ts                    // Square to native migration
│   │   ├── validators.ts                  // Zod schemas for availability
│   │   └── constants.ts                   // Availability states/types
│   └── db/
│       └── availability-queries.ts        // Prisma queries for availability
├── types/
│   ├── availability.ts                    // TypeScript interfaces
│   └── availability-rules.ts              // Rule type definitions
├── actions/
│   └── availability.ts                    // Server actions for availability
└── store/
    └── availability-store.ts              // Zustand store for availability UI state
```

#### Updated Prisma Schema (Extending Your Existing Schema)
```prisma
// Add to your existing schema.prisma

model AvailabilityRule {
  id                String      @id @default(uuid()) @db.Uuid
  productId         String      @db.Uuid
  name              String
  enabled           Boolean     @default(true)
  priority          Int         @default(0)
  ruleType          String      @db.VarChar(50) // 'date_range', 'seasonal', 'inventory', 'custom', 'time_based'
  state             String      @db.VarChar(50) // 'available', 'pre_order', 'view_only', 'hidden', etc.
  
  // Date controls
  startDate         DateTime?   @map("start_date")
  endDate           DateTime?   @map("end_date")
  
  // Seasonal config (JSONB)
  seasonalConfig    Json?       @map("seasonal_config")
  
  // Time restrictions (JSONB)
  timeRestrictions  Json?       @map("time_restrictions")
  
  // Settings based on state (JSONB)
  preOrderSettings  Json?       @map("pre_order_settings")
  viewOnlySettings  Json?       @map("view_only_settings")
  
  // Override flag
  overrideSquare    Boolean     @default(true) @map("override_square")
  
  // Metadata
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")
  createdBy         String      @db.Uuid @map("created_by")
  updatedBy         String      @db.Uuid @map("updated_by")
  deletedAt         DateTime?   @map("deleted_at")
  
  // Relations
  product           Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdByProfile  Profile     @relation("CreatedRules", fields: [createdBy], references: [id])
  updatedByProfile  Profile     @relation("UpdatedRules", fields: [updatedBy], references: [id])
  
  @@index([productId, enabled])
  @@index([startDate, endDate])
  @@index([productId, priority])
  @@map("availability_rules")
}

model AvailabilitySchedule {
  id              String      @id @default(uuid()) @db.Uuid
  ruleId          String      @db.Uuid
  scheduledAt     DateTime    @map("scheduled_at")
  stateChange     String      @db.VarChar(50) @map("state_change")
  processed       Boolean     @default(false)
  processedAt     DateTime?   @map("processed_at")
  errorMessage    String?     @map("error_message")
  
  rule            AvailabilityRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  
  @@index([scheduledAt, processed])
  @@map("availability_schedule")
}

// Update Product model relations
model Product {
  // ... existing fields ...
  availabilityRules AvailabilityRule[]
  // ... rest of model ...
}

// Update Profile model relations
model Profile {
  // ... existing fields ...
  createdAvailabilityRules AvailabilityRule[] @relation("CreatedRules")
  updatedAvailabilityRules AvailabilityRule[] @relation("UpdatedRules")
  // ... rest of model ...
}
```

#### Key TypeScript Types (Aligned with Your Patterns)
```tsx
// src/types/availability.ts
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Availability States Enum
export enum AvailabilityState {
  AVAILABLE = 'available',
  PRE_ORDER = 'pre_order',
  VIEW_ONLY = 'view_only',
  HIDDEN = 'hidden',
  COMING_SOON = 'coming_soon',
  SOLD_OUT = 'sold_out',
  RESTRICTED = 'restricted'
}

// Rule Types
export enum RuleType {
  DATE_RANGE = 'date_range',
  SEASONAL = 'seasonal',
  INVENTORY = 'inventory',
  CUSTOM = 'custom',
  TIME_BASED = 'time_based'
}

// Zod Schemas (using your existing pattern)
export const AvailabilityRuleSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  ruleType: z.nativeEnum(RuleType),
  state: z.nativeEnum(AvailabilityState),
  
  // Date controls
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  
  // Seasonal controls
  seasonalConfig: z.object({
    startMonth: z.number().min(1).max(12),
    startDay: z.number().min(1).max(31),
    endMonth: z.number().min(1).max(12),
    endDay: z.number().min(1).max(31),
    yearly: z.boolean(),
    timezone: z.string().default('America/Los_Angeles')
  }).nullable().optional(),
  
  // Time restrictions
  timeRestrictions: z.object({
    daysOfWeek: z.array(z.number().min(0).max(6)),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().default('America/Los_Angeles')
  }).nullable().optional(),
  
  // Pre-order settings
  preOrderSettings: z.object({
    message: z.string(),
    expectedDeliveryDate: z.coerce.date(),
    maxQuantity: z.number().nullable().optional(),
    depositRequired: z.boolean().default(false),
    depositAmount: z.number().nullable().optional()
  }).nullable().optional(),
  
  // View-only settings
  viewOnlySettings: z.object({
    message: z.string(),
    showPrice: z.boolean().default(true),
    allowWishlist: z.boolean().default(false),
    notifyWhenAvailable: z.boolean().default(true)
  }).nullable().optional(),
  
  overrideSquare: z.boolean().default(true)
});

export type AvailabilityRule = z.infer<typeof AvailabilityRuleSchema>;

// Bulk operation types
export interface BulkAvailabilityRequest {
  productIds: string[];
  rules: Partial<AvailabilityRule>[];
  operation: 'create' | 'update' | 'delete';
  applyToVariants: boolean;
}

// Preview types
export interface AvailabilityPreview {
  productId: string;
  currentState: AvailabilityState;
  futureStates: Array<{
    date: Date;
    state: AvailabilityState;
    rule: AvailabilityRule;
  }>;
  conflicts: Array<{
    rule1: AvailabilityRule;
    rule2: AvailabilityRule;
    resolution: 'priority' | 'date' | 'manual';
  }>;
}
```

### 2. Server Actions (Next.js 15 Pattern)

```tsx
// src/actions/availability.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { withDatabaseConnection } from '@/lib/db-utils';
import { AvailabilityRuleSchema, type AvailabilityRule } from '@/types/availability';
import { getServerSession } from 'next-auth';
import { logger } from '@/utils/logger';

export async function createAvailabilityRule(
  productId: string,
  data: Partial<AvailabilityRule>
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const validated = AvailabilityRuleSchema.parse({
    ...data,
    productId,
  });

  const result = await withDatabaseConnection(async () => {
    return await prisma.availabilityRule.create({
      data: {
        ...validated,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
    });
  });

  revalidatePath('/admin/products/availability');
  revalidatePath(`/products/${productId}`);
  
  return result;
}

export async function bulkUpdateAvailability(
  request: BulkAvailabilityRequest
) {
  // Implementation using prisma.$transaction
}

export async function migrateFromSquare(productIds?: string[]) {
  // Migration logic from current Square-based system
}
```

### 3. UI Components (Using Your Existing UI Library)

```tsx
// src/components/admin/availability/AvailabilityForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { AvailabilityRuleSchema } from '@/types/availability';

// Component implementation using your existing UI components
```

### 4. Integration with Existing Systems

#### Update AddToCartButton Component
```tsx
// src/components/store/AddToCartButton.tsx
// Enhanced version with availability checking

import { useAvailability } from '@/hooks/useAvailability';

export function AddToCartButton({ product, ...props }) {
  const { currentState, isPreOrder, preOrderSettings } = useAvailability(product.id);
  
  if (currentState === 'hidden') return null;
  
  if (currentState === 'view_only') {
    return <ViewOnlyButton product={product} />;
  }
  
  if (isPreOrder) {
    return <PreOrderButton product={product} settings={preOrderSettings} />;
  }
  
  // Existing implementation
}
```

#### Square Sync Enhancement
```tsx
// src/app/api/square/sync/route.ts
// Add logic to preserve manual availability overrides

async function syncProduct(squareProduct: any) {
  const existingRule = await prisma.availabilityRule.findFirst({
    where: {
      productId: product.id,
      overrideSquare: true,
      enabled: true
    }
  });
  
  if (existingRule) {
    // Skip Square availability updates for products with manual overrides
    return;
  }
  
  // Existing sync logic
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Using Your Jest Setup)
```tsx
// src/__tests__/lib/availability/engine.test.ts
// src/__tests__/components/admin/AvailabilityForm.test.tsx
// src/__tests__/actions/availability.test.ts
```

### Integration Tests
```tsx
// src/__tests__/integration/availability-flow.test.ts
// Test complete availability management workflow
```

### E2E Tests (Using Your Playwright Setup)
```tsx
// tests/e2e/availability-management.spec.ts
// Test admin UI and customer-facing behavior
```

---

## 📊 Performance & Monitoring

### Caching Strategy (Using Upstash Redis)
```tsx
// src/lib/availability/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function getCachedAvailability(productId: string) {
  const cached = await redis.get(`availability:${productId}`);
  // Implementation
}
```

### Monitoring (Using Your Sentry Setup)
```tsx
// Add Sentry tracking for availability rule execution
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'availability',
  message: 'Rule evaluated',
  level: 'info',
  data: { productId, ruleId, state }
});
```

---

## 🎨 UI/UX Considerations

### Admin Interface Features
- Visual timeline using `framer-motion` for animations
- Date pickers using existing `react-day-picker`
- Bulk editor using your existing table components
- Real-time preview with `@tanstack/react-query`

### Customer-Facing Changes
- Enhanced product cards with availability badges
- Pre-order confirmation dialogs
- Coming soon countdown timers
- Stock availability indicators

---

## 📦 Deployment & Rollback

### Migration Strategy
1. Add new database tables via Prisma migration
2. Deploy feature behind feature flag
3. Run migration script for existing products
4. Gradual rollout using Vercel's feature flags
5. Monitor with existing Sentry integration

### Environment Variables
```env
# Add to your existing .env files
FEATURE_NATIVE_AVAILABILITY=true
AVAILABILITY_SCHEDULER_ENABLED=true
AVAILABILITY_PREVIEW_MODE=false
```

---

## 📝 Documentation Requirements

### Updates Needed
- Update existing product management docs
- Add availability rule examples
- Document migration process from Square
- API documentation for new endpoints
- Admin user guide with screenshots

This plan fully integrates with your existing Next.js 15, Prisma, Supabase, and component architecture while providing the comprehensive availability management system you need.