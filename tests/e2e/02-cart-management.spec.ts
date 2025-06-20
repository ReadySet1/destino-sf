import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { testProducts } from '../fixtures/test-data';

/**
 * Critical Test 2: Cart Management
 * Tests cart functionality that affects user experience and conversion
 */
test.describe('Cart Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await TestHelpers.clearCart(page);
  });

  test('should add and remove items from cart', async ({ page }) => {
    // Add item to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    
    // Go to cart
    await page.goto('/cart');
    
    // Verify item is in cart
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    
    // Remove item
    await page.click('[data-testid="remove-item"]');
    
    // Verify cart is empty
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  });

  test('should update item quantities', async ({ page }) => {
    // Add item to cart
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug);
    
    // Go to cart
    await page.goto('/cart');
    
    // Update quantity to 5
    await page.fill('[data-testid="quantity-input"]', '5');
    await page.click('[data-testid="update-quantity"]');
    
    // Verify quantity updated
    await expect(page.locator('[data-testid="quantity-input"]')).toHaveValue('5');
    
    // Verify total price updated
    const expectedTotal = testProducts.alfajor.price * 5;
    await expect(page.getByText(`$${expectedTotal.toFixed(2)}`)).toBeVisible();
  });

  test('should persist cart across page navigation', async ({ page }) => {
    // Add items to cart
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug);
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug);
    
    // Navigate to different pages
    await TestHelpers.navigateTo(page, 'about');
    await TestHelpers.navigateTo(page, 'menu');
    
    // Go back to cart
    await page.goto('/cart');
    
    // Verify items are still there
    await expect(page.getByText(testProducts.empanada.name)).toBeVisible();
    await expect(page.getByText(testProducts.alfajor.name)).toBeVisible();
  });
  test('should calculate correct totals with tax and shipping', async ({ page }) => {
    // Add multiple items
    await TestHelpers.addProductToCart(page, testProducts.empanada.slug, 2);
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug, 1);
    
    // Go to cart
    await page.goto('/cart');
    
    // Verify subtotal
    const subtotal = (testProducts.empanada.price * 2) + testProducts.alfajor.price;
    await expect(page.getByText(`Subtotal: $${subtotal.toFixed(2)}`)).toBeVisible();
    
    // Start checkout to see tax and shipping
    await page.click('[data-testid="checkout-button"]');
    
    // Fill address to calculate shipping
    await TestHelpers.fillShippingAddress(page);
    await page.click('[data-testid="calculate-shipping"]');
    
    // Verify shipping and tax are calculated
    await expect(page.locator('[data-testid="shipping-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="tax-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
  });

  test('should handle empty cart state', async ({ page }) => {
    // Go to cart when empty
    await page.goto('/cart');
    
    // Verify empty state
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible();
    
    // Checkout button should be disabled
    await expect(page.locator('[data-testid="checkout-button"]')).toBeDisabled();
  });

  test('should validate minimum order requirements', async ({ page }) => {
    // This test assumes there might be minimum order amounts
    await page.goto('/cart');
    
    // Add a low-value item
    await TestHelpers.addProductToCart(page, testProducts.alfajor.slug, 1);
    
    await page.goto('/cart');
    
    // Check if minimum order message appears (if applicable)
    const minimumOrderText = page.getByText(/minimum order/i);
    if (await minimumOrderText.isVisible()) {
      await expect(page.locator('[data-testid="checkout-button"]')).toBeDisabled();
    }
  });
});