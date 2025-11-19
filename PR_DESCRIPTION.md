# Prepare Merge to Main: Code Quality & Documentation Cleanup

## Summary
This PR prepares the codebase for merging into `main` by addressing code quality issues, organizing documentation, and fixing test scripts. It also includes recent fixes for CI permissions, test mocks, and marketing updates.

## Changes

### 🧹 Code Quality & Hygiene
- **Removed console.log statements**: Cleaned up debug logs in `src/app/api/admin/delivery-zones/route.ts` and product pages.
- **Fixed `any` types**: Replaced `any` with proper types (`Record<string, unknown>`, `unknown`) in:
  - `src/lib/square/sync.ts`
  - `src/lib/audit/delivery-zone-audit.ts`
  - `src/app/(store)/products/[slug]/page.tsx`
  - `src/app/(store)/products/category/[slug]/page.tsx`

### 📚 Documentation
- **Archived transient docs**: Moved `docs/to-fix/`, `docs/to-implement/`, `docs/fixes/`, and `docs/issues/` to `docs/archive/` to declutter the project root.

### 🛠️ Fixes & Features
- **Fix(ci)**: Added PR comment permissions to pre-deployment workflow (`dcbf2a1`)
- **Fix(tests)**: Corrected Square payments mock path in jest setup (`49b8554`)
- **Feat(marketing)**: Updated summer special to winter special (`5813440`)
- **Fix(scripts)**: Updated `test:critical` script in `package.json` to correctly use space-separated project names for Jest.

## Testing
- **Unit Tests**: Passed (`pnpm test:unit`)
- **Critical Tests**: `pnpm test:critical` script fixed.
  - *Note*: Integration tests requiring a local database may fail in environments without a running PostgreSQL instance.

## Deployment Notes
- No new environment variables required.
- Standard deployment process.

