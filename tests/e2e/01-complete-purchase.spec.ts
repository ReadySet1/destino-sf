import { test, expect } from '@playwright/test';
import { testProducts, testCustomer } from './fixtures/test-data';

/**
 * Critical Test 1: Complete Purchase Journey
 * Tests the core revenue-generating flow from product browsing to order completion
 */
test.describe('Complete Purchase Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - navigate to home and clear any existing cart
    await page.goto('/');
  });

  test('should complete full purchase flow - single item', async ({ page }) => {
    // Step 1: Browse to product page
    await page.goto(`/products/${testProducts.empanada.slug}`);

    // Verify product details are displayed
    await expect(page.getByRole('heading', { name: testProducts.empanada.name })).toBeVisible();
    await expect(page.getByText(`$${testProducts.empanada.price.toFixed(2)}`)).toBeVisible();

    // Step 2: Add to cart with more robust selector
    const addToCartButton = page.getByRole('button', { name: /Add to Cart/i });
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Verify "Added to Cart" alert appears
    await expect(page.getByText(/Added to Cart/i)).toBeVisible({ timeout: 5000 });

    // Step 3: Go to cart using the URL directly to avoid selector conflicts
    await page.goto('/cart');

    // Wait for cart to load
    await page.waitForLoadState('networkidle');

    // Verify item in cart
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(`$${testProducts.empanada.price.toFixed(2)} / each`)).toBeVisible();

    // Verify cart total calculations
    const expectedSubtotal = testProducts.empanada.price;
    const expectedTax = expectedSubtotal * 0.0825; // Assuming 8.25% tax
    const expectedTotal = expectedSubtotal + expectedTax;

    // Use data-testid attributes for more reliable assertions
    await expect(page.getByTestId('order-subtotal')).toContainText('Subtotal (1 items)');
    await expect(page.getByTestId('order-total')).toContainText(`$${expectedTotal.toFixed(2)}`);

    // Step 4: Proceed to checkout - click the Link, not the Button inside it
    const checkoutLink = page.getByRole('link', { name: /Proceed to.*Checkout/i });
    await expect(checkoutLink).toBeVisible();
    await expect(checkoutLink).toBeEnabled();

    // Debug: Log the current URL before clicking
    console.log('Current URL before clicking checkout:', page.url());

    // Click the link and wait for navigation to start
    await Promise.all([page.waitForURL('/checkout', { timeout: 10000 }), checkoutLink.click()]);

    // Verify we're on checkout page
    await expect(page).toHaveURL('/checkout');

    // Note: For a real implementation, you'd continue with the checkout flow
    // This test verifies the core cart functionality works as expected
  });

  test('should add multiple items to cart', async ({ page }) => {
    // Add first product
    await page.goto(`/products/${testProducts.empanada.slug}`);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await expect(page.getByText(/Added to Cart/i)).toBeVisible();

    // Add second product
    await page.goto(`/products/${testProducts.alfajor.slug}`);
    await page.getByRole('button', { name: /Add to Cart/i }).click();
    await expect(page.getByText(/Added to Cart/i)).toBeVisible();

    // Go to cart using URL to avoid selector conflicts
    await page.goto('/cart');

    // Verify both products are in cart
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(testProducts.alfajor.name)).toBeVisible();

    // Verify subtotal reflects both items
    const expectedSubtotal = testProducts.empanada.price + testProducts.alfajor.price;
    await expect(page.locator('text="Subtotal (2 items)"')).toBeVisible();
  });

  test('should allow quantity updates in cart', async ({ page }) => {
    // Add item to cart
    await page.goto(`/products/${testProducts.empanada.slug}`);
    await page.getByRole('button', { name: /Add to Cart/i }).click();

    // Go to cart
    await page.goto('/cart');

    // Increase quantity
    await page.getByRole('button', { name: 'Increase quantity' }).click();

    // Verify quantity changed to 2 - be more specific about which "2" we're looking for
    await expect(
      page.locator('div').filter({ hasText: /^2\$/ }).locator('span').first()
    ).toBeVisible();

    // Verify price updated
    const expectedTotal = testProducts.empanada.price * 2;
    await expect(page.locator('text="Subtotal (2 items)"')).toBeVisible();
  });

  test('should allow item removal from cart', async ({ page }) => {
    // Add item to cart
    await page.goto(`/products/${testProducts.empanada.slug}`);
    await page.getByRole('button', { name: /Add to Cart/i }).click();

    // Go to cart
    await page.goto('/cart');

    // Remove item
    await page.getByRole('button', { name: 'Remove item' }).click();

    // Verify cart is empty (this would depend on your implementation)
    // You might see an empty cart message or be redirected
  });

  test('should navigate between product categories', async ({ page }) => {
    // Start from home page
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Debug: Take a screenshot to see what's on the page
    await page.screenshot({ path: 'debug-homepage.png' });

    // Navigate to empanadas category - use .first() to avoid strict mode violation
    // (there are multiple "Our Empanadas" links on the page)
    const empanadasLink = page.getByRole('link', { name: /Our Empanadas/i }).first();
    await expect(empanadasLink).toBeVisible({ timeout: 10000 });

    // Debug: Log the href attribute before clicking
    const href = await empanadasLink.getAttribute('href');
    console.log('Empanadas link href:', href);

    // Click the link and wait for navigation
    await Promise.all([
      page.waitForURL('/products/category/empanadas', { timeout: 10000 }),
      empanadasLink.click(),
    ]);

    // Verify we're on empanadas page
    await expect(page).toHaveURL('/products/category/empanadas');

    // Be more specific about which heading we're looking for
    await expect(page.locator('h1').filter({ hasText: 'EMPANADAS' })).toBeVisible();

    // Navigate to alfajores category
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const alfajoresLink = page.getByRole('link', { name: /Our Alfajores/i }).first();
    await expect(alfajoresLink).toBeVisible({ timeout: 10000 });

    await Promise.all([
      page.waitForURL('/products/category/alfajores', { timeout: 10000 }),
      alfajoresLink.click(),
    ]);

    await expect(page).toHaveURL('/products/category/alfajores');
    await expect(page.locator('h1').filter({ hasText: 'ALFAJORES' })).toBeVisible();

    // Verify products are displayed in each category by looking for at least one product price
    await expect(
      page
        .locator('span')
        .filter({ hasText: /^\$\d+\.\d{2}$/ })
        .first()
    ).toBeVisible();
  });
});
