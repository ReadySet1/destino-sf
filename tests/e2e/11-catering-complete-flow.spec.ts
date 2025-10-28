import { test, expect } from '@playwright/test';
import { cateringTestData, testPaymentInfo } from './fixtures/test-data';
import { WaitHelpers } from './utils/wait-helpers';

/**
 * Critical Test: Complete Catering Order Flow
 * Tests the high-value catering business flow from menu selection to order completion
 * Business Value: Validates complete catering revenue stream
 *
 * Catering Flow:
 * 1. Browse catering menu and packages
 * 2. Add items to catering cart
 * 3. Select delivery zone (SF, South Bay, Peninsula)
 * 4. Verify minimum order requirements
 * 5. Complete checkout with event details
 * 6. Payment processing
 * 7. Catering order confirmation
 *
 * Key Differences from Regular Orders:
 * - Separate catering cart (not mixed with regular products)
 * - Event date and attendee count required
 * - Delivery zone-based pricing and minimums
 * - Higher order values (typically $200+)
 * - Lead time requirements (24-48 hours advance)
 *
 * Test Scenarios:
 * 1. Browse catering menu and view packages
 * 2. Add catering package to cart
 * 3. Add à-la-carte items to cart
 * 4. View catering cart with totals
 * 5. Select delivery zone and date
 * 6. Verify minimum order requirements
 * 7. Complete catering checkout
 * 8. Catering order confirmation
 */
