/**
 * Tests for Umami Analytics Integration
 */

import { UMAMI_CONFIG, isUmamiLoaded, trackEvent, UmamiTracking } from '@/lib/analytics';

describe('Umami Analytics', () => {
  beforeEach(() => {
    // Reset window object for each test
    delete (global as any).window;
    (global as any).window = {
      umami: undefined,
    };
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      expect(UMAMI_CONFIG.websiteId).toBe('5a0ae847-dbb0-456c-b972-9e29944de4b2');
      expect(UMAMI_CONFIG.src).toBe('https://analytics.readysetllc.com/script.js');
      expect(UMAMI_CONFIG.autoTrack).toBe(true);
      expect(UMAMI_CONFIG.dataCache).toBe(true);
    });

    it('should use environment variables when available', () => {
      const originalEnv = process.env;
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = 'test-website-id';
      process.env.NEXT_PUBLIC_UMAMI_SRC = 'https://test-analytics.com/script.js';

      // Re-import to get updated config
      jest.resetModules();
      const { UMAMI_CONFIG: updatedConfig } = require('@/lib/analytics');

      expect(updatedConfig.websiteId).toBe('test-website-id');
      expect(updatedConfig.src).toBe('https://test-analytics.com/script.js');

      // Restore original env
      process.env = originalEnv;
    });
  });

  describe('isUmamiLoaded', () => {
    it('should return false when window is undefined', () => {
      delete (global as any).window;
      expect(isUmamiLoaded()).toBe(false);
    });

    it('should return false when umami is not loaded', () => {
      (global as any).window = {};
      expect(isUmamiLoaded()).toBe(false);
    });

    it('should return true when umami is loaded', () => {
      (global as any).window = {
        umami: {
          track: jest.fn(),
          identify: jest.fn(),
        },
      };
      expect(isUmamiLoaded()).toBe(true);
    });
  });

  describe('trackEvent', () => {
    it('should not track when umami is not loaded', () => {
      // Should not throw when umami is not loaded
      expect(() => {
        trackEvent('test_event', { test: 'data' });
      }).not.toThrow();
    });

    it('should track when umami is loaded', () => {
      const mockTrack = jest.fn();
      (global as any).window = {
        umami: {
          track: mockTrack,
          identify: jest.fn(),
        },
      };

      trackEvent('test_event', { test: 'data' });

      expect(mockTrack).toHaveBeenCalledWith('test_event', { test: 'data' });
    });

    it('should handle errors gracefully', () => {
      const mockTrack = jest.fn().mockImplementation(() => {
        throw new Error('Tracking failed');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global as any).window = {
        umami: {
          track: mockTrack,
          identify: jest.fn(),
        },
      };

      trackEvent('test_event');

      expect(consoleSpy).toHaveBeenCalledWith('[Umami] Error tracking event:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('UmamiTracking', () => {
    beforeEach(() => {
      const mockTrack = jest.fn();
      (global as any).window = {
        umami: {
          track: mockTrack,
          identify: jest.fn(),
        },
      };
    });

    it('should track product views', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackProductView('Test Product', 'empanadas', 12.99);

      expect(mockTrack).toHaveBeenCalledWith('product_view', {
        product_name: 'Test Product',
        category: 'empanadas',
        price: 12.99,
      });
    });

    it('should track add to cart events', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackAddToCart('Test Product', 2, 12.99);

      expect(mockTrack).toHaveBeenCalledWith('add_to_cart', {
        product_name: 'Test Product',
        quantity: 2,
        price: 12.99,
        total: 25.98,
      });
    });

    it('should track purchase events', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackPurchase(45.99, 3, 'card');

      expect(mockTrack).toHaveBeenCalledWith('purchase', {
        order_total: 45.99,
        order_items: 3,
        payment_method: 'card',
      });
    });

    it('should track contact form submissions', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackContactForm('contact');

      expect(mockTrack).toHaveBeenCalledWith('contact_form', {
        form_type: 'contact',
      });
    });

    it('should track button clicks', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackButtonClick('add_to_cart', 'product_page');

      expect(mockTrack).toHaveBeenCalledWith('button_click', {
        button_name: 'add_to_cart',
        location: 'product_page',
      });
    });

    it('should track errors', () => {
      const mockTrack = jest.fn();
      (global as any).window.umami.track = mockTrack;

      UmamiTracking.trackError('validation_error', 'Invalid email format', '/contact');

      expect(mockTrack).toHaveBeenCalledWith('error', {
        error_type: 'validation_error',
        error_message: 'Invalid email format',
        page: '/contact',
      });
    });
  });
});
