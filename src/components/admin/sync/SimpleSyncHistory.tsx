'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface SimpleSyncHistoryProps {
  refreshTrigger?: number;
}

interface SyncRecord {
  syncId: string;
  status: 'COMPLETED' | 'FAILED' | 'RUNNING' | 'PENDING' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  duration?: number;
  message?: string;
  summary?: {
    syncedProducts: number;
    skippedProducts: number;
    warnings: number;
    errors: number;
  };
}

export function SimpleSyncHistory({ refreshTrigger }: SimpleSyncHistoryProps) {
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/sync/history?limit=10&days=30');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch sync history (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setHistory(data.history || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching sync history:', err);
      setError(errorMessage);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'RUNNING':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Successful
          </Badge>
        );
      case 'FAILED':
        return <Badge variant="danger">Failed</Badge>;
      case 'RUNNING':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Running
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-600">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading && history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Synchronization History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading synchronization history...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Synchronization History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-4 space-y-3">
            <div className="text-red-600 text-sm">Error loading sync history: {error}</div>
            <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          </div>
        ) : history.length === 0 && !isLoading ? (
          <div className="text-center text-muted-foreground py-4">No recent synchronizations</div>
        ) : (
          <div className="space-y-3">
            {history.map(record => (
              <div
                key={record.syncId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium text-sm">{formatTime(record.startTime)}</div>
                    {record.message && (
                      <div className="text-xs text-muted-foreground">{record.message}</div>
                    )}
                    {record.duration && (
                      <div className="text-xs text-muted-foreground">
                        Duration: {record.duration}s
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.summary && (
                    <span className="text-xs text-muted-foreground">
                      {record.summary.syncedProducts > 0
                        ? `${record.summary.syncedProducts} synced`
                        : record.summary.skippedProducts > 0
                          ? `${record.summary.skippedProducts} up to date`
                          : '0 synced'}
                    </span>
                  )}
                  {getStatusBadge(record.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
