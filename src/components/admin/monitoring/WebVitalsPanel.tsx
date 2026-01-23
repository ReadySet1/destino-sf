/**
 * Web Vitals Panel Component
 *
 * Displays Core Web Vitals metrics with visual indicators.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface WebVitalsData {
  LCP: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
  FID: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
  INP: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
  CLS: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
  FCP: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
  TTFB: { value: number | null; rating: 'good' | 'needs-improvement' | 'poor' | null };
}

interface WebVitalsPanelProps {
  data?: WebVitalsData;
}

const metricInfo = {
  LCP: {
    name: 'Largest Contentful Paint',
    description: 'Measures loading performance. Good: <2.5s',
    unit: 'ms',
    thresholds: { good: 2500, poor: 4000 },
  },
  FID: {
    name: 'First Input Delay',
    description: 'Measures interactivity. Good: <100ms',
    unit: 'ms',
    thresholds: { good: 100, poor: 300 },
  },
  INP: {
    name: 'Interaction to Next Paint',
    description: 'Measures responsiveness. Good: <200ms',
    unit: 'ms',
    thresholds: { good: 200, poor: 500 },
  },
  CLS: {
    name: 'Cumulative Layout Shift',
    description: 'Measures visual stability. Good: <0.1',
    unit: '',
    thresholds: { good: 0.1, poor: 0.25 },
  },
  FCP: {
    name: 'First Contentful Paint',
    description: 'Time to first content render. Good: <1.8s',
    unit: 'ms',
    thresholds: { good: 1800, poor: 3000 },
  },
  TTFB: {
    name: 'Time to First Byte',
    description: 'Server response time. Good: <800ms',
    unit: 'ms',
    thresholds: { good: 800, poor: 1800 },
  },
};

const ratingColors = {
  good: {
    text: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    badge: 'success' as const,
  },
  'needs-improvement': {
    text: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    badge: 'warning' as const,
  },
  poor: {
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    badge: 'danger' as const,
  },
};

export function WebVitalsPanel({ data }: WebVitalsPanelProps) {
  // Use placeholder data if none provided
  const vitals = data || {
    LCP: { value: null, rating: null },
    FID: { value: null, rating: null },
    INP: { value: null, rating: null },
    CLS: { value: null, rating: null },
    FCP: { value: null, rating: null },
    TTFB: { value: null, rating: null },
  };

  const coreVitals = ['LCP', 'INP', 'CLS'] as const;
  const otherVitals = ['FCP', 'TTFB', 'FID'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Core Web Vitals
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Core Web Vitals are Google&apos;s key metrics for measuring user
                  experience. These metrics are collected from real users.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Performance metrics from real user monitoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Core Web Vitals */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3">Core Vitals</h4>
          <div className="grid grid-cols-3 gap-4">
            {coreVitals.map(metric => (
              <WebVitalCard
                key={metric}
                metric={metric}
                value={vitals[metric].value}
                rating={vitals[metric].rating}
              />
            ))}
          </div>
        </div>

        {/* Other Vitals */}
        <div>
          <h4 className="text-sm font-medium mb-3">Other Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            {otherVitals.map(metric => (
              <WebVitalCard
                key={metric}
                metric={metric}
                value={vitals[metric].value}
                rating={vitals[metric].rating}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WebVitalCard({
  metric,
  value,
  rating,
}: {
  metric: keyof typeof metricInfo;
  value: number | null;
  rating: 'good' | 'needs-improvement' | 'poor' | null;
}) {
  const info = metricInfo[metric];
  const colors = rating ? ratingColors[rating] : null;

  const formatValue = (val: number | null): string => {
    if (val === null) return '-';
    if (metric === 'CLS') return val.toFixed(3);
    if (val >= 1000) return `${(val / 1000).toFixed(2)}s`;
    return `${Math.round(val)}${info.unit}`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`p-3 rounded-lg border transition-colors cursor-help ${
              colors
                ? `${colors.bg} ${colors.border}`
                : 'bg-muted/50 border-muted'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {metric}
              </span>
              {rating && <Badge variant={colors?.badge}>{rating}</Badge>}
            </div>
            <div className={`text-2xl font-bold ${colors?.text || 'text-muted-foreground'}`}>
              {formatValue(value)}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{info.name}</p>
          <p className="text-sm text-muted-foreground">{info.description}</p>
          <div className="mt-2 text-xs">
            <p className="text-green-500">Good: &lt;{info.thresholds.good}{info.unit}</p>
            <p className="text-yellow-500">
              Needs Improvement: {info.thresholds.good}-{info.thresholds.poor}{info.unit}
            </p>
            <p className="text-red-500">Poor: &gt;{info.thresholds.poor}{info.unit}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact Web Vitals indicator for headers
 */
export function WebVitalsIndicator({
  score,
}: {
  score: 'good' | 'needs-improvement' | 'poor';
}) {
  const colors = ratingColors[score];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${colors.bg}`}>
      <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
      <span className={`text-xs font-medium capitalize ${colors.text}`}>{score}</span>
    </div>
  );
}

/**
 * Calculate overall Web Vitals score
 */
export function calculateOverallScore(
  data: WebVitalsData
): 'good' | 'needs-improvement' | 'poor' {
  const coreVitals = [data.LCP, data.INP, data.CLS];
  const ratings = coreVitals.map(v => v.rating).filter(Boolean);

  if (ratings.length === 0) return 'good'; // No data yet

  if (ratings.some(r => r === 'poor')) return 'poor';
  if (ratings.some(r => r === 'needs-improvement')) return 'needs-improvement';
  return 'good';
}
