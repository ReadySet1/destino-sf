/**
 * Feedback Components Visual Regression Tests
 *
 * Tests feedback and status UI components:
 * - Alert (default, destructive variants)
 * - Badge (all 7 variants)
 * - LoadingSpinner (sm, md, lg sizes)
 * - ErrorDisplay (with/without return link)
 * - Skeleton (various shapes and sizes)
 */

import { test, expect } from '@playwright/test';

test.describe('Alert Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
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
  });

  const variants = ['default', 'destructive'];

  for (const variant of variants) {
    test(`alert variant: ${variant}`, async ({ page }) => {
      await page.goto(`/visual-test-harness/alert?variant=${variant}`);

      const alert = page.getByTestId(`alert-${variant}`);
      await alert.waitFor({ state: 'visible' });

      await expect(alert).toHaveScreenshot(`alert-${variant}.png`, {
        animations: 'disabled',
      });
    });
  }
});

test.describe('Badge Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  const variants = ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'outline'];

  for (const variant of variants) {
    test(`badge variant: ${variant}`, async ({ page }) => {
      await page.goto(`/visual-test-harness/badge?variant=${variant}`);

      const badge = page.getByTestId(`badge-${variant}`);
      await badge.waitFor({ state: 'visible' });

      await expect(badge).toHaveScreenshot(`badge-${variant}.png`, {
        animations: 'disabled',
      });
    });
  }
});

test.describe('LoadingSpinner Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  const sizes = ['sm', 'md', 'lg'];

  for (const size of sizes) {
    test(`loading spinner size: ${size}`, async ({ page }) => {
      await page.goto(`/visual-test-harness/loading-spinner?size=${size}`);

      const spinner = page.getByTestId(`loading-spinner-${size}`);
      await spinner.waitFor({ state: 'visible' });

      await expect(spinner).toHaveScreenshot(`loading-spinner-${size}.png`, {
        animations: 'disabled',
      });
    });
  }
});

test.describe('ErrorDisplay Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('error display without link', async ({ page }) => {
    await page.goto('/visual-test-harness/error-display');

    const error = page.getByTestId('error-display');
    await error.waitFor({ state: 'visible' });

    await expect(error).toHaveScreenshot('error-display-no-link.png', {
      animations: 'disabled',
    });
  });

  test('error display with return link', async ({ page }) => {
    await page.goto('/visual-test-harness/error-display?state=with-link');

    const error = page.getByTestId('error-display-with-link');
    await error.waitFor({ state: 'visible' });

    await expect(error).toHaveScreenshot('error-display-with-link.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Skeleton Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('skeleton loading states', async ({ page }) => {
    await page.goto('/visual-test-harness/skeleton');

    const skeletonLarge = page.getByTestId('skeleton-large');
    await skeletonLarge.waitFor({ state: 'visible' });

    await expect(skeletonLarge).toHaveScreenshot('skeleton-large.png', {
      animations: 'disabled',
    });

    const skeletonMedium = page.getByTestId('skeleton-medium');
    await expect(skeletonMedium).toHaveScreenshot('skeleton-medium.png', {
      animations: 'disabled',
    });

    const skeletonSmall = page.getByTestId('skeleton-small');
    await expect(skeletonSmall).toHaveScreenshot('skeleton-small.png', {
      animations: 'disabled',
    });
  });
});
