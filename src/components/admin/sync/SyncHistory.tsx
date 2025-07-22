'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Square, AlertTriangle, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SyncHistoryItem {
  syncId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: string;
  endTime?: string;
  duration: number | null;
  progress: number;
  message: string;
  startedBy: string;
  summary?: {
    syncedProducts: number;
    skippedProducts: number;
    warnings: number;
    errors: number;
  };
  options?: any;
}

interface SyncHistoryData {
  history: SyncHistoryItem[];
  stats: {
    total: number;
    last7Days: {
      completed: number;
      failed: number;
      cancelled: number;
      running: number;
      pending: number;
    };
  };
  pagination: {
    limit: number;
    returned: number;
    hasMore: boolean;
  };
}

interface SyncHistoryProps {
  refreshTrigger?: number;
}

export function SyncHistory({ refreshTrigger }: SyncHistoryProps) {
  const [data, setData] = useState<SyncHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit, setLimit] = useState<number>(10);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/sync/history?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync history');
      }

      const historyData = await response.json();
      setData(historyData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
      console.error('Error fetching sync history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, limit, refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'RUNNING':
        return <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELLED':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "danger" | "outline" | "success" | "warning" => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'CANCELLED':
        return 'secondary';
      case 'RUNNING':
        return 'default';
      case 'PENDING':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sync History</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchHistory}
            disabled={loading}
          >
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          View past sync operations and their results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold">{data.stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{data.stats.last7Days.completed}</div>
              <div className="text-xs text-muted-foreground">Completed (7d)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{data.stats.last7Days.failed}</div>
              <div className="text-xs text-muted-foreground">Failed (7d)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{data.stats.last7Days.running}</div>
              <div className="text-xs text-muted-foreground">Running (7d)</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">{data.stats.last7Days.pending}</div>
              <div className="text-xs text-muted-foreground">Pending (7d)</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* History List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : data?.history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No sync history found</p>
            {statusFilter !== 'all' && (
              <p className="text-sm">Try changing the status filter</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {data?.history.map((sync) => (
              <div key={sync.syncId} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(sync.status)}
                    <span className="font-medium">{formatDate(sync.startTime)}</span>
                    <Badge variant={getStatusVariant(sync.status)}>
                      {sync.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDuration(sync.duration)}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-2">
                  {sync.message}
                </div>

                {sync.summary && (
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-green-600">{sync.summary.syncedProducts}</div>
                      <div className="text-muted-foreground">Synced</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-600">{sync.summary.skippedProducts}</div>
                      <div className="text-muted-foreground">Skipped</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-600">{sync.summary.warnings}</div>
                      <div className="text-muted-foreground">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{sync.summary.errors}</div>
                      <div className="text-muted-foreground">Errors</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                  <span>Started by {sync.startedBy}</span>
                  <span>ID: {sync.syncId.substring(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {data?.pagination.hasMore && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setLimit(prev => prev + 10)}
              disabled={loading}
            >
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 