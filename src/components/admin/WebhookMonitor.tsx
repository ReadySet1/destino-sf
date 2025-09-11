/**
 * Webhook Monitor Component
 * 
 * Main dashboard component for monitoring webhook health, viewing logs,
 * and triggering manual synchronization operations.
 */

'use client';

import React, { useState } from 'react';
import { useWebhookStatus, usePaymentSync, useWebhookMetrics } from '@/hooks/useWebhookStatus';
import { type SquareEnvironment } from '@/types/webhook';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface WebhookMonitorProps {
  className?: string;
  environment?: SquareEnvironment;
}

export function WebhookMonitor({ className, environment }: WebhookMonitorProps) {
  const [selectedEnvironment, setSelectedEnvironment] = useState<SquareEnvironment | undefined>(environment);
  
  const { data: webhookStatus, isLoading, error, refetch } = useWebhookStatus({
    environment: selectedEnvironment,
    refreshIntervalMs: 30000
  });
  
  const { triggerSync, isLoading: isSyncing, error: syncError } = usePaymentSync();

  const handleManualSync = async () => {
    try {
      await triggerSync({
        lookbackMinutes: 60,
        environment: selectedEnvironment || 'production',
        forceSync: false
      });
      
      // Refetch status after sync
      setTimeout(refetch, 2000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading webhook status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Webhook Monitor Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load webhook status</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refetch} className="mt-4" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!webhookStatus) {
    return null;
  }

  return (
    <div className={className}>
      {/* Header with Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Webhook Monitor
                <Badge 
                  variant={webhookStatus.isHealthy ? "default" : "danger"}
                  className="ml-2"
                >
                  {webhookStatus.isHealthy ? 'Healthy' : 'Issues Detected'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time webhook validation status and payment sync monitoring
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Environment Filter */}
              <select 
                value={selectedEnvironment || 'all'}
                onChange={(e) => setSelectedEnvironment(e.target.value === 'all' ? undefined : e.target.value as SquareEnvironment)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Environments</option>
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
              
              {/* Manual Sync Button */}
              <Button 
                onClick={handleManualSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : 'Manual Sync'}
              </Button>
              
              {/* Refresh Button */}
              <Button onClick={refetch} variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {webhookStatus.alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {webhookStatus.alerts.map((alert, index) => (
            <Alert 
              key={index}
              variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Sync Error Alert */}
      {syncError && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Manual Sync Failed</AlertTitle>
          <AlertDescription>{syncError}</AlertDescription>
        </Alert>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          title="Health Score"
          value={`${webhookStatus.healthScore}/100`}
          status={webhookStatus.healthScore >= 95 ? 'excellent' : 
                  webhookStatus.healthScore >= 90 ? 'good' : 
                  webhookStatus.healthScore >= 80 ? 'fair' : 'poor'}
          icon={webhookStatus.isHealthy ? CheckCircle : XCircle}
          trend={webhookStatus.successRate > 95 ? 'up' : 'down'}
        />
        
        <StatusCard
          title="Success Rate"
          value={`${webhookStatus.successRate.toFixed(1)}%`}
          status={webhookStatus.successRate > 95 ? 'excellent' : 
                  webhookStatus.successRate > 90 ? 'good' : 'poor'}
          icon={Activity}
          trend={webhookStatus.successRate > 95 ? 'up' : 'down'}
        />
        
        <StatusCard
          title="Avg Latency"
          value={`${webhookStatus.averageLatency}ms`}
          status={webhookStatus.averageLatency < 200 ? 'excellent' : 
                  webhookStatus.averageLatency < 500 ? 'good' : 'poor'}
          icon={Clock}
          trend={webhookStatus.averageLatency < 200 ? 'up' : 'down'}
        />
        
        <StatusCard
          title="Total Webhooks"
          value={webhookStatus.totalWebhooks.toString()}
          status="info"
          icon={Activity}
          subtitle={`${webhookStatus.failedWebhooks} failed`}
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Webhook Activity</CardTitle>
          <CardDescription>
            Last {webhookStatus.recentWebhooks.length} webhook events received
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookLogTable webhooks={webhookStatus.recentWebhooks} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Status Card Component
 */
interface StatusCardProps {
  title: string;
  value: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  subtitle?: string;
}

function StatusCard({ title, value, status, icon: Icon, trend, subtitle }: StatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`border-2 ${getStatusColor(status)}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                trend === 'up' ? 
                  <TrendingUp className="w-4 h-4 text-green-500" /> :
                  <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <Icon className={`w-8 h-8 ${getStatusColor(status).split(' ')[0]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Webhook Log Table Component
 */
interface WebhookLogTableProps {
  webhooks: Array<{
    id: string;
    eventType: string;
    environment: SquareEnvironment;
    success: boolean;
    processingTime: number;
    timestamp: Date;
  }>;
}

function WebhookLogTable({ webhooks }: WebhookLogTableProps) {
  if (webhooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No recent webhook activity</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Event Type</th>
            <th className="text-left p-2">Environment</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Processing Time</th>
            <th className="text-left p-2">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map((webhook) => (
            <tr key={webhook.id} className="border-b hover:bg-muted/50">
              <td className="p-2 font-mono text-xs">{webhook.eventType}</td>
              <td className="p-2">
                <Badge variant={webhook.environment === 'production' ? 'default' : 'secondary'}>
                  {webhook.environment}
                </Badge>
              </td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  {webhook.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={webhook.success ? 'text-green-700' : 'text-red-700'}>
                    {webhook.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </td>
              <td className="p-2 font-mono text-xs">
                {webhook.processingTime ? `${webhook.processingTime}ms` : 'N/A'}
              </td>
              <td className="p-2 text-xs text-muted-foreground">
                {webhook.timestamp.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WebhookMonitor;
