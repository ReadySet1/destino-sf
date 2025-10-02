# Product Archive Feature - Deployment Preparation Guide

## Overview

This guide covers the complete process for preparing the Product Archive feature (Phases 1 & 2) for deployment to the development branch, including testing, validation, and pre-merge checks.

---

## Pre-Deployment Checklist

### 1. Code Quality & Build Verification

#### TypeScript Compilation
```bash
# Verify TypeScript compiles without errors
npm run type-check
# or
npx tsc --noEmit

# Expected: No errors
```

#### Build Verification
```bash
# Production build test
npm run build

# Expected: Build completes successfully with no errors
# Watch for:
# - ✓ Compiled successfully
# - ✓ Linting and checking validity of types
# - ✓ Creating an optimized production build
```

#### Linting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Expected: 0 errors, 0 warnings
```

#### Code Formatting
```bash
# Check formatting (if using Prettier)
npm run format:check

# Fix formatting
npm run format

# Expected: All files formatted correctly
```

---

### 2. Database Verification

#### Check Migration Status
```bash
# View migration status
npx prisma migrate status

# Expected: All migrations applied
```

#### Verify Schema
```bash
# Ensure Prisma schema is in sync
npx prisma generate

# Validate schema
npx prisma validate

# Expected: Schema is valid
```

#### Test Database Connection
```bash
# Run a test query (create a test script if needed)
npx prisma studio

# Verify:
# - products table has is_archived, archived_at, archived_reason columns
# - idx_products_archived_active index exists
```

---

### 3. Functional Testing

#### Manual Testing Checklist

**Archive Functionality:**
- [ ] Archive a product from main products page
  - Navigate to `/admin/products`
  - Click archive button on a product
  - Confirm action
  - Verify toast notification appears
  - Verify product is archived (appears dimmed/greyed)

- [ ] Restore an archived product
  - Navigate to `/admin/products/archived`
  - Click restore button
  - Verify toast notification
  - Verify product returns to active state

- [ ] Archive filter on main page
  - Click "All Products" - see all products
  - Click "Active Only" - see only active
  - Click "Archived Only" - see only archived
  - Verify URL updates with `?archived=` param

**Archive Statistics:**
- [ ] View archive stats dashboard
  - Navigate to `/admin/products/archived`
  - Verify total count is accurate
  - Verify breakdown by reason shows correct numbers
  - Verify breakdown by category is accurate

**Pagination:**
- [ ] Test pagination on archived page
  - Archive 20+ products (if needed for testing)
  - Navigate to `/admin/products/archived`
  - Verify pagination controls appear
  - Click next page, verify page changes
  - Verify page number in URL

**Archive via API:**
- [ ] Test archive API endpoint
```bash
# Archive product
curl -X POST http://localhost:3000/api/admin/products/PRODUCT_ID/archive \
  -H "Content-Type: application/json"

# Restore product
curl -X DELETE http://localhost:3000/api/admin/products/PRODUCT_ID/archive \
  -H "Content-Type: application/json"

# Get archive status
curl http://localhost:3000/api/admin/products/PRODUCT_ID/archive
```

**Square Sync Integration:**
- [ ] Verify Square sync respects is_archived
  - Archive a product in Square dashboard
  - Run sync: `npm run sync:square` (or trigger via cron)
  - Verify product is archived in database
  - Check `archived_reason` = 'square_archived'

**Error Handling:**
- [ ] Try to archive non-existent product
  - Should return 404 or appropriate error
- [ ] Try to archive already archived product
  - Should handle gracefully
- [ ] Test with invalid product ID
  - Should return error message

**Mobile Responsiveness:**
- [ ] Test on mobile viewport (DevTools)
  - Archive filter buttons stack properly
  - Product cards display in single column
  - Statistics dashboard is readable
  - Buttons are touch-friendly

---

### 4. Performance Testing

#### Page Load Times
```bash
# Use Lighthouse or similar
npm run lighthouse -- --url=http://localhost:3000/admin/products
npm run lighthouse -- --url=http://localhost:3000/admin/products/archived

