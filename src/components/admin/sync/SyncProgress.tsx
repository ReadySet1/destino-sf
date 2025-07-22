'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Clock, CheckCircle2, XCircle, AlertTriangle, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

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

export function SyncProgress({ syncId, onSyncComplete }: SyncProgressProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
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
  const isSyncStale = useCallback((startTime: string): boolean => {
    const now = new Date().getTime();
    const syncStartTime = new Date(startTime).getTime();
    return (now - syncStartTime) > STALE_SYNC_THRESHOLD;
  }, [STALE_SYNC_THRESHOLD]);

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
              toast({
                title: "Sync Completed! ✅",
                description: `${data.results?.syncedProducts || 0} products updated successfully`,
              });
            } else if (currentStatus === 'FAILED') {
              toast({
                title: "Sync Failed ❌",
                description: data.message || "Something went wrong during the sync",
                variant: "destructive"
              });
            } else if (currentStatus === 'CANCELLED') {
              toast({
                title: "Sync Cancelled ⚠️",
                description: "The sync was cancelled successfully",
                variant: "default"
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
  }, [syncId, onSyncComplete, toast, isSyncStale]);

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
        toast({
          title: "Sync Cancelled",
          description: "The sync has been cancelled successfully",
        });
        // Status will be updated by the polling mechanism
      } else {
        const data = await response.json();
        toast({
          title: "Cancel Failed",
          description: data.message || "Failed to cancel sync",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Cancel Failed",
        description: "Network error while cancelling sync",
        variant: "destructive"
      });
    }
  };

  if (!syncId) {
    return (
      <Card className="opacity-50">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No active sync to monitor
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status && loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-pulse">Loading sync status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const getStatusIcon = () => {
    switch (status.status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'RUNNING':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (): "default" | "secondary" | "danger" | "outline" => {
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

  const isRunning = status.status === 'RUNNING' || status.status === 'PENDING';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Sync Progress
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant()}>
              {status.status}
            </Badge>
            {isPollingRef.current && (
              <div className="text-xs text-muted-foreground">
                Monitoring...
              </div>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Started by {status.startedBy} • {formatDuration(status.duration)} elapsed
          {pollCountRef.current > 0 && (
            <span className="ml-2 text-xs">
              (Updates: {pollCountRef.current})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{status.message}</span>
            <span>{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="w-full" />
        </div>

        {/* Current Status */}
        <div className="text-sm text-muted-foreground">
          <p>Current step: {status.currentStep}</p>
          {status.processed && status.total && (
            <p>Progress: {status.processed} / {status.total} products</p>
          )}
          {status.currentProduct && (
            <p>Processing: {status.currentProduct}</p>
          )}
        </div>

        {/* Results Summary (for completed syncs) */}
        {status.results && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {status.results.syncedProducts}
              </div>
              <div className="text-xs text-muted-foreground">Synced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {status.results.skippedProducts}
              </div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {status.results.warnings}
              </div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {status.results.errors}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
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
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelSync}
              className="w-full"
            >
              Cancel Sync
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 