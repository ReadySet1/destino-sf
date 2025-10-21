# SEO Fix Implementation - DES-44

## Issue Summary
Fixed Google indexing issues where:
1. Development domain (`development.destinosf.com`) was being indexed
2. Catering products (Ropa Vieja, Tamarind Chicken, etc.) were appearing in general product searches

## Changes Implemented

### 1. Block Development Domain from Indexing

#### A. Dynamic robots.txt (`src/app/robots.ts`)
**What changed:**
- Updated `robots.ts` to detect development/staging environments
- Blocks ALL crawlers on non-production domains
- Uses `NEXT_PUBLIC_APP_URL` environment variable for production detection

**How it works:**
```typescript
const isDevelopment =
  process.env.NODE_ENV === 'development' ||
  baseUrl.includes('development.') ||
  baseUrl.includes('staging.') ||
  baseUrl.includes('localhost');

if (isDevelopment) {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',  // Block everything
    },
  };
}
```

**Result:**
- `development.destinosf.com/robots.txt` → Disallow: /
- `destinosf.com/robots.txt` → Normal indexing rules

#### B. Root Layout Meta Tags (`src/app/layout.tsx`)
**What changed:**
- Added environment detection
- Conditional `noindex` meta tags for development

**How it works:**
```typescript
robots: isDevelopment
  ? {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
      nocache: true,
    }
  : {
      index: true,
      follow: true,
      // ... production settings
    }
```

**Result:** Development pages have `<meta name="robots" content="noindex, nofollow">` in HTML head.

### 2. Product Categorization and Conditional Indexing

#### A. Product Helper Utilities (`src/lib/seo/product-helpers.ts`)
**New file created** with utilities to:
- Identify catering products by category (categories starting with "CATERING-")
- Determine if a product should be indexed
- Generate appropriate schema.org types
- Build correct category breadcrumbs

**Key functions:**
- `isCateringProduct()` - Checks if category starts with "CATERING-"
- `shouldIndexProduct()` - Returns false for catering products
- `getProductSchemaType()` - Returns "MenuItem" for catering, "Product" for regular
- `isRegularProductCategory()` - Identifies alfajores and empanadas

#### B. Updated SEO Library (`src/lib/seo.ts`)
**What changed:**
- Added `robots` parameter to `SEOConfig` interface
- Updated `generateSEO()` to accept custom robots configuration
- Fixed baseUrl to use `NEXT_PUBLIC_APP_URL`

**New robots parameter:**
```typescript
robots?: {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  nocache?: boolean;
}
```

#### C. Product Page Metadata (`src/app/(store)/products/[slug]/page.tsx`)
**What changed:**
- Import product helper functions
- Detect if product is catering
- Apply conditional indexing
- Use category-appropriate keywords

**Implementation:**
```typescript
const isCatering = isCateringProduct(dbProduct);
const shouldIndex = shouldIndexProduct(dbProduct);

// Different keywords for catering vs regular products
const keywords = isCatering
  ? ['catering', 'event catering', 'corporate catering', ...]
  : ['empanadas', 'alfajores', 'latin food', ...];

// Conditional indexing
robots: shouldIndex
  ? undefined  // Use default (index, follow)
  : {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    }
```

