# Accessibility Testing Guidelines

This document provides guidelines for maintaining WCAG 2.1 AA compliance in the Destino SF application.

## Overview

We use automated accessibility testing with axe-core integrated into Playwright to ensure all pages meet WCAG 2.1 AA standards. Tests run in CI but operate in "report-only" mode - they report issues without blocking deployments.

## Quick Start

### Running Accessibility Tests

```bash
# Run all accessibility tests
pnpm test:a11y

# Run tests for specific page groups
pnpm test:a11y:core       # Homepage, menu, products, cart, checkout, auth
pnpm test:a11y:catering   # Catering pages
pnpm test:a11y:account    # Account and order pages
pnpm test:a11y:admin      # Admin dashboard pages

# Generate detailed report (HTML, JSON, Markdown)
pnpm test:a11y:report
pnpm test:a11y:report --format html --output ./reports/a11y.html
pnpm test:a11y:report --pages admin --severity serious

# Run for CI with reporters
pnpm test:a11y:ci
```

### CLI Audit Options

The `test:a11y:report` script supports various options:

| Option | Description | Example |
|--------|-------------|---------|
| `--pages <filter>` | Filter by page group or pattern | `--pages admin`, `--pages checkout` |
| `--severity <level>` | Minimum severity to report | `--severity serious` |
| `--format <type>` | Output format | `--format json`, `--format markdown`, `--format html` |
| `--output <path>` | Output file path | `--output ./reports/a11y.json` |

## Test Structure

### Test Files

```
tests/e2e/accessibility/
  core-pages.a11y.spec.ts    # Core user-facing pages
  catering.a11y.spec.ts      # Catering flow pages
  account.a11y.spec.ts       # Account/order pages
  admin.a11y.spec.ts         # Admin dashboard pages

tests/e2e/utils/
  a11y-helpers.ts            # Helper functions and utilities
```

### Page Coverage

| Test File | Pages Covered |
|-----------|---------------|
| `core-pages.a11y.spec.ts` | Homepage, menu, products, product detail, cart, checkout, auth pages, contact, about, terms, privacy |
| `catering.a11y.spec.ts` | Catering home, a-la-carte, browse options, checkout, confirmation, custom quote, inquiry form |
| `account.a11y.spec.ts` | Account dashboard, orders, pending orders, order details, payment |
| `admin.a11y.spec.ts` | Admin dashboard, orders, products, availability, settings, users, sync pages |

## Understanding Results

### Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| **Critical** | Users cannot access the content at all | Must fix immediately |
| **Serious** | Significant barriers for users | Should fix before release |
| **Moderate** | Some users will experience difficulty | Fix in next sprint |
| **Minor** | May be annoying but not blocking | Fix when convenient |

### Common Violations

#### 1. Missing Form Labels (`label`)

**Problem:** Form inputs without associated labels.

**Fix:**
```tsx
// Bad
<input type="text" placeholder="Email" />

// Good - Using label with htmlFor
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// Good - Using aria-label
<input type="text" aria-label="Email address" />
```

#### 2. Missing Alt Text (`image-alt`)

**Problem:** Images without alt attributes.

**Fix:**
```tsx
// Bad
<img src="/logo.png" />

// Good - Informative image
<img src="/logo.png" alt="Destino SF logo" />

// Good - Decorative image
<img src="/decoration.png" alt="" role="presentation" />
```

#### 3. Color Contrast (`color-contrast`)

**Problem:** Text color doesn't have enough contrast against background.

