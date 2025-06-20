import { Page, expect } from '@playwright/test';
import { testCustomer, testAdmin, testShippingAddress, testPaymentInfo, TestCustomer, TestAddress } from '../fixtures/test-data';

/**
 * Helper utilities for Destino SF E2E tests
 */
export class TestHelpers {
  
  /**
   * Login as a customer user
   */
  static async loginAsCustomer(page: Page, customer: TestCustomer = testCustomer) {
    await page.goto('/sign-in');
    await page.fill('[data-testid="email"]', customer.email);
    await page.fill('[data-testid="password"]', customer.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for successful login redirect
    await page.waitForURL('**/account', { timeout: 10000 });
    await expect(page.getByText(`Welcome, ${customer.firstName}`)).toBeVisible();
  }

  /**
   * Login as an admin user
   */
  static async loginAsAdmin(page: Page, admin: TestCustomer = testAdmin) {
    await page.goto('/sign-in');
    await page.fill('[data-testid="email"]', admin.email);
    await page.fill('[data-testid="password"]', admin.password);
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for admin dashboard
    await page.waitForURL('**/admin', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  }

  /**
   * Add a product to cart by slug
   */
  static async addProductToCart(page: Page, productSlug: string, quantity: number = 1) {
    await page.goto(`/products/${productSlug}`);
    
    // Wait for product page to load
    await expect(page.getByRole('heading')).toBeVisible();
    
    // Set quantity if needed
    if (quantity > 1) {
      await page.fill('[data-testid="quantity-input"]', quantity.toString());
    }
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    
    // Wait for confirmation
    await expect(page.getByText('Added to cart')).toBeVisible();
  }
  /**
   * Fill shipping address form
   */
  static async fillShippingAddress(page: Page, address: TestAddress = testShippingAddress) {
    await page.fill('[data-testid="address-line1"]', address.line1);
    if (address.line2) {
      await page.fill('[data-testid="address-line2"]', address.line2);
    }
    await page.fill('[data-testid="city"]', address.city);
    await page.selectOption('[data-testid="state"]', address.state);
    await page.fill('[data-testid="zip"]', address.zip);
  }

  /**
   * Complete checkout process with payment
   */
  static async completeCheckout(page: Page, options: {
    deliveryType?: 'delivery' | 'pickup';
    paymentMethod?: 'card' | 'cash';
  } = {}) {
    const { deliveryType = 'delivery', paymentMethod = 'card' } = options;
    
    // Select delivery option
    await page.check(`[data-testid="delivery-${deliveryType}"]`);
    
    if (deliveryType === 'delivery') {
      await TestHelpers.fillShippingAddress(page);
    }
    
    // Fill customer information
    await page.fill('[data-testid="customer-email"]', testCustomer.email);
    await page.fill('[data-testid="customer-phone"]', testCustomer.phone);
    
    // Continue to payment
    await page.click('[data-testid="continue-to-payment"]');
    
    if (paymentMethod === 'card') {
      await TestHelpers.fillPaymentInfo(page);
    }
    
    // Place order
    await page.click('[data-testid="place-order"]');
    
    // Wait for order confirmation
    await page.waitForURL('**/order-confirmation/**', { timeout: 15000 });
  }
  /**
   * Fill Square payment form (iframe handling)
   */
  static async fillPaymentInfo(page: Page) {
    // Wait for Square payment form to load
    await page.waitForSelector('#sq-card-number', { timeout: 10000 });
    
    // Fill card number
    const cardNumberFrame = page.frameLocator('#sq-card-number');
    await cardNumberFrame.locator('input').fill(testPaymentInfo.number);
    
    // Fill expiry date
    const expiryFrame = page.frameLocator('#sq-expiration-date');
    await expiryFrame.locator('input').fill(testPaymentInfo.expiry);
    
    // Fill CVV
    const cvvFrame = page.frameLocator('#sq-cvv');
    await cvvFrame.locator('input').fill(testPaymentInfo.cvv);
    
    // Fill cardholder name if present
    const nameInput = page.locator('[data-testid="cardholder-name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(testPaymentInfo.name);
    }
  }

  /**
   * Clear cart completely
   */
  static async clearCart(page: Page) {
    await page.goto('/cart');
    
    // Remove all items if cart has content
    const removeButtons = page.locator('[data-testid="remove-item"]');
    const count = await removeButtons.count();
    
    for (let i = 0; i < count; i++) {
      await removeButtons.first().click();
      await page.waitForTimeout(500); // Wait for removal animation
    }
    
    // Verify cart is empty
    await expect(page.getByText('Your cart is empty')).toBeVisible();
  }

  /**
   * Navigate to a specific section of the site
   */
  static async navigateTo(page: Page, section: 'home' | 'menu' | 'catering' | 'about' | 'contact') {
    const routes = {
      home: '/',
      menu: '/menu',
      catering: '/catering',
      about: '/about',
      contact: '/contact'
    };
    
    await page.goto(routes[section]);
    await page.waitForLoadState('networkidle');
  }
}