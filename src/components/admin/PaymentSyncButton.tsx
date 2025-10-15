/**
 * Payment Sync Button Component
 *
 * Provides a user-friendly interface for triggering manual payment
 * synchronization with customizable parameters and real-time feedback.
 */

'use client';

import React, { useState } from 'react';
import { usePaymentSync } from '@/hooks/useWebhookStatus';
import { type SquareEnvironment } from '@/types/webhook';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Zap, CheckCircle, AlertTriangle, Settings } from 'lucide-react';

interface PaymentSyncButtonProps {
  className?: string;
  environment?: SquareEnvironment;
  onSyncComplete?: (result: any) => void;
}

export function PaymentSyncButton({
  className,
  environment = 'production',
  onSyncComplete,
}: PaymentSyncButtonProps) {
  const { triggerSync, isLoading, error } = usePaymentSync();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncParams, setSyncParams] = useState({
    lookbackMinutes: 60,
    environment: environment,
    forceSync: false,
  });
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  const handleQuickSync = async () => {
    try {
      const result = await triggerSync({
        lookbackMinutes: 60,
        environment,
        forceSync: false,
      });

      setLastSyncResult(result);
      onSyncComplete?.(result);
    } catch (error) {
      console.error('Quick sync failed:', error);
    }
  };

  const handleAdvancedSync = async () => {
    try {
      const result = await triggerSync(syncParams);

      setLastSyncResult(result);
      setIsDialogOpen(false);
      onSyncComplete?.(result);
    } catch (error) {
      console.error('Advanced sync failed:', error);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* Quick Sync Button */}
        <Button onClick={handleQuickSync} disabled={isLoading} variant="default" size="sm">
          {isLoading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {isLoading ? 'Syncing...' : 'Quick Sync'}
        </Button>

        {/* Advanced Sync Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Advanced Payment Sync</DialogTitle>
              <DialogDescription>
                Configure payment synchronization parameters for precise control.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Lookback Minutes */}
              <div className="space-y-2">
                <Label htmlFor="lookback">Lookback Time (minutes)</Label>
                <Input
                  id="lookback"
                  type="number"
                  min="1"
                  max="1440"
                  value={syncParams.lookbackMinutes}
                  onChange={e =>
                    setSyncParams(prev => ({
                      ...prev,
                      lookbackMinutes: parseInt(e.target.value) || 60,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How far back to search for payments (1-1440 minutes)
                </p>
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <select
                  id="environment"
                  value={syncParams.environment}
                  onChange={e =>
                    setSyncParams(prev => ({
                      ...prev,
                      environment: e.target.value as SquareEnvironment,
                    }))
                  }
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  <option value="production">Production</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </div>

              {/* Force Sync */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forceSync"
                  checked={syncParams.forceSync}
                  onCheckedChange={checked =>
                    setSyncParams(prev => ({
                      ...prev,
                      forceSync: !!checked,
                    }))
                  }
                />
                <Label htmlFor="forceSync" className="text-sm">
                  Force sync existing payments
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Re-process payments that already exist in the database
              </p>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdvancedSync} disabled={isLoading}>
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Syncing...' : 'Start Sync'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Last Sync Result */}
      {lastSyncResult && (
        <div className="mt-4">
          <Alert variant={lastSyncResult.success ? 'default' : 'destructive'}>
            {lastSyncResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-1">
                <p>
                  <strong>Sync {lastSyncResult.success ? 'completed' : 'failed'}:</strong>{' '}
                  {lastSyncResult.summary.paymentsFound} found,{' '}
                  {lastSyncResult.summary.paymentsProcessed} processed
                  {lastSyncResult.summary.paymentsFailed > 0 &&
                    `, ${lastSyncResult.summary.paymentsFailed} failed`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duration: {lastSyncResult.summary.duration}ms | Sync ID: {lastSyncResult.syncId}
                </p>
                {lastSyncResult.details.errors.length > 0 && (
                  <p className="text-xs text-red-600">
                    {lastSyncResult.details.errors.length} error(s) occurred
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

export default PaymentSyncButton;
