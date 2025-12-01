import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Error Display Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#error-display`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('error displays section', async ({ page }) => {
    const section = page.getByTestId('error-displays');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('error-displays-section.png');
  });

  test('full error display section', async ({ page }) => {
    const section = page.locator('#error-display');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('error-display-section-full.png');
  });

  test('default error display', async ({ page }) => {
    const errorDisplays = page.getByTestId('error-displays');
    await errorDisplays.scrollIntoViewIfNeeded();

    // Find the default error display (first one)
    const defaultError = errorDisplays.locator('.bg-red-50').first();
    await expect(defaultError).toHaveScreenshot('error-display-default.png');
  });

  test('custom error display - payment failed', async ({ page }) => {
    const errorDisplays = page.getByTestId('error-displays');
    await errorDisplays.scrollIntoViewIfNeeded();

    // Find the payment failed error (second one)
    const paymentError = errorDisplays.locator('.bg-red-50').nth(1);
    await expect(paymentError).toHaveScreenshot('error-display-payment-failed.png');
  });

  test('not found error display', async ({ page }) => {
    const errorDisplays = page.getByTestId('error-displays');
    await errorDisplays.scrollIntoViewIfNeeded();

    // Find the not found error (third one)
    const notFoundError = errorDisplays.locator('.bg-red-50').nth(2);
    await expect(notFoundError).toHaveScreenshot('error-display-not-found.png');
  });

  test('error display link hover', async ({ page }) => {
    const errorDisplays = page.getByTestId('error-displays');
    await errorDisplays.scrollIntoViewIfNeeded();

    // Hover over the return link in first error
    const returnLink = errorDisplays.locator('a').first();
    await returnLink.hover();
    await page.waitForTimeout(100);

    await expect(returnLink).toHaveScreenshot('error-display-link-hover.png');
  });
});

test.describe('Actual Error Pages', () => {
  test('404 page', async ({ page }) => {
    // Navigate to a non-existent page
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForTimeout(500);

    // Capture the 404 page
    await expect(page).toHaveScreenshot('404-page.png');
  });

  test('error boundary (if triggered)', async ({ page }) => {
    // Navigate to error page if it exists
    await page.goto('/error');
    await page.waitForTimeout(500);

    // Capture what's shown
    await expect(page).toHaveScreenshot('error-page.png');
  });
});
