# Deployment Checklist - PR #23

**Pull Request**: https://github.com/ReadySet1/destino-sf/pull/23
**Target**: `main` (production)
**Source**: `development`
**Date**: 2025-09-30

## 📋 Pre-Merge Verification

### Code Quality
- ✅ TypeScript compilation passes (`pnpm type-check`)
- ✅ Production build succeeds (203 pages)
- ✅ ESLint passes (0 errors, 0 warnings)
- ✅ Critical tests pass (`pnpm test:critical`)

### Database State
- ✅ RLS enabled on all tables (migration `20250930110710`)
- ✅ Foreign key indexes added (migration `20250930110720`)
- ✅ Production database migrations up to date

### Code Changes Summary
- Catering dessert filtering (Lunch tab - Alfajores only)
- Webhook signature verification fix
- Production logging cleanup
- TypeScript and linting fixes

## 🚀 Deployment Steps

### Step 1: Merge Pull Request
```bash
# Review and approve PR #23 on GitHub
# Merge using "Squash and merge" or "Create a merge commit"
```

### Step 2: Apply Manual Database Migrations

**Important**: These migrations apply product availability fixes and must be run AFTER merging to main.

#### Production Database Connection
```bash
# Get production database URL from environment
export DATABASE_URL="postgresql://postgres.drrejylrcjbeldnzodjd:5qpIoVheBSgkq5f9@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Connect to production database
psql $DATABASE_URL
```

#### Migration 1: Fix Lucuma Availability
```bash
# In psql
\i prisma/migrations-manual/fix_lucuma_availability.sql

# Expected output:
# UPDATE 1
# INSERT 0 1
# COMMIT
```

#### Migration 2: Process Past Availability Schedules
```bash
# In psql
\i prisma/migrations-manual/process_past_availability_schedules.sql

# Expected output:
# UPDATE 1 (Pride product)
# UPDATE 1 (Valentine's product)
# UPDATE 2 (schedules marked processed)
# INSERT 0 1 (sync log)
# COMMIT
```

#### Verify Migrations
```sql
-- Check Lucuma product state
SELECT name, visibility, is_available, active, item_state, is_preorder
FROM products
WHERE name = 'Alfajores de Lucuma (10 per packet)';

-- Expected: visibility=PUBLIC, is_available=true, item_state=ACTIVE, is_preorder=false

-- Check Pride product state
SELECT name, visibility, is_available, item_state
FROM products
WHERE name = 'Alfajores- Pride (6-pack)';

-- Expected: visibility=PUBLIC, is_available=false, item_state=ACTIVE

-- Check Valentine's product state
SELECT name, visibility, is_available, item_state
FROM products
WHERE name = 'Alfajores- Valentine''s (10 per packet)';

-- Expected: visibility=PUBLIC, is_available=false, item_state=ACTIVE

-- Check sync logs
SELECT sync_type, status, items_synced, metadata->>'description' as description
FROM sync_logs
WHERE sync_type IN ('PRODUCT_AVAILABILITY_FIX', 'AVAILABILITY_MIGRATION')
ORDER BY started_at DESC
LIMIT 3;
```

### Step 3: Deploy Application

#### Option A: Vercel (Recommended)
```bash
# Vercel automatically deploys main branch
# Monitor deployment at: https://vercel.com/your-project/deployments
```

#### Option B: Manual Deployment
```bash
git checkout main
git pull origin main
pnpm install
pnpm build
# Deploy built application
```

### Step 4: Post-Deployment Verification

#### Immediate Checks (0-5 minutes)
- [ ] Application loads: https://destinosf.com
- [ ] Catering menu page loads: https://destinosf.com/catering
- [ ] Lunch tab displays correctly (only Alfajores desserts)
- [ ] Other tabs display all desserts (Appetizers, Buffet, Boxed Lunches)
- [ ] No console errors in browser developer tools
- [ ] Health check passes: https://destinosf.com/api/health

#### Functional Testing (5-30 minutes)
- [ ] Browse catering menu - all tabs work
- [ ] Add Alfajores to cart from Lunch tab
- [ ] Add other desserts from Buffet tab
- [ ] Complete a test order (use Square sandbox card)
- [ ] Check order confirmation email received
- [ ] Verify order appears in admin panel

#### Database Verification (30 minutes)
```sql
-- Check product availability states
SELECT
  name,
  visibility,
  is_available,
  item_state,
  (SELECT COUNT(*) FROM availability_rules ar WHERE ar."productId" = p.id) as rules_count
FROM products p
WHERE name IN (
  'Alfajores de Lucuma (10 per packet)',
  'Alfajores- Pride (6-pack)',
  'Alfajores- Valentine''s (10 per packet)'
);

-- Check recent orders
SELECT id, status, "paymentStatus", total, "createdAt"
FROM orders
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check webhook processing
SELECT event_type, status, processed_at
FROM webhook_queue
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

#### Monitoring (24 hours)
- [ ] Monitor Sentry for errors
- [ ] Check webhook logs for failures
- [ ] Monitor order creation success rate
- [ ] Review error logs for any anomalies
- [ ] Check Square dashboard for payment issues

## 🔍 Rollback Plan

If critical issues are discovered:

### Step 1: Revert Code
```bash
# On GitHub, revert the merge commit
# Or manually:
git checkout main
git revert HEAD
git push origin main
```

### Step 2: Revert Database Changes (if needed)
```sql
-- Revert Lucuma product (if needed)
BEGIN;
UPDATE products
SET
  visibility = 'PUBLIC',
  is_available = false,
  item_state = 'SEASONAL',
  is_preorder = true,
  "updatedAt" = NOW()
WHERE id = '1ad24693-b2cd-4e29-bf59-edbfd2773b7a'
  AND name = 'Alfajores de Lucuma (10 per packet)';
COMMIT;

-- Revert Pride/Valentine's if needed (mark schedules as unprocessed)
BEGIN;
UPDATE availability_schedule
SET processed = false, processed_at = NULL
WHERE id IN (
  SELECT s.id FROM availability_schedule s
  INNER JOIN availability_rules ar ON s."ruleId" = ar.id
  INNER JOIN products p ON ar."productId" = p.id
  WHERE p.name IN ('Alfajores- Pride (6-pack)', 'Alfajores- Valentine''s (10 per packet)')
    AND s.processed = true
    AND s.scheduled_at <= NOW()
);
COMMIT;
```

### Step 3: Notify Stakeholders
- Post in #deployments Slack channel
- Email affected team members
- Update status page if customer-facing

## 📊 Success Metrics

**Deployment is successful when**:
- ✅ All health checks pass
- ✅ Catering menu displays correctly
- ✅ Orders can be created successfully
- ✅ Webhooks process without errors
- ✅ No increase in error rate (< 0.1%)
- ✅ Response times remain normal (< 500ms p95)

## 📞 Emergency Contacts

**On-Call Engineer**: [Your contact info]
**Database Admin**: [Contact info]
**DevOps**: [Contact info]

## 📝 Notes

- Manual migrations are **idempotent** - safe to run multiple times
- RLS policies are already enabled (no performance impact expected)
- Webhook fix improves reliability (fixes 12 failing tests)
- Catering menu change is feature enhancement (low risk)

---

**Prepared by**: Claude Code
**Date**: 2025-09-30
**Last Updated**: 2025-09-30
