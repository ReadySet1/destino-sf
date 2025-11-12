/**
 * Form Input Components Visual Regression Tests
 *
 * Tests all form input components for visual consistency:
 * - Input (text, with placeholder, error, disabled)
 * - Textarea (default, error, disabled)
 * - Checkbox (unchecked, checked, disabled)
 * - Radio Group (unselected, selected, disabled)
 * - Switch (off, on, disabled)
 */

import { test, expect } from '@playwright/test';

test.describe('Input Visual Regression', () => {
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

  test('input default state', async ({ page }) => {
    await page.goto('/visual-test-harness/input');

    const input = page.getByTestId('input');
    await input.waitFor({ state: 'visible' });

    await expect(input).toHaveScreenshot('input-default.png', {
      animations: 'disabled',
    });
  });

  test('input disabled state', async ({ page }) => {
    await page.goto('/visual-test-harness/input?state=disabled');

    const input = page.getByTestId('input-disabled');
    await input.waitFor({ state: 'visible' });

    await expect(input).toHaveScreenshot('input-disabled.png', {
      animations: 'disabled',
    });
  });

  test('input error state', async ({ page }) => {
    await page.goto('/visual-test-harness/input?state=error');

    const input = page.getByTestId('input-error');
    await input.waitFor({ state: 'visible' });

    await expect(input).toHaveScreenshot('input-error.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Textarea Visual Regression', () => {
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

  test('textarea default state', async ({ page }) => {
    await page.goto('/visual-test-harness/textarea');

    const textarea = page.getByTestId('textarea');
    await textarea.waitFor({ state: 'visible' });

    await expect(textarea).toHaveScreenshot('textarea-default.png', {
      animations: 'disabled',
    });
  });

  test('textarea disabled state', async ({ page }) => {
    await page.goto('/visual-test-harness/textarea?state=disabled');

    const textarea = page.getByTestId('textarea-disabled');
    await textarea.waitFor({ state: 'visible' });

    await expect(textarea).toHaveScreenshot('textarea-disabled.png', {
      animations: 'disabled',
    });
  });

  test('textarea error state', async ({ page }) => {
    await page.goto('/visual-test-harness/textarea?state=error');

    const textarea = page.getByTestId('textarea-error');
    await textarea.waitFor({ state: 'visible' });

    await expect(textarea).toHaveScreenshot('textarea-error.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Checkbox Visual Regression', () => {
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

  test('checkbox unchecked', async ({ page }) => {
    await page.goto('/visual-test-harness/checkbox');

    const checkbox = page.getByTestId('checkbox');
    await checkbox.waitFor({ state: 'visible' });

    await expect(checkbox).toHaveScreenshot('checkbox-unchecked.png', {
      animations: 'disabled',
    });
  });

  test('checkbox checked', async ({ page }) => {
    await page.goto('/visual-test-harness/checkbox?state=checked');

    const checkbox = page.getByTestId('checkbox-checked');
    await checkbox.waitFor({ state: 'visible' });

    await expect(checkbox).toHaveScreenshot('checkbox-checked.png', {
      animations: 'disabled',
    });
  });

  test('checkbox disabled', async ({ page }) => {
    await page.goto('/visual-test-harness/checkbox?state=disabled');

    const checkbox = page.getByTestId('checkbox-disabled');
    await checkbox.waitFor({ state: 'visible' });

    await expect(checkbox).toHaveScreenshot('checkbox-disabled.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Radio Group Visual Regression', () => {
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

  test('radio group unselected', async ({ page }) => {
    await page.goto('/visual-test-harness/radio');

    const radio = page.getByTestId('radio-option-1');
    await radio.waitFor({ state: 'visible' });

    await expect(radio).toHaveScreenshot('radio-unselected.png', {
      animations: 'disabled',
    });
  });

  test('radio group selected', async ({ page }) => {
    await page.goto('/visual-test-harness/radio?state=selected');

    const radio = page.getByTestId('radio-option-1');
    await radio.waitFor({ state: 'visible' });

    await expect(radio).toHaveScreenshot('radio-selected.png', {
      animations: 'disabled',
    });
  });

  test('radio group disabled', async ({ page }) => {
    await page.goto('/visual-test-harness/radio?state=disabled');

    const radio = page.getByTestId('radio-option-1');
    await radio.waitFor({ state: 'visible' });

    await expect(radio).toHaveScreenshot('radio-disabled.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Switch Visual Regression', () => {
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

  test('switch off', async ({ page }) => {
    await page.goto('/visual-test-harness/switch');

    const switchElement = page.getByTestId('switch');
    await switchElement.waitFor({ state: 'visible' });

    await expect(switchElement).toHaveScreenshot('switch-off.png', {
      animations: 'disabled',
    });
  });

  test('switch on', async ({ page }) => {
    await page.goto('/visual-test-harness/switch?state=checked');

    const switchElement = page.getByTestId('switch-checked');
    await switchElement.waitFor({ state: 'visible' });

    await expect(switchElement).toHaveScreenshot('switch-on.png', {
      animations: 'disabled',
    });
  });

  test('switch disabled', async ({ page }) => {
    await page.goto('/visual-test-harness/switch?state=disabled');

    const switchElement = page.getByTestId('switch-disabled');
    await switchElement.waitFor({ state: 'visible' });

    await expect(switchElement).toHaveScreenshot('switch-disabled.png', {
      animations: 'disabled',
    });
  });
});
