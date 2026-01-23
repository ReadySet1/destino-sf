/**
 * Health Status Card Component
 *
 * Displays system health status with visual indicators.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthStatusCardProps {
  title: string;
  status: HealthStatus;
  description?: string;
  metrics?: Array<{
    label: string;
    value: string | number;
    status?: HealthStatus;
  }>;
  lastUpdated?: string;
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    badgeVariant: 'success' as const,
    label: 'Healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    badgeVariant: 'warning' as const,
    label: 'Degraded',
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    badgeVariant: 'danger' as const,
    label: 'Unhealthy',
  },
};

export function HealthStatusCard({
  title,
  status,
  description,
  metrics,
  lastUpdated,
}: HealthStatusCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className={config.bgColor}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge variant={config.badgeVariant}>{config.label}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-8 w-8 ${config.color}`} />
          <div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {metrics && metrics.length > 0 && (
          <div className="mt-4 space-y-2">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{metric.label}</span>
                <span
                  className={
                    metric.status
                      ? statusConfig[metric.status].color
                      : 'font-medium'
                  }
                >
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact health indicator for inline use
 */
export function HealthIndicator({ status }: { status: HealthStatus }) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center space-x-1">
      <StatusIcon className={`h-4 w-4 ${config.color}`} />
      <span className={`text-sm ${config.color}`}>{config.label}</span>
    </div>
  );
}

/**
 * System overview card with overall status
 */
export function SystemOverviewCard({
  status,
  errorRate,
  avgResponseTime,
  throughput,
}: {
  status: HealthStatus;
  errorRate: number;
  avgResponseTime: number;
  throughput: number;
}) {
  return (
    <HealthStatusCard
      title="System Overview"
      status={status}
      description={`Processing ${throughput} requests/min`}
      metrics={[
        {
          label: 'Error Rate',
          value: `${errorRate}%`,
          status: errorRate > 5 ? 'unhealthy' : errorRate > 2 ? 'degraded' : 'healthy',
        },
        {
          label: 'Avg Response Time',
          value: `${avgResponseTime}ms`,
          status:
            avgResponseTime > 1000
              ? 'unhealthy'
              : avgResponseTime > 500
                ? 'degraded'
                : 'healthy',
        },
        {
          label: 'Throughput',
          value: `${throughput}/min`,
          status: 'healthy',
        },
      ]}
    />
  );
}
