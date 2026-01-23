/**
 * Client-Side Error Tracker with User Behavior Context
 *
 * Tracks user interactions, cart state, and checkout progress
 * to provide rich context for Sentry error reports.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import * as Sentry from '@sentry/nextjs';

export interface UserInteraction {
  type: 'click' | 'input' | 'navigation' | 'scroll' | 'custom';
  target: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CartContext {
  itemCount: number;
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  lastModified: Date;
}

export interface CheckoutContext {
  step: 'cart' | 'shipping' | 'payment' | 'confirmation' | 'complete';
  fulfillmentType?: 'pickup' | 'delivery' | 'shipping';
  hasPaymentInfo: boolean;
  hasShippingInfo: boolean;
  startedAt?: Date;
}

export interface BrowserContext {
  viewport: { width: number; height: number };
  connectionType?: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  userAgent: string;
  language: string;
  online: boolean;
  [key: string]: unknown; // Allow index access for Sentry Context compatibility
}

export interface SessionContext {
  sessionId: string;
  startTime: Date;
  pageViews: number;
  interactions: number;
  errors: number;
}

const MAX_INTERACTIONS = 50;
const SESSION_KEY = 'destino_session_context';

/**
 * Client-Side Error Tracker
 * Maintains context about user behavior for error reporting
 */
class ClientErrorTracker {
  private interactions: UserInteraction[] = [];
  private cartContext: CartContext | null = null;
  private checkoutContext: CheckoutContext | null = null;
  private sessionContext: SessionContext | null = null;
  private isInitialized = false;

  /**
   * Initialize the tracker (should be called once on app mount)
   */
  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;
    this.initializeSession();
    this.setupEventListeners();
    this.setupSentryIntegration();

