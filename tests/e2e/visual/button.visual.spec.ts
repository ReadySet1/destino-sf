import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Button Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#buttons`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('button variants', async ({ page }) => {
    const section = page.getByTestId('button-variants');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('button-variants.png');
  });

  test('button sizes', async ({ page }) => {
    const section = page.getByTestId('button-sizes');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('button-sizes.png');
  });

  test('button states', async ({ page }) => {
    const section = page.getByTestId('button-states');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('button-states.png');
  });

  test('buttons with icons', async ({ page }) => {
    const section = page.getByTestId('button-icons');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('button-icons.png');
  });

  test('full buttons section', async ({ page }) => {
    const section = page.locator('#buttons');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('buttons-section-full.png');
  });

  test('button hover state', async ({ page }) => {
    const defaultButton = page.getByTestId('button-variants').getByRole('button', { name: 'Default' });
    await defaultButton.scrollIntoViewIfNeeded();
    await defaultButton.hover();
    await page.waitForTimeout(100);
    await expect(defaultButton).toHaveScreenshot('button-hover-default.png');
  });

  test('button focus state', async ({ page }) => {
    const defaultButton = page.getByTestId('button-variants').getByRole('button', { name: 'Default' });
    await defaultButton.scrollIntoViewIfNeeded();
    await defaultButton.focus();
    await page.waitForTimeout(100);
    await expect(defaultButton).toHaveScreenshot('button-focus-default.png');
  });
});