# Expected:
# - Performance score > 90
# - No console errors
# - Reasonable load times (<2s)
```

#### Database Query Performance
```typescript
// Add this test script: scripts/test-archive-queries.ts

import { prisma } from '@/lib/db';

async function testQueries() {
  console.time('Get archived products');
  const archived = await prisma.product.findMany({
    where: { isArchived: true },
    take: 20
  });
  console.timeEnd('Get archived products');
  
  console.time('Get active products');
  const active = await prisma.product.findMany({
    where: { active: true, isArchived: false },
    take: 20
  });
  console.timeEnd('Get active products');
  
  console.time('Archive stats');
  const stats = await getArchivedProductsCount();
  console.timeEnd('Archive stats');
  
  console.log(`Archived: ${archived.length}, Active: ${active.length}`);
}

testQueries();

// Expected: All queries < 100ms
```

---

### 5. Security & Data Integrity

#### Authentication Checks
- [ ] Verify archive endpoints require authentication
- [ ] Test unauthorized access to `/api/admin/products/[id]/archive`
- [ ] Ensure only admin users can access archive pages

#### Data Validation
- [ ] Archive sets all required fields:
  - `isArchived = true`
  - `archivedAt` is timestamp
  - `archivedReason` is valid value
  - `active = false`

- [ ] Restore clears all archive fields:
  - `isArchived = false`
  - `archivedAt = null`
  - `archivedReason = null`
  - `active = true`

#### SQL Injection Prevention
- [ ] All Prisma queries use parameterized inputs
- [ ] No raw SQL with user input
- [ ] Search queries properly escaped

---

### 6. Documentation Review

#### Code Documentation
- [ ] All components have JSDoc comments
- [ ] Complex logic has inline comments
- [ ] TypeScript types are well-documented

#### Feature Documentation
- [ ] `PRODUCT_ARCHIVE_FEATURE.md` is up-to-date
- [ ] Phase 2 summary reflects actual implementation
- [ ] API endpoints documented with examples
- [ ] Usage examples are accurate

#### Developer Documentation
- [ ] Update CHANGELOG.md with new features
- [ ] Add migration instructions if needed
- [ ] Document any new environment variables

---

### 7. Environment Configuration

#### Environment Variables Check
```bash
# Verify required env vars exist
# .env.local (development)

DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SQUARE_ACCESS_TOKEN=...
# ... other vars
```

#### Configuration Files
- [ ] `next.config.js` - No changes needed (verify)
- [ ] `prisma/schema.prisma` - Archive fields present
- [ ] `tsconfig.json` - No changes needed (verify)

---

## Git Workflow & Branch Preparation

### 1. Create Feature Branch (if not already done)

```bash
# Ensure you're on main/master
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/product-archive-phase-1-2

# Or if branch exists
git checkout feature/product-archive-phase-1-2
git pull origin feature/product-archive-phase-1-2
```

### 2. Review Changes

```bash
# View all changed files
git status

# Review diff
git diff main

# Expected changes:
# - prisma/schema.prisma
# - prisma/migrations/*/migration.sql
# - src/lib/square/production-sync.ts
# - src/lib/square/archive-handler.ts
# - src/types/square-sync.ts
# - src/types/product-archive.ts
# - src/app/api/admin/products/[id]/archive/route.ts
# - src/app/(dashboard)/admin/products/page.tsx
# - src/app/(dashboard)/admin/products/archived/page.tsx
# - src/app/(dashboard)/admin/products/components/*
# - docs/PRODUCT_ARCHIVE_*.md
```

### 3. Stage Changes

```bash
# Stage all changes
git add .

# Or stage selectively
git add prisma/
git add src/lib/square/
git add src/types/
git add src/app/
git add docs/
```

### 4. Commit with Descriptive Message

```bash
git commit -m "feat: Add product archive feature (Phase 1 & 2)

Phase 1 - Backend & API:
- Add is_archived, archived_at, archived_reason fields to products table
- Create database migration with index
- Integrate archive status with Square sync
- Add archive/restore API endpoints
- Update archive handler functions
- Add TypeScript types

