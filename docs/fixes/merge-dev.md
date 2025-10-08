# Prepare Branch for Merge: Fix Failing CI/CD Checks

## Context

Branch `fix/square-sync-improvements` has been created with sync optimizations but has 6 failing GitHub checks that need to be resolved before merging to `development`.

## Failing Checks to Fix

### 1. Essential Quality Checks / Build Application

**Status:** Failing after 2m
**Likely Issues:**

- TypeScript compilation errors introduced by sync changes
- Missing dependencies or imports
- Type mismatches in parallelization code

### 2. Essential Quality Checks / Run Tests

**Status:** Failing after 1m
**Likely Issues:**

- Unit tests failing due to changed sync behavior
- Mock/stub expectations not updated for parallel execution
- Test timeouts due to new async patterns

### 3. Lighthouse CI Performance Testing (Mobile & Desktop)

**Status:** Both failing after 2m
**Likely Issues:**

- May be pre-existing issues unrelated to sync changes
- Performance regression in admin pages
- Network/timeout issues in CI environment

### 4. Pre-Merge Validation / Code Review Checklist

**Status:** Failing after 5s
**Likely Issues:**

- Missing PR description elements
- Code quality checks (linting, formatting)
- Documentation requirements not met

### 5. Pre-Merge Validation / Pre-Merge Checks

**Status:** Failing after 3m
**Likely Issues:**

- Integration test failures
- Database migration issues
- Environment-specific failures

## Required Actions

### Phase 1: Diagnosis (Do This First)

1. **Check GitHub Actions logs** for each failing check
2. **Identify root causes** - are they related to sync changes or pre-existing?
3. **Review git diff** between `fix/square-sync-improvements` and `development`
4. **Check for TypeScript errors**: Run `npm run type-check` or `tsc --noEmit`
5. **Run tests locally**: `npm test` or `npm run test:watch`

### Phase 2: Fix Build & Type Issues

1. **Review all files modified in the branch**:
   - `/api/square/unified-sync` or related sync files
   - Any type definition files
   - Configuration files

2. **Fix TypeScript errors**:
   - Ensure `p-limit` is properly imported and typed
   - Check Promise typing for parallel operations
   - Verify all async/await usage is correct
   - Fix any type mismatches from refactoring

3. **Install missing dependencies** if needed:
   ```bash
   npm install p-limit
   npm install --save-dev @types/p-limit
   ```

### Phase 3: Fix Test Failures

1. **Update test mocks/stubs** for parallel execution:
   - Tests may expect sequential behavior
   - Update timing expectations for faster sync
   - Mock `p-limit` if needed for deterministic tests

2. **Fix integration tests**:
   - Ensure database state is properly cleaned between tests
   - Update assertions for new logging messages
   - Handle race conditions in parallel operations

3. **Example test fix pattern**:

   ```typescript
   // Before: Expected sequential execution
   expect(mockSquareApi.search).toHaveBeenCalledTimes(1);

   // After: Parallel execution may call multiple times
   expect(mockSquareApi.search).toHaveBeenCalled();
   expect(mockSquareApi.search.mock.calls.length).toBeGreaterThan(0);
   ```

### Phase 4: Fix Code Quality Checks

1. **Run linting**: `npm run lint` or `npm run lint:fix`
2. **Format code**: `npm run format` or `prettier --write .`
3. **Check for console.logs**: Remove or replace with proper logger
4. **Update PR description** with required checklist items

### Phase 5: Address Lighthouse (If Related)

1. **Check if Lighthouse failures are pre-existing**:
   - Compare with `development` branch Lighthouse scores
   - If pre-existing, document in PR and create separate issue

2. **If caused by sync changes**:
   - Check if admin pages are loading slower
   - Investigate any client-side JavaScript changes
   - Ensure no blocking synchronous operations

### Phase 6: Verify All Fixes

1. **Run full local build**: `npm run build`
2. **Run all tests**: `npm test`
3. **Start dev server**: `npm run dev`
4. **Manually test sync**: Trigger sync and verify it works
5. **Check TypeScript**: `npm run type-check`
6. **Commit fixes** with clear messages
