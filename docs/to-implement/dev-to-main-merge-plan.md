# Development to Main Merge Plan

## 🔍 **Current Status Summary (Oct 2, 2025)**

**Database Gap Identified:**

- ✅ Production: 31 migrations (latest: `enable_rls_availability_tables`)
- ✅ Development: 57 migrations (latest: `populate_shipping_configurations`)
- 🔴 **Gap: 26 migrations need to be applied to production**

**Key Findings:**

- `shipping_configurations` table exists in BOTH prod and dev (empty in both)
- Latest migration is a safe data-only insert (3 shipping configs)
- Product type badges tables exist only in development
- Some Prisma CLI commands timeout (use Supabase MCP instead)

**Merge Complexity:** MEDIUM-HIGH (due to migration gap)

---

## Claude Code Prompt

````
I need to safely merge the development branch into main for production deployment. This is a critical operation that requires careful attention to database migrations and production safety.

## Project Context
- **Repository**: ReadySet1/destino-sf
- **Tech Stack**: Next.js 15, TypeScript, PostgreSQL, Prisma, Supabase
- **Package Manager**: pnpm
- **Current Branch**: develop (several commits ahead of main)
- **Target Branch**: main (production)

## Pre-Merge Checklist

### 1. Database Backup from Development and PRODUCTION (CRITICAL - DO THIS FIRST)
Create a manual backup of the production database before ANY changes:

```bash
# Create timestamped backup directory
mkdir -p backups/pre-merge-$(date +%Y%m%d-%H%M%S)

# Option A: Using the project's backup script
pnpm backup-db:sql

# Option B: Direct pg_dump (if you have direct DB access)
pg_dump $DATABASE_URL > backups/pre-merge-$(date +%Y%m%d-%H%M%S)/production-backup.sql

# Also backup the schema separately for quick reference
pnpm backup-db:schema
````

**Verification**: Confirm backup file exists and has reasonable size (> 100KB)

### 2. Environment Validation

Verify all environment variables are properly set:

```bash
# Check database connection
pnpm diagnose-db

# Validate database configuration
pnpm validate-db

# Verify Square API tokens (if applicable)
pnpm test-square-tokens
```

### 3. Dependency Check

Ensure all dependencies are in sync:

```bash
# Install/update dependencies
pnpm install

# Verify lockfile is committed
git status pnpm-lock.yaml
```

### 4. Local Testing Suite

Run comprehensive tests before merge:

```bash
# Type checking
pnpm type-check

# Critical path tests
pnpm test:critical

# Unit tests
pnpm test:unit

# Component tests
pnpm test:components

# Integration tests (if available)
pnpm test:integration
```

### 5. Migration Analysis

Review and understand all pending migrations:

```bash
# List all migrations
ls -la prisma/migrations/

# Check for migrations that haven't been applied to production
# Compare with main branch migrations
git diff main..develop -- prisma/migrations/

# Review migration files for:
# - Data modifications
# - Schema changes
# - Potential breaking changes
# - Rollback complexity
```

**CURRENT DATABASE DIFFERENCES (as of Oct 2, 2025):**

#### ✅ Already in Production (Sept 30, 2025):

- `availability_rules` table (19 columns, 4 indexes, RLS policies)
- `availability_schedule` table (7 columns, 2 indexes, RLS policies)

#### 🔴 CRITICAL: 26 Migrations Missing in Production

**Development is significantly ahead of production. Here are the key missing migrations:**

**Latest Missing Migrations (Most Critical):**

1. **`20251002061347_populate_shipping_configurations`** (Oct 2, 2025)
   - **Type:** Data migration
   - **Risk:** LOW
   - **Action:** Inserts 3 shipping weight configurations
   - **Rollback:** `DELETE FROM shipping_configurations;`

2. **`20251002050424_add_badge3_and_icon_fields`** (Oct 2, 2025)
   - **Type:** Schema change
   - **Risk:** MEDIUM
   - **Action:** Adds badge and icon fields to product types

3. **`20251002042810_add_badge_colors_to_product_type_badges`** (Oct 2, 2025)
   - **Type:** Schema change
   - **Risk:** MEDIUM
   - **Action:** Adds color fields to badge configuration

4. **`20251002040944_add_product_type_and_badges_table`** (Oct 2, 2025)
   - **Type:** Schema change
   - **Risk:** HIGH
   - **Action:** Creates new product_type_badges table

**Earlier Missing Migrations:** 23 additional migrations from Sept 12 - Sept 30

- Various performance, RLS, and schema fixes
- See development migration list for complete details

**⚠️ IMPORTANT:** All 26 migrations must be applied to production in order!

#### ⚠️ Known Schema Inconsistencies:

1. **Products Table:**
   - `description_validated_at`: Production uses `timestamp with time zone`, Dev uses `timestamp without time zone`
   - **Action Required:** Verify this doesn't cause issues

2. **Store Settings:**
   - Production MAY have `usage_flags` (jsonb) column
   - **Action Required:** Verify if this column exists and is needed

**Migration Summary Document:**
| Migration | Date | Type | Risk | Rollback Strategy |
|-----------|------|------|------|-------------------|
| populate_shipping_configurations | 2025-10-02 | Data | LOW | `DELETE FROM shipping_configurations;` |

### 6. Build Verification

Ensure the application builds successfully:

```bash
# Full type-check and build
pnpm typecheck-build

