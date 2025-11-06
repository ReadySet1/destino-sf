# E2E Test Execution Guide

## Understanding Test Counts

### Why You See Different Numbers

When running `pnpm test:e2e`, you'll see different test counts depending on configuration:

**Example**: 39 test cases across 7 browsers = 273 test executions

```
playwright.config.ts projects:
1. chromium
2. firefox
3. webkit
4. Mobile Chrome
5. Mobile Safari
6. Microsoft Edge
7. Google Chrome

39 tests × 7 browsers = 273 test runs
```

**With retries enabled** (playwright.config.ts:13):

```typescript
retries: process.env.CI ? 2 : 1,  // 1 retry locally, 2 in CI
```

If 30% of tests fail on first run:

- 273 initial runs
- ~82 retry runs (273 × 0.3)
- **~355 total test executions**

---

## Local vs CI Configuration

### **Local Development** (Default)

Optimized for speed and database stability:

```typescript
// playwright.config.ts
projects: [
  { name: 'chromium' }  // Only 1 browser
],
workers: 2,  // Reduced to prevent DB connection pool exhaustion
retries: 1   // 1 retry for transient failures
```

**Result**: 39 tests × 1 browser = **~39-50 test runs** (with retries)

### **CI Environment** (GitHub Actions)

Full browser matrix for comprehensive coverage:

```typescript
// playwright.config.ts when process.env.CI is true
projects: [
  { name: 'chromium' },
  { name: 'firefox' },
  { name: 'webkit' },
  { name: 'Mobile Chrome' },
  { name: 'Mobile Safari' },
  { name: 'Microsoft Edge' },
  { name: 'Google Chrome' }
],
workers: 1,   // Sequential to avoid flakiness in CI
retries: 2    // More retries for CI environment
```

**Result**: 39 tests × 7 browsers = **~273-400 test runs** (with retries)

---

## Available Commands

### Quick Local Testing

```bash
# Default (uses local config - chromium only, 2 workers)
pnpm test:e2e

# Explicitly chromium-only with 2 workers
pnpm test:e2e:local

# Critical path only (fastest)
pnpm test:e2e:critical

# Headed mode (watch tests run)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug

# UI mode (interactive test runner)
pnpm test:e2e:ui
```

### Full Browser Testing

```bash
# Mobile devices only
pnpm test:e2e:mobile

# CI configuration (all browsers, sequential)
CI=true pnpm test:e2e
```

### Reports and Analysis

```bash
# View last test report
pnpm test:e2e:report

# Performance tests
pnpm test:performance

# Accessibility tests
pnpm test:accessibility
```

---

## Common Issues & Solutions

### Issue 1: "~400 tests instead of expected 39"

**Cause**: Running full browser matrix (7 browsers × 39 tests = 273) + retries

**Solution**: Use local configuration

```bash
pnpm test:e2e:local  # Chromium only
```

### Issue 2: Database Connection Timeouts

**Symptoms**:

```
Error: appetizer-products timeout after 15 seconds
Error: spotlight-picks timeout after 15 seconds
```

**Cause**: Too many parallel workers overwhelming database connection pool

**Solution**: Already fixed in playwright.config.ts:15

```typescript
workers: process.env.CI ? 1 : 2,  // Reduced from unlimited
```

### Issue 3: Tests Take Too Long

**Cause**: Running all browsers + retries

**Solutions**:

```bash
# 1. Use chromium-only (fastest)
pnpm test:e2e:local

# 2. Run critical path only
pnpm test:e2e:critical

# 3. Run specific file
pnpm test:e2e tests/e2e/02-cart-management.spec.ts
```

### Issue 4: High Failure Rate

**Expected**: Tests should have >90% pass rate

**If seeing 70-80% failures**:

1. Check database connection (see Issue 2)
2. Ensure dev server is running: `pnpm dev`
3. Check for server-side errors in terminal
4. Verify test data is seeded: `pnpm test:seed`

---

## Performance Expectations

### Local Testing (chromium only)

- **Total tests**: ~39 test cases
- **Duration**: 5-10 minutes
- **Pass rate**: >90%
- **Retries**: ~5-10 (if any)

### CI Testing (all browsers)

- **Total tests**: ~273 test runs
- **Duration**: 20-40 minutes
- **Pass rate**: >85%
- **Retries**: ~30-50 (if any)

---

## Test File Organization

```
tests/e2e/
├── 01-complete-purchase.spec.ts    (Critical - 6 tests)
├── 02-cart-management.spec.ts      (Critical - 5 tests)
├── 03-authentication.spec.ts        (Critical - 10 tests)
├── 04-catering-inquiry.spec.ts      (Critical - 4 tests)
├── 05-browser-mcp-integration.spec.ts (8 tests)
├── 06-catering-inquiry-enhanced.spec.ts (6 tests)
└── utils/
    ├── wait-helpers.ts              (Reliability utilities)
    └── test-helpers.ts              (Shared helpers)
```

---

## Debugging Failed Tests

### 1. View Screenshots

```bash
# Failed tests automatically save screenshots to:
test-results/
```

### 2. Watch Video Recordings

```bash
# Failed tests save videos to:
test-results/
```

### 3. View Trace

```bash
# Traces saved on retry failures
npx playwright show-trace test-results/.../trace.zip
```

### 4. Run Specific Test in Debug Mode

```bash
pnpm test:e2e:debug -- --grep "should complete full purchase flow"
```

---

## Best Practices

### For Local Development

1. ✅ Use `pnpm test:e2e:local` (chromium only)
2. ✅ Use `pnpm test:e2e:critical` for quick validation
3. ✅ Use `pnpm test:e2e:headed` to watch tests run
4. ❌ Avoid running full browser matrix locally (slow)

### For CI/CD

1. ✅ Let CI run full browser matrix
2. ✅ Use sequential workers (workers: 1)
3. ✅ Enable full retry logic (retries: 2)
4. ✅ Generate reports for debugging

### Writing New Tests

1. ✅ Use `data-testid` attributes for stable selectors
2. ✅ Use `WaitHelpers` instead of hard-coded timeouts
3. ✅ Ensure proper cleanup in `afterEach` hooks
4. ✅ Test in isolation (don't depend on other tests)
5. ✅ Add to appropriate test file by feature area

---

## Configuration Reference

### Key Timeouts

```typescript
actionTimeout: 15 * 1000,      // 15s per action
navigationTimeout: 30 * 1000,  // 30s per navigation
timeout: 60 * 1000,            // 60s per test
expect.timeout: 10 * 1000,     // 10s per assertion
```

### Workers & Retries

```typescript
// Local
workers: 2;
retries: 1;

// CI
workers: 1;
retries: 2;
```

### Browser Matrix

```typescript
// Local: chromium only
// CI: chromium, firefox, webkit, Mobile Chrome, Mobile Safari, Edge, Chrome
```

---

## Related Documentation

- [E2E Test Selectors](./E2E_TEST_SELECTORS.md) - data-testid requirements
- [CLAUDE.md](../CLAUDE.md) - Test commands reference
- [Playwright Config](../playwright.config.ts) - Full configuration
