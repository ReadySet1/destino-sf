'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, AlertTriangle, Square } from 'lucide-react';
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
  };
  errors?: any[];
}

export function SyncProgressWithDesignSystem({ syncId, onSyncComplete }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to track polling state and prevent race conditions
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const pollCountRef = useRef(0);
  const lastStatusRef = useRef<string | null>(null);

  // Constants for polling control
  const MAX_POLLING_DURATION = 30 * 60 * 1000; // 30 minutes maximum
  const MAX_POLL_COUNT = 900; // 30 minutes at 2 second intervals
  const STALE_SYNC_THRESHOLD = 45 * 60 * 1000; // 45 minutes

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

  // Poll for status updates
  useEffect(() => {
    if (!syncId) {
      cleanup();
      setStatus(null);
      setError(null);
      return;
    }

    // Reset refs for new sync
    mountedRef.current = true;
    pollCountRef.current = 0;

    const fetchStatus = async () => {
      // Don't fetch if component unmounted or already polling
      if (!mountedRef.current || isPollingRef.current) {
        return;
      }

      // Stop if exceeded maximum poll count
      if (pollCountRef.current >= MAX_POLL_COUNT) {
        cleanup();
        setError('Sync monitoring timed out. Please refresh to check status.');
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
          return;
        }

        setStatus(data);
        setError(null);

        // Check if this is a status change to completion
        const currentStatus = data.status;
        const isComplete = isSyncComplete(currentStatus);
        const statusChanged = lastStatusRef.current !== currentStatus;

        if (isComplete) {
          cleanup(); // Stop polling immediately when complete

          // Only show toast if status actually changed (prevent duplicate toasts)
          if (statusChanged) {
            if (currentStatus === 'COMPLETED') {
              toast.success('Sync Completed! ✅', {
                description: `${data.results?.syncedProducts || 0} products updated successfully`,
              });
            } else if (currentStatus === 'FAILED') {
              toast.error('Sync Failed ❌', {
                description: data.message || 'Something went wrong during the sync',
              });
            } else if (currentStatus === 'CANCELLED') {
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

    // Start polling immediately - the fetchStatus function will handle completion detection
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
  }, [syncId, onSyncComplete, isSyncStale]);

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
        // Status will be updated by the polling mechanism
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

  if (!syncId) {
    return (
      <div className="text-center text-gray-500 py-8">
        No active sync to monitor
      </div>
    );
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
          <div className="w-6 h-6 flex-shrink-0">
            {getStatusIcon()}
          </div>
          <div>
            <div className="font-semibold text-sm">
              Started by {status.startedBy}
            </div>
            <div className="text-xs text-gray-500">
              {formatDuration(status.duration)} elapsed
              {pollCountRef.current > 0 && (
                <span className="ml-2">(Updates: {pollCountRef.current})</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant()}>{status.status}</Badge>
          {isPollingRef.current && (
            <div className="text-xs text-gray-500">Monitoring...</div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{status.message}</span>
          <span>{status.progress}%</span>
        </div>
        <Progress value={status.progress} className="w-full" />
      </div>

      {/* Current Status */}
      <div className="text-sm text-gray-600 space-y-1">
        <p>Current step: {status.currentStep}</p>
        {status.processed && status.total && (
          <p>
            Progress: {status.processed} / {status.total} products
          </p>
        )}
        {status.currentProduct && <p>Processing: {status.currentProduct}</p>}
      </div>

      {/* Results Summary (for completed syncs) */}
      {status.results && (
        <FormGrid cols={4} gap={4}>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {status.results.syncedProducts}
            </div>
            <div className="text-xs text-gray-500">Synced</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {status.results.skippedProducts}
            </div>
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