**Result:**
- Alfajores & Empanadas: `index: true` (appear in general search)
- Catering products: `index: false` (don't appear in general search)

### 3. Separate Sitemaps for Product Types

#### A. Main Sitemap (`src/app/sitemap.ts`)
**What changed:**
- Filter products to ONLY include regular categories (alfajores, empanadas)
- Exclude all catering products
- Updated baseUrl to use `NEXT_PUBLIC_APP_URL`

**Implementation:**
```typescript
const products = await prismaClient.product.findMany({
  where: {
    active: true,
    category: {
      slug: {
        in: ['alfajores', 'empanadas'],  // Only regular products
      },
    },
  },
});
```

**Result:**
- Main sitemap at `/sitemap.xml` only contains alfajores and empanadas
- Catering products completely excluded from general search

#### B. Catering Sitemap (`src/app/sitemap-catering.ts`)
**New file created** specifically for catering content.

**What it includes:**
- Catering static pages (browse-options, a-la-carte, packages, etc.)
- Catering product pages (categories starting with "catering-")

**Implementation:**
```typescript
const cateringProducts = await prismaClient.product.findMany({
  where: {
    active: true,
    category: {
      slug: {
        startsWith: 'catering-',
      },
    },
  },
});
```

**Result:**
- Catering sitemap at `/sitemap-catering.xml`
- Lower priority (0.5) for catering products
- Still discoverable for catering-specific searches

### 4. Environment Variable Usage

All changed files now use `NEXT_PUBLIC_APP_URL` instead of hardcoded domains:

**Before:**
```typescript
const baseUrl = 'https://development.destinosf.com';
```

**After:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';
```

**Environment setup:**
- Development: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Staging: `NEXT_PUBLIC_APP_URL=https://development.destinosf.com`
- Production: `NEXT_PUBLIC_APP_URL=https://destinosf.com`

## Files Modified

### Modified Files
1. `src/app/robots.ts` - Dynamic robots.txt with environment detection
2. `src/app/layout.tsx` - Conditional noindex meta tags
3. `src/app/sitemap.ts` - Filter to regular products only
4. `src/app/(store)/products/[slug]/page.tsx` - Conditional indexing per product
5. `src/lib/seo.ts` - Support for custom robots configuration
6. `public/robots.txt` - Static fallback robots.txt

### New Files Created
1. `src/lib/seo/product-helpers.ts` - Product categorization utilities
2. `src/app/sitemap-catering.ts` - Separate catering sitemap
3. `docs/SEO_FIX_DES-44.md` - This documentation

## Testing Checklist

### Local Testing
- [ ] Visit `http://localhost:3000/robots.txt` - should block all
- [ ] Check page source for noindex meta tags in development
- [ ] Test `/sitemap.xml` - should only show alfajores/empanadas
- [ ] Test `/sitemap-catering.xml` - should show catering items
- [ ] Check product page for Ropa Vieja - should have noindex
- [ ] Check product page for alfajores - should be indexable

### Development Domain Testing
- [ ] Visit `https://development.destinosf.com/robots.txt`
- [ ] Verify `Disallow: /` is present
- [ ] Check HTML source for `<meta name="robots" content="noindex, nofollow">`
- [ ] Verify catering products have noindex in meta tags

### Production Testing
- [ ] Visit `https://destinosf.com/robots.txt`
- [ ] Verify normal indexing rules (allow /, disallow /admin/, etc.)
- [ ] Verify sitemap only includes regular products
- [ ] Check that regular products are indexable
- [ ] Check that catering products have noindex tags
- [ ] Verify canonical URLs point to destinosf.com

### Google Search Console
- [ ] Submit removal request for development.destinosf.com
- [ ] Verify main sitemap at destinosf.com/sitemap.xml
- [ ] Submit catering sitemap as supplemental sitemap
- [ ] Monitor index coverage reports
- [ ] Check for "Indexed, though blocked by robots.txt" warnings
- [ ] Verify only alfajores and empanadas appear in indexed pages

## Expected Outcomes

### Immediate Effects
1. **Development domain completely blocked**
   - robots.txt: `Disallow: /`
   - Meta tags: `noindex, nofollow, noarchive, nosnippet`
   - Search engines will stop crawling development domain

2. **Catering products excluded from general search**
   - Not included in main sitemap
   - `noindex` meta tag on product pages
   - Won't appear in searches for "Ropa Vieja", "Tamarind Chicken", etc.

3. **Regular products properly indexed**
   - Alfajores and empanadas in main sitemap
   - Full indexing enabled
   - Appear in general product searches

### Long-term Effects (2-4 weeks)
1. **Google deindexes development domain**
   - Removal request accelerates process
   - No more development.destinosf.com in search results

2. **Catering products removed from general results**
   - Still accessible via direct URL
   - Only appear in catering-specific searches
   - Proper categorization in Search Console

3. **Improved SEO for main products**
   - No duplicate content issues
   - Better ranking for alfajores and empanadas
   - Clearer site structure for search engines

## Category Breakdown

### Regular Product Categories (Indexed)
- `alfajores` - Lemon Alfajores (6-pack combo)
- `empanadas` - Various empanada flavors

### Catering Categories (Not Indexed)
- `catering-appetizers`
- `catering-boxed-lunch-entrees`
- `catering-boxed-lunches`
- `catering-buffet-entrees` (includes Ropa Vieja, Tamarind Chicken)
- `catering-buffet-sides`
- `catering-buffet-starters`
- `catering-desserts` (includes lemon alfajores catering version)
- `catering-lunch-entrees`
- `catering-lunch-sides`
- `catering-lunch-starters`
- `catering-share-platters`

## Next Steps

1. **Deploy to development first**
   ```bash
   git add .
   git commit -m "fix(seo): block development indexing and separate catering products (DES-44)"
   git push origin fix/seo-indexing-issues-des-44
   ```

2. **Test on development domain**
   - Verify robots.txt blocking
   - Check meta tags
   - Test sitemaps

3. **Create pull request**
   - Target: `development` branch
   - Include this documentation
   - Link to DES-44 issue

4. **After merge to production:**
   - Submit removal request in Google Search Console
   - Update sitemaps in Search Console
   - Monitor indexing status

5. **Google Search Console Actions:**
   - Submit URL removal for `development.destinosf.com`
   - Add `/sitemap-catering.xml` as supplemental sitemap
   - Monitor "Index Coverage" for catering products being removed

## Additional Notes

- **No database changes required** - All changes are code-only
- **Backwards compatible** - Works with existing product data
- **Environment-aware** - Automatically adapts based on deployment environment
- **Future-proof** - Easy to add new product categories to either group
- **Reversible** - Can be rolled back without data loss

## Related Issues
- Plane: DES-44
- GitHub: (Will be added in PR)