Phase 2 - Admin UI:
- Archive statistics dashboard component
- Archive filter on main products page
- Archive/restore toggle buttons with confirmation
- Dedicated archived products page with pagination
- Product cards with archive status badges
- Visual dimming for archived products
- Toast notifications for user feedback

Features:
- Archive products manually or via Square sync
- Restore archived products
- Filter products by archive status
- View archive statistics by reason and category
- Track archive metadata (timestamp, reason)

Breaking Changes: None
Migration Required: Yes (run prisma migrate deploy)

Closes #123 (if applicable)
"
```

### 5. Push to Remote

```bash
# Push feature branch
git push origin feature/product-archive-phase-1-2

# Or set upstream if first push
git push -u origin feature/product-archive-phase-1-2
```

---

## Pre-Merge Validation

### 1. Create Pull Request

**PR Title:**
```
feat: Product Archive Feature - Phase 1 & 2
```

**PR Description Template:**
```markdown
## Summary
Implements comprehensive product archive feature with backend API and admin UI.

## Changes
### Phase 1 - Backend & API
- ✅ Database schema with archive fields
- ✅ Square sync integration
- ✅ Archive/restore API endpoints
- ✅ Archive handler functions
- ✅ TypeScript types

### Phase 2 - Admin UI
- ✅ Archive statistics dashboard
- ✅ Archive filter component
- ✅ Archive/restore buttons
- ✅ Dedicated archived products page
- ✅ Product cards with archive status
- ✅ Toast notifications

## Testing
- [x] Manual testing completed
- [x] Archive/restore functionality verified
- [x] Square sync tested
- [x] Mobile responsive design verified
- [x] TypeScript compilation passes
- [x] Build successful

## Database Migration
⚠️ **Requires migration:** Yes
```bash
npx prisma migrate deploy
```

## Documentation
- [x] Feature documentation updated
- [x] API endpoints documented
- [x] Code comments added

## Screenshots
[Add screenshots of UI components]

## Checklist
- [x] Code follows style guidelines
- [x] Self-review performed
- [x] Comments added to complex code
- [x] Documentation updated
- [x] No new warnings generated
- [x] Tests pass locally
- [x] Migration tested

## Related Issues
Closes #123 (if applicable)
```

### 2. Automated Checks (CI/CD)

If you have CI/CD setup (GitHub Actions, etc.), ensure:

```yaml
# .github/workflows/test.yml (example)
name: Test Archive Feature

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
      
      - name: Test database migration
        run: |
          npx prisma generate
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### 3. Code Review Preparation

**Self-Review Checklist:**
- [ ] No debugging code (console.log, debugger)
- [ ] No commented-out code
- [ ] No TODO comments without context
- [ ] Consistent naming conventions
- [ ] Proper error handling
- [ ] No hardcoded values (use env vars)
- [ ] Removed unused imports
- [ ] Code is readable and maintainable

**Review Focus Areas:**
- Database migration safety
- API endpoint security
- TypeScript type safety
- Error handling completeness
- UI/UX consistency
- Performance implications
- Documentation accuracy

---

## Development Branch Deployment

### 1. Merge to Development Branch

```bash
# After PR approval
git checkout develop
git pull origin develop

# Merge feature branch
git merge feature/product-archive-phase-1-2

# Or use GitHub UI to merge PR
```

### 2. Run Database Migration on Dev Environment

```bash
# SSH into development server or use deployment script
ssh dev-server

# Navigate to project
cd /path/to/project

# Pull latest code
git pull origin develop

# Install dependencies (if needed)
npm ci

# Run migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status

# Restart application
pm2 restart app-name
# or
systemctl restart app-service
```

### 3. Verify Deployment

```bash
# Check application health
curl https://dev.yoursite.com/api/health

# Test archive endpoint
curl https://dev.yoursite.com/api/admin/products/TEST_ID/archive

# Monitor logs
tail -f /var/log/app.log
# or
pm2 logs app-name
```

### 4. Smoke Testing on Dev Environment

