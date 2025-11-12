/**
 * Button Component Visual Regression Tests
 *
 * Tests all button variants, sizes, and states for visual consistency.
 * Covers:
 * - 6 variants: default, destructive, outline, secondary, ghost, link
 * - 4 sizes: default, sm, lg, icon
 * - States: default, disabled
 */

import { test, expect } from '@playwright/test';

test.describe('Button Visual Regression', () => {
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

  // Test all button variants
  const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];

  for (const variant of variants) {
    test(`button variant: ${variant}`, async ({ page }) => {
      await page.goto(`/visual-test-harness/button?variant=${variant}&size=default`);

      const button = page.getByTestId(`button-${variant}-default`);
      await button.waitFor({ state: 'visible' });

      await expect(button).toHaveScreenshot(`button-${variant}-default.png`, {
        animations: 'disabled',
      });
    });
  }

  // Test all button sizes (using default variant)
  const sizes = ['default', 'sm', 'lg', 'icon'];

  for (const size of sizes) {
    test(`button size: ${size}`, async ({ page }) => {
      await page.goto(`/visual-test-harness/button?variant=default&size=${size}`);

      const button = page.getByTestId(`button-default-${size}`);
      await button.waitFor({ state: 'visible' });

      await expect(button).toHaveScreenshot(`button-size-${size}.png`, {
        animations: 'disabled',
      });
    });
  }

  // Test disabled state for each variant
  for (const variant of variants) {
    test(`button variant ${variant} - disabled`, async ({ page }) => {
      await page.goto(`/visual-test-harness/button?variant=${variant}&size=default&state=disabled`);

      const button = page.getByTestId(`button-${variant}-default-disabled`);
      await button.waitFor({ state: 'visible' });

      await expect(button).toHaveScreenshot(`button-${variant}-disabled.png`, {
        animations: 'disabled',
      });
    });
  }

  // Test combinations: destructive + large (common use case)
  test('button destructive large', async ({ page }) => {
    await page.goto('/visual-test-harness/button?variant=destructive&size=lg');

    const button = page.getByTestId('button-destructive-lg');
    await button.waitFor({ state: 'visible' });

    await expect(button).toHaveScreenshot('button-destructive-large.png', {
      animations: 'disabled',
    });
  });

  // Test combinations: outline + small (common use case)
  test('button outline small', async ({ page }) => {
    await page.goto('/visual-test-harness/button?variant=outline&size=sm');

    const button = page.getByTestId('button-outline-sm');
    await button.waitFor({ state: 'visible' });

    await expect(button).toHaveScreenshot('button-outline-small.png', {
      animations: 'disabled',
    });
  });
});
