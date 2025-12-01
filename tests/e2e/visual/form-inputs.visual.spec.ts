import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Form Inputs Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#form-inputs`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('text inputs', async ({ page }) => {
    const section = page.getByTestId('text-inputs');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('text-inputs.png');
  });

  test('textarea inputs', async ({ page }) => {
    const section = page.getByTestId('textarea-inputs');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('textarea-inputs.png');
  });

  test('select inputs', async ({ page }) => {
    const section = page.getByTestId('select-inputs');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('select-inputs.png');
  });

  test('checkbox and radio inputs', async ({ page }) => {
    const section = page.getByTestId('checkbox-radio-inputs');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('checkbox-radio-inputs.png');
  });

  test('full form inputs section', async ({ page }) => {
    const section = page.locator('#form-inputs');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('form-inputs-section-full.png');
  });

  test('input focus state', async ({ page }) => {
    const input = page.locator('#input-default');
    await input.scrollIntoViewIfNeeded();
    await input.focus();
    await page.waitForTimeout(100);
    await expect(input).toHaveScreenshot('input-focus.png');
  });

  test('input with value', async ({ page }) => {
    const input = page.locator('#input-default');
    await input.scrollIntoViewIfNeeded();
    await input.fill('Test input value');
    await expect(input).toHaveScreenshot('input-filled.png');
  });

  test('select dropdown open', async ({ page }) => {
    // Click the first select trigger to open dropdown
    const selectTrigger = page.getByTestId('select-inputs').locator('button').first();
    await selectTrigger.scrollIntoViewIfNeeded();
    await selectTrigger.click();
    await page.waitForTimeout(300);

    // Capture the full page since dropdown uses portal
    await expect(page).toHaveScreenshot('select-dropdown-open.png');
  });

  test('checkbox checked state', async ({ page }) => {
    const checkboxSection = page.getByTestId('checkbox-radio-inputs');
    const uncheckedCheckbox = page.locator('#checkbox-unchecked');

    await checkboxSection.scrollIntoViewIfNeeded();
    await uncheckedCheckbox.click();
    await page.waitForTimeout(100);

    await expect(checkboxSection).toHaveScreenshot('checkbox-after-check.png');
  });
});
