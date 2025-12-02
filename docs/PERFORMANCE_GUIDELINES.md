# Performance Guidelines

This document outlines performance standards, budgets, and optimization practices for the Destino SF e-commerce application.

## Performance Budgets

### Current Budgets (Error Level)

These thresholds will fail CI if exceeded:

| Metric | Desktop | Mobile | Description |
|--------|---------|--------|-------------|
| **FCP** (First Contentful Paint) | < 2000ms | < 2500ms | Time until first content appears |
| **LCP** (Largest Contentful Paint) | < 3000ms | < 4000ms | Time until largest content element renders |
| **CLS** (Cumulative Layout Shift) | < 0.1 | < 0.1 | Visual stability score |
| **TBT** (Total Blocking Time) | < 500ms | < 600ms | Time main thread is blocked |
| **Speed Index** | < 3500ms | < 4500ms | How quickly content is visually displayed |
| **TTI** (Time to Interactive) | < 5000ms | < 7500ms | Time until page is fully interactive |

### Target Budgets (DES-63 Goals)

Future targets to work toward:

| Metric | Target |
|--------|--------|
| FCP | < 1500ms |
| LCP | < 2500ms |
| TTI | < 3500ms |
| CLS | < 0.1 |
| TBT | < 300ms |
| Speed Index | < 3000ms |

### Lighthouse Scores

| Category | Minimum Score |
|----------|---------------|
| Performance | 80% (desktop) / 70% (mobile) |
| Accessibility | 90% |
| Best Practices | 85% |
| SEO | 90% |

## Pages Tested

Lighthouse CI runs against these URLs:

1. **Homepage** (`/`)
2. **Product Category - Empanadas** (`/products/category/empanadas`)
3. **Product Category - Alfajores** (`/products/category/alfajores`)
4. **Product Detail** (`/products/empanada-carne`)
5. **Catering** (`/catering`)
6. **Cart** (`/cart`)
7. **Checkout** (`/checkout`)

## Running Performance Tests

### Local Testing

```bash
# Run desktop Lighthouse tests
pnpm test:performance:lighthouse

# Run mobile Lighthouse tests
pnpm test:performance:lighthouse:mobile

# Run both (in sequence)
pnpm test:performance:lighthouse && pnpm test:performance:lighthouse:mobile
```

### Prerequisites

1. Ensure the development server is **not** running (Lighthouse will start its own)
2. Tests will build the application before testing
3. Chrome must be installed on the machine

### Viewing Reports

After running tests, reports are saved to:
- `.lighthouseci/` - JSON results
- `*.report.html` - HTML reports (viewable in browser)

## CI Integration

### When Tests Run

- **PRs to `development`**: Tests run, results posted as PR comment, warnings only
- **PRs to `main`**: Tests run, must pass budgets to merge
- **Push to `main`**: Tests run for trend tracking

### Interpreting Results

**PR Comment Format:**
```
🚦 Lighthouse Performance Report

| Platform | Status |
|----------|--------|
| Desktop | ✅ success |
| Mobile | ⚠️ failure |
```

**Artifacts:**
- `lighthouse-desktop-report` - Desktop HTML/JSON reports
- `lighthouse-mobile-report` - Mobile HTML/JSON reports

## Optimization Guidelines

### Images

1. **Use Next.js Image component** for automatic optimization:
   ```tsx
   import Image from 'next/image';

   <Image
     src="/product.jpg"
     alt="Product"
     width={400}
     height={300}
     priority={isAboveFold}
   />
   ```

2. **Use `priority` prop** for above-the-fold images (LCP candidates)

3. **Specify dimensions** to prevent layout shift (CLS)

4. **Use modern formats** - Next.js auto-converts to WebP/AVIF

### Fonts

1. **Use `next/font`** for optimized font loading:
   ```tsx
   import { Inter } from 'next/font/google';

   const inter = Inter({ subsets: ['latin'] });
   ```

2. **Set `display: swap`** (automatic with next/font)

3. **Preload critical fonts** for faster FCP

### JavaScript

1. **Use dynamic imports** for non-critical code:
   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <Skeleton />,
     ssr: false,
   });
   ```

2. **Tree-shake unused code** - Use named imports:
   ```tsx
   // Good
   import { Button } from '@/components/ui/button';

   // Avoid
   import * as UI from '@/components/ui';
   ```

3. **Minimize third-party scripts** - Load analytics/chat widgets lazily

### CSS

1. **Use Tailwind CSS** - Purges unused styles automatically

2. **Avoid render-blocking CSS** - Critical CSS is inlined by Next.js

3. **Use CSS containment** for complex layouts:
   ```css
   .product-grid {
     contain: layout style;
   }
   ```

### Server Components

1. **Default to Server Components** (Next.js 15 App Router)

2. **Use Client Components only when needed**:
   - Interactivity (onClick, onChange)
   - State management (useState, useEffect)
   - Browser-only APIs

3. **Avoid waterfalls** - Fetch data in parallel:
   ```tsx
   // Good - parallel
   const [products, categories] = await Promise.all([
     getProducts(),
     getCategories(),
   ]);

   // Bad - sequential
   const products = await getProducts();
   const categories = await getCategories();
   ```

### Caching

1. **Use Redis cache** (`src/lib/cache/redis-service.ts`) for:
   - Product data
   - Category data
   - Shipping rates

2. **Configure Next.js caching**:
   ```tsx
   export const revalidate = 3600; // Revalidate every hour
   ```

### Database

1. **Use indexed queries** - Check Prisma schema for indexes

2. **Avoid N+1 queries** - Use `include` for relations:
   ```tsx
   const orders = await prisma.order.findMany({
     include: { items: true },
   });
   ```

3. **Paginate large datasets**

## Troubleshooting

### Common Issues

**1. Server startup timeout in CI**

The Lighthouse config has a 90-second timeout. If builds are slow:
- Check for large dependencies
- Enable build caching
- Increase `startServerReadyTimeout`

**2. Different results locally vs CI**

CI uses consistent throttling; local may vary:
- Use `--preset desktop` or `mobile` consistently
- CI has less CPU power, expect slower results

**3. High CLS on dynamic content**

- Set explicit dimensions on images
- Use skeleton loaders with fixed dimensions
- Avoid inserting content above existing content

**4. High TBT from third-party scripts**

- Load scripts with `async` or `defer`
- Use `next/script` with `strategy="lazyOnload"`
- Consider removing unnecessary scripts

### Debugging Performance

1. **Chrome DevTools Performance Tab**
   - Record page load
   - Identify long tasks
   - Check layout shifts

2. **Lighthouse DevTools Panel**
   - Run audits directly in browser
   - Compare with CI results

3. **Web Vitals Extension**
   - Real-time CWV monitoring
   - Identifies specific elements causing issues

## Monitoring

### Performance Tracking

- **CI artifacts** store historical reports (30-day retention)
- Download and compare reports over time
- Track score trends after deployments

### Production Monitoring

Consider adding:
- Real User Monitoring (RUM) via `web-vitals` library
- Sentry Performance Monitoring (already configured)
- Google Search Console Core Web Vitals

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [web.dev Performance](https://web.dev/performance/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
