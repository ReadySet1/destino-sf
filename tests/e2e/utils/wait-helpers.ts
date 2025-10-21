import { Page, Locator, expect } from '@playwright/test';

/**
 * Reliable wait helper utilities for E2E tests
 * Replaces hard-coded timeouts with state-based waits
 */
export class WaitHelpers {
  /**
   * Wait for network to be idle (no pending requests)
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 30000) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for DOM to be fully loaded
   */
  static async waitForDOMReady(page: Page, timeout: number = 30000) {
    await page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Wait for element to be visible and stable (not animating)
   */
  static async waitForElementStable(
    locator: Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;

    // Wait for element to be visible
    await expect(locator).toBeVisible({ timeout });

    // Wait for element to be stable (not animating)
    await locator.waitFor({ state: 'visible', timeout });

    // Additional stability check - element position shouldn't change
    const box1 = await locator.boundingBox();
    await page.waitForTimeout(100); // Minimal wait
    const box2 = await locator.boundingBox();

    // If positions don't match, element is still animating
    if (box1 && box2 && (box1.x !== box2.x || box1.y !== box2.y)) {
      await page.waitForTimeout(300); // Wait for animation to complete
    }
  }

  /**
   * Wait for cart update to complete (replaces hard-coded timeouts)
   */
  static async waitForCartUpdate(page: Page): Promise<void> {
    // Wait for any pending cart API requests to complete
    await Promise.race([
      page.waitForResponse(response =>
        response.url().includes('/api/cart') && response.status() === 200,
        { timeout: 5000 }
      ).catch(() => {
        // If no cart API call, just wait for network idle
        return page.waitForLoadState('networkidle', { timeout: 5000 });
      }),
      page.waitForLoadState('networkidle', { timeout: 5000 })
    ]);
  }

  /**
   * Wait for authentication to complete
   */
  static async waitForAuthStateChange(page: Page): Promise<void> {
    // Wait for auth cookie or localStorage change
    await Promise.race([
      page.waitForResponse(response =>
        response.url().includes('/api/auth') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => {}),
      page.waitForLoadState('networkidle', { timeout: 10000 })
    ]);
  }

  /**
   * Wait for toast/notification to appear and optionally disappear
   */
  static async waitForNotification(
    page: Page,
    text: string | RegExp,
    options: { waitForDismiss?: boolean; timeout?: number } = {}
  ): Promise<void> {
    const { waitForDismiss = false, timeout = 5000 } = options;

    const notification = page.getByText(text);
    await expect(notification).toBeVisible({ timeout });

    if (waitForDismiss) {
      await expect(notification).toBeHidden({ timeout: timeout + 5000 });
    }
  }

  /**
   * Wait for one of multiple selectors to be visible (first match wins)
   */
  static async waitForAnySelector(
    page: Page,
    selectors: string[],
    options: { timeout?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        const locator = page.locator(selector);
        const isVisible = await locator.isVisible().catch(() => false);

        if (isVisible) {
          return locator;
        }
      }

      await page.waitForTimeout(100); // Small poll interval
    }

    throw new Error(`None of the selectors were visible within ${timeout}ms: ${selectors.join(', ')}`);
  }

  /**
   * Wait for URL to match pattern (with retry)
   */
  static async waitForURL(
    page: Page,
    urlPattern: string | RegExp,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 10000 } = options;
    await page.waitForURL(urlPattern, { timeout });
  }

  /**
   * Wait for element to be removed from DOM
   */
  static async waitForElementRemoved(
    locator: Locator,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 5000 } = options;
    await expect(locator).toBeHidden({ timeout });
  }

  /**
   * Wait for cart item count to update
   */
  static async waitForCartCountUpdate(
    page: Page,
    expectedCount: number,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const { timeout = 5000 } = options;

    // Look for cart count badge
    const cartBadge = page.locator('[data-testid="cart-count"], [aria-label*="cart"] [data-count]');

    await expect(cartBadge).toHaveText(String(expectedCount), { timeout });
  }

  /**
   * Retry an action until it succeeds or times out
   */
  static async retryUntilSuccess<T>(
    action: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      errorMessage?: string;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, errorMessage = 'Action failed after retries' } = options;

    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error as Error;

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw new Error(`${errorMessage}: ${lastError?.message}`);
  }
}
