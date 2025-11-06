/**
 * Web Vitals Tracking
 *
 * Integrates with web-vitals library to track Core Web Vitals metrics
 * and report them for performance monitoring.
 */

import type { CLSMetric, FCPMetric, INPMetric, LCPMetric, TTFBMetric, Metric } from 'web-vitals';
import { performanceMonitor, WEB_VITALS_THRESHOLDS, getRating } from './performance-monitor';

/**
 * Web Vitals metric names
 * Note: FID was deprecated in web-vitals v4 and removed in v5, replaced by INP
 */
export type WebVitalMetric = 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP';

/**
 * Web Vitals data structure
 */
export interface WebVitalsData {
  name: WebVitalMetric;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType?: string;
}

/**
 * Report Web Vitals to performance monitor
 */
export function reportWebVitals(metric: WebVitalsData): void {
  // Record in performance monitor
  performanceMonitor.record({
    name: `web_vitals_${metric.name.toLowerCase()}`,
    value: metric.value,
    unit: metric.name === 'CLS' ? 'score' : 'ms',
    timestamp: Date.now(),
    metadata: {
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    },
  });

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    const threshold = WEB_VITALS_THRESHOLDS[metric.name];
    const emoji =
      metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';

    console.log(
      `${emoji} ${metric.name}:`,
      metric.value.toFixed(2),
      `(${metric.rating})`,
      `| Good: <${threshold.good}, Needs Improvement: <${threshold.needsImprovement}`
    );
  }

  // Send to analytics (if configured)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating,
      metric_delta: Math.round(metric.delta),
      metric_id: metric.id,
    });
  }
}

/**
 * Initialize Web Vitals tracking
 *
 * Call this in your _app.tsx or root layout
 *
 * @example
 * ```tsx
 * import { initWebVitals } from '@/lib/testing/web-vitals';
 *
 * export default function App({ Component, pageProps }) {
 *   useEffect(() => {
 *     initWebVitals();
 *   }, []);
 *
 *   return <Component {...pageProps} />;
 * }
 * ```
 */
export async function initWebVitals(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Dynamically import web-vitals to avoid SSR issues
    // Note: FID was deprecated in v4 and removed in v5, replaced by INP
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Track Cumulative Layout Shift
    onCLS((metric: CLSMetric) => {
      reportWebVitals({
        name: 'CLS',
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track First Contentful Paint
    onFCP((metric: FCPMetric) => {
      reportWebVitals({
        name: 'FCP',
        value: metric.value,
        rating: getRating('FCP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track Largest Contentful Paint
    onLCP((metric: LCPMetric) => {
      reportWebVitals({
        name: 'LCP',
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track Time to First Byte
    onTTFB((metric: TTFBMetric) => {
      reportWebVitals({
        name: 'TTFB',
        value: metric.value,
        rating: getRating('TTFB', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });

    // Track Interaction to Next Paint (Chrome 96+)
    onINP((metric: INPMetric) => {
      reportWebVitals({
        name: 'INP',
        value: metric.value,
        rating: getRating('INP', metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });
    });
  } catch (error) {
    console.error('Failed to initialize Web Vitals tracking:', error);
  }
}

/**
 * Get Web Vitals summary
 */
export function getWebVitalsSummary(): Record<
  WebVitalMetric,
  {
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    threshold: { good: number; needsImprovement: number };
  }
> | null {
  const metrics = performanceMonitor.getMetrics();

  const webVitalsMetrics = metrics.filter(m => m.name.startsWith('web_vitals_'));

  if (webVitalsMetrics.length === 0) return null;

  const summary: any = {};

  // Note: FID was deprecated in web-vitals v4 and removed in v5, replaced by INP
  (['LCP', 'CLS', 'TTFB', 'FCP', 'INP'] as WebVitalMetric[]).forEach(metric => {
    const metricData = webVitalsMetrics.find(m => m.name === `web_vitals_${metric.toLowerCase()}`);

    if (metricData) {
      summary[metric] = {
        value: metricData.value,
        rating: metricData.metadata?.rating || getRating(metric, metricData.value),
        threshold: WEB_VITALS_THRESHOLDS[metric],
      };
    }
  });

  return summary;
}

/**
 * Check if all Web Vitals pass thresholds
 */
export function checkWebVitalsHealth(): {
  healthy: boolean;
  metrics: Record<string, boolean>;
  summary: ReturnType<typeof getWebVitalsSummary>;
} {
  const summary = getWebVitalsSummary();

  if (!summary) {
    return {
      healthy: false,
      metrics: {},
      summary: null,
    };
  }

  const metrics: Record<string, boolean> = {};
  let allHealthy = true;

  Object.entries(summary).forEach(([name, data]) => {
    const isHealthy = data.rating === 'good';
    metrics[name] = isHealthy;
    if (!isHealthy) allHealthy = false;
  });

  return {
    healthy: allHealthy,
    metrics,
    summary,
  };
}
