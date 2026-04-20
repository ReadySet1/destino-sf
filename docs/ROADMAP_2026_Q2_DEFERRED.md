# Destino SF — Q2 2026 Deferred Items + Master Maintenance Audit Plan

**Created:** 2026-04-03
**Last reviewed:** 2026-04-20
**Based on:** [Q2 2026 Roadmap](./ROADMAP_2026_Q2.md) (deferred items)
**Goal:** Complete all deferred items from the Q2 audit and establish a recurring maintenance framework.
**Timeline:** ~12 weeks (6 sprints of 1-2 weeks each)

---

## Status Snapshot (2026-04-20)

| Area | State | Notes |
|------|-------|-------|
| Sprint 1 — Quick Wins | ✅ Complete | ISR, Redis cache, `any` cleanup, bundle baseline all shipped. |
| Sprint 2 — Performance | ✅ Complete | FeaturedProducts + Account page Server Components shipped. |
| Sprint 3 — Testing Fixes | 🟡 Partial | `shippingUtils.test.ts` fixed; admin CRUD partial (4 of 5 routes, missing `sync-conflicts/rollback`); auth flow tests still skipped. |
| Sprint 4 — Test Expansion | 🔴 Not started | E2E specs 17/18 not created; `collectCoverage` still `false`; `todo-triage.md` missing. |
| Sprint 5 — Observability | 🟡 Partial | **Weekly DB backup shipped (PR #148)** — new. Prisma slow-query logging + `check-bundle-size.ts` still pending. |
| Sprint 6 — Finalization | 🔴 Not started | No Lighthouse thresholds, no `MAINTENANCE_AUDIT_PLAN.md`. |

**Next quick wins (≤2h each):**
1. Flip `collectCoverage` to `process.env.CI === 'true'` (Sprint 4.2)
2. Create `scripts/check-bundle-size.ts` with 10%/20% thresholds (Sprint 5.2)
3. Add Prisma `query`-event slow-query logging → Sentry (Sprint 5.1)

---

## Sprint 1: Quick Wins & Foundations (Week 1-2)

### 1.1 ISR Expansion for Product Pages
- [x] `src/app/(store)/products/page.tsx` — add `export const revalidate = 3600` (1hr)
- [x] `src/app/(store)/products/[slug]/page.tsx` — add `export const revalidate = 1800` (30min)
- [x] `src/app/(store)/menu/page.tsx` — add `export const revalidate = 3600`
- [x] `src/app/(store)/products/category/[slug]/page.tsx` — add `export const revalidate = 3600`

### 1.2 `generateStaticParams` for Product Detail Pages
- [x] ~~Added `generateStaticParams()` — reverted: page body hits DB directly, causes CI build failure~~
- [x] ISR via `revalidate = 1800` still active — pages rendered on demand then cached 30min
- [ ] **Deferred:** Requires wrapping full page data fetch with `safeBuildTimeOperation` first

### 1.3 Wire Redis Cache into Product Visibility Service
- [x] Integrate `cacheService` + `CacheKeys` from `src/lib/cache-service.ts` into `src/lib/services/product-visibility-service.ts`
- [x] Add cache-aside reads in product fetch methods using `CacheKeys.products()` / `CacheKeys.product()`
- [x] Implement `clearCategoryCache()` with `CacheInvalidation.invalidateCategory()`
- [x] Implement `clearProductCache()` with `CacheInvalidation.invalidateProduct()`
- [x] Uses `getCacheTTL('products')` (15 min TTL)
- [ ] **Verify:** Products load from cache on second request; cache invalidation works

### 1.4 Fix `any` Types in API Validator
- [x] Replace `z.ZodType<any, any, any>` with `z.ZodType` in `src/middleware/api-validator.ts` (4 instances)
- [x] Replace `...args: any[]` with `...args: unknown[]` in wrapper function
- [x] Isolated 1 remaining `any` in `RouteHandler` type alias (required for generic handler compat, with eslint-disable)
- [x] **Verify:** `pnpm type-check` passes; routes using `withValidation` still compile

### 1.5 Bundle Baseline Report
- [x] Installed `@next/bundle-analyzer` (was configured but not in dependencies)
- [x] Run `pnpm analyze` to generate initial report
- [x] Recorded baseline in `docs/bundle-baseline.json` with date stamp
- [x] Key finding: Shared JS = 218 kB, largest page = admin/products/availability at 356 kB First Load

---

## Sprint 2: Component Architecture & Performance (Week 3-4)

### 2.1 FeaturedProducts Server Component Conversion
- [x] Created `FeaturedProductsServer.tsx` — server component fetching via Prisma directly
- [x] Created `FeaturedProductsSkeleton.tsx` for Suspense fallback
- [x] Homepage uses `<Suspense><FeaturedProductsServer /></Suspense>` — eliminates client-side fetch waterfall
- [x] Original `FeaturedProducts.tsx` kept for admin SpotlightPicksManager preview (client context)
- [x] **Verify:** `pnpm type-check` passes

### 2.2 Account Page Suspense Boundaries
- [x] Extracted `AccountStats` async server component with `AccountStatsSkeleton`
- [x] Extracted `ProfileSection` async server component with `ProfileSkeleton`
- [x] Header + quick actions render immediately (no data dependency)
- [x] Stats and profile stream in via independent Suspense boundaries
- [x] OrderHistory unchanged (already handles own loading internally)
- [x] **Verify:** `pnpm type-check` passes

### 2.3 ProductGrid Static Layout (Optional)
- [ ] Extract outer layout from `src/components/products/ProductGrid.tsx` to server component wrapper
- [ ] Marginal benefit — only if time permits

---

## Sprint 3: Fix Broken Tests & Critical Test Gaps (Week 5-6)

### 3.1 Fix shippingUtils.test.ts — ✅ Complete (verified 2026-04-20)
- [x] `describe.skip` removed from `src/__tests__/lib/shippingUtils.test.ts`
- [x] Mock weight values updated (alfajores 1.8, empanadas 1.6, sauces 0.9)
- [x] Tests for `getShippingGlobalConfig` present (line 371+)
- [x] `isBuildTime` mock in place (line 26)

### 3.2 Admin CRUD Tests (Critical Routes) — 🟡 Partial
Tests live in `src/__tests__/app/api/admin/admin-crud.test.ts`:
- [x] `/api/admin/orders` — covered
- [x] `/api/admin/fix-production-orders` — covered
- [ ] `/api/admin/sync-conflicts/rollback` — **not yet covered** (only remaining route)
- [x] `/api/admin/promote-admin` — covered
- [x] `/api/admin/db-reset` — covered
- [x] Auth guard consistency verified (401 / 403 / 200 paths)

### 3.3 Auth Flow Tests — 🔴 Not started
- [ ] Unskip login test in `tests/e2e/03-authentication.spec.ts` (5 `test.skip` blocks still present: lines 35, 79, 96, 102, 121)
- [ ] Add unit tests for session handling (`src/__tests__/lib/auth-session.test.ts`)
- [ ] Add unit tests for role-based access (`src/__tests__/middleware/auth-guards.test.ts`)
- [ ] **Verify:** `pnpm test:e2e -- --grep "authentication"` passes

---

## Sprint 4: Test Expansion & CI Enforcement (Week 7-8)

### 4.1 E2E Expansion — 🔴 Not started
- [ ] Unskip catering cart/checkout tests in `tests/e2e/11-catering-complete-flow.spec.ts` (`test.describe.skip` at line 291)
- [ ] Add admin editing/bulk operations E2E test (`tests/e2e/17-admin-editing.spec.ts`)
- [ ] Add dedicated login flow E2E test — note: slot `18-` is now taken by `18-square-writeback.spec.ts`; use `19-login-flow.spec.ts` instead

### 4.2 Coverage Enforcement in CI — 🔴 Not started
- [ ] `jest.config.ts` line 250 — still reads `collectCoverage: false`. Change to `collectCoverage: process.env.CI === 'true'`
- [ ] `.github/workflows/test-suite.yml` — ensure coverage step uses `--coverage` and thresholds block the build
- [ ] Start with `continue-on-error: true` for 2 weeks to baseline, then make blocking

### 4.3 TODO Triage — 🔴 Not started
- [ ] `docs/todo-triage.md` does not exist yet
- [ ] Document all TODOs with categories, priority, and recommendations
- [ ] Key clusters: dashboard alerts (11), catering features (7+), notification services (6), cache (2, done in Sprint 1)
- [ ] Create trackable issues for top 10 by priority

---

## Sprint 5: Observability & Budgets (Week 9-10)

### 5.0 Weekly Database Backup — ✅ Complete (PR #148, 2026-04-20)
- [x] `.github/workflows/weekly-backup.yml` — Sundays 09:00 UTC
- [x] `scripts/rotate-supabase-backups.mjs` — 8-week retention
- [x] `.gitignore` excludes local `.context/` snapshots

### 5.1 Prisma Query Logging — 🔴 Not started
- [ ] `src/lib/db-unified.ts` currently logs only `error` + `warn` events (lines 177–182, 468). No `query`-level logging configured.
- [ ] Add Prisma `log` config for slow queries (>500ms)
- [ ] Route slow query events to Sentry breadcrumbs (Sentry already configured)
- [ ] **Verify:** Slow queries appear in Sentry on error events

### 5.2 Bundle Budget Enforcement in CI — 🔴 Not started
- [ ] `scripts/check-bundle-size.ts` does not exist yet
- [ ] Add bundle size check step in `.github/workflows/test-suite.yml` after build
- [ ] Compare `.next` output against `performance-budgets.json`
- [ ] Warn at 10% over budget, fail at 20%

### 5.3 API Documentation Expansion — 🟡 Partial
- [x] `docs/api/rest-api/` has 6 files: `admin.md`, `authentication.md`, `catering.md`, `orders.md`, `products.md`, `README.md`
- [ ] Tier 1: Finish customer-facing coverage gaps (products, checkout, orders, catering)
- [ ] Tier 2: Expand admin API docs
- [ ] Expand `openapi.json` (still 292 lines, partial coverage) to match all 60+ live routes

---

## Sprint 6: Finalization & Maintenance Framework (Week 11-12)

### 6.1 Remaining Work — 🔴 Not started
- [ ] Complete any spillover from Sprints 4-5
- [ ] Add Lighthouse pass/fail thresholds to `.github/workflows/lighthouse.yml` (currently advisory only)

### 6.2 Master Maintenance Audit Document — 🔴 Not started
- [ ] Create `docs/MAINTENANCE_AUDIT_PLAN.md` as a living document (see template below)

---

## Master Maintenance Audit Template

### Weekly (Automated via CI)

| Check | Tool | Action on Failure |
|-------|------|-------------------|
| Test suite | `test-suite.yml` | Block merge |
| Coverage thresholds | Jest `--coverage` | Block merge |
| Type checking | `pnpm type-check` | Block merge |
| Lint | `pnpm lint` | Block merge |
| Security audit | `pnpm audit` | Block deploy |
| Bundle size | `check-bundle-size` script | Warn/fail |

### Monthly (Manual, ~2 hours)

- [ ] `pnpm outdated` — check dependency freshness
- [ ] TODO count trend — should not grow beyond 60
- [ ] Skipped test count — should decrease over time
- [ ] Sentry error dashboard — identify new patterns
- [ ] Lighthouse trends — check for LCP/CLS regressions
- [ ] Redis cache hit rates — should be >80% for product queries
- [ ] Vercel function logs — review P95 latency

### Quarterly Audit (Manual, ~4-6 hours)

- [ ] Run `pnpm analyze`, compare to baseline, update `docs/bundle-baseline.json`
- [ ] Full `any` type count audit + new TODO triage
- [ ] Coverage report review + test gap analysis
- [ ] Security: Supabase RLS policies, API auth guards, env variable hygiene
- [ ] Documentation: compare `openapi.json` routes vs actual route files
- [ ] Dependencies: major version upgrade assessment, remove unused packages
- [ ] Infrastructure: Vercel settings, Sentry quota, Redis memory

### Automation Opportunities

- [ ] Dependabot/Renovate for automated dependency PRs
- [ ] CI step counting TODOs with threshold alert
- [ ] CI step counting `.skip()` tests with PR comment
- [ ] OpenAPI validation against actual API responses in E2E

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| FeaturedProducts conversion breaks homepage | Keep old component as fallback; test on preview deploy first |
| Redis cache causes stale product data | Start with 15min TTL; test invalidation paths thoroughly |
| Shipping test fixes reveal calculation bugs | Cross-check against real Shippo quotes before deploying |
| CI coverage enforcement blocks valid PRs | Start with `continue-on-error: true` for 2-week baseline |
| Account Suspense causes hydration mismatches | Test on production build, not dev mode |

---

## Verification (After Each Sprint)

1. `pnpm validate` (type-check + lint)
2. `pnpm test:critical` (critical path tests)
3. `pnpm build` (production build succeeds)
4. Manual smoke test on preview deploy
5. PR review with CI checks passing

---

## Progress Tracking

| Sprint | Status | Target Date | Completion |
|--------|--------|-------------|------------|
| Sprint 1: Quick Wins | **Complete** | 2026-04-03 | 100% |
| Sprint 2: Performance | **Complete** | 2026-04-03 | 100% |
| Sprint 3: Testing Fixes | **In Progress** | — | ~60% (3.1 done; 3.2 4/5 routes; 3.3 pending) |
| Sprint 4: Test Expansion | **Not Started** | — | 0% |
| Sprint 5: Observability | **In Progress** | — | ~25% (5.0 weekly backup done; 5.1/5.2 pending; 5.3 partial) |
| Sprint 6: Maintenance | **Not Started** | — | 0% |

_Last updated: 2026-04-20_
