/**
 * Errors Table Component
 *
 * Displays recent errors and error breakdown.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, Bug } from 'lucide-react';

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: string | Date;
  table?: string;
}

interface ErrorBreakdown {
  [service: string]: {
    count: number;
    types: Record<string, number>;
  };
}

interface ErrorsTableProps {
  slowQueries?: SlowQuery[];
  errorBreakdown?: ErrorBreakdown;
}

export function ErrorsTable({ slowQueries = [], errorBreakdown = {} }: ErrorsTableProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SlowQueriesCard queries={slowQueries} />
      <ErrorBreakdownCard breakdown={errorBreakdown} />
    </div>
  );
}

function SlowQueriesCard({ queries }: { queries: SlowQuery[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Slow Queries
        </CardTitle>
        <CardDescription>Database queries exceeding 100ms</CardDescription>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No slow queries detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queries.slice(0, 5).map((query, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="danger">{query.duration}ms</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(query.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm font-mono truncate" title={query.query}>
                  {query.query.substring(0, 100)}
                  {query.query.length > 100 ? '...' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorBreakdownCard({ breakdown }: { breakdown: ErrorBreakdown }) {
  const services = Object.entries(breakdown);
  const hasErrors = services.some(([_, data]) => data.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error Breakdown
        </CardTitle>
        <CardDescription>Errors by service and type</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasErrors ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No errors in the last hour</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(([service, data]) => {
              if (data.count === 0) return null;

              return (
                <div key={service} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{service}</span>
                    <Badge variant={data.count > 10 ? 'danger' : 'warning'}>
                      {data.count} errors
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.types).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Error summary statistics
 */
export function ErrorSummary({
  critical,
  high,
  medium,
  low,
}: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}) {
  const total = critical + high + medium + low;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Summary</CardTitle>
        <CardDescription>Errors by severity level</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-red-600">{critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-orange-500">{high}</div>
            <div className="text-xs text-muted-foreground">High</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-500">{medium}</div>
            <div className="text-xs text-muted-foreground">Medium</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-500">{low}</div>
            <div className="text-xs text-muted-foreground">Low</div>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Errors</span>
              <span className="font-medium">{total}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
