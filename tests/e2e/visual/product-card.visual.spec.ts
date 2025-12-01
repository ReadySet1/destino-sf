import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Product Card Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#product-card`);
    await setupVisualTest(page);
    await waitForAnimations(page);
  });

  test('product cards grid', async ({ page }) => {
    const section = page.getByTestId('product-cards');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('product-cards-grid.png');
  });

  test('full product card section', async ({ page }) => {
    const section = page.locator('#product-card');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('product-card-section-full.png');
  });

  test('product card with hover', async ({ page }) => {
    const productCard = page.getByTestId('product-cards').locator('.border').first();
    await productCard.scrollIntoViewIfNeeded();
    await productCard.hover();
    await page.waitForTimeout(100);
    await expect(productCard).toHaveScreenshot('product-card-hover.png');
  });

  test('product card add to cart button hover', async ({ page }) => {
    const addButton = page.getByTestId('product-cards').getByRole('button', { name: 'Add to Cart' }).first();
    await addButton.scrollIntoViewIfNeeded();
    await addButton.hover();
    await page.waitForTimeout(100);
    await expect(addButton).toHaveScreenshot('product-card-button-hover.png');
  });

  test('individual product card - standard', async ({ page }) => {
    const cards = page.getByTestId('product-cards').locator('.border');
    const standardCard = cards.nth(0);
    await standardCard.scrollIntoViewIfNeeded();
    await expect(standardCard).toHaveScreenshot('product-card-standard.png');
  });

  test('individual product card - with badge', async ({ page }) => {
    const cards = page.getByTestId('product-cards').locator('.border');
    const badgeCard = cards.nth(1);
    await badgeCard.scrollIntoViewIfNeeded();
    await expect(badgeCard).toHaveScreenshot('product-card-with-badge.png');
  });

  test('individual product card - pre-order', async ({ page }) => {
    const cards = page.getByTestId('product-cards').locator('.border');
    const preorderCard = cards.nth(2);
    await preorderCard.scrollIntoViewIfNeeded();
    await expect(preorderCard).toHaveScreenshot('product-card-preorder.png');
  });

  test('individual product card - out of stock', async ({ page }) => {
    const cards = page.getByTestId('product-cards').locator('.border');
    const outOfStockCard = cards.nth(3);
    await outOfStockCard.scrollIntoViewIfNeeded();
    await expect(outOfStockCard).toHaveScreenshot('product-card-out-of-stock.png');
  });
});