    console.log('[ClientErrorTracker] Initialized');
  }

  /**
   * Initialize or restore session context
   */
  private initializeSession(): void {
    const stored = this.getStoredSession();

    if (stored && this.isSessionValid(stored)) {
      this.sessionContext = {
        ...stored,
        startTime: new Date(stored.startTime),
        pageViews: stored.pageViews + 1,
      };
    } else {
      this.sessionContext = {
        sessionId: this.generateSessionId(),
        startTime: new Date(),
        pageViews: 1,
        interactions: 0,
        errors: 0,
      };
    }

    this.persistSession();
  }

  /**
   * Get stored session from sessionStorage
   */
  private getStoredSession(): (SessionContext & { startTime: string }) | null {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if session is still valid (within 30 minutes)
   */
  private isSessionValid(session: SessionContext & { startTime: string }): boolean {
    const sessionAge = Date.now() - new Date(session.startTime).getTime();
    const thirtyMinutes = 30 * 60 * 1000;
    return sessionAge < thirtyMinutes;
  }

  /**
   * Persist session to sessionStorage
   */
  private persistSession(): void {
    if (this.sessionContext) {
      try {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            ...this.sessionContext,
            startTime: this.sessionContext.startTime.toISOString(),
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Setup DOM event listeners for automatic interaction tracking
   */
  private setupEventListeners(): void {
    // Track clicks
    document.addEventListener(
      'click',
      e => {
        const target = e.target as HTMLElement;
        if (target) {
          this.trackInteraction({
            type: 'click',
            target: this.getElementIdentifier(target),
            timestamp: new Date(),
            metadata: {
              tagName: target.tagName,
              className: target.className,
              id: target.id,
            },
          });
        }
      },
      { passive: true }
    );

    // Track form inputs (debounced)
    let inputTimeout: NodeJS.Timeout;
    document.addEventListener(
      'input',
      e => {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
          const target = e.target as HTMLElement;
          if (target) {
            this.trackInteraction({
              type: 'input',
              target: this.getElementIdentifier(target),
              timestamp: new Date(),
              metadata: {
                inputType: (target as HTMLInputElement).type,
              },
            });
          }
        }, 500); // Debounce input events
      },
      { passive: true }
    );

    // Track navigation
    if (typeof window !== 'undefined') {
      const originalPushState = history.pushState;
      history.pushState = (...args) => {
        this.trackInteraction({
          type: 'navigation',
          target: args[2]?.toString() || 'unknown',
          timestamp: new Date(),
        });
        return originalPushState.apply(history, args);
      };

      window.addEventListener('popstate', () => {
        this.trackInteraction({
          type: 'navigation',
          target: window.location.pathname,
          timestamp: new Date(),
          metadata: { via: 'popstate' },
        });
      });
    }
  }

  /**
   * Get a human-readable identifier for an element
   */
  private getElementIdentifier(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }
    if (element.getAttribute('aria-label')) {
      return `[aria-label="${element.getAttribute('aria-label')}"]`;
    }
    const classes = element.className?.split?.(' ').slice(0, 2).join('.') || '';
    return `${element.tagName.toLowerCase()}${classes ? '.' + classes : ''}`;
  }

  /**
   * Setup Sentry integration for enhanced error context
   */
  private setupSentryIntegration(): void {
    // Configure Sentry to include our context on every event
    Sentry.addEventProcessor(event => {
      // Add user interactions as breadcrumbs if not already present
      const existingBreadcrumbs = event.breadcrumbs || [];
      const interactionBreadcrumbs = this.interactions.slice(-10).map(interaction => ({
        type: 'user' as const,
        category: `ui.${interaction.type}`,
        message: interaction.target,
        timestamp: interaction.timestamp.getTime() / 1000,
        data: interaction.metadata,
      }));

      // Merge breadcrumbs, avoiding duplicates
      event.breadcrumbs = [...existingBreadcrumbs, ...interactionBreadcrumbs].slice(-50);

      // Add context sections
      event.contexts = {
        ...event.contexts,
        cart: this.cartContext
          ? {
              item_count: this.cartContext.itemCount,
              total_amount: this.cartContext.totalAmount,
              items: this.cartContext.items.map(i => `${i.name} x${i.quantity}`).join(', '),
            }
          : undefined,
        checkout: this.checkoutContext
          ? {
              step: this.checkoutContext.step,
              fulfillment_type: this.checkoutContext.fulfillmentType,
              has_payment_info: this.checkoutContext.hasPaymentInfo,
              has_shipping_info: this.checkoutContext.hasShippingInfo,
            }
          : undefined,
        session: this.sessionContext
          ? {
              session_id: this.sessionContext.sessionId,
              duration_seconds: Math.round(
                (Date.now() - this.sessionContext.startTime.getTime()) / 1000
              ),
              page_views: this.sessionContext.pageViews,
              interactions: this.sessionContext.interactions,
              errors: this.sessionContext.errors,
            }
          : undefined,
        browser: this.getBrowserContext(),
      };

      return event;
    });
  }

  /**
   * Track a user interaction
   */
  trackInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);

    // Keep only the last MAX_INTERACTIONS
    if (this.interactions.length > MAX_INTERACTIONS) {
      this.interactions = this.interactions.slice(-MAX_INTERACTIONS);
    }

    // Update session context
    if (this.sessionContext) {
      this.sessionContext.interactions++;
      this.persistSession();
    }

    // Add as Sentry breadcrumb
    Sentry.addBreadcrumb({
      type: 'user',
      category: `ui.${interaction.type}`,
      message: interaction.target,
      level: 'info',
      data: interaction.metadata,
    });
  }

  /**
   * Track a custom event
   */
  trackEvent(
    name: string,
    category: string = 'custom',
    metadata?: Record<string, unknown>
  ): void {
    this.trackInteraction({
      type: 'custom',
      target: name,
      timestamp: new Date(),
      metadata: { category, ...metadata },
    });
  }

  /**
   * Update cart context
   */
  updateCartContext(cart: CartContext): void {
    this.cartContext = cart;

    Sentry.setContext('cart', {
      item_count: cart.itemCount,
      total_amount: cart.totalAmount,
      items_preview: cart.items.slice(0, 5).map(i => `${i.name} x${i.quantity}`),
    });

    Sentry.addBreadcrumb({
      type: 'info',
      category: 'cart',
      message: `Cart updated: ${cart.itemCount} items, $${(cart.totalAmount / 100).toFixed(2)}`,
      level: 'info',
    });
  }

  /**
   * Update checkout context
   */
  updateCheckoutContext(checkout: CheckoutContext): void {
    const previousStep = this.checkoutContext?.step;
    this.checkoutContext = checkout;

    Sentry.setContext('checkout', {
      step: checkout.step,
      fulfillment_type: checkout.fulfillmentType,
      has_payment_info: checkout.hasPaymentInfo,
      has_shipping_info: checkout.hasShippingInfo,
    });

    // Track step changes as breadcrumbs
    if (previousStep !== checkout.step) {
      Sentry.addBreadcrumb({
        type: 'navigation',
        category: 'checkout',
        message: `Checkout step: ${previousStep || 'start'} -> ${checkout.step}`,
        level: 'info',
      });
    }
  }

  /**
   * Clear checkout context (after successful order or abandonment)
   */
  clearCheckoutContext(): void {
    this.checkoutContext = null;
    Sentry.setContext('checkout', null);
  }

  /**
   * Get current browser context
   */
  getBrowserContext(): BrowserContext {
    if (typeof window === 'undefined') {
      return {
        viewport: { width: 0, height: 0 },
        userAgent: '',
        language: '',
        online: false,
      };
    }

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
      };
      deviceMemory?: number;
    };

    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connectionType: nav.connection?.effectiveType,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      userAgent: nav.userAgent,
      language: nav.language,
      online: nav.onLine,
    };
  }

  /**
   * Capture an error with full context
   */
  captureError(
    error: Error,
    options?: {
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
      level?: Sentry.SeverityLevel;
    }
  ): string {
    // Increment session error count
    if (this.sessionContext) {
      this.sessionContext.errors++;
      this.persistSession();
    }

    return Sentry.captureException(error, {
      level: options?.level || 'error',
      tags: options?.tags,
      extra: {
        ...options?.extra,
        recent_interactions: this.interactions.slice(-10),
        cart_context: this.cartContext,
        checkout_context: this.checkoutContext,
        browser_context: this.getBrowserContext(),
      },
    });
  }

  /**
   * Capture a message with context
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    extra?: Record<string, unknown>
  ): string {
    return Sentry.captureMessage(message, {
      level,
      extra: {
        ...extra,
        cart_context: this.cartContext,
        checkout_context: this.checkoutContext,
      },
    });
  }

  /**
   * Get the current session context
   */
  getSessionContext(): SessionContext | null {
    return this.sessionContext;
  }

  /**
   * Get recent interactions
   */
  getRecentInteractions(count: number = 10): UserInteraction[] {
    return this.interactions.slice(-count);
  }

  /**
   * Reset tracker state (useful for testing)
   */
  reset(): void {
    this.interactions = [];
    this.cartContext = null;
    this.checkoutContext = null;
    this.sessionContext = null;
    this.isInitialized = false;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
  }
}

// Export singleton instance
export const clientErrorTracker = new ClientErrorTracker();

/**
 * Hook-friendly function to track checkout step changes
 */
export function trackCheckoutStep(
  step: CheckoutContext['step'],
  fulfillmentType?: CheckoutContext['fulfillmentType']
): void {
  clientErrorTracker.updateCheckoutContext({
    step,
    fulfillmentType,
    hasPaymentInfo: false,
    hasShippingInfo: false,
    startedAt: new Date(),
  });
}

/**
 * Track cart changes from cart store updates
 */
export function trackCartChange(
  items: Array<{ id: string; name: string; quantity: number; price: number }>,
  total: number
): void {
  clientErrorTracker.updateCartContext({
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: total,
    items,
    lastModified: new Date(),
  });
}
