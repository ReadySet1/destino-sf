# 🧹 Destino SF - Safe Cleanup Plan (Updated)

## ⚠️ IMPORTANT: What NOT to Remove

### Keep These Working Features:

1. **`/src/app/catering/` directory** - Public catering page (WORKING)
2. **`/src/actions/catering.ts`** - Server actions for catering (WORKING)
3. **`/src/components/Catering/`** - UI components for catering (WORKING)
4. **`/src/types/catering.ts`** - Type definitions (NEEDED)
5. **`/src/app/api/catering/`** - API routes for public catering (WORKING)
6. **Database tables**: `catering_packages`, `catering_orders`, etc. (IN USE)
7. **Unified sync** (`/api/square/unified-sync`) - Your main sync mechanism

## 📋 Safe Removal Checklist

### Phase 1: Update Admin Sidebar

```tsx
// File: /src/app/(dashboard)/admin/components/AdminSidebar.tsx
// Remove these items from navigationItems array (lines 74-88):

// DELETE THESE LINES:
{
  href: '/admin/new-appetizers-sync',
  label: 'New Appetizers',
  icon: <Plus className="h-4 w-4" />,
},
{
  href: '/admin/catering-sync',
  label: 'Catering Sync',
  icon: <ImageIcon className="h-4 w-4" />,
},
{
  href: '/admin/catering',
  label: 'Catering',
  icon: <UtensilsCrossed className="h-4 w-4" />,
},
```

### Phase 2: Remove Deprecated Admin Pages

```bash
# These are old admin interfaces no longer needed
rm -rf /src/app/(dashboard)/admin/catering/
rm -rf /src/app/admin/catering-sync/
rm -rf /src/app/admin/new-appetizers-sync/
rm -rf /src/app/api/admin/catering/  # Old admin API
```

### Phase 3: Remove Sanity CMS

```bash
# Remove Sanity files
rm -f sanity.cli.ts
rm -f sanity.config.ts
rm -rf /src/sanity/
rm -rf /src/app/api/sanity/
rm -rf /src/app/studio/  # Sanity Studio route

# Remove Sanity packages
pnpm remove @sanity/client @sanity/image-url @sanity/vision
pnpm remove @sanity/dashboard @sanity/desk-tool @sanity/cli
pnpm remove @sanity/types @sanity/ui @sanity/icons
pnpm remove @sanity/preview-kit @sanity/visual-editing
pnpm remove sanity next-sanity
```

### Phase 4: Clean package.json Scripts

```json
// Remove these scripts from package.json:
"sync-catering-images": "tsx src/scripts/sync-catering-images.ts",
"monitor-catering": "tsx src/scripts/monitor-catering-images.ts",
"dedupe-catering": "tsx src/scripts/deduplicate-catering-items.ts",
"dedupe-catering-execute": "tsx src/scripts/deduplicate-catering-items.ts --execute",
"test:catering": "./scripts/test-catering.sh enhanced",
"test:catering:ui": "./scripts/test-catering.sh ui",
"test:catering:all": "./scripts/test-catering.sh both",
"test:catering:auth": "./scripts/test-catering.sh auth",
```

### Phase 5: Remove Unused Scripts

```bash
# Remove deprecated catering scripts
rm -f /src/scripts/sync-catering-images.ts
rm -f /src/scripts/monitor-catering-images.ts
rm -f /src/scripts/deduplicate-catering-items.ts
rm -f /scripts/test-catering.sh
```

### Phase 6: Remove Unused Test Files

```bash
# Remove old catering tests (if they exist)
rm -rf /src/__tests__/catering/
rm -rf /src/__tests__/components/Catering/
```

## 🔍 Files to Check for Broken Imports

After removal, check these files for any broken imports:

1. `/src/app/layout.tsx` - Check for Sanity imports
2. `/src/env.ts` or `.env` files - Remove Sanity environment variables
3. Any file importing from `/sanity/` or `@sanity/*`

## 🛡️ Safety Verification Steps

### Before Starting:

```bash
# 1. Create a backup branch
git checkout -b cleanup/remove-deprecated-features

# 2. Run tests to establish baseline
pnpm test
pnpm build
```

### After Each Phase:

```bash
# Verify TypeScript compilation
pnpm type-check

# Verify build still works
pnpm build

# Test the application
pnpm dev
# Then manually test:
# - Admin dashboard loads
# - Public /catering page works
# - Product sync still works
```

## 📝 Environment Variables to Remove

Remove from `.env` and `.env.example`:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=
SANITY_WEBHOOK_SECRET=
```

## 🎯 Expected Results

### What Will Be Removed:

- 3 deprecated admin menu items
- ~20 Sanity-related files
- 15+ npm packages
- 8 deprecated scripts
- Old admin catering interface

### What Will Remain Working:

- ✅ Public `/catering` page
- ✅ Catering checkout flow
- ✅ Square unified sync for catering items
- ✅ All catering components and forms
- ✅ Catering database tables and data

## 🚀 Final Cleanup Commands

```bash
# After all phases are complete:

# 1. Clean node_modules and reinstall
rm -rf node_modules
pnpm install

# 2. Clear Next.js cache
rm -rf .next

# 3. Rebuild
pnpm build

# 4. Run final tests
pnpm test
pnpm dev  # Manual testing

# 5. Commit changes
git add -A
git commit -m "chore: remove deprecated features (Sanity CMS, old catering admin)"
```

## ⚠️ Rollback Plan

If anything breaks:

```bash
# Discard all changes
git checkout main
git branch -D cleanup/remove-deprecated-features

# Reinstall dependencies
pnpm install
```

## 📊 Success Metrics

After cleanup, you should see:

- ✅ Reduced bundle size (check with `pnpm build`)
- ✅ Fewer dependencies in package.json
- ✅ Admin sidebar has only active menu items
- ✅ No TypeScript errors
- ✅ Public catering page still works
- ✅ Product sync from Square still works