# If successful, clean build artifacts
rm -rf .next
```

## Merge Execution Plan

### Phase 1: Branch Synchronization

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Fetch latest main
git fetch origin main

# Check for conflicts before merging
git merge --no-commit --no-ff origin/main

# If conflicts exist:
# 1. Resolve carefully, prioritizing production stability
# 2. Test after each conflict resolution
# 3. Document significant conflict resolutions

# If no conflicts or after resolution:
git merge --abort  # We'll do the actual merge later
```

### Phase 2: Pre-Production Testing

```bash
# Create a temporary merge branch for testing
git checkout -b temp/merge-test
git merge origin/main

# Run full test suite on merged code
pnpm test:ci

# Run E2E critical tests
pnpm test:e2e:critical

# If tests fail:
# - Fix issues on develop branch
# - Delete temp branch: git branch -D temp/merge-test
# - Start over from Phase 1

# Delete temp branch after verification
git checkout develop
git branch -D temp/merge-test
```

### Phase 3: Database Migration Dry Run

**SPECIFIC MIGRATIONS TO REVIEW:**

```bash
# Generate Prisma client with latest schema
pnpm prisma generate

# View migration status (DON'T APPLY YET)
pnpm prisma migrate status

# Review the specific pending migration
cat prisma/migrations/20251002000000_populate_shipping_configurations/migration.sql

# Expected migration content:
# - DELETE FROM shipping_configurations (clears existing)
# - INSERT 3 default configurations:
#   1. alfajores (0.5 lb base, 0.4 lb/unit)
#   2. empanadas (1.0 lb base, 0.8 lb/unit)
#   3. default (0.5 lb base, 0.5 lb/unit)
# - Verification logic to ensure 3 configs inserted

# Verify production has shipping_configurations table
# If NOT, this migration will FAIL - need to create table first
```

**✅ VERIFIED DATABASE STATUS (via Supabase MCP - Oct 2, 2025):**

**Development Database (drrejylrcjbeldnzodjd):**

- Total Migrations: 57
- Latest: `20251002061347_populate_shipping_configurations`
- shipping_configurations table: ✅ EXISTS (0 rows - needs population)

**Production Database (ocusztulyiegeawqptrs):**

- Total Migrations: 31
- Latest: `20250930093511_enable_rls_availability_tables`
- shipping_configurations table: ✅ EXISTS (0 rows)
- **Gap: 26 migrations behind development**

**Migration Analysis:**

- The table ALREADY EXISTS in production (created in earlier migration)
- The `populate_shipping_configurations` migration will safely insert 3 default rows
- Safe to apply - it's a data-only migration with built-in verification

**Why `pnpm prisma migrate status` hangs:**
Use Supabase MCP instead for faster status checks:

```bash
# Alternative: Use Supabase CLI or MCP tools for migration status
# The Prisma CLI can timeout with pooler connections
```

### Phase 4: The Actual Merge

```bash
# Switch to main branch
git checkout main
git pull origin main

# Merge develop into main
git merge develop --no-ff -m "Merge develop into main for production deployment

Includes:
- [List major features/fixes]
- Database migrations: [List migration names]
- Dependencies updated: [Note major dep changes]

Pre-merge checklist completed:
✅ Database backup created
✅ All tests passing
✅ Build successful
✅ Migration plan reviewed
"

# If merge is successful, DON'T PUSH YET
```

### Phase 5: Production Database Migration

⚠️ **POINT OF NO RETURN - After this, rollback requires using backup** ⚠️