- [ ] Visit `https://dev.yoursite.com/admin/products`
- [ ] Verify archive filter appears
- [ ] Archive a test product
- [ ] Visit `https://dev.yoursite.com/admin/products/archived`
- [ ] Verify archived product appears
- [ ] Restore the product
- [ ] Check logs for errors

---

## Rollback Plan

In case of issues, have a rollback strategy:

### Database Rollback
```bash
# If migration causes issues
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Revert to previous version
git checkout develop
git revert HEAD
git push origin develop

# Re-deploy previous version
npm ci
npx prisma migrate deploy
pm2 restart app-name
```

### Feature Flag Alternative
Consider wrapping the feature in a feature flag:

```typescript
// lib/feature-flags.ts
export const ARCHIVE_FEATURE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ARCHIVE === 'true';

// In components
if (ARCHIVE_FEATURE_ENABLED) {
  return <ArchiveToggleButton />;
}
```

---

## Post-Deployment Monitoring

### 1. Monitor Application Logs

```bash
# Watch for errors
grep -i "error" /var/log/app.log | tail -50

# Watch for archive-related logs
grep -i "archive" /var/log/app.log | tail -50
```

### 2. Monitor Database Performance

```sql
-- Check query performance
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query ILIKE '%is_archived%'
ORDER BY mean_time DESC;

-- Verify index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'idx_products_archived_active';
```

### 3. User Feedback Collection

- Monitor support channels for questions
- Check for any UI confusion
- Gather feedback on archive workflow
- Note any feature requests

---

## Final Checklist Before Merge

**Code Quality:**
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Linting passes
- [ ] Code formatted consistently

**Testing:**
- [ ] All manual tests pass
- [ ] Archive/restore works correctly
- [ ] Square sync integration verified
- [ ] Mobile responsive
- [ ] No console errors

**Database:**
- [ ] Migration tested locally
- [ ] Migration reversible (if needed)
- [ ] Index created successfully
- [ ] Queries perform well

**Documentation:**
- [ ] Feature docs updated
- [ ] API endpoints documented
- [ ] Code comments added
- [ ] CHANGELOG.md updated

**Security:**
- [ ] Authentication required
- [ ] Input validation present
- [ ] No SQL injection vulnerabilities
- [ ] Sensitive data protected

**Git:**
- [ ] Descriptive commit message
- [ ] Branch pushed to remote
- [ ] PR created with description
- [ ] No merge conflicts

**Deployment:**
- [ ] Environment variables documented
- [ ] Migration commands ready
- [ ] Rollback plan prepared
- [ ] Monitoring plan established

---

## Success Metrics

After deployment, track these metrics:

**Usage Metrics:**
- Number of products archived per day
- Number of products restored per day
- Archive reasons breakdown
- Time to archive (performance)

**User Metrics:**
- Admin users utilizing archive feature
- Support tickets related to archive
- User feedback scores

**Technical Metrics:**
- API response times
- Database query performance
- Error rates
- Page load times

---

## Next Steps After Successful Deployment

1. **Monitor for 24-48 hours** in dev environment
2. **Collect user feedback** from team using dev site
3. **Address any issues** that arise
4. **Plan production deployment** once stable
5. **Consider Phase 3 features** based on usage patterns

---

## Contact & Support

**For Issues:**
- Check logs first
- Review error messages
- Search documentation
- Contact development team

**For Questions:**
- Refer to `PRODUCT_ARCHIVE_FEATURE.md`
- Check API documentation
- Review Phase 2 implementation summary

---

## Summary

This deployment includes:
- ✅ Database migration with 3 new fields + index
- ✅ 7 new/modified files for backend
- ✅ 6 new components for UI
- ✅ Complete documentation
- ✅ Testing completed
- ✅ Ready for development branch

**Estimated Time:** 30-45 minutes for full deployment and verification

**Risk Level:** Low (no breaking changes, additive feature)

**Rollback Time:** < 5 minutes if needed

---

**Ready to deploy!** Follow the steps above in order for a smooth deployment to the development branch.