**Fix:**
- Ensure text has at least 4.5:1 contrast ratio (normal text)
- Ensure text has at least 3:1 contrast ratio (large text, 18px+ or 14px bold)
- Use our design tokens which are tested for contrast:
  - Yellow (#fdc32d) on Charcoal (#2d3538)
  - Charcoal on Cream (#fcfcf5)

#### 4. Missing Button Names (`button-name`)

**Problem:** Buttons with only icons, no accessible name.

**Fix:**
```tsx
// Bad
<button><IconTrash /></button>

// Good - Using aria-label
<button aria-label="Delete item"><IconTrash /></button>

// Good - Using visually hidden text
<button>
  <IconTrash />
  <span className="sr-only">Delete item</span>
</button>
```

#### 5. Heading Order (`heading-order`)

**Problem:** Headings skip levels (e.g., h1 to h3).

**Fix:**
```tsx
// Bad
<h1>Page Title</h1>
<h3>Section Title</h3>  // Skipped h2!

// Good
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

#### 6. Missing Link Names (`link-name`)

**Problem:** Links without accessible text.

**Fix:**
```tsx
// Bad
<a href="/cart"><ShoppingCart /></a>

// Good
<a href="/cart" aria-label="View shopping cart">
  <ShoppingCart />
</a>
```

## Writing Accessible Components

### Form Components

```tsx
// Accessible form field component
function FormField({ label, id, error, ...props }) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-describedby={errorId}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
```

### Interactive Components

```tsx
// Accessible button with loading state
function LoadingButton({ loading, children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading}
    >
      {loading ? (
        <>
          <span aria-hidden="true">Loading...</span>
          <span className="sr-only">Loading, please wait</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
```

### Data Tables

```tsx
// Accessible data table
function OrdersTable({ orders }) {
  return (
    <table>
      <caption className="sr-only">Order history</caption>
      <thead>
        <tr>
          <th scope="col">Order ID</th>
          <th scope="col">Date</th>
          <th scope="col">Status</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order.id}>
            <td>{order.id}</td>
            <td>{formatDate(order.date)}</td>
            <td>
              <span
                className={`status-${order.status}`}
                aria-label={`Status: ${order.status}`}
              >
                {order.status}
              </span>
            </td>
            <td>{formatCurrency(order.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Adding Tests for New Pages

### Basic Page Test

```typescript
import { test, expect } from '@playwright/test';
import {
  checkPageAccessibility,
  logViolationsWithoutFailing,
  getCriticalViolations,
} from '../utils/a11y-helpers';

test.describe('New Feature Accessibility @a11y', () => {
  test('new page meets WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/new-page');
    const results = await checkPageAccessibility(page, 'New Page');

    // Log all violations for reporting
    logViolationsWithoutFailing(results, 'New Page');

    // Only fail on critical/serious issues
    const critical = getCriticalViolations(results);
    expect(
      critical,
      `New page has ${critical.length} critical/serious a11y violations`
    ).toHaveLength(0);
  });
});
```

### Form-Focused Test

```typescript
import { RULE_SETS } from '../utils/a11y-helpers';

test('form has proper labels', async ({ page }) => {
  await page.goto('/new-form-page');
  const results = await checkPageAccessibility(
    page,
    'New Form - Labels',
    RULE_SETS.forms
  );

  logViolationsWithoutFailing(results, 'New Form - Labels');
});
```

### Keyboard Navigation Test

```typescript
test('page supports keyboard navigation', async ({ page }) => {
  await page.goto('/new-page');
  await page.waitForLoadState('networkidle');

  // Test tab navigation
  await page.keyboard.press('Tab');

  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => ({
      tagName: document.activeElement?.tagName,
      isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT'].includes(
        document.activeElement?.tagName || ''
      ),
    }));

    // Log if focusing non-interactive elements
    if (!focused.isInteractive) {
      console.log(`[A11y Info] Focused on ${focused.tagName}`);
    }
  }
});
```

## CI Integration

### Workflow Behavior

The accessibility tests run in a separate CI workflow (`.github/workflows/a11y-tests.yml`) that:

1. Triggers on pushes and PRs to `main` and `development` branches
2. Runs all accessibility tests using Playwright with axe-core
3. Generates HTML and JSON reports as artifacts
4. Posts a summary comment on PRs
5. **Does NOT block deployment** - operates in report-only mode

### Artifacts

After each CI run, download the `a11y-report` artifact which contains:

- `html-report/` - Interactive HTML report
- `results.json` - Machine-readable JSON results
- `test-artifacts/` - Screenshots and traces for failed tests

### Manual Workflow Trigger

You can manually trigger the workflow from the GitHub Actions UI with optional page filtering.

## WCAG 2.1 AA Quick Reference

### Perceivable

- **1.1.1** Non-text content has text alternatives
- **1.3.1** Info and relationships are programmatically determinable
- **1.4.1** Color is not the only means of conveying information
- **1.4.3** Text has contrast ratio of at least 4.5:1
- **1.4.11** Non-text contrast is at least 3:1

### Operable

- **2.1.1** All functionality is keyboard accessible
- **2.1.2** No keyboard traps
- **2.4.1** Skip to main content mechanism
- **2.4.4** Link purpose is determinable
- **2.4.6** Headings and labels describe topic or purpose

### Understandable

- **3.1.1** Page language is programmatically determinable
- **3.2.1** Focus does not trigger unexpected changes
- **3.3.1** Input errors are identified and described
- **3.3.2** Labels or instructions are provided

### Robust

- **4.1.1** Markup is well-formed
- **4.1.2** Name, role, value are programmatically determinable

## Resources

### Tools

- [axe DevTools Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility/lhdoppojpmngadmnindnejefpokejbdd) - Manual testing
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/) - Visual feedback
- [Contrast Checker](https://webaim.org/resources/contrastchecker/) - Color contrast testing

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rule Descriptions](https://dequeuniversity.com/rules/axe/4.7)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Design Resources

- [Inclusive Components](https://inclusive-components.design/)
- [A11y Style Guide](https://a11y-style-guide.com/style-guide/)
