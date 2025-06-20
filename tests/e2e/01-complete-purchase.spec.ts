import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { testProducts, testCustomer } from '../fixtures/test-data';

/**
 * Critical Test 1: Complete Purchase Journey
 * Tests the core revenue-generating flow from product browsing to order completion
 */
test.describe('Complete Purchase Journey', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await TestHelpers.clearCart(page);
  });

  test('should complete full purchase flow - single item', async ({ page }) => {
    // Step 1: Browse to product page
    await page.goto(`/products/${testProducts.empanada.slug}`);
    
    // Verify product details are displayed
    await expect(page.getByRole('heading', { name: testProducts.empanada.name })).toBeVisible();
    await expect(page.getByText(`$${testProducts.empanada.price}`)).toBeVisible();
    
    // Step 2: Add to cart
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.getByText('Added to cart')).toBeVisible();
    
    // Step 3: Go to cart
    await page.click('[data-testid="cart-icon"]');
    await page.waitForURL('**/cart');
    
    // Verify item in cart
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(`$${testProducts.empanada.price}`)).toBeVisible();
    
    // Step 4: Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    await page.waitForURL('**/checkout');
    
    // Step 5: Complete checkout process
    await TestHelpers.completeCheckout(page, {
      deliveryType: 'delivery',
      paymentMethod: 'card'
    });
    
    // Step 6: Verify order confirmation
    await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    
    // Verify order details
    const orderNumber = await page.locator('[data-testid="order-number"]').textContent();
    expect(orderNumber).toMatch(/^#\d+$/);
    
    // Verify email confirmation message
    await expect(page.getByText(/confirmation email sent/i)).toBeVisible();
  });
  test('should complete purchase flow - multiple items', async ({ page }) => {
    // Add multiple products to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug, 2);
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug, 3);
    await TestHelpers.addProductToCart(page, testProducts.vegetarian.slug, 1);
    
    // Go to cart and verify all items
    await page.goto('/cart');
    
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(testProducts.alfajor.name)).toBeVisible();
    await expect(page.getByText(testProducts.vegetarian.name)).toBeVisible();
    
    // Verify quantities
    await expect(page.locator('[data-testid="quantity-empanada"]')).toHaveValue('2');
    await expect(page.locator('[data-testid="quantity-alfajor"]')).toHaveValue('3');
    await expect(page.locator('[data-testid="quantity-vegetarian"]')).toHaveValue('1');
    
    // Calculate expected total
    const expectedTotal = (testProducts.empanada.price * 2) + 
                         (testProducts.alfajor.price * 3) + 
                         (testProducts.vegetarian.price * 1);
    
    await expect(page.getByText(`$${expectedTotal.toFixed(2)}`)).toBeVisible();
    
    // Complete checkout
    await page.click('[data-testid="checkout-button"]');
    await TestHelpers.completeCheckout(page, { deliveryType: 'pickup' });
    
    // Verify order confirmation with all items
    await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(testProducts.alfajor.name)).toBeVisible();
    await expect(page.getByText(testProducts.vegetarian.name)).toBeVisible();
  });

  test('should handle checkout validation errors', async ({ page }) => {
    // Add item to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    
    // Go to checkout
    await page.goto('/checkout');
    
    // Try to proceed without filling required fields
    await page.click('[data-testid="place-order"]');
    
    // Verify validation errors appear
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/phone is required/i)).toBeVisible();
    await expect(page.getByText(/address is required/i)).toBeVisible();
  });
});