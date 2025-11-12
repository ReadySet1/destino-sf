# Visual Regression Testing Guide

This document describes the visual regression testing setup for Destino SF using Playwright's screenshot comparison feature.

## Overview

Visual regression testing helps detect unintended UI changes by comparing screenshots of your application against baseline images. This catches visual bugs that functional tests might miss, such as:

- Layout breaks and CSS regressions
- Font and styling changes
- Image loading issues
- Responsive design problems
- Component rendering bugs
- Cross-browser inconsistencies

## Architecture

### Directory Structure

```
tests/e2e/visual/
├── [test-name].visual.spec.ts       # Visual test files
└── [test-name].visual.spec.ts-snapshots/  # Baseline screenshots (committed to git)
    ├── [screenshot-name]-visual-regression-desktop-chromium.png
    └── [screenshot-name]-visual-regression-mobile-chromium.png
```

**Note**: Baseline screenshots are automatically organized into `-snapshots/` directories alongside their test files. The naming convention includes the project name (desktop/mobile) to differentiate viewport sizes.

### Configuration

Visual regression tests are configured in `playwright.config.ts` with two dedicated projects:

1. **visual-regression-desktop**: Desktop viewport (1920x1080)
2. **visual-regression-mobile**: Mobile viewport (375x667, iPhone SE)

**Key Configuration Settings:**

- **Screenshot comparison tolerance**: 0.2% pixel difference (100 pixels max)
- **Animations**: Disabled for consistent captures
- **Caret**: Hidden to avoid cursor-related flakiness
- **Test matching**: `*.visual.spec.ts` files
- **Cross-platform compatibility**: Custom `snapshotPathTemplate` ensures baselines generated on macOS work in Linux CI (no platform-specific suffixes)

## Running Visual Tests

### Basic Commands

```bash
# Run all visual regression tests (desktop + mobile)
pnpm test:e2e:visual

# Run desktop visual tests only
pnpm test:e2e:visual:desktop

# Run mobile visual tests only
pnpm test:e2e:visual:mobile

# Run specific test file
pnpm test:e2e:visual tests/e2e/visual/homepage.visual.spec.ts

# Run with UI mode for debugging
pnpm test:e2e:visual:ui
```

### First-Time Setup: Generate Baselines

When running visual tests for the first time or after creating new tests, you need to generate baseline screenshots:

```bash
# Generate baseline screenshots for all visual tests
pnpm test:e2e:visual:update

# Generate baselines for specific test file
npx playwright test tests/e2e/visual/homepage.visual.spec.ts --project=visual-regression-desktop --project=visual-regression-mobile --update-snapshots
```

**Important**: Review all generated baselines carefully before committing them to ensure they represent the correct visual state.

## Baseline Management

### Baseline Screenshot Storage

Baseline screenshots are stored in git at:

```
tests/e2e/visual/[test-file-name]-snapshots/
```

**Example structure:**

```
tests/e2e/visual/homepage.visual.spec.ts-snapshots/
├── homepage-hero-visual-regression-desktop-chromium.png
├── homepage-hero-visual-regression-mobile-chromium.png
├── homepage-nav-logged-out-visual-regression-desktop-chromium.png
└── ...
```

### When to Update Baselines

Update baselines when:

1. ✅ **Intentional UI changes** - You've made legitimate design or layout changes
2. ✅ **New features** - You've added new UI components or pages
3. ✅ **Bug fixes** - You've fixed a visual bug and the new appearance is correct

**DO NOT** update baselines for:

- ❌ Actual regressions or bugs
- ❌ Flaky test failures (investigate the root cause instead)
- ❌ Dynamic content issues (use CSS to hide dynamic elements)

### Updating Baselines Workflow

1. **Make your UI changes** in your feature branch

2. **Run visual tests** to see what changed:
   ```bash
   pnpm test:e2e:visual
   ```

3. **Review the diff images** in `test-results/`:
   ```bash
   # Open the HTML report to see visual diffs
   npx playwright show-report
   ```

4. **Verify changes are intentional** - Examine each diff carefully

5. **Update baselines** if changes are correct:
   ```bash
   pnpm test:e2e:visual:update
   ```

6. **Commit updated baselines** with a descriptive message:
   ```bash
   git add tests/e2e/visual/
   git commit -m "chore: update visual regression baselines for [feature]"
   ```

## Test Patterns and Best Practices

### Hiding Dynamic Content

Dynamic content (timestamps, order IDs, dates) can cause false positives. Hide them using CSS:

```typescript
await page.addStyleTag({
  content: `
    [data-dynamic], .dynamic-content, time {
      opacity: 0 !important;
    }
  `,
});
```

### Waiting for Content

Always wait for content to load before taking screenshots:

```typescript
import { waitForNetworkIdle } from '../utils/wait-helpers';

// Wait for network to be idle
await waitForNetworkIdle(page);

// Wait for specific elements
await page.waitForSelector('[data-testid="hero-section"]', {
  state: 'visible',
  timeout: 10000,
});
```

### Conditional Tests

Skip tests gracefully when elements don't exist:

```typescript
const element = page.locator('[data-testid="optional-element"]');
const exists = await element.count();

if (exists === 0) {
  test.skip();
  return;
}

// Continue with test
await element.waitFor({ state: 'visible' });
```

### Screenshot Naming Convention

Use descriptive names that indicate:

1. **Page/component** being tested
2. **State** of the component
3. **Viewport** (handled automatically by Playwright)

