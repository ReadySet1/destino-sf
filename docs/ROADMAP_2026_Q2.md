# Destino SF — Q2 2026 Roadmap

**Created:** 2026-03-25
**Based on:** [Audit Report](./AUDIT_REPORT_2026_03_25.md)
**Goal:** Address all critical/high findings, improve performance and code quality.

---

## Phase 1: Security Hardening (Week of Mar 30)

### Critical Fixes
- [x] **CORS: Admin endpoint** — Replaced wildcard `*` with `NEXT_PUBLIC_APP_URL` in `src/app/api/admin/products/[id]/archive/route.ts`
- [x] **CORS: Other routes** — Restricted CORS on `src/app/api/contact/route.ts` and `src/app/api/alerts/customer/route.ts`. Kept `*` on `src/app/api/og/route.tsx` (public OG images need it for social crawlers)
- [x] **Rate limiter migration** — Deleted in-memory `src/lib/security/rate-limiter.ts`. Migrated both consumers (webhook-security.ts, alerts/customer route) to use existing Redis-based `src/lib/rate-limit.ts` (Upstash)

### Cleanup
- [x] **Remove test/debug routes** — Deleted 30+ test pages, test API routes, and the entire `src/app/api/debug/` directory (19 routes exposing internal diagnostics)
- [x] **Console.log cleanup** — Removed debug logs from `src/app/auth/callback/route.ts` (11 logs), `src/app/api/alerts/customer/route.ts` (15+ logs), and `src/app/layout.tsx` (service worker logs)

---

## Phase 2: Performance Optimization (Week of Apr 6)

### Client Component Audit
- [ ] **Identify convertible components** — Audit all 238 `'use client'` files, tag which ones can become server components
- [ ] **Convert static components** — Start with menu, marketing, and layout components that don't use state/effects
- [ ] **Target:** Reduce client components by 30-40% (~70-95 components)

### Loading & Streaming
- [ ] **Suspense: Product pages** — Add `<Suspense>` boundaries around DB queries in product list/detail pages
- [ ] **Suspense: Admin pages** — Add loading states for orders table, products table, dashboard metrics
- [ ] **Suspense: Checkout** — Wrap profile fetch in Suspense to prevent blocking

### Tooling
- [ ] **Bundle analyzer** — Add `@next/bundle-analyzer` to dev dependencies, configure in `next.config.ts`
- [ ] **Baseline report** — Generate initial bundle size report for future comparison

---

## Phase 3: Code Quality & Type Safety (Week of Apr 13)

### Type Safety (Critical Paths First)
- [ ] **Checkout flow** — Remove `any` types in `src/app/api/checkout/route.ts` and `src/app/api/checkout/payment/route.ts`
- [ ] **Square integration** — Type Square API responses properly in `src/lib/square/` and `src/app/actions/orders.ts`
- [ ] **Middleware** — Fix `any` types in `src/middleware/api-validator.ts` and `src/middleware.ts`
- [ ] **Target:** Reduce `any` usage by 50% in critical path files

### Redis Caching
- [ ] **Product catalog cache** — Cache product listings with 1-hour TTL, invalidate on sync
- [ ] **Category cache** — Cache category data, invalidate on update
- [ ] **Implement cache layer** — Create `src/lib/cache/` utilities using existing Upstash Redis connection

### Technical Debt
- [ ] **Triage TODOs** — Review all 55 TODO/FIXME comments, categorize as: fix now / backlog / remove
- [ ] **Role-based access** — Implement proper admin role validation for the 5 admin routes missing checks
- [ ] **ESLint rules** — Add stricter rules: no-unused-vars, import-order, no-explicit-any (as warning)

---

## Phase 4: Test Coverage (Week of Apr 20)

### API Route Testing
- [ ] **Admin CRUD tests** — Write tests for admin product, order, and catering management routes
- [ ] **Auth flow tests** — Test login, signup, session handling, and protected route access
- [ ] **Square sync tests** — Test product sync, payment processing, and webhook handling paths
- [ ] **Target:** Cover top 30 most-used API routes (currently 15/160)

### CI Enforcement
- [ ] **Remove `passWithNoTests`** — Make CI fail when test count drops
- [ ] **Coverage thresholds** — Set minimum 30% line coverage as a baseline, increase over time
- [ ] **Fix skipped tests** — Re-enable or remove `src/__tests__/lib/square/comprehensive-coverage.test.ts`

### E2E Expansion
- [ ] **Admin workflow E2E** — Add Playwright tests for admin dashboard, product management
- [ ] **Catering flow E2E** — Expand coverage for catering order lifecycle

---

## Phase 5: Optimization & Polish (Week of Apr 27)

### Static Generation
- [ ] **ISR for marketing pages** — Add `revalidate` to landing, about, and menu pages
- [ ] **Static generation** — Use `generateStaticParams` for product detail pages

### Monitoring
- [ ] **Query logging** — Add database query performance monitoring to detect N+1 queries
- [ ] **Bundle budgets** — Set CI-enforced bundle size limits based on baseline from Phase 2

### Documentation
- [ ] **Update CLAUDE.md** — Reflect any architectural changes from this roadmap
- [ ] **API documentation** — Document all public API endpoints and their expected behavior

---

## Progress Tracking

| Phase | Status | Target Date | Completion |
|-------|--------|-------------|------------|
| Phase 1: Security | **Complete** | Apr 4 | 100% |
| Phase 2: Performance | Not Started | Apr 11 | 0% |
| Phase 3: Code Quality | Not Started | Apr 18 | 0% |
| Phase 4: Testing | Not Started | Apr 25 | 0% |
| Phase 5: Polish | Not Started | May 2 | 0% |

---

## Completed Items

### 2026-03-25
- [x] **Ghost orders fix** — Removed `fetchAndCreateOrderFromSquare()` from webhook handler, archived 4 ghost orders in production DB. Prevents Square POS/Online orders from creating shell records. (Commit: `ffe42ee`)
- [x] **Phase 1: Security Hardening** — Complete:
  - Fixed wildcard CORS on admin archive endpoint + 2 other routes
  - Migrated rate limiting from in-memory to distributed Redis (Upstash) — deleted `src/lib/security/rate-limiter.ts`, migrated consumers to existing `src/lib/rate-limit.ts`
  - Deleted 30+ test/debug routes exposed in production (8 test pages, 11 test API routes, 19 debug API routes)
  - Cleaned up 40+ debug console.log statements from auth callback, alerts API, and layout
