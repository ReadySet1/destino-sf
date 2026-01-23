/**
 * External Services Status Component
 *
 * Displays the health and metrics of external API services.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Cloud,
  CreditCard,
  Truck,
  Mail,
  Database,
  Activity,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { HealthStatus } from './HealthStatusCard';

interface ServiceHealth {
  status: HealthStatus;
  errorRate: number;
  avgLatency: number;
  lastCallAt: string | null;
  rateLimitStatus?: {
    remaining: number;
    total: number;
    percentUsed: number;
  };
}

interface ExternalServicesStatusProps {
  services: Record<string, ServiceHealth>;
}

const serviceConfig: Record<
  string,
  { icon: React.ElementType; label: string; description: string }
> = {
  square: {
    icon: CreditCard,
    label: 'Square',
    description: 'Payment processing',
  },
  shippo: {
    icon: Truck,
    label: 'Shippo',
    description: 'Shipping rates & labels',
  },
  resend: {
    icon: Mail,
    label: 'Resend',
    description: 'Email delivery',
  },
  supabase: {
    icon: Database,
    label: 'Supabase',
    description: 'Authentication & storage',
  },
  other: {
    icon: Cloud,
    label: 'Other',
    description: 'Miscellaneous services',
  },
};

const statusConfig = {
  healthy: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    badgeVariant: 'success' as const,
  },
  degraded: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    badgeVariant: 'warning' as const,
  },
  unhealthy: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    badgeVariant: 'danger' as const,
  },
};

export function ExternalServicesStatus({ services }: ExternalServicesStatusProps) {
  const serviceEntries = Object.entries(services).filter(
    ([name]) => name !== 'other' || services.other?.avgLatency > 0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          External Services
        </CardTitle>
        <CardDescription>Status of third-party API integrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {serviceEntries.map(([name, health]) => (
            <ServiceCard key={name} name={name} health={health} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ServiceCard({ name, health }: { name: string; health: ServiceHealth }) {
  const config = serviceConfig[name] || serviceConfig.other;
  const status = statusConfig[health.status];
  const Icon = config.icon;

  const hasActivity = health.lastCallAt !== null;

  return (
    <div
      className={`p-4 rounded-lg border ${status.bgColor} ${status.borderColor}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${status.color}`} />
          <div>
            <h4 className="font-medium">{config.label}</h4>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <Badge variant={status.badgeVariant}>{health.status}</Badge>
      </div>

      {hasActivity ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              Latency
            </span>
            <span
              className={
                health.avgLatency > 2000
                  ? 'text-red-500'
                  : health.avgLatency > 1000
                    ? 'text-yellow-500'
                    : 'text-green-500'
              }
            >
              {health.avgLatency}ms avg
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Error Rate
            </span>
            <span
              className={
                health.errorRate > 10
                  ? 'text-red-500'
                  : health.errorRate > 5
                    ? 'text-yellow-500'
                    : 'text-green-500'
              }
            >
              {health.errorRate}%
            </span>
          </div>

          {health.rateLimitStatus && (
            <div className="mt-2 pt-2 border-t border-dashed">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rate Limit</span>
                <span
                  className={
                    health.rateLimitStatus.percentUsed > 80
                      ? 'text-red-500'
                      : health.rateLimitStatus.percentUsed > 60
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  }
                >
                  {health.rateLimitStatus.remaining}/{health.rateLimitStatus.total} remaining
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    health.rateLimitStatus.percentUsed > 80
                      ? 'bg-red-500'
                      : health.rateLimitStatus.percentUsed > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${health.rateLimitStatus.percentUsed}%` }}
                />
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2">
            Last call: {new Date(health.lastCallAt!).toLocaleTimeString()}
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <Activity className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
          <p className="text-xs text-muted-foreground">No recent activity</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact service status for header/summary views
 */
export function ServiceStatusIndicators({
  services,
}: {
  services: Record<string, { status: HealthStatus }>;
}) {
  return (
    <div className="flex items-center gap-2">
      {Object.entries(services)
        .filter(([name]) => name !== 'other')
        .map(([name, { status }]) => {
          const config = serviceConfig[name] || serviceConfig.other;
          const statusColors = statusConfig[status];
          const Icon = config.icon;

          return (
            <div
              key={name}
              className={`p-1.5 rounded ${statusColors.bgColor}`}
              title={`${config.label}: ${status}`}
            >
              <Icon className={`h-4 w-4 ${statusColors.color}`} />
            </div>
          );
        })}
    </div>
  );
}
