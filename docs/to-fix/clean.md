# 🧹 Destino SF Project Cleanup Plan

## TypeScript/Next.js/PostgreSQL Full Stack Cleanup

### Template Usage Instructions

This plan follows your Master Fix Planning Template structure to remove deprecated features (New Appetizers, Catering Sync, Catering) and all Sanity CMS references from the project.

------

## 🎯 Feature/Fix Overview

**Name**: Remove Deprecated Features & Sanity CMS

**Type**: Refactor

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

The project contains deprecated menu items (New Appetizers, Catering Sync, Catering) in the admin sidebar and legacy Sanity CMS code that is no longer in use. These features create confusion and increase maintenance burden.

### Success Criteria

- [x] Admin sidebar no longer shows "New Appetizers", "Catering Sync", or "Catering" menu items
- [x] All Sanity CMS dependencies removed from package.json
- [x] All Sanity-related files and directories deleted
- [x] All Catering-related code, components, and database tables removed
- [x] Application builds and runs without errors
- [x] All tests pass after cleanup

------

## 📋 Planning Phase

### 1. Code Structure & References

### Files to Modify

```tsx
// Admin Sidebar - Remove menu items
src/app/(dashboard)/admin/components/AdminSidebar.tsx
  - Remove lines 74-88 (New Appetizers, Catering Sync, Catering menu items)

// Package.json - Remove Sanity dependencies
package.json
  - Remove all @sanity/* dependencies
  - Remove sanity and next-sanity packages
```

### Files/Directories to Delete

```bash
# Sanity-related files (root level)
/sanity.cli.ts
/sanity.config.ts

# Sanity directories
/src/sanity/                          # All Sanity schemas and config
/src/app/api/sanity/                  # Sanity API routes
/src/types/sanity.d.ts               # Sanity type definitions
/src/components/admin/SanityImageInput.tsx  # Sanity image component

# Catering-related directories
/src/app/(dashboard)/admin/catering/  # Admin catering pages
/src/app/admin/catering-sync/         # Catering sync page
/src/app/admin/new-appetizers-sync/   # New appetizers sync page
/src/app/api/admin/catering/          # Admin catering API
/src/app/api/catering/                # Public catering API
/src/app/catering/                    # Public catering pages
/src/app/contact-catering/            # Catering contact page
/src/app/debug-catering/              # Debug catering page
/src/components/Catering/             # All catering components
/src/lib/catering/                    # Catering utilities
/src/store/catering-cart.ts          # Catering cart store
/src/types/catering.ts               # Catering types
/src/types/catering-sync.ts          # Catering sync types
/src/utils/catering-optimized.ts     # Catering optimizations
/src/__tests__/catering/              # Catering tests
/src/__tests__/components/Catering/   # Catering component tests

# Individual catering-related files
/src/actions/catering.ts
/src/actions/catering-overrides.ts
/src/components/CateringBanner.tsx
/src/components/ContactForm/ContactCateringForm.tsx
/src/components/ContactForm/ContactInfoCatering.tsx
/src/components/FAQ/CateringFaqSection.tsx
/src/components/Marketing/CateringSection.tsx
/src/components/ui/catering-package-skeleton.tsx
/src/lib/catering-duplicate-detector.ts
/src/lib/square/catering-price-sync.ts
```

### Database Migration

```sql
-- Create a migration to drop catering-related tables
-- migrations/[timestamp]_remove_catering_features.sql

-- Drop catering-related tables if they exist
DROP TABLE IF EXISTS catering_items CASCADE;
DROP TABLE IF EXISTS catering_packages CASCADE;
DROP TABLE IF EXISTS catering_orders CASCADE;
DROP TABLE IF EXISTS catering_sync_logs CASCADE;
DROP TABLE IF EXISTS new_appetizers CASCADE;

-- Remove catering-related columns from existing tables if any
-- (Check schema.prisma for any catering-related fields in shared tables)
```

### 2. Core Functionality Checklist

### Required Changes (Do Not Skip)

- [ ] Remove menu items from AdminSidebar.tsx
- [ ] Delete all Sanity configuration files
- [ ] Remove all Sanity dependencies from package.json
- [ ] Delete all catering-related pages and components
- [ ] Remove catering-related API routes
- [ ] Clean up database schema
- [ ] Update any imports that reference deleted files
- [ ] Remove catering-related scripts from package.json

### Implementation Assumptions

- No other features depend on the catering functionality
- Sanity is completely replaced by another CMS/solution
- Database backups exist before making schema changes

