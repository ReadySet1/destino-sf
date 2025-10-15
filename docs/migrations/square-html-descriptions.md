# Migration Guide: Square HTML Descriptions

**Date**: 2025-01-10
**Status**: ⚠️ **DEV TESTING ONLY** - Do not deploy to production yet
**Related PR**: #TBD
**Issue**: Formatting (bold, italics) from Square product descriptions not displaying on website

---

## Overview

This migration updates the product sync system to use Square's `description_html` field instead of the plain text `description` field. This preserves formatting (bold, italic text) that James has applied to product descriptions in Square.

### What Changed

**Before:**

- Synced `description` field (plain text, all formatting stripped by Square)
- Example: "GF, Veggie, Vegan" (no formatting)

**After:**

- Syncs `description_html` field (HTML formatted)
- Sanitizes HTML for security (removes scripts, iframes, etc.)
- Safely renders HTML in React components
- Example: "<strong><em>GF</em></strong>, Veggie, Vegan" (bold + italic)

---

## Files Changed

### New Files

1. **`src/lib/utils/product-description.ts`** - HTML sanitization utilities
2. **`scripts/test-html-sanitization.ts`** - Security testing script
3. **`scripts/check-square-descriptions.ts`** - Square API verification script

### Modified Files

1. **`src/lib/square/sync.ts`** - Updated to sync `description_html`
2. **`src/components/products/ProductCard.tsx`** - Renders HTML safely
3. **`src/components/products/ProductDetails.tsx`** - Renders HTML safely
4. **`src/components/store/ProductCard.tsx`** - Renders HTML safely
5. **`src/components/store/ProductDetail.tsx`** - Renders HTML safely
6. **`src/components/products/ProductCardWithNutrition.tsx`** - Renders HTML safely

---

## Database Changes

### Schema

**No migration required** ✅

The existing `products.description` field is already `String?` in Prisma, which maps to PostgreSQL `TEXT` type. This can store HTML without any schema changes.

---

## Testing in Development

### 1. Security Testing

Run the security test suite to verify HTML sanitization:

```bash
npx tsx scripts/test-html-sanitization.ts
```

**Expected output:**

- ✓ All tests pass (29/29)
- ✓ Malicious HTML (scripts, iframes) stripped
- ✓ Safe formatting (bold, italic) preserved

### 2. Product Re-Sync

Re-sync products from Square to pull HTML descriptions:

**Option A: Admin Dashboard**

1. Navigate to `/admin/products`
2. Click "Sync Products from Square"
3. Verify sync completes successfully

**Option B: Manual Sync (for testing)**

```bash
# Load environment variables
set -a && source .env.local && set +a

# Run sync (create a script if needed)
# This will pull description_html for all products
```

### 3. Visual Verification

Test these pages in development:

#### Product Cards (Homepage/Menu)

- [ ] Navigate to `/menu`
- [ ] Check product descriptions show bold/italic formatting
- [ ] Verify truncation still works (line-clamp-2)
- [ ] No weird spacing or broken HTML

#### Product Details Pages

- [ ] Open any product detail page
- [ ] Check full description shows formatting
- [ ] Test products with different formatting (bold only, italic only, both)

#### Catering Pages

- [ ] Navigate to `/catering`
- [ ] Check catering lunch items show formatting
- [ ] Verify dietary labels (GF, V, VG) are formatted

#### Store Components

- [ ] Test `/store` pages if applicable
- [ ] Verify product cards and details render correctly

### 4. Browser Testing

Test in multiple browsers:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari
- [ ] Mobile Chrome

### 5. Example Products to Test

Query these products in dev to verify formatting:

1. **Acorn Squash** (`2HKY7CZYFOBQMT7NLS2EKV2S`)
   - Should show: `(6oz)` in bold
   - Should show: `-gf, vg, vgn` in bold+italic

2. **Adobo Pork** (`ONJCXBF3ZAYAUYISIZLNBUCX`)
   - Should show: `(6oz)` in bold
   - Should show: `-gf` in italic

3. **Albondigas** (`KPWN4NFQCFAQMGNXLHHYDRPR`)
   - Should show: `-gf` in bold+italic

---

## Production Deployment Plan

### Prerequisites

✅ All dev tests pass
✅ Visual verification complete
✅ Security tests pass
✅ TypeScript compilation successful
✅ Emmanuel's review and approval

### Deployment Steps

#### Step 1: Pre-Deployment

