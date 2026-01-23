/**
 * Monitoring Dashboard Component
 *
 * Main dashboard for system monitoring with tabbed navigation.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RefreshCcw,
  Activity,
  Cloud,
  AlertTriangle,
  Lock,
  Gauge,
  Loader2,
} from 'lucide-react';

import {
  HealthStatusCard,
  SystemOverviewCard,
  type HealthStatus,
} from './HealthStatusCard';
import { PerformanceChart, TopEndpointsTable } from './PerformanceChart';
import { ErrorsTable, ErrorSummary } from './ErrorsTable';
import { ExternalServicesStatus, ServiceStatusIndicators } from './ExternalServicesStatus';

interface MonitoringData {
  overview: {
    timestamp: string;
    status: HealthStatus;
    performance: {
      averageResponseTime: number;
      p95ResponseTime: number;
      errorRate: number;
      throughput: number;
    };
    externalServices: Record<
      string,
      {
        status: HealthStatus;
        errorRate: number;
        avgLatency: number;
        lastCallAt: string | null;
      }
    >;
    concurrency: {
      healthy: boolean;
      issues: string[];
      stats: {
        totalLockAcquisitions: number;
        lockConflicts: number;
        deduplicationsTriggered: number;
      };
    };
    recentErrors: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  performance: {
    response_times: { average: number; p95: number };
    error_rate: number;
    throughput: number;
    slow_queries: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    top_endpoints: Array<{
      endpoint: string;
      count: number;
      avg_duration: number;
      error_rate: number;
    }>;
    memory: {
      heap_used_mb: number;
      heap_total_mb: number;
      external_mb: number;
      rss_mb: number;
    };
  };
  externalServices: {
    health: Record<string, any>;
    errors: Record<string, { count: number; types: Record<string, number> }>;
    latencyByEndpoint: Record<string, Array<any>>;
  };
  concurrency: {
    health: { healthy: boolean; issues: string[] };
    stats: any;
  };
  slowQueries: Array<{ query: string; duration: number; timestamp: string }>;
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/monitoring/comprehensive');

      if (!response.ok) {
        throw new Error(`Failed to fetch monitoring data: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
      console.error('[MonitoringDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, autoRefresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time performance and health metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ServiceStatusIndicators services={data.overview.externalServices} />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>

            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
          </div>
        </div>
      </div>

      {lastRefresh && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
          {error && (
            <span className="text-yellow-500 ml-2">(refresh failed)</span>
          )}
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            API Performance
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            External Services
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Errors
          </TabsTrigger>
          <TabsTrigger value="concurrency" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Concurrency
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SystemOverviewCard
              status={data.overview.status}
              errorRate={data.overview.performance.errorRate}
              avgResponseTime={data.overview.performance.averageResponseTime}
              throughput={data.overview.performance.throughput}
            />

            <HealthStatusCard
              title="Concurrency"
              status={data.overview.concurrency.healthy ? 'healthy' : 'unhealthy'}
              description={
                data.overview.concurrency.issues.length > 0
                  ? data.overview.concurrency.issues[0]
                  : 'All systems operating normally'
              }
              metrics={[
                {
                  label: 'Lock Acquisitions',
                  value: data.overview.concurrency.stats.totalLockAcquisitions,
                },
                {
                  label: 'Conflicts',
                  value: data.overview.concurrency.stats.lockConflicts,
                  status:
                    data.overview.concurrency.stats.lockConflicts > 10
                      ? 'unhealthy'
                      : 'healthy',
                },
                {
                  label: 'Deduplications',
                  value: data.overview.concurrency.stats.deduplicationsTriggered,
                },
              ]}
            />

            <ErrorSummary {...data.overview.recentErrors} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PerformanceChart metrics={data.overview.performance} />
            <TopEndpointsTable endpoints={data.performance.top_endpoints} />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <PerformanceChart
              metrics={data.overview.performance}
              title="Response Times"
              description="API response time metrics"
            />

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <MemoryMetric
                    label="Heap Used"
                    value={data.performance.memory.heap_used_mb}
                    max={data.performance.memory.heap_total_mb}
                    unit="MB"
                  />
                  <MemoryMetric
                    label="Heap Total"
                    value={data.performance.memory.heap_total_mb}
                    max={1024}
                    unit="MB"
                  />
                  <MemoryMetric
                    label="RSS"
                    value={data.performance.memory.rss_mb}
                    max={2048}
                    unit="MB"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <TopEndpointsTable endpoints={data.performance.top_endpoints} />
        </TabsContent>

        {/* External Services Tab */}
        <TabsContent value="external" className="space-y-4">
          <ExternalServicesStatus services={data.externalServices.health} />

          <Card>
            <CardHeader>
              <CardTitle>API Call Errors by Service</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.externalServices.errors).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No API errors in the last hour
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(data.externalServices.errors).map(
                    ([service, errorData]) => (
                      <div
                        key={service}
                        className="p-4 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{service}</span>
                          <Badge variant="danger">{errorData.count} errors</Badge>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(errorData.types).map(([type, count]) => (
                            <div
                              key={type}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground">{type}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <ErrorSummary {...data.overview.recentErrors} />
          <ErrorsTable
            slowQueries={data.slowQueries}
            errorBreakdown={data.externalServices.errors}
          />
        </TabsContent>

        {/* Concurrency Tab */}
        <TabsContent value="concurrency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <HealthStatusCard
              title="Lock System"
              status={data.concurrency.health.healthy ? 'healthy' : 'unhealthy'}
              description="Database row locking and pessimistic locks"
              metrics={[
                {
                  label: 'Total Acquisitions',
                  value: data.concurrency.stats.totalLockAcquisitions,
                },
                {
                  label: 'Conflicts',
                  value: data.concurrency.stats.lockConflicts,
                  status:
                    data.concurrency.stats.lockConflicts > 10 ? 'unhealthy' : 'healthy',
                },
              ]}
            />

            <HealthStatusCard
              title="Request Deduplication"
              status="healthy"
              description="Preventing duplicate concurrent requests"
              metrics={[
                {
                  label: 'Deduplications',
                  value: data.concurrency.stats.deduplicationsTriggered,
                },
              ]}
            />

            <HealthStatusCard
              title="Optimistic Locking"
              status="healthy"
              description="Version-based concurrency control"
              metrics={[
                {
                  label: 'Version Conflicts',
                  value: data.concurrency.stats.optimisticLockConflicts || 0,
                },
              ]}
            />
          </div>

          {data.concurrency.health.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-500">Active Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.concurrency.health.issues.map((issue, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemoryMetric({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const status =
    percentage > 90 ? 'text-red-500' : percentage > 70 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={status}>
          {value} {unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            percentage > 90
              ? 'bg-red-500'
              : percentage > 70
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default MonitoringDashboard;