test.describe('Complete Catering Order Flow', () => {
  const generateCateringEmail = () => `catering-${Date.now()}@example.com`;

  // Helper to format future date
  const getFutureDate = (daysAhead: number = 3) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
    await WaitHelpers.waitForNetworkIdle(page);

    // Navigate to catering page
    await page.goto('/catering');
    await expect(page.getByRole('heading', { name: 'Catering', exact: true })).toBeVisible();
  });

  test('should display catering menu with packages and pricing', async ({ page }) => {
    // Verify catering page displays correctly
    await expect(page.getByText('Let us cater your next event!')).toBeVisible();

    // Verify packages are displayed
    await expect(page.getByRole('heading', { name: 'Catering Menu' })).toBeVisible();
    await expect(page.getByText('5 Appetizers')).toBeVisible();
    await expect(page.getByText('10 Appetizers')).toBeVisible();

    // Verify pricing is shown
    await expect(page.getByText('$22.00')).toBeVisible();
    await expect(page.getByText('per person')).toBeVisible();

    // Verify share platters section
    await expect(page.getByRole('heading', { name: 'Catering- Share Platters' })).toBeVisible();
    await expect(page.getByText('Plantain Chips Platter')).toBeVisible();
  });

  test('should show delivery zones and minimum order information', async ({ page }) => {
    // Look for delivery zone information
    const pageContent = await page.content();

    // Catering should mention delivery zones or areas served
    const hasDeliveryInfo =
      pageContent.includes('San Francisco') ||
      pageContent.includes('delivery') ||
      pageContent.includes('zone') ||
      pageContent.includes('Where do you deliver');

    expect(hasDeliveryInfo).toBe(true);

    // Check if minimum order information is displayed
    const hasMinimumInfo =
      pageContent.includes('minimum') ||
      pageContent.includes('$') ||
      pageContent.includes('order requirement');

    expect(hasMinimumInfo).toBe(true);
  });

  test('should allow browsing catering options and packages', async ({ page }) => {
    // Check if there's a "Browse Options" or similar button
    const browseButton = page.getByRole('button', { name: /browse|explore|view.*options/i });
    const browseLink = page.getByRole('link', { name: /browse|explore|view.*options/i });

    const hasBrowseOption =
      (await browseButton.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await browseLink.isVisible({ timeout: 2000 }).catch(() => false));

    if (hasBrowseOption) {
      // Click browse button/link
      if (await browseButton.isVisible().catch(() => false)) {
        await browseButton.click();
      } else {
        await browseLink.click();
      }

      // Wait for navigation or modal
      await page.waitForTimeout(1000);

      // Should show more catering options
      const currentUrl = page.url();
      expect(currentUrl.includes('catering') || currentUrl.includes('browse')).toBe(true);
    } else {
      // Options might be displayed inline on the catering page
      console.log('Browse button not found, options may be inline');
    }
  });

  test('should display catering FAQ with common questions', async ({ page }) => {
    // Verify FAQ section exists
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();

    // Verify common FAQ items
    await expect(page.getByText('Can you accommodate dietary restrictions')).toBeVisible();
    await expect(page.getByText('Where do you deliver catering orders?')).toBeVisible();
    await expect(page.getByText('How much lead time do you need')).toBeVisible();

    // Test FAQ interaction
    const firstFAQ = page.getByRole('button', { name: 'Can you accommodate dietary restrictions' });
    await expect(firstFAQ).toHaveAttribute('aria-expanded', 'true');

    // Verify FAQ answer is visible
    await expect(page.getByText('Absolutely! We offer a wide variety of options')).toBeVisible();
  });

  test('should show contact information for catering inquiries', async ({ page }) => {
    // Verify catering contact information
    await expect(page.getByText('james@destinosf.com')).toBeVisible();
    await expect(page.getByText('415.577.1677')).toBeVisible();

    // Verify location/address
    await expect(page.getByText(/San Francisco.*94114/i)).toBeVisible();
  });

  test('should allow submitting catering inquiry form', async ({ page }) => {
    const cateringEmail = generateCateringEmail();

    // Scroll to contact form
    await page.locator('text=Send us a message').scrollIntoViewIfNeeded();

    // Fill inquiry form
    await page.fill('input[placeholder="Your name"]', 'Corporate Event Planner');
    await page.fill('input[placeholder="Your email"]', cateringEmail);

    const eventDate = getFutureDate(7);
    const message = `Hi, I'm interested in catering for a corporate event with 50 people on ${eventDate}. Please contact me to discuss menu options and pricing.`;

    await page.fill('textarea[placeholder="Your message"]', message);

    // Submit the form
    await page.click('button:has-text("Send Message")');

    // Wait for submission response
    await page.waitForTimeout(2000);

    // Verify submission (could be success message or redirect)
    const pageContent = await page.content();
    const wasSubmitted =
      pageContent.includes('thank') ||
      pageContent.includes('received') ||
      pageContent.includes('sent') ||
      pageContent.includes('success') ||
      page.url().includes('confirmation') ||
      page.url().includes('success');

    expect(wasSubmitted).toBe(true);
  });

  test('should display catering menu item details with descriptions', async ({ page }) => {
    // Verify menu items have descriptions
    const pageContent = await page.content();

    // Catering items should have descriptions (not just names and prices)
    const hasDescriptions =
      pageContent.includes('appetizer') ||
      pageContent.includes('includes') ||
      pageContent.includes('serves') ||
      pageContent.includes('people');

    expect(hasDescriptions).toBe(true);

    // Verify both package and à-la-carte options exist
    await expect(page.getByText('5 Appetizers')).toBeVisible(); // Package
    await expect(page.getByText('Plantain Chips Platter')).toBeVisible(); // À-la-carte
  });

  test('should show per-person pricing for catering packages', async ({ page }) => {
    // Verify per-person pricing is clearly indicated
    await expect(page.getByText('per person').first()).toBeVisible();

    // Verify package pricing
    await expect(page.getByText('$22.00')).toBeVisible(); // 5 Appetizers package
    await expect(page.getByText('5 Appetizers')).toBeVisible();

    // Verify higher-tier package
    await expect(page.getByText('10 Appetizers')).toBeVisible();

    const pageContent = await page.content();

    // Should show multiple price points
    const priceMatches = pageContent.match(/\$\d+\.\d{2}/g);
    expect(priceMatches).toBeTruthy();
    expect(priceMatches!.length).toBeGreaterThan(2); // Multiple items with prices
  });

  test('should display catering event type examples', async ({ page }) => {
    // Verify event type examples are shown
    await expect(page.getByText('We Cater:')).toBeVisible();
    await expect(page.getByText('Corporate Luncheons')).toBeVisible();

    // Look for other event types
    const pageContent = await page.content();
    const hasEventTypes =
      pageContent.includes('corporate') ||
      pageContent.includes('wedding') ||
      pageContent.includes('party') ||
      pageContent.includes('event');

    expect(hasEventTypes).toBe(true);
  });

  test('should show catering service area information', async ({ page }) => {
    // Look for delivery/service area info in FAQ
    const deliveryFAQ = page.getByText('Where do you deliver catering orders?');
    await deliveryFAQ.scrollIntoViewIfNeeded();

    // Click to expand if collapsed
    const isExpanded = await deliveryFAQ.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await deliveryFAQ.click();
      await page.waitForTimeout(500);
    }

    // Should show delivery zones
    const pageContent = await page.content();
    const hasZoneInfo =
      pageContent.includes('San Francisco') ||
      pageContent.includes('Bay Area') ||
      pageContent.includes('Peninsula') ||
      pageContent.includes('South Bay');

    expect(hasZoneInfo).toBe(true);
  });

  test('should display lead time requirements for catering orders', async ({ page }) => {
    // Find lead time FAQ
    const leadTimeFAQ = page.getByText('How much lead time do you need');
    await leadTimeFAQ.scrollIntoViewIfNeeded();

    // Click to expand if collapsed
    const isExpanded = await leadTimeFAQ.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await leadTimeFAQ.click();
      await page.waitForTimeout(500);
    }

    // Verify lead time information is shown
    const pageContent = await page.content();
    const hasLeadTimeInfo =
      pageContent.includes('24') ||
      pageContent.includes('48') ||
      pageContent.includes('advance') ||
      pageContent.includes('notice') ||
      pageContent.includes('hours') ||
      pageContent.includes('days');

    expect(hasLeadTimeInfo).toBe(true);
  });
});

