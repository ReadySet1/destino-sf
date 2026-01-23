/**
 * Performance Chart Component
 *
 * Displays performance metrics in chart format.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';

interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  throughput: number;
}

interface PerformanceChartProps {
  metrics: PerformanceMetrics;
  title?: string;
  description?: string;
}

export function PerformanceChart({
  metrics,
  title = 'API Performance',
  description = 'Last hour performance metrics',
}: PerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MetricBlock
            icon={Clock}
            label="Avg Response"
            value={`${metrics.averageResponseTime}ms`}
            status={getResponseTimeStatus(metrics.averageResponseTime)}
          />
          <MetricBlock
            icon={TrendingUp}
            label="P95 Response"
            value={`${metrics.p95ResponseTime}ms`}
            status={getResponseTimeStatus(metrics.p95ResponseTime)}
          />
          <MetricBlock
            icon={TrendingDown}
            label="Error Rate"
            value={`${metrics.errorRate}%`}
            status={getErrorRateStatus(metrics.errorRate)}
          />
          <MetricBlock
            icon={Zap}
            label="Throughput"
            value={`${metrics.throughput}/min`}
            status="neutral"
          />
        </div>

        {/* Simple bar visualization */}
        <div className="mt-6 space-y-4">
          <ProgressBar
            label="Response Time (target: <500ms)"
            value={Math.min(metrics.averageResponseTime / 1000, 1) * 100}
            status={getResponseTimeStatus(metrics.averageResponseTime)}
          />
          <ProgressBar
            label="Error Rate (target: <5%)"
            value={Math.min(metrics.errorRate / 10, 1) * 100}
            status={getErrorRateStatus(metrics.errorRate)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricBlockProps {
  icon: React.ElementType;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

function MetricBlock({ icon: Icon, label, value, status }: MetricBlockProps) {
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
    neutral: 'text-blue-500',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className={`h-5 w-5 mt-0.5 ${statusColors[status]}`} />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${statusColors[status]}`}>{value}</p>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
}

function ProgressBar({ label, value, status }: ProgressBarProps) {
  const statusColors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    neutral: 'bg-blue-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${statusColors[status]} transition-all duration-300`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function getResponseTimeStatus(ms: number): 'good' | 'warning' | 'critical' {
  if (ms < 500) return 'good';
  if (ms < 1000) return 'warning';
  return 'critical';
}

function getErrorRateStatus(rate: number): 'good' | 'warning' | 'critical' {
  if (rate < 2) return 'good';
  if (rate < 5) return 'warning';
  return 'critical';
}

/**
 * Top endpoints table
 */
export function TopEndpointsTable({
  endpoints,
}: {
  endpoints: Array<{
    endpoint: string;
    count: number;
    avg_duration: number;
    error_rate: number;
  }>;
}) {
  if (endpoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No endpoint data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Endpoints</CardTitle>
        <CardDescription>Most frequently called endpoints</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {endpoints.map((endpoint, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{endpoint.endpoint}</p>
                <p className="text-xs text-muted-foreground">
                  {endpoint.count} calls
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span
                  className={
                    endpoint.avg_duration > 1000
                      ? 'text-red-500'
                      : endpoint.avg_duration > 500
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  }
                >
                  {endpoint.avg_duration}ms
                </span>
                <span
                  className={
                    endpoint.error_rate > 5
                      ? 'text-red-500'
                      : endpoint.error_rate > 2
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  }
                >
                  {endpoint.error_rate}% err
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