**Examples:**

- `homepage-hero.png`
- `product-card-available.png`
- `checkout-validation-errors.png`
- `cart-empty-state.png`

### Full Page vs Element Screenshots

```typescript
// Full page screenshot
await expect(page).toHaveScreenshot('full-page.png', {
  fullPage: true,
  animations: 'disabled',
});

// Element screenshot
const element = page.locator('[data-testid="hero"]');
await expect(element).toHaveScreenshot('hero.png', {
  animations: 'disabled',
});
```

## Test Coverage

### Current Visual Tests

| Page/Feature | Desktop | Mobile | Tests |
|--------------|---------|--------|-------|
| Homepage | ✅ | ✅ | Hero, nav, spotlight, footer, full page |
| Product Listing | ✅ | ✅ | Alfajores, empanadas, product cards |
| Product Details | ✅ | ✅ | Individual products, gallery, pricing |
| Shopping Cart | ✅ | ✅ | Empty, single item, multiple items, controls |
| Checkout | ✅ | ✅ | Customer info, fulfillment, payment, summary |
| Catering | ✅ | ✅ | Menu, packages, inquiry form, date picker |
| Admin Dashboard | ✅ | ✅ | Overview, orders table, product management |

### Adding New Visual Tests

1. **Create test file** with `.visual.spec.ts` suffix:
   ```bash
   touch tests/e2e/visual/my-feature.visual.spec.ts
   ```

2. **Write tests** following existing patterns

3. **Generate baselines**:
   ```bash
   pnpm test:e2e:visual:update tests/e2e/visual/my-feature.visual.spec.ts
   ```

4. **Review and commit baselines**

## CI/CD Integration

### Current Setup

Visual regression tests are NOT automatically run in CI yet. This is a deliberate decision to allow for incremental test implementation without blocking the CI pipeline.

**Decision Log (2025-11-12):**
- Infrastructure is in place and ready for visual tests
- Tests can be run locally and in PR reviews
- CI integration will be added once we have a stable set of baseline tests
- This allows us to add tests incrementally without false failures in CI

### Adding Visual Tests to CI (When Ready)

To enable visual regression tests in CI:

1. **Update `.github/workflows/test-suite.yml`**:
   ```yaml
   - name: Run visual regression tests
     run: pnpm test:e2e:visual

   - name: Upload visual test results
     if: failure()
     uses: actions/upload-artifact@v3
     with:
       name: visual-test-results
       path: |
         test-results/
         playwright-report/
   ```

2. **Configure screenshot diff artifacts**:
   - Failed tests will upload diff images
   - Review artifacts in GitHub Actions

### Future Enhancements

Consider adding:

- **Percy** or **Chromatic** for visual regression service
- **Automated baseline updates** via bot comments on PRs
- **Visual regression reports** in PR comments
- **Parallel execution** of visual tests in CI

## Troubleshooting

### Common Issues

#### 1. Flaky Visual Tests

**Symptom**: Tests fail intermittently with small pixel differences

**Solutions:**

- Increase `maxDiffPixels` or `maxDiffPixelRatio` in config
- Ensure animations are disabled
- Wait for fonts to load: `await page.waitForLoadState('networkidle')`
- Hide dynamic content with CSS

#### 2. Missing Baseline Screenshots

**Symptom**: Test fails with "Screenshot doesn't exist"

**Solution:**

```bash
# Generate missing baselines
pnpm test:e2e:visual:update
```

#### 3. Large Pixel Differences

**Symptom**: Tests fail with thousands of different pixels

**Solutions:**

- Review actual UI changes in the HTML report
- Check if fonts or images failed to load
- Verify viewport size matches baseline
- Check for animation or transition issues

#### 4. Cross-Browser Inconsistencies

**Symptom**: Visual tests pass on desktop but fail in CI

**Solutions:**

- Use consistent viewport sizes
- Disable animations and transitions
- Wait for web fonts to load
- Hide browser-specific UI elements

### Debugging Tips

1. **View diff images** in HTML report:
   ```bash
   npx playwright show-report
   ```

2. **Run in UI mode** for debugging:
   ```bash
   pnpm test:e2e:visual:ui
   ```

3. **Inspect screenshots** manually:
   ```bash
   open tests/e2e/visual/[test-name]-snapshots/
   ```

4. **Compare baseline vs actual**:
   - Baseline: `tests/e2e/visual/[test]-snapshots/`
   - Actual: `test-results/[test]/[screenshot]-actual.png`
   - Diff: `test-results/[test]/[screenshot]-diff.png`

## Performance Considerations

### Test Execution Time

Visual tests are slower than functional tests:

- **Desktop tests**: ~30-60s per test file
- **Mobile tests**: ~30-60s per test file
- **Parallel execution**: Reduces total time significantly

### Optimization Tips

1. **Run visual tests separately** from functional E2E tests
2. **Use selective testing** during development:
   ```bash
   pnpm test:e2e:visual tests/e2e/visual/homepage.visual.spec.ts
   ```
3. **Cache node_modules** and Playwright browsers in CI
4. **Run on dedicated CI workers** to avoid blocking other tests

## References

- [Playwright Visual Comparisons Docs](https://playwright.dev/docs/test-snapshots)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)

## Support

For questions or issues with visual testing:

1. Check this documentation
2. Review existing test files for patterns
3. Examine Playwright documentation
4. Open an issue in the project repository

---

**Last Updated**: 2025-11-12
**Maintained by**: Development Team
