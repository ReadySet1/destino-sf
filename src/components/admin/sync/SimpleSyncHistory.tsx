'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface SimpleSyncHistoryProps {
  refreshTrigger?: number;
}

interface SyncRecord {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'running';
  productsCount?: number;
  message?: string;
}

export function SimpleSyncHistory({ refreshTrigger }: SimpleSyncHistoryProps) {
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      
      // For now, we'll create a simple mock history
      // In a real implementation, you'd fetch from an API
      const mockHistory: SyncRecord[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          status: 'success',
          productsCount: 121,
          message: 'Synchronization completed successfully'
        }
      ];
      
      setHistory(mockHistory);
    } catch (error) {
      console.error('Error fetching sync history:', error);
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
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Successful</Badge>;
      case 'error':
        return <Badge variant="danger">Error</Badge>;
      case 'running':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Synchronization History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Loading history...
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
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No recent synchronizations
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium text-sm">
                      {formatTime(record.timestamp)}
                    </div>
                    {record.message && (
                      <div className="text-xs text-muted-foreground">
                        {record.message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {record.productsCount && (
                    <span className="text-xs text-muted-foreground">
                      {record.productsCount} products
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
