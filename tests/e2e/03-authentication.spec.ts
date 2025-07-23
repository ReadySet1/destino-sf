import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests user registration, login, logout, and route protection
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
  });

  test('should register new user', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/sign-up');

    // Fill out registration form
    await page.fill('[data-testid="email"]', 'test-new-user@example.com');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.fill('[data-testid="confirm-password"]', 'TestPass123!');

    // Submit registration
    await page.click('[data-testid="register-button"]');

    // Should show email verification message
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/sign-in');

    // Fill out login form with test credentials
    await page.fill('[data-testid="email"]', 'test@destino-sf.com');
    await page.fill('[data-testid="password"]', 'password123');

    // Submit login
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard or show welcome message
    await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for invalid credentials', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // Try to login with invalid credentials
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should validate email format during registration', async ({ page }) => {
    await page.goto('/auth/sign-up');

    // Try to register with invalid email
    await page.fill('[data-testid="email"]', 'not-an-email');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.fill('[data-testid="confirm-password"]', 'TestPass123!');
    await page.click('[data-testid="register-button"]');

    // Should show email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should validate password strength during registration', async ({ page }) => {
    await page.goto('/auth/sign-up');

    // Try to register with weak password
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', '123');
    await page.fill('[data-testid="confirm-password"]', '123');
    await page.click('[data-testid="register-button"]');

    // Should show password strength error
    await expect(page.getByText(/password.*strong/i)).toBeVisible();
  });

  test('should validate password confirmation during registration', async ({ page }) => {
    await page.goto('/auth/sign-up');

    // Try to register with mismatched passwords
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.fill('[data-testid="confirm-password"]', 'DifferentPass123!');
    await page.click('[data-testid="register-button"]');

    // Should show password mismatch error
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test('should protect admin routes for unauthenticated users', async ({ page }) => {
    // Try to access admin route without login
    await page.goto('/admin');

    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth.*sign-in/);

    // Should show login form
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test('should protect admin routes for non-admin users', async ({ page }) => {
    // First login as regular user
    await page.goto('/auth/sign-in');
    await page.fill('[data-testid="email"]', 'regular-user@destino-sf.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for login to complete
    await page.waitForURL('/', { timeout: 10000 });

    // Try to access admin route
    await page.goto('/admin');

    // Should show access denied or redirect to unauthorized page
    await expect(page.getByText(/unauthorized|access denied/i)).toBeVisible();
  });

  test('should allow logout functionality', async ({ page }) => {
    // First login
    await page.goto('/auth/sign-in');
    await page.fill('[data-testid="email"]', 'test@destino-sf.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for login to complete
    await page.waitForURL('/', { timeout: 10000 });

    // Look for logout button (might be in dropdown or navigation)
    const logoutButton = page
      .locator('[data-testid="logout-button"]')
      .or(page.getByRole('button', { name: /sign out|logout/i }));

    await logoutButton.click();

    // Should redirect to home page or login page
    await expect(page).toHaveURL(/\/$|.*auth.*sign-in/);

    // Should no longer have access to protected routes
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*auth.*sign-in/);
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Fill in email for password reset
    await page.fill('[data-testid="email"]', 'test@destino-sf.com');
    await page.click('[data-testid="reset-password-button"]');

    // Should show password reset confirmation
    await expect(page.getByText(/password reset.*sent/i)).toBeVisible();
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login first
    await page.goto('/auth/sign-in');
    await page.fill('[data-testid="email"]', 'test@destino-sf.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for login to complete
    await page.waitForURL('/', { timeout: 10000 });

    // Reload the page
    await page.reload();

    // Should still be logged in (check for user-specific elements)
    // This could be a user menu, welcome message, or lack of login button
    const loginIndicator = page.getByText(/welcome/i).or(page.locator('[data-testid="user-menu"]'));

    await expect(loginIndicator).toBeVisible({ timeout: 5000 });
  });
});
