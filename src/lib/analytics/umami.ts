/**
 * Umami Analytics Integration for Destino SF
 *
 * This module provides TypeScript-safe Umami analytics tracking
 * with proper types and utilities for custom event tracking.
 */

// Umami configuration types
export interface UmamiConfig {
  websiteId: string;
  src: string;
  domains?: string[];
  autoTrack?: boolean;
  dataCache?: boolean;
  dataHostUrl?: string;
}

// Custom event data types
export interface UmamiEventData {
  [key: string]: string | number | boolean;
}

// Predefined event types for type safety
export type UmamiEventType =
  | 'page_view'
  | 'button_click'
  | 'form_submit'
  | 'product_view'
  | 'add_to_cart'
  | 'purchase'
  | 'contact_form'
  | 'newsletter_signup'
  | 'catering_inquiry'
  | 'menu_download'
  | 'location_click'
  | 'social_share'
  | 'search'
  | 'error'
  | string; // Allow custom event types

// Umami global interface extension
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: UmamiEventData) => void;
      identify: (sessionData: UmamiEventData) => void;
    };
  }
}

/**
 * Umami configuration for Destino SF
 */
export const UMAMI_CONFIG: UmamiConfig = {
  websiteId: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '5a0ae847-dbb0-456c-b972-9e29944de4b2',
  src: process.env.NEXT_PUBLIC_UMAMI_SRC || 'https://analytics.readysetllc.com/script.js',
  domains: ['destinosf.com', 'www.destinosf.com', 'development.destinosf.com'],
  autoTrack: true,
  dataCache: true,
};

/**
 * Check if Umami is available and loaded
 */
export const isUmamiLoaded = (): boolean => {
  return typeof window !== 'undefined' && !!window.umami;
};

/**
 * Track a custom event with Umami
 * @param eventName - The name of the event to track
 * @param eventData - Optional data to send with the event
 */
export const trackEvent = (eventName: UmamiEventType, eventData?: UmamiEventData): void => {
  if (!isUmamiLoaded()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Umami] Event would be tracked:', eventName, eventData);
    }
    return;
  }

  try {
    window.umami!.track(eventName, eventData);
  } catch (error) {
    console.error('[Umami] Error tracking event:', error);
  }
};

/**
 * Identify a user session with additional data
 * @param sessionData - Data to associate with the session
 */
export const identifySession = (sessionData: UmamiEventData): void => {
  if (!isUmamiLoaded()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Umami] Session would be identified:', sessionData);
    }
    return;
  }

  try {
    window.umami!.identify(sessionData);
  } catch (error) {
    console.error('[Umami] Error identifying session:', error);
  }
};

/**
 * Predefined tracking functions for common Destino SF events
 */
export const UmamiTracking = {
  /**
   * Track product views
   */
  trackProductView: (productName: string, category: string, price?: number) => {
    trackEvent('product_view', {
      product_name: productName,
      category,
      ...(price && { price }),
    });
  },

  /**
   * Track add to cart events
   */
  trackAddToCart: (productName: string, quantity: number, price: number) => {
    trackEvent('add_to_cart', {
      product_name: productName,
      quantity,
      price,
      total: quantity * price,
    });
  },

  /**
   * Track purchase events
   */
  trackPurchase: (orderTotal: number, orderItems: number, paymentMethod?: string) => {
    trackEvent('purchase', {
      order_total: orderTotal,
      order_items: orderItems,
      ...(paymentMethod && { payment_method: paymentMethod }),
    });
  },

  /**
   * Track contact form submissions
   */
  trackContactForm: (formType: 'contact' | 'catering' | 'newsletter') => {
    trackEvent('contact_form', {
      form_type: formType,
    });
  },

  /**
   * Track button clicks
   */
  trackButtonClick: (buttonName: string, location: string) => {
    trackEvent('button_click', {
      button_name: buttonName,
      location,
    });
  },

  /**
   * Track page performance
   */
  trackPagePerformance: (pageName: string, loadTime: number) => {
    trackEvent('page_performance', {
      page_name: pageName,
      load_time: loadTime,
    });
  },

  /**
   * Track errors
   */
  trackError: (errorType: string, errorMessage: string, page: string) => {
    trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      page,
    });
  },

  /**
   * Track social media clicks
   */
  trackSocialClick: (platform: string, content: string) => {
    trackEvent('social_share', {
      platform,
      content,
    });
  },

  /**
   * Track search events
   */
  trackSearch: (query: string, results: number) => {
    trackEvent('search', {
      query,
      results,
    });
  },
};
