import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Cart Item Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#cart-item`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('cart items list', async ({ page }) => {
    const section = page.getByTestId('cart-items');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('cart-items-list.png');
  });

  test('full cart item section', async ({ page }) => {
    const section = page.locator('#cart-item');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('cart-item-section-full.png');
  });

  test('cart item row', async ({ page }) => {
    const cartItemRow = page.getByTestId('cart-items').locator('.flex.items-center').first();
    await cartItemRow.scrollIntoViewIfNeeded();
    await expect(cartItemRow).toHaveScreenshot('cart-item-row.png');
  });

  test('quantity stepper buttons hover', async ({ page }) => {
    const minusButton = page.getByTestId('cart-items').locator('button').filter({ has: page.locator('svg') }).first();
    await minusButton.scrollIntoViewIfNeeded();
    await minusButton.hover();
    await page.waitForTimeout(100);
    await expect(minusButton).toHaveScreenshot('cart-quantity-minus-hover.png');
  });

  test('remove button hover', async ({ page }) => {
    const removeButton = page.getByTestId('cart-items').locator('button.text-gray-400').first();
    await removeButton.scrollIntoViewIfNeeded();
    await removeButton.hover();
    await page.waitForTimeout(100);
    await expect(removeButton).toHaveScreenshot('cart-remove-button-hover.png');
  });

  test('cart total section', async ({ page }) => {
    const totalSection = page.getByTestId('cart-items').locator('.border-t');
    await totalSection.scrollIntoViewIfNeeded();
    await expect(totalSection).toHaveScreenshot('cart-total-section.png');
  });
});
