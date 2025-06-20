import { test, expect } from '@playwright/test';
import { cateringTestData } from '../fixtures/test-data';

/**
 * Critical Test 4: Catering Inquiry & Quote
 * Tests high-value lead generation flow for catering business
 */
test.describe('Catering Inquiry & Quote', () => {

  test('should submit catering inquiry form', async ({ page }) => {
    // Navigate to catering page
    await page.goto('/catering');
    
    // Verify catering page loads
    await expect(page.getByRole('heading', { name: /catering/i })).toBeVisible();
    
    // Click on custom quote option
    await page.click('[data-testid="custom-quote-button"]');
    await page.waitForURL('**/catering/custom-quote');
    
    // Fill event details
    await page.fill('[data-testid="event-name"]', cateringTestData.event.name);
    await page.fill('[data-testid="event-date"]', cateringTestData.event.date);
    await page.fill('[data-testid="event-time"]', cateringTestData.event.time);
    await page.fill('[data-testid="guest-count"]', cateringTestData.event.guestCount.toString());
    await page.fill('[data-testid="budget"]', cateringTestData.event.budget.toString());
    
    // Fill contact information
    await page.fill('[data-testid="contact-name"]', cateringTestData.contact.name);
    await page.fill('[data-testid="contact-email"]', cateringTestData.contact.email);
    await page.fill('[data-testid="contact-phone"]', cateringTestData.contact.phone);
    await page.fill('[data-testid="company-name"]', cateringTestData.contact.company);
    
    // Add special requirements
    await page.fill('[data-testid="special-requirements"]', 
      'Please include vegetarian options. Setup needed by 11:30 AM.'
    );
    
    // Submit inquiry
    await page.click('[data-testid="submit-inquiry"]');
    
    // Verify confirmation
    await expect(page.getByRole('heading', { name: /inquiry submitted/i })).toBeVisible();
    await expect(page.getByText(/we'll get back to you/i)).toBeVisible();
    
    // Verify inquiry details are displayed
    await expect(page.getByText(cateringTestData.event.name)).toBeVisible();
    await expect(page.getByText(cateringTestData.contact.email)).toBeVisible();
  });

  test('should browse catering packages', async ({ page }) => {
    await page.goto('/catering');
    
    // Click browse packages
    await page.click('[data-testid="browse-packages"]');
    await page.waitForURL('**/catering/browse-options');
    
    // Verify packages are displayed
    await expect(page.getByText(/office lunch/i)).toBeVisible();
    await expect(page.getByText(/corporate event/i)).toBeVisible();
    
    // View package details
    await page.click('[data-testid="package-details"]:first-child');
    
    // Verify package details page
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.getByText(/serves/i)).toBeVisible();
    await expect(page.getByText(/\$/)).toBeVisible(); // Price display
  });
  test('should validate catering form requirements', async ({ page }) => {
    await page.goto('/catering/custom-quote');
    
    // Try to submit empty form
    await page.click('[data-testid="submit-inquiry"]');
    
    // Verify validation errors
    await expect(page.getByText(/event name is required/i)).toBeVisible();
    await expect(page.getByText(/date is required/i)).toBeVisible();
    await expect(page.getByText(/guest count is required/i)).toBeVisible();
    await expect(page.getByText(/contact name is required/i)).toBeVisible();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/phone is required/i)).toBeVisible();
  });

  test('should handle date and time validation', async ({ page }) => {
    await page.goto('/catering/custom-quote');
    
    // Try to select past date
    const pastDate = '2025-01-01';
    await page.fill('[data-testid="event-date"]', pastDate);
    
    // Fill other required fields
    await page.fill('[data-testid="event-name"]', 'Test Event');
    await page.fill('[data-testid="guest-count"]', '50');
    await page.fill('[data-testid="contact-name"]', 'Test Contact');
    await page.fill('[data-testid="contact-email"]', 'test@example.com');
    await page.fill('[data-testid="contact-phone"]', '(555) 123-4567');
    
    await page.click('[data-testid="submit-inquiry"]');
    
    // Verify date validation
    await expect(page.getByText(/event date must be in the future/i)).toBeVisible();
  });

  test('should navigate to contact catering page', async ({ page }) => {
    await page.goto('/catering');
    
    // Click contact us button
    await page.click('[data-testid="contact-catering"]');
    await page.waitForURL('**/contact-catering');
    
    // Verify contact page loads
    await expect(page.getByRole('heading', { name: /contact us/i })).toBeVisible();
    await expect(page.getByText(/phone/i)).toBeVisible();
    await expect(page.getByText(/email/i)).toBeVisible();
  });
});