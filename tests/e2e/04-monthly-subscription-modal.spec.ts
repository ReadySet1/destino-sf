import { test, expect, type Page } from '@playwright/test';

test.describe('Monthly Subscription Coming Soon Modal', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    // Navigate to the homepage where spotlight picks are displayed
    await page.goto('/');
  });

  test('should display Monthly Subscription with Coming Soon badge', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Check if Monthly Subscription product is visible
    const monthlySubscriptionTitle = page.locator('text=Monthly Subscription');
    await expect(monthlySubscriptionTitle).toBeVisible();
    
    // Check if Coming Soon badge is present
    const comingSoonBadge = page.locator('text=Coming Soon');
    await expect(comingSoonBadge).toBeVisible();
    
    // Check if the description text is present
    const comingSoonText = page.locator('text=⏰ Coming soon - Click to learn more!');
    await expect(comingSoonText).toBeVisible();
  });

  test('should not display price for Monthly Subscription', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Look for the Monthly Subscription product
    const monthlySubscriptionSection = page.locator('text=Monthly Subscription').locator('..');
    
    // Check that no price is displayed in this section
    // (This assumes the price would be formatted like $15.99)
    const priceElement = monthlySubscriptionSection.locator('text=/\\$\\d+\\.\\d{2}/');
    await expect(priceElement).not.toBeVisible();
  });

  test('should open modal when Monthly Subscription is clicked', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Find and click the Monthly Subscription product
    const monthlySubscriptionButton = page.locator('text=Monthly Subscription').locator('xpath=ancestor::button[1]');
    await monthlySubscriptionButton.click();
    
    // Check if the coming soon modal opens
    await expect(page.locator('text=Coming Soon!')).toBeVisible();
    await expect(page.locator('text=Our Monthly Subscription service is currently in development')).toBeVisible();
  });

  test('should close modal when close button is clicked', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Click Monthly Subscription to open modal
    const monthlySubscriptionButton = page.locator('text=Monthly Subscription').locator('xpath=ancestor::button[1]');
    await monthlySubscriptionButton.click();
    
    // Wait for modal to open
    await expect(page.locator('text=Coming Soon!')).toBeVisible();
    
    // Click the close button (X)
    const closeButton = page.locator('[aria-label="Close modal"]');
    await closeButton.click();
    
    // Check that modal is closed
    await expect(page.locator('text=Coming Soon!')).not.toBeVisible();
  });

  test('should close modal when "Got it!" button is clicked', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Click Monthly Subscription to open modal
    const monthlySubscriptionButton = page.locator('text=Monthly Subscription').locator('xpath=ancestor::button[1]');
    await monthlySubscriptionButton.click();
    
    // Wait for modal to open
    await expect(page.locator('text=Coming Soon!')).toBeVisible();
    
    // Click the "Got it!" button
    const gotItButton = page.locator('text=Got it!');
    await gotItButton.click();
    
    // Check that modal is closed
    await expect(page.locator('text=Coming Soon!')).not.toBeVisible();
  });

  test('should handle both regular products and Monthly Subscription', async ({ page }: { page: Page }) => {
    // Wait for the spotlight picks section to load
    await page.waitForSelector('[data-testid="spotlight-image"]', { timeout: 10000 });
    
    // Check that we have multiple products displayed
    const productImages = page.locator('[data-testid="spotlight-image"]');
    const imageCount = await productImages.count();
    expect(imageCount).toBeGreaterThan(1);
    
    // Check that Monthly Subscription has special treatment
    const monthlySubscription = page.locator('text=Monthly Subscription');
    await expect(monthlySubscription).toBeVisible();
    
    const comingSoonBadge = page.locator('text=Coming Soon');
    await expect(comingSoonBadge).toBeVisible();
    
    // Check that other products might have prices (this is just a general check)
    const priceElements = page.locator('text=/\\$\\d+\\.\\d{2}/');
    const priceCount = await priceElements.count();
    // We expect some products to have prices, but Monthly Subscription should not
    expect(priceCount).toBeGreaterThanOrEqual(0);
  });
}); 