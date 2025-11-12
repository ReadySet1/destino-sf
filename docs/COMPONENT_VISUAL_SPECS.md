# Component Visual Specifications

## Overview

This document provides comprehensive visual regression testing documentation for all UI components in the Destino SF application. Visual regression tests help detect unintended UI changes by comparing screenshots of components against baseline images.

## Implementation Status

**Phase 1: Foundation & Core UI Primitives** ✅ COMPLETED

- **Issue**: [DES-62](https://plane.readysetllc.com/ready-set-llc/browse/DES-62/)
- **Branch**: `feature/DES-62-component-visual-testing`
- **Implementation Date**: 2025-11-12

## Test Coverage Summary

| Category | Components Tested | Total Snapshots | Desktop | Mobile |
|----------|-------------------|-----------------|---------|--------|
| Buttons | 1 | 26 | ✅ | ✅ |
| Form Inputs | 5 | 21 | ✅ | ✅ |
| Feedback | 5 | 17 | ✅ | ✅ |
| **Total** | **11** | **64** | ✅ | ✅ |

**Responsive Breakpoints:**
- Desktop: 1920x1080
- Mobile: 375x667 (iPhone SE)

---

## Component Catalog

### UI Primitives

#### Button

**File**: `src/components/ui/button.tsx`
**Visual Test**: `tests/e2e/visual/primitives/button.visual.spec.ts`
**Test Harness**: `/visual-test-harness/button`

**Variants**:
- `default` - Primary blue button
- `destructive` - Red warning/delete button
- `outline` - Bordered button with background
- `secondary` - Secondary gray button
- `ghost` - Minimal button without border
- `link` - Styled as a text link

**Sizes**:
- `default` - Standard height (h-10)
- `sm` - Small height (h-9)
- `lg` - Large height (h-11)
- `icon` - Square button (h-10 w-10)

**States Tested**:
- Default (enabled, resting state)
- Disabled (opacity-50, pointer-events-none)

**Snapshot Count**: 26 (13 desktop + 13 mobile)

**Snapshots**:
- `button-{variant}-default.png` (6 variants)
- `button-size-{size}.png` (4 sizes)
- `button-{variant}-disabled.png` (6 variants)
- `button-destructive-large.png` (common combination)
- `button-outline-small.png` (common combination)

**Usage Examples**:
```typescript
// Run all button visual tests
pnpm test:e2e:visual tests/e2e/visual/primitives/button.visual.spec.ts

// Update button baselines
pnpm test:e2e:visual:update tests/e2e/visual/primitives/button.visual.spec.ts

// Preview button in test harness
open http://localhost:3000/visual-test-harness/button?variant=destructive&size=lg
```

---

#### Input

**File**: `src/components/ui/input.tsx`
**Visual Test**: `tests/e2e/visual/primitives/inputs.visual.spec.ts`
**Test Harness**: `/visual-test-harness/input`

**States Tested**:
- Default (with placeholder)
- Disabled (opacity-50, cursor-not-allowed)
- Error (red border, error message)

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `input-default.png`
- `input-disabled.png`
- `input-error.png`

---

#### Textarea

**File**: `src/components/ui/textarea.tsx`
**Visual Test**: `tests/e2e/visual/primitives/inputs.visual.spec.ts`
**Test Harness**: `/visual-test-harness/textarea`

**States Tested**:
- Default (with placeholder)
- Disabled
- Error (red border, error message)

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `textarea-default.png`
- `textarea-disabled.png`
- `textarea-error.png`

---

#### Checkbox

**File**: `src/components/ui/checkbox.tsx`
**Visual Test**: `tests/e2e/visual/primitives/inputs.visual.spec.ts`
**Test Harness**: `/visual-test-harness/checkbox`

**States Tested**:
- Unchecked
- Checked
- Disabled

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `checkbox-unchecked.png`
- `checkbox-checked.png`
- `checkbox-disabled.png`

---

#### Radio Group

**File**: `src/components/ui/radio-group.tsx`
**Visual Test**: `tests/e2e/visual/primitives/inputs.visual.spec.ts`
**Test Harness**: `/visual-test-harness/radio`

**States Tested**:
- Unselected
- Selected
- Disabled

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `radio-unselected.png`
- `radio-selected.png`
- `radio-disabled.png`

---

#### Switch

**File**: `src/components/ui/switch.tsx`
**Visual Test**: `tests/e2e/visual/primitives/inputs.visual.spec.ts`
**Test Harness**: `/visual-test-harness/switch`

**States Tested**:
- Off
- On
- Disabled

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `switch-off.png`
- `switch-on.png`
- `switch-disabled.png`

---

### Feedback Components

#### Alert

**File**: `src/components/ui/alert.tsx`
**Visual Test**: `tests/e2e/visual/primitives/feedback.visual.spec.ts`
**Test Harness**: `/visual-test-harness/alert`

**Variants**:
- `default` - Neutral blue alert
- `destructive` - Red error alert

**Snapshot Count**: 4 (2 desktop + 2 mobile)

**Snapshots**:
- `alert-default.png`
- `alert-destructive.png`

---

#### Badge

**File**: `src/components/ui/badge.tsx`
**Visual Test**: `tests/e2e/visual/primitives/feedback.visual.spec.ts`
**Test Harness**: `/visual-test-harness/badge`

**Variants**:
- `default` - Gray badge
- `primary` - Blue badge
- `secondary` - Secondary color badge
- `success` - Green badge
- `warning` - Yellow badge
- `danger` - Red badge
- `outline` - Bordered badge

**Snapshot Count**: 14 (7 desktop + 7 mobile)

**Snapshots**:
- `badge-{variant}.png` (7 variants)

---

#### LoadingSpinner

**File**: `src/components/ui/LoadingSpinner.tsx`
**Visual Test**: `tests/e2e/visual/primitives/feedback.visual.spec.ts`
**Test Harness**: `/visual-test-harness/loading-spinner`

**Sizes**:
- `sm` - Small spinner
- `md` - Medium spinner (default)
- `lg` - Large spinner

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `loading-spinner-sm.png`
- `loading-spinner-md.png`
- `loading-spinner-lg.png`

---

#### ErrorDisplay

**File**: `src/components/ui/ErrorDisplay.tsx`
**Visual Test**: `tests/e2e/visual/primitives/feedback.visual.spec.ts`
**Test Harness**: `/visual-test-harness/error-display`

**Variants**:
- Without return link
- With return link

**Snapshot Count**: 4 (2 desktop + 2 mobile)

**Snapshots**:
- `error-display-no-link.png`
- `error-display-with-link.png`

---

#### Skeleton

**File**: `src/components/ui/skeleton.tsx`
**Visual Test**: `tests/e2e/visual/primitives/feedback.visual.spec.ts`
**Test Harness**: `/visual-test-harness/skeleton`

**Sizes**:
- Large (h-12 w-full)
- Medium (h-8 w-3/4)
- Small (h-4 w-1/2)

**Snapshot Count**: 6 (3 desktop + 3 mobile)

**Snapshots**:
- `skeleton-large.png`
- `skeleton-medium.png`
- `skeleton-small.png`

---

## Architecture

### Component Test Harness

**URL**: `/visual-test-harness/[component]`

A dedicated Next.js page that renders UI components in isolation for visual testing. Components are rendered with disabled animations and transitions to ensure consistent screenshots.

**Query Parameters:**
- `variant` - Component variant (e.g., default, destructive, outline)
- `size` - Component size (e.g., default, sm, lg)
- `state` - Component state (e.g., disabled, checked, error)

**Example URLs:**
```
/visual-test-harness/button?variant=destructive&size=lg
/visual-test-harness/input?state=error
/visual-test-harness/checkbox?state=checked
/visual-test-harness/badge?variant=success
```

### Directory Structure

```
tests/e2e/visual/
├── primitives/
│   ├── button.visual.spec.ts           # Button component tests
│   ├── inputs.visual.spec.ts           # Form input tests
│   ├── feedback.visual.spec.ts         # Feedback component tests
│   └── [future tests]
├── business/
│   └── [future business component tests]
├── utils/
│   └── [future test utilities]
└── README.md

Snapshots are stored alongside test files:
tests/e2e/visual/primitives/button.visual.spec.ts-snapshots/
├── button-default-default-visual-regression-desktop-chromium.png
├── button-default-default-visual-regression-mobile-chromium.png
└── ... (all button snapshots)
```

---

## Running Visual Tests

### Basic Commands

```bash
# Run all component visual tests
pnpm test:e2e:visual

# Run only primitive component tests
pnpm test:e2e:visual tests/e2e/visual/primitives/

# Run specific test file
pnpm test:e2e:visual tests/e2e/visual/primitives/button.visual.spec.ts

# Run desktop tests only
pnpm test:e2e:visual:desktop

# Run mobile tests only
pnpm test:e2e:visual:mobile

# Run with UI mode for debugging
pnpm test:e2e:visual:ui
```

### Generating Baselines

When creating new tests or after intentional UI changes:

```bash
# Generate baseline screenshots for all visual tests
pnpm test:e2e:visual:update

# Generate baselines for specific test file
pnpm test:e2e:visual:update tests/e2e/visual/primitives/button.visual.spec.ts

# Generate baselines for desktop only
npx playwright test tests/e2e/visual/primitives/ --project=visual-regression-desktop --update-snapshots

# Generate baselines for mobile only
npx playwright test tests/e2e/visual/primitives/ --project=visual-regression-mobile --update-snapshots
```

**IMPORTANT**: Always review generated baselines carefully before committing to ensure they represent the correct visual state.

---

## Visual Regression Workflow

### When UI Changes Are Made

1. **Make your UI changes** in a feature branch

2. **Run visual tests** to see what changed:
   ```bash
   pnpm test:e2e:visual
   ```

3. **Review the diff images** in the HTML report:
   ```bash
   npx playwright show-report
   ```

4. **Verify changes are intentional** - Examine each diff carefully:
   - ✅ Intentional design/layout changes
   - ✅ New features or components
   - ✅ Bug fixes with correct new appearance
   - ❌ Actual regressions or unintended bugs

5. **Update baselines** if changes are correct:
   ```bash
   pnpm test:e2e:visual:update
   ```

6. **Commit updated baselines** with descriptive message:
   ```bash
   git add tests/e2e/visual/
   git commit -m "chore: update visual regression baselines for [feature]"
   ```

---

## Test Patterns and Best Practices

### Disabling Animations

All visual tests include CSS to disable animations and transitions for consistent screenshots:

```typescript
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `,
});
```

### Waiting for Elements

Always wait for elements to be visible before taking screenshots:

```typescript
const button = page.getByTestId('button-default');
await button.waitFor({ state: 'visible' });