### 3. Dependencies to Remove

### NPM Packages to Uninstall

```bash
# Run these commands to remove Sanity packages
pnpm remove @sanity/client
pnpm remove @sanity/image-url
pnpm remove @sanity/vision
pnpm remove @sanity/dashboard
pnpm remove @sanity/desk-tool
pnpm remove @sanity/cli
pnpm remove @sanity/types
pnpm remove @sanity/ui
pnpm remove @sanity/icons
pnpm remove @sanity/preview-kit
pnpm remove @sanity/visual-editing
pnpm remove sanity
pnpm remove next-sanity
```

------

## 🧪 Testing Strategy

### Pre-Cleanup Testing

```bash
# Run all tests to establish baseline
pnpm test

# Run build to ensure it works before changes
pnpm build
```

### Post-Cleanup Testing

```bash
# Component Tests - Ensure no broken imports
pnpm test:components

# API Tests - Verify endpoints still work
pnpm test:api

# Build Test - Ensure project builds
pnpm build

# Type Check - Ensure no TypeScript errors
pnpm type-check

# E2E Tests - Verify critical paths work
pnpm test:e2e:critical
```

### Manual Testing Checklist

- [ ] Admin dashboard loads without errors
- [ ] Admin sidebar displays correctly without removed items
- [ ] No console errors in browser
- [ ] All remaining admin pages function correctly
- [ ] Public-facing pages load without errors

------

## 🔒 Security Analysis

### Access Control Updates

- [ ] Verify no orphaned permissions for catering features
- [ ] Check that role-based access still works for remaining features
- [ ] Ensure no exposed endpoints after deletion

### Database Security

- [ ] Backup database before making schema changes
- [ ] Verify foreign key constraints are properly handled
- [ ] Check for any orphaned data after deletion

------

## 📊 Performance Improvements

### Expected Benefits

- Reduced bundle size (removing Sanity and catering code)
- Faster build times
- Simplified codebase maintenance
- Reduced database complexity

### Metrics to Monitor

- [ ] Bundle size reduction (measure before/after)
- [ ] Build time improvement
- [ ] Test execution time
- [ ] Application startup time

------

## 🚦 Implementation Checklist

### Phase 1: Preparation (Day 1)

- [ ] Create feature branch: `feature/cleanup-deprecated-features`
- [ ] Backup database
- [ ] Document current bundle size and build time
- [ ] Run full test suite and save results

### Phase 2: Remove Catering Features (Day 2)

- [ ] Remove catering menu items from AdminSidebar.tsx
- [ ] Delete all catering-related directories and files
- [ ] Remove catering-related scripts from package.json
- [ ] Update any imports that break
- [ ] Create database migration to drop catering tables
- [ ] Run migration on development database

### Phase 3: Remove Sanity CMS (Day 3)

- [ ] Delete Sanity configuration files
- [ ] Remove Sanity directories
- [ ] Uninstall Sanity npm packages
- [ ] Remove any Sanity-related environment variables
- [ ] Update .env.example to remove Sanity variables

### Phase 4: Testing & Validation (Day 4)

- [ ] Fix any TypeScript errors
- [ ] Update/remove broken tests
- [ ] Run full test suite
- [ ] Test build process
- [ ] Manual testing of admin interface
- [ ] Performance comparison

### Phase 5: Deployment Preparation (Day 5)

- [ ] Update documentation
- [ ] Create PR with detailed description
- [ ] Code review
- [ ] Test on staging environment
- [ ] Prepare production deployment plan

------

## 📝 Implementation Commands

### Step-by-Step Cleanup Commands

