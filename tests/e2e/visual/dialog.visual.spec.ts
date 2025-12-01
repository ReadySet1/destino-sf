import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Dialog Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#dialog`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('dialog section with static preview', async ({ page }) => {
    const section = page.getByTestId('dialog-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('dialog-section.png');
  });

  test('dialog preview static', async ({ page }) => {
    const preview = page.getByTestId('dialog-preview');
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toHaveScreenshot('dialog-preview-static.png');
  });

  test('full dialog section', async ({ page }) => {
    const section = page.locator('#dialog');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('dialog-section-full.png');
  });

  test('dialog open state', async ({ page }) => {
    // Click the dialog trigger button
    const trigger = page.getByTestId('dialog-trigger');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    // Wait for dialog to open
    await page.waitForTimeout(300);

    // Capture the full page with dialog overlay
    await expect(page).toHaveScreenshot('dialog-open-fullpage.png');
  });

  test('dialog content', async ({ page }) => {
    // Open the dialog
    const trigger = page.getByTestId('dialog-trigger');
    await trigger.click();
    await page.waitForTimeout(300);

    // Find and capture just the dialog content
    const dialogContent = page.getByTestId('dialog-content');
    if (await dialogContent.isVisible()) {
      await expect(dialogContent).toHaveScreenshot('dialog-content.png');
    }
  });

  test('dialog close on cancel', async ({ page }) => {
    // Open the dialog
    const trigger = page.getByTestId('dialog-trigger');
    await trigger.click();
    await page.waitForTimeout(300);

    // Click cancel button
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();
    await page.waitForTimeout(300);

    // Verify dialog is closed (page should not have overlay)
    const section = page.locator('#dialog');
    await expect(section).toHaveScreenshot('dialog-after-close.png');
  });
});
