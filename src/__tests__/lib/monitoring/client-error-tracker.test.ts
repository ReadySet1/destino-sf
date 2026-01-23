/**
 * Tests for Client Error Tracker
 *
 * @jest-environment jsdom
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
  addEventProcessor: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn().mockReturnValue('mock-event-id'),
  captureMessage: jest.fn().mockReturnValue('mock-event-id'),
}));

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Import after mocks are set up
import {
  clientErrorTracker,
  trackCheckoutStep,
  trackCartChange,
  type UserInteraction,
  type CartContext,
} from '@/lib/monitoring/client-error-tracker';

describe('ClientErrorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    clientErrorTracker.reset();
  });

  describe('initialization', () => {
    it('should initialize session context on first call', () => {
      clientErrorTracker.initialize();

      const session = clientErrorTracker.getSessionContext();
      expect(session).not.toBeNull();
      expect(session?.sessionId).toMatch(/^ses_\d+_/);
      expect(session?.pageViews).toBe(1);
      expect(session?.interactions).toBe(0);
      expect(session?.errors).toBe(0);
    });

    it('should restore existing session from storage', () => {
      const existingSession = {
        sessionId: 'ses_existing_test',
        startTime: new Date().toISOString(),
        pageViews: 5,
        interactions: 10,
        errors: 2,
      };

      mockSessionStorage.setItem('destino_session_context', JSON.stringify(existingSession));

      clientErrorTracker.initialize();

      const session = clientErrorTracker.getSessionContext();
      expect(session?.sessionId).toBe('ses_existing_test');
      expect(session?.pageViews).toBe(6); // Incremented on page load
    });

    it('should not re-initialize if already initialized', () => {
      clientErrorTracker.initialize();
      const firstSession = clientErrorTracker.getSessionContext();

      clientErrorTracker.initialize();
      const secondSession = clientErrorTracker.getSessionContext();

      expect(firstSession?.sessionId).toBe(secondSession?.sessionId);
    });
  });

  describe('trackInteraction', () => {
    beforeEach(() => {
      clientErrorTracker.initialize();
    });

    it('should track user interactions', () => {
      const interaction: UserInteraction = {
        type: 'click',
        target: '#submit-button',
        timestamp: new Date(),
        metadata: { buttonType: 'primary' },
      };

      clientErrorTracker.trackInteraction(interaction);

      const recentInteractions = clientErrorTracker.getRecentInteractions();
      expect(recentInteractions).toHaveLength(1);
      expect(recentInteractions[0].type).toBe('click');
      expect(recentInteractions[0].target).toBe('#submit-button');
    });

    it('should add Sentry breadcrumb for interactions', () => {
      const interaction: UserInteraction = {
        type: 'click',
        target: '#test-button',
        timestamp: new Date(),
      };

      clientErrorTracker.trackInteraction(interaction);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user',
          category: 'ui.click',
          message: '#test-button',
        })
      );
    });

    it('should limit stored interactions to 50', () => {
      for (let i = 0; i < 60; i++) {
        clientErrorTracker.trackInteraction({
          type: 'click',
          target: `#button-${i}`,
          timestamp: new Date(),
        });
      }

      const interactions = clientErrorTracker.getRecentInteractions(100);
      expect(interactions).toHaveLength(50);
      expect(interactions[49].target).toBe('#button-59');
    });

    it('should increment session interaction count', () => {
      clientErrorTracker.trackInteraction({
        type: 'click',
        target: '#test',
        timestamp: new Date(),
      });

      const session = clientErrorTracker.getSessionContext();
      expect(session?.interactions).toBe(1);
    });
  });

  describe('trackEvent', () => {
    beforeEach(() => {
      clientErrorTracker.initialize();
    });

    it('should track custom events', () => {
      clientErrorTracker.trackEvent('add_to_cart', 'ecommerce', {
        productId: '123',
        quantity: 2,
      });

      const interactions = clientErrorTracker.getRecentInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].type).toBe('custom');
      expect(interactions[0].target).toBe('add_to_cart');
      expect(interactions[0].metadata).toMatchObject({
        category: 'ecommerce',
        productId: '123',
      });
    });
  });

  describe('updateCartContext', () => {
    beforeEach(() => {
      clientErrorTracker.initialize();
    });

    it('should update cart context', () => {
      const cart: CartContext = {
        itemCount: 3,
        totalAmount: 4500,
        items: [
          { id: '1', name: 'Alfajor', quantity: 2, price: 1500 },
          { id: '2', name: 'Empanada', quantity: 1, price: 1500 },
        ],
        lastModified: new Date(),
      };

      clientErrorTracker.updateCartContext(cart);

      expect(Sentry.setContext).toHaveBeenCalledWith(
        'cart',
        expect.objectContaining({
          item_count: 3,
          total_amount: 4500,
        })
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'cart',
          message: expect.stringContaining('3 items'),
        })
      );
    });
  });

  describe('updateCheckoutContext', () => {
    beforeEach(() => {
      clientErrorTracker.initialize();
    });

    it('should update checkout context', () => {
      clientErrorTracker.updateCheckoutContext({
        step: 'shipping',
        fulfillmentType: 'delivery',
        hasPaymentInfo: false,
        hasShippingInfo: true,
        startedAt: new Date(),
      });

      expect(Sentry.setContext).toHaveBeenCalledWith(
        'checkout',
        expect.objectContaining({
          step: 'shipping',
          fulfillment_type: 'delivery',
        })
      );
    });

    it('should track step changes as breadcrumbs', () => {
      clientErrorTracker.updateCheckoutContext({
        step: 'cart',
        hasPaymentInfo: false,
        hasShippingInfo: false,
      });

      clientErrorTracker.updateCheckoutContext({
        step: 'shipping',
        hasPaymentInfo: false,
        hasShippingInfo: false,
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'checkout',
          message: expect.stringContaining('cart -> shipping'),
        })
      );
    });
  });

  describe('captureError', () => {
    beforeEach(() => {
      clientErrorTracker.initialize();
    });

    it('should capture errors with context', () => {
      const error = new Error('Test error');

      const eventId = clientErrorTracker.captureError(error, {
        tags: { component: 'checkout' },
        extra: { orderId: '123' },
      });

      expect(eventId).toBe('mock-event-id');
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: { component: 'checkout' },
        })
      );
    });

    it('should increment session error count', () => {
      clientErrorTracker.captureError(new Error('Test'));

      const session = clientErrorTracker.getSessionContext();
      expect(session?.errors).toBe(1);
    });
  });

  describe('getBrowserContext', () => {
    it('should return browser context information', () => {
      const context = clientErrorTracker.getBrowserContext();

      expect(context).toHaveProperty('viewport');
      expect(context).toHaveProperty('userAgent');
      expect(context).toHaveProperty('language');
      expect(context).toHaveProperty('online');
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      clientErrorTracker.initialize();
      clientErrorTracker.trackInteraction({
        type: 'click',
        target: '#test',
        timestamp: new Date(),
      });
      clientErrorTracker.updateCartContext({
        itemCount: 1,
        totalAmount: 100,
        items: [],
        lastModified: new Date(),
      });

      clientErrorTracker.reset();

      expect(clientErrorTracker.getSessionContext()).toBeNull();
      expect(clientErrorTracker.getRecentInteractions()).toHaveLength(0);
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clientErrorTracker.reset();
    clientErrorTracker.initialize();
  });

  describe('trackCheckoutStep', () => {
    it('should update checkout context with step', () => {
      trackCheckoutStep('payment', 'shipping');

      expect(Sentry.setContext).toHaveBeenCalledWith(
        'checkout',
        expect.objectContaining({
          step: 'payment',
          fulfillment_type: 'shipping',
        })
      );
    });
  });

  describe('trackCartChange', () => {
    it('should update cart context from items array', () => {
      trackCartChange(
        [
          { id: '1', name: 'Product 1', quantity: 2, price: 1000 },
          { id: '2', name: 'Product 2', quantity: 1, price: 500 },
        ],
        2500
      );

      expect(Sentry.setContext).toHaveBeenCalledWith(
        'cart',
        expect.objectContaining({
          item_count: 3,
          total_amount: 2500,
        })
      );
    });
  });
});