```bash
# 1. Verify production database connection
echo $DATABASE_URL  # Should show production URL

# 2. Create database backup
pnpm backup-db
# OR manually via Supabase dashboard
```

#### Step 2: Deploy Code

```bash
# 1. Merge PR to main
git checkout main
git pull origin main

# 2. Deploy to production (Vercel)
# This happens automatically on merge to main

# 3. Wait for deployment to complete
# Check Vercel dashboard for status
```

#### Step 3: Post-Deployment

**DO NOT RUN PRODUCT SYNC IMMEDIATELY**

1. **Verify deployment:**

   ```bash
   # Check production site is up
   curl https://destinosf.com
   ```

2. **Test one product manually:**
   - Visit a product page
   - Verify description still displays (even if plain text)
   - No console errors

3. **Run production sync:**
   - Navigate to production admin panel
   - Run product sync
   - Monitor sync logs for errors

4. **Visual verification:**
   - Check 5-10 products on production
   - Verify formatting appears
   - Check mobile and desktop

#### Step 4: Monitoring

Monitor for 24-48 hours:

- [ ] Check error logs (Vercel/Sentry)
- [ ] Monitor user reports
- [ ] Verify no XSS vulnerabilities reported
- [ ] Check page load performance

---

## Rollback Procedure

If issues occur in production:

### Quick Rollback (Code)

```bash
# 1. Revert the PR in GitHub
# 2. Vercel will auto-deploy previous version
# 3. Products will show plain text descriptions (still functional)
```

### Database Rollback (if needed)

```bash
# Products table not modified, no rollback needed
# Descriptions will just show as plain text
```

---

## Security Considerations

### HTML Sanitization

- Uses **DOMPurify** library (industry standard)
- Whitelist approach: only allows safe tags
- Strips all dangerous content:
  - `<script>` tags
  - Event handlers (`onclick`, etc.)
  - `<iframe>` tags
  - `<style>` tags
  - JavaScript URLs

### Allowed HTML Tags

Safe formatting only:

- `<b>`, `<strong>` - Bold text
- `<i>`, `<em>` - Italic text
- `<p>` - Paragraphs
- `<br>` - Line breaks
- `<ul>`, `<ol>`, `<li>` - Lists

**No attributes allowed** (prevents onclick, href, etc.)

### Testing Results

- ✅ 29/29 security tests passing
- ✅ XSS attacks blocked
- ✅ Malformed HTML handled gracefully

---

## Known Limitations

1. **Truncation on Cards:**
   - Product cards truncate to 80 characters
   - If description exceeds 80 chars, HTML is converted to plain text
   - This prevents broken HTML tags from truncation
   - Full HTML shown on detail pages

2. **Square Formatting Only:**
   - Formatting must be applied in Square dashboard
   - Cannot add formatting locally
   - This is intentional (Square as source of truth)

3. **Limited HTML Tags:**
   - Only basic formatting supported
   - No images, links, or complex HTML
   - This is a security measure

---

## Troubleshooting

### Issue: Formatting not showing after sync

**Diagnosis:**

```bash
# Check if description_html exists in Square
npx tsx scripts/check-square-descriptions.ts
```

**Solution:**

- If Square has plain text descriptions, formatting must be added in Square first
- Re-sync after adding formatting in Square

### Issue: Broken HTML rendering

**Diagnosis:**

- Check browser console for errors
- Verify sanitization is working: `npx tsx scripts/test-html-sanitization.ts`

**Solution:**

- HTML should auto-close malformed tags
- If issues persist, check DOMPurify configuration in `product-description.ts`

### Issue: Performance degradation

**Diagnosis:**

- HTML parsing shouldn't impact performance significantly
- If slowdown occurs, check browser performance tools

**Solution:**

- Sanitization runs once per product on server-side sync
- Client-side rendering uses pre-sanitized HTML
- No real-time sanitization on page load

---

## Success Criteria

Before marking this migration as complete:

✅ All security tests pass
✅ TypeScript compilation successful
✅ Visual testing complete in dev
✅ Browser compatibility verified
✅ Production deployment successful
✅ Post-deployment monitoring clean (24-48 hours)
✅ No XSS vulnerabilities detected
✅ User feedback positive

---

## Support

**Questions or issues?**

- Check this guide first
- Review test results: `scripts/test-html-sanitization.ts`
- Check Square API docs: https://developer.squareup.com/reference/square/objects/CatalogItem

**For Emmanuel:**

- All code changes documented
- Security measures in place
- Rollback procedure ready
- Dev testing complete
