import { test, expect } from '@playwright/test';
import { cateringTestData } from './fixtures/test-data';

/**
 * Critical Test 4: Catering Inquiry & Quote
 * Tests high-value lead generation flow for catering business
 */
test.describe('Catering Inquiry & Quote', () => {
  test('should navigate to catering page and display content', async ({ page }) => {
    // Navigate to catering page
    await page.goto('/catering');

    // Verify catering page loads with main heading
    await expect(page.getByRole('heading', { name: 'Catering', exact: true })).toBeVisible();

    // Verify key sections are displayed
    await expect(page.getByText('Let us cater your next event!')).toBeVisible();
    await expect(page.getByText('We Cater:')).toBeVisible();
    await expect(page.getByText('Corporate Luncheons')).toBeVisible();

    // Verify catering menu sections are visible
    await expect(page.getByRole('heading', { name: 'Catering Menu' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catering- Share Platters' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Catering- Desserts' })).toBeVisible();
  });

  test('should display catering menu items with prices', async ({ page }) => {
    await page.goto('/catering');

    // Verify appetizer packages are displayed with prices
    await expect(page.getByText('5 Appetizers')).toBeVisible();
    await expect(page.getByText('$22.00')).toBeVisible();

    // Be more specific about which "per person" text we want
    await expect(page.getByText('per person').first()).toBeVisible();

    // Verify share platters are displayed with prices
    await expect(page.getByText('Plantain Chips Platter')).toBeVisible();
    await expect(page.getByText('$45.00')).toBeVisible();

    // Verify dessert items are displayed
    await expect(page.getByText('Classic Alfajores')).toBeVisible();
    // Look for the price more specifically within the alfajores section
    await expect(
      page
        .locator('div')
        .filter({ hasText: /Classic Alfajores/ })
        .locator('div')
        .filter({ hasText: /\$2\.50/ })
    ).toBeVisible();
  });

  test('should submit catering contact form', async ({ page }) => {
    await page.goto('/catering');

    // Scroll to contact form
    await page.locator('text=Send us a message').scrollIntoViewIfNeeded();

    // Fill contact form
    await page.fill('input[placeholder="Your name"]', cateringTestData.contact.name);
    await page.fill('input[placeholder="Your email"]', cateringTestData.contact.email);
    await page.fill(
      'textarea[placeholder="Your message"]',
      `Hi, I'm interested in catering for ${cateringTestData.event.guestCount} people on ${cateringTestData.event.date}. ${cateringTestData.event.name}. Please contact me to discuss options.`
    );

    // Submit the form
    await page.click('button:has-text("Send Message")');

    // Note: In a real test, you'd verify successful submission
    // For now, we just verify the form was submitted without errors
  });

  test('should display contact information', async ({ page }) => {
    await page.goto('/catering');

    // Verify contact information is displayed
    await expect(page.getByText('james@destinosf.com')).toBeVisible();
    await expect(page.getByText('415.577.1677')).toBeVisible();
    await expect(page.getByText('San Francisco, CA 94114')).toBeVisible();
  });

  test('should show FAQ section', async ({ page }) => {
    await page.goto('/catering');

    // Verify FAQ section is present
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();

    // Check some FAQ items
    await expect(page.getByText('Can you accommodate dietary restrictions')).toBeVisible();
    await expect(page.getByText('Where do you deliver catering orders?')).toBeVisible();
    await expect(page.getByText('How much lead time do you need')).toBeVisible();

    // Test FAQ interaction - first FAQ should be expanded by default
    const firstFAQ = page.getByRole('button', { name: 'Can you accommodate dietary restrictions' });
    await expect(firstFAQ).toHaveAttribute('aria-expanded', 'true');

    // Verify expanded content is visible
    await expect(page.getByText('Absolutely! We offer a wide variety of options')).toBeVisible();
  });
});
