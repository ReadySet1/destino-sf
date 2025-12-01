import { test, expect } from '@playwright/test';
import { VISUAL_TEST_PAGE, setupVisualTest, waitForAnimations } from './visual-test-utils';

test.describe('Navigation Visual Tests', () => {
  test.describe('Test Page Navigation Preview', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${VISUAL_TEST_PAGE}#navigation`);
      await setupVisualTest(page);
      await waitForAnimations(page);
    });

    test('navigation preview', async ({ page }) => {
      const section = page.getByTestId('navigation-preview');
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot('navigation-preview.png');
    });

    test('full navigation section', async ({ page }) => {
      const section = page.locator('#navigation');
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot('navigation-section-full.png');
    });
  });

  test.describe('Actual Site Navigation', () => {
    test('homepage navbar desktop', async ({ page }) => {
      await page.goto('/');
      await setupVisualTest(page);
      await waitForAnimations(page);

      // Capture just the top portion of the page where navbar is
      const navbar = page.locator('nav').first();
      if (await navbar.isVisible()) {
        await expect(navbar).toHaveScreenshot('navbar-homepage-desktop.png');
      } else {
        // Fallback: capture header area
        await expect(page).toHaveScreenshot('homepage-header-desktop.png', {
          clip: { x: 0, y: 0, width: 1920, height: 100 },
        });
      }
    });

    test('store page navbar', async ({ page }) => {
      await page.goto('/store');
      await setupVisualTest(page);
      await waitForAnimations(page);

      const navbar = page.locator('nav').first();
      if (await navbar.isVisible()) {
        await expect(navbar).toHaveScreenshot('navbar-store-page.png');
      }
    });

    test('catering page navbar', async ({ page }) => {
      await page.goto('/catering');
      await setupVisualTest(page);
      await waitForAnimations(page);

      const navbar = page.locator('nav').first();
      if (await navbar.isVisible()) {
        await expect(navbar).toHaveScreenshot('navbar-catering-page.png');
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('mobile navbar collapsed', async ({ page }) => {
      await page.goto('/');
      await setupVisualTest(page);
      await waitForAnimations(page);

      // Capture header area for mobile
      await expect(page).toHaveScreenshot('navbar-mobile-collapsed.png', {
        clip: { x: 0, y: 0, width: 375, height: 80 },
      });
    });

    test('mobile menu expanded', async ({ page }) => {
      await page.goto('/');
      await setupVisualTest(page);
      await waitForAnimations(page);

      // Try to find and click the mobile menu button (hamburger)
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [data-testid="mobile-menu-button"]').first();

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500); // Wait for menu animation

        // Capture the expanded mobile menu
        await expect(page).toHaveScreenshot('navbar-mobile-expanded.png');
      }
    });
  });
});
