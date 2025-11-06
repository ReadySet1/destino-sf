'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Square,
  RefreshCw,
  Package,
  Image as ImageIcon,
  DollarSign,
  FileText,
  Loader2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';

interface SyncProgressProps {
  syncId: string | null;
  onSyncComplete?: () => void;
}

interface SyncStatus {
  syncId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  message: string;
  currentStep: string;
  startTime: string;
  endTime?: string;
  duration: number;
  startedBy: string;
  processed?: number;
  total?: number;
  currentProduct?: string;
  results?: {
    syncedProducts: number;
    skippedProducts: number;
    warnings: number;
    errors: number;
    productDetails?: Array<{
      id: string;
      name: string;
      changes?: Array<{
        field: string;
        oldValue: any;
        newValue: any;
      }>;
      status?: 'synced' | 'skipped' | 'error';
    }>;
  };
  errors?: any[];
}

interface ActivityItem {
  id: string;
  timestamp: number;
  type: 'step' | 'product' | 'warning' | 'error' | 'info';
  message: string;
  details?: string;
  icon?: any;
}

export function EnhancedSyncProgress({ syncId, onSyncComplete }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  // Use refs to track polling state and prevent race conditions
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const pollCountRef = useRef(0);
  const lastStatusRef = useRef<string | null>(null);
  const lastStepRef = useRef<string | null>(null);
  const lastProductRef = useRef<string | null>(null);
  const lastProcessedRef = useRef<number>(0);

  // Constants for polling control
  const MAX_POLL_COUNT = 900; // 30 minutes at 2 second intervals
  const STALE_SYNC_THRESHOLD = 45 * 60 * 1000; // 45 minutes
  const MAX_ACTIVITY_ITEMS = 20; // Keep only last 20 items

  // Add activity item
  const addActivity = useCallback((item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    setActivityFeed(prev => {
      const newItem: ActivityItem = {
        ...item,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...prev];
      return updated.slice(0, MAX_ACTIVITY_ITEMS); // Keep only last N items
    });
  }, []);

  // Cleanup function
  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPollingRef.current = false;
    pollCountRef.current = 0;
  };

  // Check if sync is complete
  const isSyncComplete = (syncStatus: string): boolean => {
    return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(syncStatus);
  };

  // Check if sync is stale (too old to be meaningful)
  const isSyncStale = useCallback(
    (startTime: string): boolean => {
      const now = new Date().getTime();
      const syncStartTime = new Date(startTime).getTime();
      return now - syncStartTime > STALE_SYNC_THRESHOLD;
    },
    [STALE_SYNC_THRESHOLD]
  );

  // Get icon for activity type
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'step':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'product':
        return <Package className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info':
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Poll for status updates
  useEffect(() => {
    if (!syncId) {
      cleanup();
      setStatus(null);
      setError(null);
      setActivityFeed([]);
      return;
    }

    // Reset refs for new sync
    mountedRef.current = true;
    pollCountRef.current = 0;
    lastStepRef.current = null;
    lastProductRef.current = null;
    lastProcessedRef.current = 0;

    // Add initial activity
    addActivity({
      type: 'info',
      message: 'Sync started',
      details: 'Initializing synchronization with Square...',
    });

    const fetchStatus = async () => {
      // Don't fetch if component unmounted or already polling
      if (!mountedRef.current || isPollingRef.current) {
        return;
      }

      // Stop if exceeded maximum poll count
      if (pollCountRef.current >= MAX_POLL_COUNT) {
        cleanup();
        setError('Sync monitoring timed out. Please refresh to check status.');
        addActivity({
          type: 'error',
          message: 'Sync monitoring timed out',
          details: 'Please refresh the page to check the final status',
        });
        return;
      }

      isPollingRef.current = true;
      pollCountRef.current++;

      try {
        setLoading(true);
        const response = await fetch(`/api/admin/sync/status/${syncId}`);

        if (!response.ok) {
          if (response.status === 404) {
            cleanup();
            setError('Sync not found');
            addActivity({
              type: 'error',
              message: 'Sync not found',
              details: 'Could not find sync with this ID',
            });
          } else {
            setError('Failed to fetch sync status');
          }
          return;
        }

        const data = await response.json();

        if (!mountedRef.current) return;

        // Check if sync is stale
        if (isSyncStale(data.startTime)) {
          cleanup();
          setError('This sync appears to be stale. Please refresh or start a new sync.');
          addActivity({
            type: 'error',
            message: 'Sync stale',
            details: 'This sync has been running too long',
          });
          return;
        }

        // Track changes for activity feed
        const currentStatus = data.status;
        const statusChanged = lastStatusRef.current !== currentStatus;
        const stepChanged = lastStepRef.current !== data.currentStep;
        const productChanged = lastProductRef.current !== data.currentProduct;
        const processedChanged = lastProcessedRef.current !== (data.processed || 0);

        // Add activities for changes
        if (stepChanged && data.currentStep) {
          addActivity({
            type: 'step',
            message: `Step: ${data.currentStep}`,
            details: data.message,
          });
          lastStepRef.current = data.currentStep;
        }

        if (productChanged && data.currentProduct) {
          addActivity({
            type: 'product',
            message: `Processing: ${data.currentProduct}`,
            details:
              data.processed && data.total ? `${data.processed} of ${data.total}` : undefined,
          });
          lastProductRef.current = data.currentProduct;
        }

        if (processedChanged && data.processed) {
          const increment = (data.processed || 0) - lastProcessedRef.current;
          if (increment > 0) {
            addActivity({
              type: 'info',
              message: `Processed ${increment} product${increment > 1 ? 's' : ''}`,
              details: `${data.processed} of ${data.total || '?'} completed`,
            });
          }
          lastProcessedRef.current = data.processed || 0;
        }

        setStatus(data);
        setError(null);

        // Check if sync completed
        const isComplete = isSyncComplete(currentStatus);

        if (isComplete) {
          cleanup(); // Stop polling immediately when complete

          // Add completion activity
          if (statusChanged) {
            if (currentStatus === 'COMPLETED') {
              addActivity({
                type: 'product',
                message: 'Sync completed successfully',
                details: `${data.results?.syncedProducts || 0} products synced`,
              });
              toast.success('Sync Completed! ✅', {
                description: `${data.results?.syncedProducts || 0} products updated successfully`,
              });
            } else if (currentStatus === 'FAILED') {
              addActivity({
                type: 'error',
                message: 'Sync failed',
                details: data.message || 'Something went wrong',
              });
              toast.error('Sync Failed ❌', {
                description: data.message || 'Something went wrong during the sync',
              });
            } else if (currentStatus === 'CANCELLED') {
              addActivity({
                type: 'warning',
                message: 'Sync cancelled',
                details: 'The sync was cancelled by user',
              });
              toast.warning('Sync Cancelled ⚠️', {
                description: 'The sync was cancelled successfully',
              });
            }

            // Notify parent component
            if (onSyncComplete) {
              onSyncComplete();
            }
          }
        }

        lastStatusRef.current = currentStatus;
      } catch (err) {
        if (mountedRef.current) {
          setError('Network error while fetching status');
          console.error('Error fetching sync status:', err);
          addActivity({
            type: 'error',
            message: 'Network error',
            details: 'Failed to fetch sync status',
          });
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        isPollingRef.current = false;
      }
    };

    // Initial fetch
    fetchStatus();

    // Start polling
    intervalRef.current = setInterval(async () => {
      if (!mountedRef.current) {
        cleanup();
        return;
      }
      await fetchStatus();
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount or syncId change
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [syncId, onSyncComplete, isSyncStale, addActivity]);

  const handleCancelSync = async () => {
    if (!syncId) return;

    try {
      const response = await fetch('/api/admin/sync/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncId }),
      });

      if (response.ok) {
        toast.success('Sync Cancelled', {
          description: 'The sync has been cancelled successfully',
        });
        addActivity({
          type: 'warning',
          message: 'Cancelling sync...',
          details: 'Requesting cancellation',
        });
      } else {
        const data = await response.json();
        toast.error('Cancel Failed', {
          description: data.message || 'Failed to cancel sync',
        });
      }
    } catch (error) {
      toast.error('Cancel Failed', {
        description: 'Network error while cancelling sync',
      });
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Activity className="w-full h-full" />;

    switch (status.status) {
      case 'PENDING':
        return <Clock className="w-full h-full text-amber-500" />;
      case 'RUNNING':
        return <Activity className="w-full h-full text-blue-500 animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-full h-full text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-full h-full text-red-500" />;
      case 'CANCELLED':
        return <Square className="w-full h-full text-gray-500" />;
      default:
        return <Activity className="w-full h-full" />;
    }
  };

  const getStatusVariant = (): 'default' | 'secondary' | 'danger' | 'outline' => {
    if (!status) return 'outline';

    switch (status.status) {
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'danger';
      case 'CANCELLED':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!syncId) {
    return <div className="text-center text-gray-500 py-8">No active sync to monitor</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!status && loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">Loading sync status...</div>
      </div>
    );
  }

  if (!status) return null;

  const isRunning = status.status === 'RUNNING' || status.status === 'PENDING';

  return (
    <FormStack spacing={6}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 flex-shrink-0">{getStatusIcon()}</div>
          <div>
            <div className="font-semibold text-sm">Started by {status.startedBy}</div>
            <div className="text-xs text-gray-500">{formatDuration(status.duration)} elapsed</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant()}>{status.status}</Badge>
          {isRunning && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{status.message}</span>
          <span className="font-semibold">{status.progress}%</span>
        </div>
        <Progress value={status.progress} className="w-full h-2" />
        {status.processed !== undefined && status.total !== undefined && (
          <div className="text-xs text-gray-500 text-right">
            {status.processed} / {status.total} products processed
          </div>
        )}
      </div>

      {/* Current Activity */}
      {isRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-medium text-blue-900 text-sm">{status.currentStep}</div>
              {status.currentProduct && (
                <div className="text-sm text-blue-700">Processing: {status.currentProduct}</div>
              )}
              {status.processed !== undefined && status.total !== undefined && (
                <div className="text-xs text-blue-600">
                  Progress: {status.processed} of {status.total} products
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>
          <Badge variant="outline" className="text-xs">
            {activityFeed.length} events
          </Badge>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto bg-gray-50">
            {activityFeed.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">Waiting for activity...</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {activityFeed.map(item => (
                  <div key={item.id} className="p-3 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getActivityIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{item.message}</div>
                        {item.details && (
                          <div className="text-xs text-gray-600 mt-0.5">{item.details}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Summary (for completed syncs) */}
      {status.results && (
        <FormGrid cols={4} gap={4}>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status.results.syncedProducts}</div>
            <div className="text-xs text-gray-500">Synced</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{status.results.skippedProducts}</div>
            <div className="text-xs text-gray-500">Skipped</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{status.results.warnings}</div>
            <div className="text-xs text-gray-500">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{status.results.errors}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
        </FormGrid>
      )}

      {/* Error Messages */}
      {status.errors && status.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {status.errors.map((error, index) => (
                <div key={index} className="text-sm">
                  {typeof error === 'string' ? error : error.message || 'Unknown error'}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Cancel Button (for running syncs) */}
      {isRunning && (
        <FormButton variant="secondary" onClick={handleCancelSync}>
          Cancel Sync
        </FormButton>
      )}
    </FormStack>
  );
}
