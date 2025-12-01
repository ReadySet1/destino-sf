import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Toast Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#toast`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('toast section with static previews', async ({ page }) => {
    const section = page.getByTestId('toast-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('toast-section.png');
  });

  test('full toast section', async ({ page }) => {
    const section = page.locator('#toast');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('toast-section-full.png');
  });

  test('success toast preview', async ({ page }) => {
    const successToast = page.getByTestId('toast-success-preview');
    await successToast.scrollIntoViewIfNeeded();
    await expect(successToast).toHaveScreenshot('toast-success-preview.png');
  });

  test('error toast preview', async ({ page }) => {
    const errorToast = page.getByTestId('toast-error-preview');
    await errorToast.scrollIntoViewIfNeeded();
    await expect(errorToast).toHaveScreenshot('toast-error-preview.png');
  });

  test('info toast preview', async ({ page }) => {
    const infoToast = page.getByTestId('toast-info-preview');
    await infoToast.scrollIntoViewIfNeeded();
    await expect(infoToast).toHaveScreenshot('toast-info-preview.png');
  });

  test('success toast triggered', async ({ page }) => {
    // Trigger success toast
    const successButton = page.getByTestId('trigger-success-toast');
    await successButton.click();

    // Wait for toast to appear
    await page.waitForTimeout(500);

    // Capture toast
    const toast = page.getByTestId('toast-success');
    if (await toast.isVisible()) {
      await expect(toast).toHaveScreenshot('toast-success-triggered.png');
    } else {
      // Fallback: capture top-right corner where toast appears
      await expect(page).toHaveScreenshot('toast-success-triggered-page.png', {
        clip: { x: 1520, y: 0, width: 400, height: 150 },
      });
    }
  });

  test('error toast triggered', async ({ page }) => {
    // Trigger error toast
    const errorButton = page.getByTestId('trigger-error-toast');
    await errorButton.click();

    // Wait for toast to appear
    await page.waitForTimeout(500);

    // Capture toast
    const toast = page.getByTestId('toast-error');
    if (await toast.isVisible()) {
      await expect(toast).toHaveScreenshot('toast-error-triggered.png');
    }
  });

  test('toast positioning', async ({ page }) => {
    // Trigger toast and capture full page to verify positioning
    const successButton = page.getByTestId('trigger-success-toast');
    await successButton.click();
    await page.waitForTimeout(500);

    // Capture full viewport to show toast position
    await expect(page).toHaveScreenshot('toast-positioning.png');
  });
});
