import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Loading States Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${VISUAL_TEST_PAGE}#loading`);
    await setupVisualTest(page);
    // Don't wait too long for loading animations since we want to capture them
    await page.waitForTimeout(300);
  });

  test('loading section full', async ({ page }) => {
    const section = page.getByTestId('loading-section');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('loading-section.png');
  });

  test('full loading section', async ({ page }) => {
    const section = page.locator('#loading');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot('loading-section-full.png');
  });

  test('loading spinners', async ({ page }) => {
    const spinners = page.getByTestId('loading-spinners');
    await spinners.scrollIntoViewIfNeeded();
    await expect(spinners).toHaveScreenshot('loading-spinners.png');
  });

  test('skeleton loaders', async ({ page }) => {
    const skeletons = page.getByTestId('skeleton-loaders');
    await skeletons.scrollIntoViewIfNeeded();
    await expect(skeletons).toHaveScreenshot('skeleton-loaders.png');
  });

  test('loading spinner sizes comparison', async ({ page }) => {
    const spinners = page.getByTestId('loading-spinners');
    await spinners.scrollIntoViewIfNeeded();

    // Capture the spinner container
    await expect(spinners).toHaveScreenshot('spinner-sizes-comparison.png');
  });

  test('skeleton card preview', async ({ page }) => {
    // Scroll to product card skeleton section
    const loadingSection = page.getByTestId('loading-section');
    await loadingSection.scrollIntoViewIfNeeded();

    // Find the product card skeleton grid (4 skeleton cards)
    const skeletonCards = loadingSection.locator('.grid').last();
    await expect(skeletonCards).toHaveScreenshot('skeleton-cards-grid.png');
  });

  test('individual skeleton line', async ({ page }) => {
    const skeletons = page.getByTestId('skeleton-loaders');
    await skeletons.scrollIntoViewIfNeeded();

    // Capture first skeleton line
    const firstSkeleton = skeletons.locator('.animate-pulse').first();
    await expect(firstSkeleton).toHaveScreenshot('skeleton-line-single.png');
  });

  test('skeleton item card', async ({ page }) => {
    const skeletons = page.getByTestId('skeleton-loaders');
    await skeletons.scrollIntoViewIfNeeded();

    // Capture the skeleton item card (image + text)
    const skeletonCard = skeletons.locator('.flex.gap-4');
    await expect(skeletonCard).toHaveScreenshot('skeleton-item-card.png');
  });
});
