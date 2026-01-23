/**
 * Tests for Web Vitals Integration
 *
 * @jest-environment jsdom
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import * as Sentry from '@sentry/nextjs';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  setMeasurement: jest.fn(),
  addBreadcrumb: jest.fn(),
  setContext: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock window.performance
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([{ duration: 100, startTime: 0 }]),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

import {
  reportWebVital,
  getMetricRating,
  WEB_VITALS_THRESHOLDS,
  markPerformance,
  measurePerformance,
  trackInteractionTiming,
  type WebVitalsMetric,
} from '@/lib/monitoring/web-vitals';

describe('Web Vitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetricRating', () => {
    it('should rate LCP correctly', () => {
      expect(getMetricRating('LCP', 2000)).toBe('good');
      expect(getMetricRating('LCP', 3000)).toBe('needs-improvement');
      expect(getMetricRating('LCP', 5000)).toBe('poor');
    });

    it('should rate FID correctly', () => {
      expect(getMetricRating('FID', 50)).toBe('good');
      expect(getMetricRating('FID', 200)).toBe('needs-improvement');
      expect(getMetricRating('FID', 400)).toBe('poor');
    });

    it('should rate INP correctly', () => {
      expect(getMetricRating('INP', 150)).toBe('good');
      expect(getMetricRating('INP', 300)).toBe('needs-improvement');
      expect(getMetricRating('INP', 600)).toBe('poor');
    });

    it('should rate CLS correctly', () => {
      expect(getMetricRating('CLS', 0.05)).toBe('good');
      expect(getMetricRating('CLS', 0.15)).toBe('needs-improvement');
      expect(getMetricRating('CLS', 0.3)).toBe('poor');
    });

    it('should rate FCP correctly', () => {
      expect(getMetricRating('FCP', 1500)).toBe('good');
      expect(getMetricRating('FCP', 2500)).toBe('needs-improvement');
      expect(getMetricRating('FCP', 4000)).toBe('poor');
    });

    it('should rate TTFB correctly', () => {
      expect(getMetricRating('TTFB', 500)).toBe('good');
      expect(getMetricRating('TTFB', 1200)).toBe('needs-improvement');
      expect(getMetricRating('TTFB', 2000)).toBe('poor');
    });
  });

  describe('reportWebVital', () => {
    it('should report a good LCP metric', () => {
      const metric: WebVitalsMetric = {
        id: 'test-id',
        name: 'LCP',
        value: 2000,
        rating: 'good',
        delta: 2000,
        entries: [],
        navigationType: 'navigate',
      };

      reportWebVital(metric);

      expect(Sentry.setMeasurement).toHaveBeenCalledWith('LCP', 2000, 'millisecond');
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'web-vitals',
          level: 'info',
        })
      );
      expect(Sentry.setContext).toHaveBeenCalledWith(
        'web_vitals',
        expect.objectContaining({
          LCP: expect.objectContaining({
            value: 2000,
            rating: 'good',
          }),
        })
      );
    });

    it('should report a poor metric with warning', () => {
      const metric: WebVitalsMetric = {
        id: 'test-id',
        name: 'LCP',
        value: 5000,
        rating: 'poor',
        delta: 5000,
        entries: [],
        navigationType: 'navigate',
      };

      reportWebVital(metric);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warning',
        })
      );
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Poor Web Vital: LCP',
        expect.objectContaining({
          level: 'warning',
        })
      );
    });

    it('should use "none" unit for CLS', () => {
      const metric: WebVitalsMetric = {
        id: 'test-id',
        name: 'CLS',
        value: 0.05,
        rating: 'good',
        delta: 0.05,
        entries: [],
        navigationType: 'navigate',
      };

      reportWebVital(metric);

      expect(Sentry.setMeasurement).toHaveBeenCalledWith('CLS', 0.05, 'none');
    });

    it('should include threshold information in poor metric reports', () => {
      const metric: WebVitalsMetric = {
        id: 'test-id',
        name: 'INP',
        value: 600,
        rating: 'poor',
        delta: 600,
        entries: [],
        navigationType: 'navigate',
      };

      reportWebVital(metric);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Poor Web Vital: INP',
        expect.objectContaining({
          extra: expect.objectContaining({
            threshold_good: WEB_VITALS_THRESHOLDS.INP.good,
            threshold_poor: WEB_VITALS_THRESHOLDS.INP.poor,
          }),
        })
      );
    });
  });

  describe('markPerformance', () => {
    it('should create a performance mark', () => {
      markPerformance('custom-mark');

      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-mark');
    });
  });

  describe('measurePerformance', () => {
    it('should measure between two marks', () => {
      const duration = measurePerformance('custom-measure', 'start-mark', 'end-mark');

      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'custom-measure',
        'start-mark',
        'end-mark'
      );
      expect(duration).toBe(100); // From our mock
    });

    it('should create end mark if not provided', () => {
      measurePerformance('custom-measure', 'start-mark');

      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-measure-end');
    });

    it('should add Sentry breadcrumb for measurement', () => {
      measurePerformance('custom-measure', 'start-mark');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'performance',
          message: expect.stringContaining('100.00ms'),
        })
      );
    });
  });

  describe('trackInteractionTiming', () => {
    it('should track good interaction timing', () => {
      trackInteractionTiming('button-click', 50);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'interaction',
          message: 'button-click: 50ms (good)',
          level: 'info',
        })
      );
    });

    it('should track needs-improvement interaction timing', () => {
      trackInteractionTiming('form-submit', 200);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'form-submit: 200ms (needs-improvement)',
          level: 'info',
        })
      );
    });

    it('should track poor interaction timing with warning', () => {
      trackInteractionTiming('slow-operation', 500);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warning',
        })
      );
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Slow interaction: slow-operation',
        expect.objectContaining({
          level: 'warning',
        })
      );
    });
  });

  describe('WEB_VITALS_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(WEB_VITALS_THRESHOLDS.LCP).toEqual({ good: 2500, poor: 4000 });
      expect(WEB_VITALS_THRESHOLDS.FID).toEqual({ good: 100, poor: 300 });
      expect(WEB_VITALS_THRESHOLDS.INP).toEqual({ good: 200, poor: 500 });
      expect(WEB_VITALS_THRESHOLDS.CLS).toEqual({ good: 0.1, poor: 0.25 });
      expect(WEB_VITALS_THRESHOLDS.FCP).toEqual({ good: 1800, poor: 3000 });
      expect(WEB_VITALS_THRESHOLDS.TTFB).toEqual({ good: 800, poor: 1800 });
    });
  });
});