```bash
# 1. Create cleanup branch
git checkout -b feature/cleanup-deprecated-features

# 2. Remove catering menu items from sidebar
# Edit: src/app/(dashboard)/admin/components/AdminSidebar.tsx
# Remove lines 74-88

# 3. Delete catering-related files
rm -rf src/app/(dashboard)/admin/catering
rm -rf src/app/admin/catering-sync
rm -rf src/app/admin/new-appetizers-sync
rm -rf src/app/api/admin/catering
rm -rf src/app/api/catering
rm -rf src/app/catering
rm -rf src/app/contact-catering
rm -rf src/app/debug-catering
rm -rf src/components/Catering
rm -rf src/lib/catering
rm -rf src/__tests__/catering
rm -rf src/__tests__/components/Catering
rm -f src/actions/catering.ts
rm -f src/actions/catering-overrides.ts
rm -f src/components/CateringBanner.tsx
rm -f src/components/ContactForm/ContactCateringForm.tsx
rm -f src/components/ContactForm/ContactInfoCatering.tsx
rm -f src/components/FAQ/CateringFaqSection.tsx
rm -f src/components/Marketing/CateringSection.tsx
rm -f src/components/ui/catering-package-skeleton.tsx
rm -f src/lib/catering-duplicate-detector.ts
rm -f src/lib/square/catering-price-sync.ts
rm -f src/store/catering-cart.ts
rm -f src/types/catering.ts
rm -f src/types/catering-sync.ts
rm -f src/utils/catering-optimized.ts

# 4. Delete Sanity files
rm -f sanity.cli.ts
rm -f sanity.config.ts
rm -rf src/sanity
rm -rf src/app/api/sanity
rm -f src/types/sanity.d.ts
rm -f src/components/admin/SanityImageInput.tsx

# 5. Remove Sanity packages
pnpm remove @sanity/client @sanity/image-url @sanity/vision @sanity/dashboard @sanity/desk-tool @sanity/cli @sanity/types @sanity/ui @sanity/icons @sanity/preview-kit @sanity/visual-editing @sanity/export @sanity/mutate @sanity/sdk sanity next-sanity

# 6. Clean package.json scripts
# Edit package.json and remove catering-related scripts:
# - test:catering*
# - sync-catering-images
# - monitor-catering
# - dedupe-catering*

# 7. Run tests and fix any issues
pnpm test
pnpm type-check
pnpm build

# 8. Create database migration
cat > prisma/migrations/$(date +%Y%m%d%H%M%S)_remove_catering_features/migration.sql << EOF
-- Drop catering-related tables
DROP TABLE IF EXISTS catering_items CASCADE;
DROP TABLE IF EXISTS catering_packages CASCADE;
DROP TABLE IF EXISTS catering_orders CASCADE;
DROP TABLE IF EXISTS catering_sync_logs CASCADE;
DROP TABLE IF EXISTS new_appetizers CASCADE;
EOF

# 9. Run migration
pnpm prisma migrate deploy

# 10. Test everything
pnpm test
pnpm build
pnpm dev # Manual testing
```

------

## 🔄 Rollback Plan

### If Issues Arise

```bash
# 1. Revert all changes
git checkout main
git branch -D feature/cleanup-deprecated-features

# 2. Restore database from backup
# Use your database backup to restore schema

# 3. Reinstall dependencies
pnpm install
```

### Monitoring After Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Check that all admin functions work
- [ ] Verify no broken links or pages
- [ ] Monitor application performance

------

## 🎨 Code Update for AdminSidebar.tsx

### Updated navigationItems array (remove lines 74-88):

```tsx
const navigationItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: <Home className="h-4 w-4" />,
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    icon: <ShoppingBag className="h-4 w-4" />,
  },
  {
    href: '/admin/products',
    label: 'Products',
    icon: <Archive className="h-4 w-4" />,
  },
  {
    href: '/admin/categories',
    label: 'Categories',
    icon: <Tag className="h-4 w-4" />,
  },
  {
    href: '/admin/square-sync',
    label: 'Product Sync',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  // REMOVED: New Appetizers, Catering Sync, Catering
  {
    href: '/admin/users',
    label: 'Users',
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
  },
  {
    href: '/admin/shipping',
    label: 'Shipping Config',
    icon: <Truck className="h-4 w-4" />,
  },
  {
    href: '/admin/spotlight-picks',
    label: 'Spotlight Picks',
    icon: <Star className="h-4 w-4" />,
  },
];
```

------

## 📚 Additional Considerations

### Files That May Need Updates

After deletion, check these files for broken imports:

1. **Layout files** - Check if any layouts import catering components
2. **Navigation components** - Remove any catering links
3. **Home page** - Remove any catering sections
4. **Environment variables** - Remove Sanity-related variables
5. **Middleware** - Check for catering-specific routing logic
6. **Store files** - Remove catering cart references from other stores

### Environment Variables to Remove

```env
# Remove from .env and .env.example
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=
```

------

## Risk Assessment

**Low Risk:**
- Removing unused menu items
- Deleting Sanity files (already not in use)

**Medium Risk:**
- Removing catering features (verify no dependencies)
- Database schema changes (requires backup)

**Mitigation:**
- Complete backup before starting
- Test thoroughly on development first
- Deploy to staging before production
- Have rollback plan ready

------

This cleanup will significantly reduce code complexity and improve maintainability. The removal of ~50+ files and multiple dependencies will make the codebase leaner and easier to manage.