```bash
# Apply migrations to production database
pnpm prisma migrate deploy

# Verify migration success
pnpm prisma migrate status

# Test critical database queries
pnpm diagnose-db

# If migration fails:
# 1. DO NOT PUSH TO MAIN
# 2. Restore from backup:
#    pnpm restore-db
# 3. Review migration errors
# 4. Fix on develop branch and restart
```

### Phase 6: Deploy to Production

```bash
# Push to main (triggers Vercel deployment)
git push origin main

# Monitor deployment in Vercel dashboard
# Watch for build errors or deployment failures

# If deployment fails:
# 1. Quickly revert the merge commit:
#    git revert HEAD
#    git push origin main
# 2. Restore database from backup if needed
# 3. Debug issues on develop
```

### Phase 7: Post-Deployment Verification

```bash
# Run smoke tests against production
pnpm test:e2e:smoke-production

# Monitor application logs for errors
# Check Sentry for new errors

# Verify critical user paths:
# - Authentication
# - Checkout flow
# - Admin functions
# - API endpoints

# Monitor for 10-15 minutes after deployment
```

## Troubleshooting

### Prisma Commands Timing Out

If `pnpm prisma migrate status` or other Prisma commands hang:

**Root Cause:** Pooler connection timeouts with long-running introspection queries.

**Solution 1: Use Supabase MCP (Fastest)**
The Supabase MCP tools are already configured and faster:

- Lists migrations without timeout issues
- Direct database queries work reliably
- Used in this plan for verification

**Solution 2: Use Direct Connection**

```bash
# Temporarily use DIRECT_DATABASE_URL for Prisma commands
export DIRECT_URL=$DIRECT_DATABASE_URL
pnpm prisma migrate status --schema prisma/schema.prisma
```

**Solution 3: Increase Timeout**

```bash
# Set longer timeout for Prisma (not recommended)
export PRISMA_CLIENT_TIMEOUT=60000
pnpm prisma migrate status
```

**Solution 4: Check via SQL**

```sql
-- Query migration status directly
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;
```

## Rollback Procedure

If issues are discovered after deployment:

### Immediate Rollback (< 30 minutes after deploy)

```bash
# 1. Revert the merge commit on main
git checkout main
git revert HEAD
git push origin main

# 2. This triggers a new deployment with previous code

# 3. Assess database state
# - If new migrations ran, may need to restore backup
# - Check if rollback scripts exist in prisma/rollback_scripts/
```

### Database Rollback

```bash
# If database changes need to be reverted:

# 1. Stop application (set maintenance mode in Vercel if possible)

# 2. Restore from backup
pnpm restore-db

# OR manually:
psql $DATABASE_URL < backups/pre-merge-[timestamp]/production-backup.sql

# 3. Verify data integrity
pnpm diagnose-db

# 4. Resume application
```

## Post-Merge Cleanup

After successful deployment and verification:

```bash
# Update develop branch with any hotfixes made to main
git checkout develop
git merge main
git push origin develop

# Tag the release
git checkout main
git tag -a v1.x.x -m "Production release [date]"
git push origin v1.x.x

# Clean up local branches
git branch -d temp/merge-test  # if still exists

# Document the deployment in team channels
# Update any deployment logs or wikis
```

## Monitoring Checklist (First 24 Hours)

- [ ] Error rates in Sentry
- [ ] Database performance metrics
- [ ] API response times
- [ ] User-reported issues
- [ ] Payment processing (if applicable)
- [ ] Email delivery
- [ ] Background jobs

## Emergency Contacts

Before starting, ensure you have:

- [ ] Access to Vercel dashboard
- [ ] Database admin credentials
- [ ] Team contact for backup support
- [ ] Sentry access for error monitoring
- [ ] Rollback authority and process understood

## Notes & Observations

[Space for Claude Code to document findings during execution]

---

**Remember**: When in doubt, DO NOT proceed. It's better to delay deployment than to corrupt production data or cause extended downtime.

Good luck! 🚀

```

## Timeline Estimate

- **Pre-merge checks**: 30-45 minutes
- **Merge execution**: 15-20 minutes
- **Database migration**: 5-10 minutes
- **Deployment**: 10-15 minutes
- **Verification**: 15-30 minutes
- **Total**: ~2 hours (allow 3 hours with buffer)

## Success Criteria

✅ All tests passing on merged code
✅ Database backup created and verified
✅ Migrations applied successfully
✅ Application deployed without errors
✅ Critical user paths functioning
✅ No increase in error rates
✅ Database performance stable
```
