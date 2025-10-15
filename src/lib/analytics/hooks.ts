/**
 * React hooks for Umami analytics integration
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  trackEvent,
  UmamiTracking,
  isUmamiLoaded,
  type UmamiEventType,
  type UmamiEventData,
} from './umami';

/**
 * Hook to track page views automatically
 * This hook tracks page changes in Next.js applications
 */
export const useUmamiPageTracking = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    // Avoid tracking the same page multiple times
    if (lastTrackedPath.current === currentPath) return;

    lastTrackedPath.current = currentPath;

    // Small delay to ensure Umami script is loaded
    const timeoutId = setTimeout(() => {
      if (isUmamiLoaded()) {
        // Umami automatically tracks page views, but we can add custom data
        trackEvent('page_view', {
          path: currentPath,
          referrer: document.referrer || 'direct',
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, searchParams]);
};

/**
 * Hook for tracking custom events with proper TypeScript support
 */
export const useUmamiTracking = () => {
  const track = useCallback((eventName: UmamiEventType, eventData?: UmamiEventData) => {
    trackEvent(eventName, eventData);
  }, []);

  const trackButtonClick = useCallback((buttonName: string, location: string) => {
    UmamiTracking.trackButtonClick(buttonName, location);
  }, []);

  const trackProductView = useCallback((productName: string, category: string, price?: number) => {
    UmamiTracking.trackProductView(productName, category, price);
  }, []);

  const trackAddToCart = useCallback((productName: string, quantity: number, price: number) => {
    UmamiTracking.trackAddToCart(productName, quantity, price);
  }, []);

  const trackPurchase = useCallback(
    (orderTotal: number, orderItems: number, paymentMethod?: string) => {
      UmamiTracking.trackPurchase(orderTotal, orderItems, paymentMethod);
    },
    []
  );

  const trackContactForm = useCallback((formType: 'contact' | 'catering' | 'newsletter') => {
    UmamiTracking.trackContactForm(formType);
  }, []);

  const trackError = useCallback((errorType: string, errorMessage: string, page: string) => {
    UmamiTracking.trackError(errorType, errorMessage, page);
  }, []);

  const trackSocialClick = useCallback((platform: string, content: string) => {
    UmamiTracking.trackSocialClick(platform, content);
  }, []);

  const trackSearch = useCallback((query: string, results: number) => {
    UmamiTracking.trackSearch(query, results);
  }, []);

  return {
    track,
    trackButtonClick,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackContactForm,
    trackError,
    trackSocialClick,
    trackSearch,
    isLoaded: isUmamiLoaded(),
  };
};

/**
 * Hook for tracking form submissions
 */
export const useUmamiFormTracking = () => {
  const trackFormStart = useCallback((formName: string) => {
    trackEvent('form_start', { form_name: formName });
  }, []);

  const trackFormSubmit = useCallback(
    (formName: string, success: boolean, errorMessage?: string) => {
      trackEvent('form_submit', {
        form_name: formName,
        success,
        ...(errorMessage && { error_message: errorMessage }),
      });
    },
    []
  );

  const trackFormFieldInteraction = useCallback((formName: string, fieldName: string) => {
    trackEvent('form_field_interaction', {
      form_name: formName,
      field_name: fieldName,
    });
  }, []);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormFieldInteraction,
  };
};

/**
 * Hook for tracking performance metrics
 */
export const useUmamiPerformanceTracking = () => {
  const trackPerformance = useCallback((metricName: string, value: number, unit: string = 'ms') => {
    trackEvent('performance_metric', {
      metric_name: metricName,
      value,
      unit,
    });
  }, []);

  const trackLoadTime = useCallback((pageName: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const loadTime = performance.now();
      UmamiTracking.trackPagePerformance(pageName, Math.round(loadTime));
    }
  }, []);

  return {
    trackPerformance,
    trackLoadTime,
  };
};
