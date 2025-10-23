'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { ClientPagination } from '@/components/ui/ClientPagination';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Package,
  Image as ImageIcon,
  DollarSign,
  Tag,
} from 'lucide-react';

interface SyncHistoryProps {
  refreshTrigger?: number;
}

interface ProductDetail {
  id: string;
  name: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'updated' | 'created' | 'deactivated' | 'activated';
  }[];
  imageUpdated?: boolean;
  status?: 'synced' | 'skipped' | 'error';
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
  results?: {
    success?: boolean;
    productDetails?: ProductDetail[];
  };
  errors?: Array<{ message: string; details?: any }>;
}

interface ApiResponse {
  history: SyncRecord[];
  pagination: {
    limit: number;
    offset: number;
    returned: number;
    hasMore: boolean;
  };
  stats?: {
    total: number;
    last7Days: {
      completed: number;
      failed: number;
    };
  };
}

export function SyncHistoryWithDetails({ refreshTrigger }: SyncHistoryProps) {
  const [history, setHistory] = useState<SyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSyncs, setExpandedSyncs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<ApiResponse['stats'] | null>(null);

  const ITEMS_PER_PAGE = 10;

  const fetchHistory = async (pageNum: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate offset based on page number (page 1 = offset 0, page 2 = offset 10, etc.)
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;

      const response = await fetch(
        `/api/admin/sync/history?limit=${ITEMS_PER_PAGE}&offset=${offset}&days=30`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch sync history (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data: ApiResponse = await response.json();

      setHistory(data.history || []);
      setStats(data.stats || null);

      // Calculate total pages based on total count from stats
      if (data.stats?.total) {
        const calculatedTotalPages = Math.ceil(data.stats.total / ITEMS_PER_PAGE);
        setTotalPages(calculatedTotalPages);
      } else {
        // Fallback: if we got a full page, assume there might be more
        setTotalPages(data.pagination?.hasMore ? pageNum + 1 : pageNum);
      }
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
    // Fetch history when page changes or refresh is triggered
    fetchHistory(currentPage);
  }, [currentPage]);

  useEffect(() => {
    // Reset to page 1 when refresh is triggered
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      setCurrentPage(1);
    }
  }, [refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    // Close all expanded syncs when changing pages
    setExpandedSyncs(new Set());
    setCurrentPage(newPage);
  };

  const toggleExpanded = (syncId: string) => {
    setExpandedSyncs(prev => {
      const next = new Set(prev);
      if (next.has(syncId)) {
        next.delete(syncId);
      } else {
        next.add(syncId);
      }
      return next;
    });
  };

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

  const getChangeIcon = (field: string) => {
    if (field.toLowerCase().includes('image')) return <ImageIcon className="h-3 w-3" />;
    if (field.toLowerCase().includes('price')) return <DollarSign className="h-3 w-3" />;
    if (field.toLowerCase().includes('name') || field.toLowerCase().includes('description'))
      return <Tag className="h-3 w-3" />;
    return <Package className="h-3 w-3" />;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'None';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderProductDetails = (record: SyncRecord) => {
    const productDetails = record.results?.productDetails || [];
    const hasChanges = productDetails.length > 0;

    if (!hasChanges) {
      return (
        <div className="text-sm text-gray-500 italic">
          No product changes recorded for this sync.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-700">
          Products Changed ({productDetails.length})
        </div>
        {productDetails.slice(0, 10).map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="border border-gray-200 rounded-lg p-4 bg-gray-50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-medium text-gray-900">{product.name}</div>
              {product.status && (
                <Badge
                  variant={
                    product.status === 'synced'
                      ? 'default'
                      : product.status === 'skipped'
                        ? 'secondary'
                        : 'danger'
                  }
                  className="text-xs"
                >
                  {product.status}
                </Badge>
              )}
            </div>

            {product.changes && product.changes.length > 0 && (
              <div className="space-y-2 mt-3">
                {product.changes.map((change, changeIndex) => (
                  <div
                    key={changeIndex}
                    className="flex items-start gap-2 text-xs bg-white p-2 rounded border border-gray-100"
                  >
                    <div className="flex-shrink-0 mt-0.5 text-gray-500">
                      {getChangeIcon(change.field)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-700 mb-1">{change.field}</div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-red-600 line-through">
                          {formatValue(change.oldValue)}
                        </span>
                        <span>→</span>
                        <span className="text-green-600 font-medium">
                          {formatValue(change.newValue)}
                        </span>
                      </div>
                    </div>
                    {change.type && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {change.type}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {product.imageUpdated && (
              <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                <ImageIcon className="h-3 w-3" />
                <span>Image updated</span>
              </div>
            )}
          </div>
        ))}
        {productDetails.length > 10 && (
          <div className="text-xs text-gray-500 italic">
            Showing 10 of {productDetails.length} products with changes
          </div>
        )}
      </div>
    );
  };

  const renderErrors = (errors: Array<{ message: string; details?: any }>) => {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Errors ({errors.length})
        </div>
        {errors.map((error, index) => (
          <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50 text-sm">
            <div className="text-red-800">{error.message}</div>
            {error.details && (
              <pre className="mt-2 text-xs text-red-600 overflow-x-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading && history.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 flex items-center justify-center gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading synchronization history...
      </div>
    );
  }

  if (error) {
    return (
      <FormStack spacing={4}>
        <div className="text-center py-4 space-y-3">
          <div className="text-red-600 text-sm">Error loading sync history: {error}</div>
          <FormButton
            variant="secondary"
            onClick={() => fetchHistory(currentPage)}
            disabled={isLoading}
            leftIcon={isLoading ? <RefreshCw className="animate-spin" /> : FormIcons.refresh}
          >
            {isLoading ? 'Retrying...' : 'Retry'}
          </FormButton>
        </div>
      </FormStack>
    );
  }

  if (history.length === 0 && !isLoading) {
    return <div className="text-center text-gray-500 py-8">No recent synchronizations</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Syncs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.last7Days.completed}</div>
            <div className="text-xs text-gray-600">Last 7 Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.last7Days.failed}</div>
            <div className="text-xs text-gray-600">Failed (7d)</div>
          </div>
        </div>
      )}

      {/* History List */}
      <FormStack spacing={4}>
        {history.map(record => {
          const isExpanded = expandedSyncs.has(record.syncId);
          const hasDetails =
            (record.results?.productDetails && record.results.productDetails.length > 0) ||
            (record.errors && record.errors.length > 0);

          return (
            <div
              key={record.syncId}
              className="rounded-lg border bg-white shadow-sm overflow-hidden"
            >
              {/* Header - Always visible */}
              <div
                className={`flex items-start justify-between p-6 ${
                  hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''
                } transition-colors`}
                onClick={() => hasDetails && toggleExpanded(record.syncId)}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">{getStatusIcon(record.status)}</div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-base text-gray-900">
                        {formatTime(record.startTime)}
                      </div>
                      {hasDetails && (
                        <div className="text-gray-400">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {record.message && (
                        <div className="text-sm text-gray-600">{record.message}</div>
                      )}
                      {record.duration && (
                        <div className="text-xs text-gray-500 font-medium">
                          Duration: {record.duration}s
                        </div>
                      )}
                      {record.summary && (
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          {record.summary.syncedProducts > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              {record.summary.syncedProducts} synced
                            </span>
                          )}
                          {record.summary.skippedProducts > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {record.summary.skippedProducts} skipped
                            </span>
                          )}
                          {record.summary.warnings > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              {record.summary.warnings} warnings
                            </span>
                          )}
                          {record.summary.errors > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-3 w-3" />
                              {record.summary.errors} errors
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">{getStatusBadge(record.status)}</div>
              </div>

              {/* Expanded Details */}
              {isExpanded && hasDetails && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  {record.status === 'COMPLETED' && record.results?.productDetails && (
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-gray-700">Change Details</div>
                      {renderProductDetails(record)}
                    </div>
                  )}
                  {record.status === 'FAILED' && record.errors && renderErrors(record.errors)}
                </div>
              )}
            </div>
          );
        })}
      </FormStack>

      {/* Pagination Controls */}
      <ClientPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    </div>
  );
}
