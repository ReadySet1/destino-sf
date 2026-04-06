# General Audit Report — Destino SF Web App

**Date:** 2026-03-25
**Audited by:** Development Team
**App State:** Inactive for ~3 months. Next.js 15.5.9, React 19.1.2, Prisma 6.16.2, Square SDK 42.3.0 — all up-to-date.

---

## CRITICAL (Fix Immediately)

### 1. Wildcard CORS on Admin Endpoint
- `src/app/api/admin/products/[id]/archive/route.ts` has `Access-Control-Allow-Origin: *`
- An admin DELETE endpoint accessible from any origin is dangerous
- **Fix:** Replace `*` with `process.env.NEXT_PUBLIC_APP_URL`

### 2. In-Memory Rate Limiting (Not Distributed)
- `src/lib/security/rate-limiter.ts` uses in-memory `Map` storage
- On Vercel serverless, each function instance has separate memory — rate limits don't work across instances
- Upstash Redis is already in dependencies but unused for rate limiting
- **Fix:** Migrate rate limiter to use `@upstash/redis`

---

## HIGH Priority

### 3. Test Coverage at 6.47%
- Lines: 6.47%, Branches: 2.31%, Functions: 3.77%
- Only 15 of ~160 API routes have tests
- Admin dashboard: 0% coverage
- Auth pages: 0% coverage
- CI has `passWithNoTests: true` which masks missing tests
- **Fix:** Prioritize tests for checkout, payment, admin CRUD, and Square sync

### 4. 832 `: any` + 408 `as any` Type Safety Violations
- Widespread in Square API integration, middleware, server actions
- Strict mode is enabled but undermined by `any` usage
- **Fix:** Gradual cleanup starting with payment/checkout critical paths

### 5. Wildcard CORS on Other Routes
- `src/app/api/contact/route.ts`, `src/app/api/alerts/customer/route.ts` also use `*`
- Less critical (public endpoints) but still worth restricting
- **Fix:** Use `process.env.NEXT_PUBLIC_APP_URL` where possible

---

## MEDIUM Priority

### 6. 238 Client Components — Too Many
- Very high ratio of `'use client'` components
- Many static/marketing components marked as client unnecessarily
- Increases JavaScript bundle sent to browser
- **Fix:** Audit and convert 30-40% to server components (menus, static content, layouts)

### 7. Missing Suspense Boundaries on Data-Heavy Pages
- Product list, checkout, admin pages do blocking DB fetches
- No streaming/progressive loading
- **Fix:** Wrap DB queries in `<Suspense>` with loading fallbacks

### 8. Redis Cache Underutilized
- `@upstash/redis` in dependencies but barely used
- Product catalog, categories, user profiles could be cached
- **Fix:** Add Redis caching for frequently-read, rarely-written data

### 9. 55 TODO/FIXME Comments (Technical Debt)
- 22 unimplemented features (role-based access, job history, boxed lunches)
- 5 admin routes missing proper role validation
- 8 database schema gaps
- **Fix:** Triage and prioritize — role-based access is most critical

### 10. Console Statements in Production Code
- Auth callback route has 15+ emoji-prefixed debug logs
- Checkout page has debug console.log statements
- Test routes (`/test-resend`, `/test-email-simple`) still exist
- **Fix:** Remove debug logs, delete test routes

### 11. No Bundle Analysis Tooling
- No `@next/bundle-analyzer` configured
- Can't track bundle size regressions
- **Fix:** Add bundle analyzer to dev dependencies

---

## LOW Priority / Good-to-Have

### 12. ESLint Config is Minimal
- Only `next/core-web-vitals` preset, no custom rules
- Missing: unused variable detection, import ordering, complexity limits

### 13. Disabled Test Suite
- `src/__tests__/lib/square/comprehensive-coverage.test.ts` is fully `.skip()`-ed
- Should be fixed or removed

### 14. Missing ISR for Static Pages
- No `revalidate` configuration on pages that could be statically generated
- Marketing/landing pages serve dynamically when they don't need to

---

## What's in Good Shape

- **Dependencies**: All major packages are current (Next.js 15.5.9, React 19, Prisma 6.16)
- **Security headers**: Comprehensive CSP, HSTS, X-Frame-Options, Permissions-Policy
- **Webhook security**: Signature validation, replay protection, dedup
- **Payment security**: Pessimistic locking, deduplication, proper validation
- **Font optimization**: next/font with display:swap
- **Image optimization**: next/image used consistently (39 usages, only 4 raw img tags)
- **CI/CD pipeline**: 5 parallel jobs (lint, build, security, test, setup)
- **E2E tests**: 25+ Playwright tests with visual regression
- **Concurrency patterns**: Optimistic/pessimistic locking, request deduplication
- **TypeScript strict mode**: Fully enabled
