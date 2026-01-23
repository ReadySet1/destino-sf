/**
 * Web Vitals Integration
 *
 * Reports Core Web Vitals to Sentry for performance monitoring.
 * Includes LCP, FID/INP, CLS, TTFB, and FCP metrics.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 * @see https://web.dev/vitals/
 */

import * as Sentry from '@sentry/nextjs';

export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender';
}

export interface WebVitalsThresholds {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  INP: { good: number; poor: number };
  CLS: { good: number; poor: number };
  FCP: { good: number; poor: number };
  TTFB: { good: number; poor: number };
}

// Core Web Vitals thresholds per Google's guidelines
export const WEB_VITALS_THRESHOLDS: WebVitalsThresholds = {
  LCP: { good: 2500, poor: 4000 },   // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },      // First Input Delay (ms)
  INP: { good: 200, poor: 500 },      // Interaction to Next Paint (ms)
  CLS: { good: 0.1, poor: 0.25 },     // Cumulative Layout Shift (unitless)
  FCP: { good: 1800, poor: 3000 },    // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 },    // Time to First Byte (ms)
};

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  name: keyof WebVitalsThresholds,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Report a Web Vital metric to Sentry
 */
export function reportWebVital(metric: WebVitalsMetric): void {
  const rating = getMetricRating(metric.name, metric.value);

  // Add as a custom measurement to Sentry
  Sentry.setMeasurement(metric.name, metric.value, getMetricUnit(metric.name));

  // Add breadcrumb for the metric
  Sentry.addBreadcrumb({
    type: 'info',
    category: 'web-vitals',
    message: `${metric.name}: ${metric.value.toFixed(2)} (${rating})`,
    level: rating === 'poor' ? 'warning' : 'info',
    data: {
      metric: metric.name,
      value: metric.value,
      rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
    },
  });

  // Set context for debugging
  Sentry.setContext('web_vitals', {
    [metric.name]: {
      value: metric.value,
      rating,
      id: metric.id,
    },
  });

  // Send to Sentry as a transaction if it's a poor metric
  if (rating === 'poor') {
    Sentry.captureMessage(`Poor Web Vital: ${metric.name}`, {
      level: 'warning',
      tags: {
        'web_vital.name': metric.name,
        'web_vital.rating': rating,
        'navigation_type': metric.navigationType,
      },
      extra: {
        value: metric.value,
        threshold_good: WEB_VITALS_THRESHOLDS[metric.name].good,
        threshold_poor: WEB_VITALS_THRESHOLDS[metric.name].poor,
        entries: metric.entries.map(e => ({
          name: e.name,
          entryType: e.entryType,
          startTime: e.startTime,
          duration: (e as PerformanceResourceTiming).duration,
        })),
      },
    });
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    const color = rating === 'good' ? '\x1b[32m' : rating === 'needs-improvement' ? '\x1b[33m' : '\x1b[31m';
    console.log(
      `${color}[WebVitals] ${metric.name}: ${metric.value.toFixed(2)} (${rating})\x1b[0m`
    );
  }
}

/**
 * Get the appropriate unit for a metric
 */
function getMetricUnit(name: string): 'millisecond' | 'none' {
  if (name === 'CLS') return 'none';
  return 'millisecond';
}

/**
 * Initialize Web Vitals reporting using the web-vitals library
 * This should be called in your app's root layout or entry point
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamically import web-vitals to keep bundle size small
    // Note: FID was deprecated in favor of INP in web-vitals v4+
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');

    // Report all Core Web Vitals (FID replaced by INP)
    onCLS(metric => reportWebVital(convertMetric(metric)));
    onFCP(metric => reportWebVital(convertMetric(metric)));
    onINP(metric => reportWebVital(convertMetric(metric)));
    onLCP(metric => reportWebVital(convertMetric(metric)));
    onTTFB(metric => reportWebVital(convertMetric(metric)));

    console.log('[WebVitals] Initialized');
  } catch (error) {
    console.error('[WebVitals] Failed to initialize:', error);
  }
}

interface WebVitalsLibMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries?: PerformanceEntry[];
  navigationType?: string;
}

/**
 * Convert web-vitals library metric to our format
 */
function convertMetric(metric: WebVitalsLibMetric): WebVitalsMetric {
  return {
    id: metric.id,
    name: metric.name as WebVitalsMetric['name'],
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    entries: metric.entries || [],
    navigationType: (metric.navigationType as WebVitalsMetric['navigationType']) || 'navigate',
  };
}

/**
 * Get current page's Web Vitals summary
 */
export function getWebVitalsSummary(): Record<string, { value: number | null; rating: string | null }> {
  return {
    LCP: { value: null, rating: null },
    FID: { value: null, rating: null },
    INP: { value: null, rating: null },
    CLS: { value: null, rating: null },
    FCP: { value: null, rating: null },
    TTFB: { value: null, rating: null },
  };
}

/**
 * Create a performance marker for custom timing
 */
export function markPerformance(name: string): void {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof window === 'undefined' || !window.performance) return null;

  try {
    const endMarkName = endMark || `${name}-end`;
    if (!endMark) {
      performance.mark(endMarkName);
    }

    performance.measure(name, startMark, endMarkName);
    const entries = performance.getEntriesByName(name, 'measure');
    const entry = entries[entries.length - 1];

    if (entry) {
      Sentry.addBreadcrumb({
        type: 'info',
        category: 'performance',
        message: `${name}: ${entry.duration.toFixed(2)}ms`,
        level: 'info',
        data: {
          duration: entry.duration,
          startTime: entry.startTime,
        },
      });

      return entry.duration;
    }
  } catch (error) {
    console.error('[WebVitals] measurePerformance error:', error);
  }

  return null;
}

/**
 * Track a custom interaction timing
 */
export function trackInteractionTiming(
  interactionName: string,
  duration: number
): void {
  const rating = duration < 100 ? 'good' : duration < 300 ? 'needs-improvement' : 'poor';

  Sentry.addBreadcrumb({
    type: 'info',
    category: 'interaction',
    message: `${interactionName}: ${duration}ms (${rating})`,
    level: rating === 'poor' ? 'warning' : 'info',
    data: {
      duration,
      rating,
    },
  });

  if (rating === 'poor') {
    Sentry.captureMessage(`Slow interaction: ${interactionName}`, {
      level: 'warning',
      tags: {
        interaction_name: interactionName,
        interaction_rating: rating,
      },
      extra: {
        duration,
      },
    });
  }
}
