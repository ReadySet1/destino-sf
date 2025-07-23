import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role?: 'admin' | 'customer';
  name?: string;
}

export const testUsers = {
  admin: {
    email: 'test@destino-sf.com',
    password: 'password123',
    role: 'admin' as const,
    name: 'Admin User',
  },
  customer: {
    email: 'customer@test.com',
    password: 'password123',
    role: 'customer' as const,
    name: 'Test Customer',
  },
  cateringCustomer: {
    email: 'catering@company.com',
    password: 'password123',
    role: 'customer' as const,
    name: 'Sarah Wilson',
  },
};

/**
 * Authentication Helper Class for Playwright Tests
 */
export class AuthHelpers {
  /**
   * Login with email and password
   */
  static async loginWithPassword(page: Page, user: TestUser): Promise<void> {
    await page.goto('/auth/sign-in');

    // Wait for form to be visible
    await expect(
      page.locator('[data-testid="email"]').or(page.locator('input[type="email"]'))
    ).toBeVisible();

    // Fill login form - try different selectors for email/password
    const emailInput = page
      .locator('[data-testid="email"]')
      .or(page.locator('input[type="email"]'))
      .first();
    const passwordInput = page
      .locator('[data-testid="password"]')
      .or(page.locator('input[type="password"]'))
      .first();

    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);

    // Submit form
    const loginButton = page
      .locator('[data-testid="login-button"]')
      .or(page.getByRole('button', { name: /sign in|login/i }))
      .first();

    await loginButton.click();

    // Wait for successful login - check for redirect or welcome message
    await page.waitForURL('/', { timeout: 10000 }).catch(async () => {
      // If not redirected to home, check for welcome message or user menu
      await expect(
        page
          .getByText(/welcome/i)
          .or(page.locator('[data-testid="user-menu"]'))
          .first()
      ).toBeVisible({ timeout: 5000 });
    });

    console.log(`✅ Logged in as ${user.email} (${user.role})`);
  }

  /**
   * Login as admin user
   */
  static async loginAsAdmin(page: Page): Promise<void> {
    await this.loginWithPassword(page, testUsers.admin);
  }

  /**
   * Login as customer user
   */
  static async loginAsCustomer(page: Page): Promise<void> {
    await this.loginWithPassword(page, testUsers.customer);
  }

  /**
   * Login as catering customer
   */
  static async loginAsCateringCustomer(page: Page): Promise<void> {
    await this.loginWithPassword(page, testUsers.cateringCustomer);
  }

  /**
   * Logout current user
   */
  static async logout(page: Page): Promise<void> {
    // Look for logout button in various possible locations
    const logoutButton = page
      .locator('[data-testid="logout-button"]')
      .or(page.getByRole('button', { name: /sign out|logout/i }))
      .or(page.locator('button:has-text("Sign Out")'))
      .first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try accessing user menu first
      const userMenu = page
        .locator('[data-testid="user-menu"]')
        .or(
          page.locator('button:has-text("Account")').or(page.locator('[data-testid="user-avatar"]'))
        )
        .first();

      if (await userMenu.isVisible()) {
        await userMenu.click();
        // Wait for dropdown and click logout
        await page.getByRole('button', { name: /sign out|logout/i }).click();
      }
    }

    // Verify logout by checking we're redirected to home or login page
    await expect(page).toHaveURL(/\/$|.*auth.*sign-in/);
    console.log('✅ Successfully logged out');
  }

  /**
   * Check if user is currently logged in
   */
  static async isLoggedIn(page: Page): Promise<boolean> {
    try {
      // Check for user-specific elements that indicate logged-in state
      const loginIndicators = [
        page.getByText(/welcome/i),
        page.locator('[data-testid="user-menu"]'),
        page.locator('[data-testid="logout-button"]'),
        page.getByRole('button', { name: /account|profile/i }),
      ];

      for (const indicator of loginIndicators) {
        if (await indicator.isVisible({ timeout: 1000 })) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Ensure clean authentication state (logout if needed)
   */
  static async ensureLoggedOut(page: Page): Promise<void> {
    if (await this.isLoggedIn(page)) {
      await this.logout(page);
    }
  }

  /**
   * Setup authenticated session with storage state
   * Useful for tests that need to start already logged in
   */
  static async createAuthenticatedSession(page: Page, user: TestUser): Promise<void> {
    await this.loginWithPassword(page, user);

    // Optionally save auth state for reuse
    // This would require additional setup in playwright.config.ts
    console.log(`✅ Created authenticated session for ${user.email}`);
  }
}
