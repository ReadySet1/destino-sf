import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Footer Visual Tests', () => {
  test.describe('Test Page Footer Preview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${VISUAL_TEST_PAGE}#footer`);
      await setupVisualTest(page);
      await waitForAnimations(page);
    });

    test('footer preview', async ({ page }) => {
      const section = page.getByTestId('footer-preview');
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot('footer-preview.png');
    });

    test('full footer section', async ({ page }) => {
      const section = page.locator('#footer');
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot('footer-section-full.png');
    });
  });

  test.describe('Actual Site Footer', () => {
    test('homepage footer desktop', async ({ page }) => {
      await page.goto('/');
      await setupVisualTest(page);
      await waitForAnimations(page);

      // Scroll to the bottom of the page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Try to find footer element
      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toHaveScreenshot('footer-homepage-desktop.png');
      }
    });

    test('store page footer', async ({ page }) => {
      await page.goto('/store');
      await setupVisualTest(page);
      await waitForAnimations(page);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toHaveScreenshot('footer-store-page.png');
      }
    });

    test('about page footer', async ({ page }) => {
      await page.goto('/about');
      await setupVisualTest(page);
      await waitForAnimations(page);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toHaveScreenshot('footer-about-page.png');
      }
    });
  });

  test.describe('Mobile Footer', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('footer mobile view', async ({ page }) => {
      await page.goto('/');
      await setupVisualTest(page);
      await waitForAnimations(page);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      const footer = page.locator('footer').first();
      if (await footer.isVisible()) {
        await expect(footer).toHaveScreenshot('footer-mobile.png');
      }
    });
  });
});