await expect(button).toHaveScreenshot('button-default.png', {
  animations: 'disabled',
});
```

### Screenshot Options

Use `animations: 'disabled'` option for consistency:

```typescript
await expect(element).toHaveScreenshot('snapshot-name.png', {
  animations: 'disabled',
});
```

### Test Organization

- Group related component tests in `test.describe()` blocks
- Use descriptive test names that indicate component, variant, and state
- Keep one component type per test file
- Use loops for testing multiple variants/sizes to reduce code duplication

---

## Future Enhancements

### Phase 2: Business Components (Planned)

- **ProductCard** - All availability states
- **CartItemRow** - With/without images, quantity variations
- **EmptyCart** - Empty state display
- **Navbar** - Desktop + mobile responsive
- **Footer** - Full footer layout

### Phase 3: Complex Components (Planned)

- **Admin Dashboard** - Tables, forms, metrics cards
- **Calendar** - Date picker states
- **Carousel** - Image carousel navigation
- **Tabs** - Tab navigation states
- **Tooltip** - Tooltip positioning
- **Popover** - Popover states

### CI/CD Integration (Planned)

Currently, visual regression tests run locally and in manual PR reviews. Future enhancements:

- Automatic visual regression in GitHub Actions CI
- Visual diff artifacts uploaded on failures
- PR comments with visual regression results
- Integration with visual regression service (Percy/Chromatic)

---

## Troubleshooting

### Common Issues

#### 1. Tests Fail with "Screenshot doesn't exist"

**Solution**: Generate baseline screenshots:
```bash
pnpm test:e2e:visual:update
```

#### 2. Flaky Visual Tests

**Symptoms**: Tests fail intermittently with small pixel differences

**Solutions**:
- Ensure animations are disabled in test setup
- Check that component test harness disables transitions
- Verify fonts and images are fully loaded
- Increase `maxDiffPixels` tolerance if needed (in `playwright.config.ts`)

#### 3. Large Pixel Differences After Intentional Changes

**Solution**: Review changes in HTML report and update baselines:
```bash
npx playwright show-report  # Review diffs
pnpm test:e2e:visual:update  # Update if correct
```

#### 4. Cross-Platform Snapshot Differences

**Note**: Playwright configuration uses custom `snapshotPathTemplate` to ensure baselines generated on macOS work in Linux CI (no platform-specific suffixes).

If you encounter cross-platform issues:
- Verify Playwright version matches across environments
- Check font rendering consistency
- Ensure viewport sizes match exactly

---

## Development Guidelines

### Adding New Component Visual Tests

1. **Add component to test harness** (`src/app/visual-test-harness/[component]/page.tsx`):
   ```typescript
   case 'my-component':
     return <MyComponent variant={variant} />
   ```

2. **Create test file** with `.visual.spec.ts` suffix:
   ```bash
   touch tests/e2e/visual/primitives/my-component.visual.spec.ts
   ```

3. **Write tests** following existing patterns (see button tests as reference)

4. **Generate baselines**:
   ```bash
   pnpm test:e2e:visual:update tests/e2e/visual/primitives/my-component.visual.spec.ts
   ```

5. **Review snapshots** carefully

6. **Update this documentation** with component details

7. **Commit tests + baselines + docs**

---

## References

- **Visual Testing Guide**: `docs/VISUAL_TESTING.md` - Complete visual regression setup and workflow
- **Playwright Visual Comparisons**: [playwright.dev/docs/test-snapshots](https://playwright.dev/docs/test-snapshots)
- **Playwright Configuration**: `playwright.config.ts` - Visual regression project configuration
- **Component Test Harness**: `src/app/visual-test-harness/[component]/page.tsx` - Isolated component rendering

---

## Support

For questions or issues with component visual testing:

1. Review this documentation and `VISUAL_TESTING.md`
2. Examine existing test files for patterns
3. Check Playwright documentation
4. Consult the development team

---

**Last Updated**: 2025-11-12
**Maintained by**: Development Team
**Related Issues**: [DES-62](https://plane.readysetllc.com/ready-set-llc/browse/DES-62/)
