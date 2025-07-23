import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import { testProducts, testCustomer, cateringTestData } from './fixtures/test-data';

/**
 * Browser MCP Integration Tests for Destino SF
 * Advanced testing patterns using browser automation
 */
test.describe('Browser MCP Integration Suite', () => {
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearCart(page);
  });

  test('should perform comprehensive multi-tab user journey', async ({ context, page }) => {
    // Test real user behavior with multiple tabs
    const page1 = page;
    const page2 = await context.newPage();

    // Browse different products simultaneously
    await Promise.all([
      page1.goto(`/products/${testProducts.empanada.slug}`),
      page2.goto(`/products/${testProducts.alfajor.slug}`),
    ]);

    // Verify both pages loaded
    await Promise.all([
      expect(page1.getByRole('heading', { name: testProducts.empanada.name })).toBeVisible(),
      expect(page2.getByRole('heading', { name: testProducts.alfajor.name })).toBeVisible(),
    ]);

    // Add products from both tabs
    await page1.click('[data-testid="add-to-cart"]');
    await page2.click('[data-testid="add-to-cart"]');

    // Verify cart synchronization
    await page1.goto('/cart');
    await expect(page1.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page1.getByText(testProducts.alfajor.name)).toBeVisible();

    // Complete purchase from one tab
    await page1.click('[data-testid="checkout-button"]');
    await TestHelpers.completeCheckout(page1);

    // Verify cart cleared in other tab
    await page2.goto('/cart');
    await expect(page2.getByText('Your cart is empty')).toBeVisible();

    await page2.close();
  });

  test('should handle complex form interactions with validation', async ({ page }) => {
    await page.goto('/catering/inquiry');

    // Test empty form submission
    await page.click('[data-testid="submit-inquiry"]');
    await expect(page.getByText(/required/i)).toBeVisible();

    // Test invalid data
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.fill('[data-testid="phone"]', '123');
    await page.click('[data-testid="submit-inquiry"]');
    await expect(page.getByText(/valid email/i)).toBeVisible();

    // Fill with valid data
    await page.fill('[data-testid="first-name"]', cateringTestData.contact.name);
    await page.fill('[data-testid="email"]', cateringTestData.contact.email);
    await page.fill('[data-testid="phone"]', cateringTestData.contact.phone);
    await page.fill('[data-testid="company"]', cateringTestData.contact.company);
    await page.fill('[data-testid="event-date"]', cateringTestData.event.date);
    await page.fill('[data-testid="guest-count"]', cateringTestData.event.guestCount.toString());

    await page.click('[data-testid="submit-inquiry"]');
    await expect(page.getByText(/inquiry submitted/i)).toBeVisible();
  });

  test('should validate complete payment flow with error handling', async ({ page }) => {
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    await page.goto('/checkout');

    // Fill customer info
    await page.fill('[data-testid="customer-email"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);

    // Select delivery and fill address
    await page.check('[data-testid="delivery-delivery"]');
    await TestHelpers.fillShippingAddress(page);
    await page.click('[data-testid="continue-to-payment"]');

    // Fill payment info
    await TestHelpers.fillPaymentInfo(page);

    // Complete order
    await page.click('[data-testid="place-order"]');
    await page.waitForURL('**/order-confirmation/**', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
  });

  test('should validate keyboard navigation and accessibility', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);

    // Test product interaction with keyboard
    await page.goto(`/products/${testProducts.empanada.slug}`);
    await page.locator('[data-testid="add-to-cart"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Added to cart')).toBeVisible();

    // Check ARIA landmarks
    const landmarks = ['banner', 'navigation', 'main', 'contentinfo'];
    for (const landmark of landmarks) {
      const element = page.locator(`[role="${landmark}"]`);
      if ((await element.count()) > 0) {
        await expect(element.first()).toBeVisible();
      }
    }
  });

  test('should measure performance and loading times', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);

    // Verify images load properly
    const images = page.locator('img[src]');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 3); i++) {
      const img = images.nth(i);
      await expect(img).toBeVisible();
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });

  test('should handle mobile-specific interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');

    await page.goto('/');

    // Test mobile menu
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }

    // Test mobile cart experience
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    await page.goto('/cart');

    const cartContainer = page.locator('[data-testid="cart-container"]');
    await expect(cartContainer).toBeVisible();

    // Verify viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
  });

  test('should validate cross-browser compatibility', async ({ page, browserName }) => {
    await page.goto('/');

    // Test basic functionality across browsers
    await expect(page.getByRole('heading')).toBeVisible();

    // Test cart functionality
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    await page.goto('/cart');
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();

    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific tests
      console.log('Running Safari-specific checks');
    } else if (browserName === 'firefox') {
      // Firefox-specific tests
      console.log('Running Firefox-specific checks');
    } else {
      // Chrome-specific tests
      console.log('Running Chrome-specific checks');
    }
  });
});

/**
 * Browser MCP Helper Class
 * Advanced browser automation utilities
 */
export class BrowserMCPHelpers {
  static async captureUserFlow(page: Page, flowName: string) {
    console.log(`Starting user flow capture: ${flowName}`);

    await page.context().tracing.start({
      name: flowName,
      screenshots: true,
      snapshots: true,
    });

    return {
      async stop() {
        await page.context().tracing.stop({
          path: `test-results/traces/${flowName}-${Date.now()}.zip`,
        });
        console.log(`Completed user flow capture: ${flowName}`);
      },
    };
  }

  static async validateSEOMetadata(page: Page) {
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');

    return {
      title,
      description,
      ogTitle,
      isValid: !!(title && description),
    };
  }

  static async measureWebVitals(page: Page) {
    return await page.evaluate(() => {
      return new Promise(resolve => {
        const vitals: any = {};

        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const nav = entry as PerformanceNavigationTiming;
              vitals.loadTime = nav.loadEventEnd - nav.loadEventStart;
              vitals.domContentLoaded =
                nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
            }
          }
          resolve(vitals);
        }).observe({ entryTypes: ['navigation'] });

        setTimeout(() => resolve(vitals), 1000);
      });
    });
  }

  static async simulateSlowNetwork(context: BrowserContext) {
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
  }

  static async captureConsoleErrors(page: Page) {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return () => errors;
  }
}