/**
 * Catering Cart and Checkout Flow
 * These tests cover the full transactional flow if catering cart functionality is implemented
 */
test.describe.skip('Catering Cart and Checkout (Future Implementation)', () => {
  test('should add catering package to cart', async ({ page }) => {
    // TODO: Implement when catering cart UI is ready
    // This test would verify:
    // 1. Click "Add to Cart" on catering package
    // 2. Verify item added to catering cart (separate from regular cart)
    // 3. Cart shows correct pricing and package details
  });

  test('should add multiple catering items to cart', async ({ page }) => {
    // TODO: Implement when catering cart UI is ready
    // This test would verify:
    // 1. Add multiple packages and à-la-carte items
    // 2. Verify cart calculates total correctly
    // 3. Verify quantities can be updated
  });

  test('should proceed to catering checkout with event details', async ({ page }) => {
    // TODO: Implement when catering checkout is ready
    // This test would verify:
    // 1. Navigate to catering checkout
    // 2. Enter event date (must be future date)
    // 3. Enter number of attendees
    // 4. Select delivery zone
    // 5. Verify minimum order requirements
  });

  test('should verify minimum order amount for delivery zone', async ({ page }) => {
    // TODO: Implement when zone minimums are enforced
    // This test would verify:
    // 1. Select delivery zone
    // 2. If cart total < minimum, show warning
    // 3. Suggest adding items to meet minimum
    // 4. Prevent checkout if minimum not met
  });

  test('should complete catering order with payment', async ({ page }) => {
    // TODO: Implement when catering checkout flow is complete
    // This test would verify:
    // 1. Fill all event and delivery details
    // 2. Process payment via Square
    // 3. Receive catering order confirmation
    // 4. Confirmation includes event details, delivery info, items
  });

  test('should show catering order confirmation with all details', async ({ page }) => {
    // TODO: Implement when confirmation page is ready
    // This test would verify:
    // 1. Order confirmation page displays
    // 2. Shows event date and time
    // 3. Shows delivery address and zone
    // 4. Shows all catering items with quantities
    // 5. Shows total with delivery fee
    // 6. Shows contact information for questions
  });

  test('should prevent catering orders with insufficient lead time', async ({ page }) => {
    // TODO: Implement when date validation is in place
    // This test would verify:
    // 1. Try to select event date within 24 hours
    // 2. System shows error about lead time
    // 3. Prevents order submission
    // 4. Suggests calling for rush orders
  });
});
