/**
 * Webhook Debugger Component
 *
 * Advanced debugging panel for webhook signature validation issues.
 * Provides detailed information about webhook configuration, recent failures,
 * and troubleshooting guidance.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useWebhookStatus } from '@/hooks/useWebhookStatus';
import { type SquareEnvironment } from '@/types/webhook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bug,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface WebhookDebuggerProps {
  className?: string;
}

export function WebhookDebugger({ className }: WebhookDebuggerProps) {
  const [configVisible, setConfigVisible] = useState(false);
  const [webhookHealth, setWebhookHealth] = useState<any>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const { data: webhookStatus, error } = useWebhookStatus({
    refreshIntervalMs: 60000, // 1 minute refresh for debugging
  });

  const checkWebhookHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const response = await fetch('/api/webhooks/square', {
        method: 'GET',
      });
      const health = await response.json();
      setWebhookHealth(health);
    } catch (error) {
      console.error('Failed to check webhook health:', error);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkWebhookHealth();
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Webhook Debugger
            </CardTitle>
            <CardDescription>
              Advanced debugging tools for webhook signature validation
            </CardDescription>
          </div>

          <Button
            onClick={checkWebhookHealth}
            disabled={isLoadingHealth}
            variant="outline"
            size="sm"
          >
            {isLoadingHealth ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="failures">Failures</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          </TabsList>

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <ConfigurationStatus
              health={webhookHealth}
              webhookStatus={webhookStatus}
              isLoading={isLoadingHealth}
            />
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <ConfigurationPanel
              health={webhookHealth}
              configVisible={configVisible}
              onToggleVisibility={() => setConfigVisible(!configVisible)}
            />
          </TabsContent>

          {/* Failures Tab */}
          <TabsContent value="failures" className="space-y-4">
            <FailureAnalysis webhookStatus={webhookStatus} />
          </TabsContent>

          {/* Troubleshooting Tab */}
          <TabsContent value="troubleshoot" className="space-y-4">
            <TroubleshootingGuide health={webhookHealth} webhookStatus={webhookStatus} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/**
 * Configuration Status Panel
 */
function ConfigurationStatus({ health, webhookStatus, isLoading }: any) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Checking webhook health...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Environment Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Environment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Production Ready</span>
              <StatusBadge status={health?.configuration?.production_ready} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sandbox Ready</span>
              <StatusBadge status={health?.configuration?.sandbox_ready} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Both Environments</span>
              <StatusBadge status={health?.configuration?.both_environments_ready} />
            </div>
          </CardContent>
        </Card>

        {/* Health Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Health Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Success Rate</span>
              <Badge variant={webhookStatus?.successRate > 95 ? 'default' : 'danger'}>
                {webhookStatus?.successRate.toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Latency</span>
              <Badge variant={webhookStatus?.averageLatency < 200 ? 'default' : 'secondary'}>
                {webhookStatus?.averageLatency || 0}ms
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Webhook</span>
              <span className="text-xs text-muted-foreground">
                {webhookStatus?.lastWebhookTime
                  ? new Date(webhookStatus.lastWebhookTime).toLocaleString()
                  : 'No recent activity'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {health?.configuration?.recommendation && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommendation:</strong> {health.configuration.recommendation}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Configuration Panel
 */
function ConfigurationPanel({ health, configVisible, onToggleVisibility }: any) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="w-4 h-4" />
            Environment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Show Configuration</span>
            <Button onClick={onToggleVisibility} variant="ghost" size="sm">
              {configVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {configVisible && health && (
            <div className="space-y-2 text-xs font-mono bg-muted p-3 rounded">
              <div>NODE_ENV: {health.environment?.node_env}</div>
              <div>VERCEL: {health.environment?.vercel ? 'Yes' : 'No'}</div>
              <div>VERCEL_ENV: {health.environment?.vercel_env || 'N/A'}</div>
              <div>
                Production Secret:{' '}
                {health.environment?.has_production_secret ? '✅ Set' : '❌ Missing'}
              </div>
              <div>
                Sandbox Secret: {health.environment?.has_sandbox_secret ? '✅ Set' : '❌ Missing'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applied Fixes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Applied Fixes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {health?.fixes_applied?.map((fix: string) => (
              <div key={fix} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-xs">{fix.replace(/_/g, ' ')}</span>
              </div>
            )) || <p className="text-xs text-muted-foreground">No fix information available</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Failure Analysis Panel
 */
function FailureAnalysis({ webhookStatus }: any) {
  const failedWebhooks = webhookStatus?.recentWebhooks?.filter((w: any) => !w.success) || [];

  return (
    <div className="space-y-4">
      {failedWebhooks.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No recent webhook failures detected. System is operating normally.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Recent Failures Detected</AlertTitle>
            <AlertDescription>
              {failedWebhooks.length} webhook(s) failed validation in recent activity.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Failed Webhook Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failedWebhooks.slice(0, 5).map((webhook: any) => (
                  <div key={webhook.id} className="border-l-2 border-red-200 pl-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{webhook.eventType}</span>
                      <Badge variant="danger">Failed</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {webhook.timestamp} • {webhook.environment}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * Troubleshooting Guide Panel
 */
function TroubleshootingGuide({ health, webhookStatus }: any) {
  const generateTroubleshootingSteps = () => {
    const steps: string[] = [];

    if (!health?.configuration?.production_ready) {
      steps.push('Set SQUARE_WEBHOOK_SECRET environment variable for production');
    }

    if (!health?.configuration?.sandbox_ready) {
      steps.push('Set SQUARE_WEBHOOK_SECRET_SANDBOX environment variable for testing');
    }

    if (webhookStatus?.successRate < 90) {
      steps.push('Check webhook secrets for trailing newlines or special characters');
      steps.push('Verify Square webhook configuration points to the correct URL');
      steps.push('Test signature validation with recent webhook payloads');
    }

    if (webhookStatus?.averageLatency > 300) {
      steps.push('Check database connection pool and query performance');
      steps.push('Monitor server resource usage during webhook processing');
    }

    if (steps.length === 0) {
      steps.push('System appears to be working correctly');
      steps.push('Monitor alerts for any emerging issues');
    }

    return steps;
  };

  const troubleshootingSteps = generateTroubleshootingSteps();

  return (
    <div className="space-y-4">
      <Alert>
        <Bug className="h-4 w-4" />
        <AlertTitle>Troubleshooting Steps</AlertTitle>
        <AlertDescription>
          Follow these steps to diagnose and resolve webhook issues.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {troubleshootingSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Quick Test Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={() => window.open('/api/webhooks/square', '_blank')}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Test Webhook Health Endpoint
          </Button>

          <Button
            onClick={() => window.open('/api/admin/webhook-dashboard', '_blank')}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Test Monitoring API
          </Button>
        </CardContent>
      </Card>

      {/* Environment Details */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Environment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Version:</strong> {health.version}
              </div>
              <div>
                <strong>Node Environment:</strong> {health.environment?.node_env}
              </div>
              <div>
                <strong>Vercel Environment:</strong>{' '}
                {health.environment?.vercel_env || 'Not Vercel'}
              </div>
              <div>
                <strong>Health Status:</strong> {health.health?.overall || 'Unknown'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: boolean | undefined }) {
  if (status === undefined) {
    return <Badge variant="secondary">Unknown</Badge>;
  }

  return status ? (
    <Badge variant="default" className="bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3 mr-1" />
      Ready
    </Badge>
  ) : (
    <Badge variant="danger">
      <XCircle className="w-3 h-3 mr-1" />
      Not Ready
    </Badge>
  );
}

export default WebhookDebugger;
