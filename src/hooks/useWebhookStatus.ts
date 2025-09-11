/**
 * React hooks for webhook monitoring and status
 * 
 * Provides real-time webhook health data, metrics, and status information
 * for the admin dashboard components.
 */

import { useState, useEffect, useCallback } from 'react';
import { type WebhookStatus, type SquareEnvironment } from '@/types/webhook';

export interface UseWebhookStatusOptions {
  environment?: SquareEnvironment;
  refreshIntervalMs?: number;
  enabled?: boolean;
}

export interface WebhookStatusData {
  isHealthy: boolean;
  lastWebhookTime: Date | null;
  successRate: number;
  averageLatency: number;
  totalWebhooks: number;
  failedWebhooks: number;
  healthScore: number;
  environment: SquareEnvironment | 'all';
  recentWebhooks: Array<{
    id: string;
    eventType: string;
    environment: SquareEnvironment;
    success: boolean;
    processingTime: number;
    timestamp: Date;
  }>;
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Hook for fetching webhook status and health data
 */
export function useWebhookStatus(options: UseWebhookStatusOptions = {}) {
  const {
    environment,
    refreshIntervalMs = 30000, // 30 seconds default
    enabled = true
  } = options;

  const [data, setData] = useState<WebhookStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhookStatus = useCallback(async () => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        hours: '24', // Last 24 hours
        ...(environment && { environment })
      });
      
      const response = await fetch(`/api/admin/webhook-dashboard?${params}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch webhook status: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Transform API response to hook data format
      const transformedData: WebhookStatusData = {
        isHealthy: result.health.status === 'excellent' || result.health.status === 'good',
        lastWebhookTime: result.webhooks.recent_logs[0]?.timestamp ? 
          new Date(result.webhooks.recent_logs[0].timestamp) : null,
        successRate: result.webhooks.detailed.successRate,
        averageLatency: result.webhooks.detailed.averageProcessingTime,
        totalWebhooks: result.webhooks.detailed.totalWebhooks,
        failedWebhooks: result.webhooks.detailed.failedWebhooks,
        healthScore: result.health.score,
        environment: environment || 'all',
        recentWebhooks: result.webhooks.recent_logs.map((log: any) => ({
          id: log.id,
          eventType: log.eventType,
          environment: log.environment,
          success: log.success,
          processingTime: log.processingTime || 0,
          timestamp: new Date(log.timestamp)
        })),
        alerts: result.health.alerts.map((alert: any) => ({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          timestamp: new Date(alert.details?.timestamp || Date.now())
        }))
      };
      
      setData(transformedData);
      
    } catch (err) {
      console.error('❌ Failed to fetch webhook status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [environment]);

  // Auto-refresh data
  useEffect(() => {
    if (!enabled) return;
    
    fetchWebhookStatus();
    
    const interval = setInterval(fetchWebhookStatus, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchWebhookStatus, refreshIntervalMs, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchWebhookStatus
  };
}

/**
 * Hook for triggering manual payment sync
 */
export function usePaymentSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSync = useCallback(async (params: {
    lookbackMinutes?: number;
    environment?: SquareEnvironment;
    forceSync?: boolean;
  } = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sync-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',
        },
        body: JSON.stringify({
          lookbackMinutes: params.lookbackMinutes || 60,
          environment: params.environment || 'production',
          forceSync: params.forceSync || false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.details || 'Payment sync failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown sync error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    triggerSync,
    isLoading,
    error
  };
}

/**
 * Hook for webhook metrics with real-time updates
 */
export function useWebhookMetrics(options: {
  environment?: SquareEnvironment;
  autoRefresh?: boolean;
} = {}) {
  const { environment, autoRefresh = true } = options;
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        hours: '24',
        ...(environment && { environment })
      });
      
      const response = await fetch(`/api/admin/webhook-dashboard?${params}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || '',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const result = await response.json();
      setMetrics(result.webhooks.detailed);
      
    } catch (err) {
      console.error('❌ Failed to fetch webhook metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [environment]);

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh]);

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics
  };
}
