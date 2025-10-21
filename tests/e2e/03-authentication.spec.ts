import { test, expect } from '@playwright/test';
import { WaitHelpers } from './utils/wait-helpers';

/**
 * Authentication Flow Tests
 * Tests user registration, login, logout, and route protection
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
    await WaitHelpers.waitForNetworkIdle(page);
  });

  test('should register new user', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/sign-up');

    // Generate unique email using timestamp to avoid conflicts
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // Fill out registration form
    await page.fill('[data-testid="email"]', uniqueEmail);
    await page.fill('[data-testid="password"]', 'TestPass123!');

    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Should show success message and redirect to sign-in
    await expect(page.getByText(/account created successfully|check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test.skip('should login existing user', async ({ page }) => {
    // This test is skipped because it requires test user: test@destino-sf.com
    // TODO: Create test user in database first
    await page.goto('/sign-in');
  });

  test('should show validation errors for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    // Try to login with invalid credentials
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should show error toast notification (use .first() to avoid strict mode violation)
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should validate email format during registration', async ({ page }) => {
    await page.goto('/sign-up');

    // Try to register with invalid email
    await page.fill('[data-testid="email"]', 'not-an-email');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="register-button"]');

    // HTML5 email validation should prevent form submission
    // Check that we're still on the sign-up page
    await expect(page).toHaveURL('/sign-up');
  });

  test('should validate password strength during registration', async ({ page }) => {
    await page.goto('/sign-up');

    // Try to register with weak password
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', '123');
    await page.click('[data-testid="register-button"]');

    // HTML5 minLength validation should prevent form submission
    // Check that we're still on the sign-up page
    await expect(page).toHaveURL('/sign-up');
  });

  test.skip('should validate password confirmation during registration', async ({ page }) => {
    // This test is skipped because the sign-up form doesn't have a confirm password field
    // The form uses minLength validation instead
    await page.goto('/sign-up');
  });

  test('should protect admin routes for unauthenticated users', async ({ page }) => {
    // Try to access admin route without login
    await page.goto('/admin');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*sign-in/);

    // Should show login form - use the button to be specific
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test.skip('should protect admin routes for non-admin users', async ({ page }) => {
    // This test is skipped because it requires a non-admin test user in the database
    // TODO: Create test user seeding script
    await page.goto('/sign-in');
  });

  test.skip('should allow logout functionality', async ({ page }) => {
    // This test is skipped because it requires a test user in the database
    // TODO: Create test user seeding script
    await page.goto('/sign-in');
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');

    // Fill in email for password reset
    await page.fill('[data-testid="email"]', 'test@destino-sf.com');
    await page.click('[data-testid="reset-password-button"]');

    // Should show password reset confirmation
    await expect(page.getByText(/password reset|check your email/i)).toBeVisible({ timeout: 10000 });
  });

  test.skip('should persist authentication across page reloads', async ({ page }) => {
    // This test is skipped because it requires a test user in the database
    // TODO: Create test user seeding script
    await page.goto('/sign-in');
  });
});
