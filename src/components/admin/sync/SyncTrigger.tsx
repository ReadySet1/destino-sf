'use client';

import { useState } from 'react';
import { RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { UserSyncOptions } from '@/lib/square/user-sync-manager';

interface SyncTriggerProps {
  onSyncStarted?: (syncId: string) => void;
  disabled?: boolean;
}

type SyncState = 'idle' | 'starting' | 'started' | 'error';

export function SyncTrigger({ onSyncStarted, disabled = false }: SyncTriggerProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [syncId, setSyncId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync options state
  const [options, setOptions] = useState<UserSyncOptions>({
    includeImages: true,
    batchSize: 'medium',
    notifyOnComplete: true,
    autoRetry: true,
  });

  const handleTriggerSync = async () => {
    if (disabled || syncState === 'starting') return;

    setSyncState('starting');
    setError(null);

    try {
      const response = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('You have reached the sync limit. Please wait before trying again.');
        } else if (response.status === 409) {
          setError('A sync is already running. Please wait for it to complete.');
        } else {
          setError(data.message || 'Failed to start sync');
        }
        setSyncState('error');
        return;
      }

      setSyncId(data.syncId);
      setSyncState('started');

      toast({
        title: 'Sync Started! 🚀',
        description: `${data.message} Estimated duration: ${data.estimatedDuration}`,
      });

      // Notify parent component
      if (onSyncStarted) {
        onSyncStarted(data.syncId);
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
      setError('Network error. Please check your connection and try again.');
      setSyncState('error');
    }
  };

  const resetState = () => {
    setSyncState('idle');
    setError(null);
    setSyncId(null);
  };

  const isLoading = syncState === 'starting';
  const hasStarted = syncState === 'started';
  const hasError = syncState === 'error';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Product Synchronization
        </CardTitle>
        <CardDescription>
          Sync products from Square to update your catalog with the latest information and images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Sync Options</h4>

          {/* Include Images */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-images" className="text-sm">
              Update product images
            </Label>
            <Switch
              id="include-images"
              checked={options.includeImages}
              onCheckedChange={checked => setOptions(prev => ({ ...prev, includeImages: checked }))}
              disabled={isLoading || hasStarted}
            />
          </div>

          {/* Batch Size */}
          <div className="space-y-2">
            <Label className="text-sm">Sync Speed</Label>
            <RadioGroup
              value={options.batchSize}
              onValueChange={value =>
                setOptions(prev => ({ ...prev, batchSize: value as 'small' | 'medium' | 'large' }))
              }
              disabled={isLoading || hasStarted}
              className="grid grid-cols-1 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="small" id="small" />
                <Label htmlFor="small" className="text-sm">
                  Slow & Careful (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-sm">
                  Normal Speed
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="large" id="large" />
                <Label htmlFor="large" className="text-sm">
                  Fast (for large catalogs)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-complete" className="text-sm">
              Notify when complete
            </Label>
            <Switch
              id="notify-complete"
              checked={options.notifyOnComplete}
              onCheckedChange={checked =>
                setOptions(prev => ({ ...prev, notifyOnComplete: checked }))
              }
              disabled={isLoading || hasStarted}
            />
          </div>
        </div>

        {/* Error Display */}
        {hasError && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {hasStarted && syncId && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Sync started successfully! You can monitor progress below.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTriggerSync}
            disabled={disabled || isLoading || hasStarted}
            className="flex-1"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Sync...
              </>
            ) : hasStarted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sync Started
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Product Sync
              </>
            )}
          </Button>

          {(hasError || hasStarted) && (
            <Button variant="outline" onClick={resetState} size="lg">
              Reset
            </Button>
          )}
        </div>

        {/* Helper Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Products will be fetched from your Square catalog</p>
          <p>• Images will be validated and optimized if enabled</p>
          <p>• You can monitor progress in real-time below</p>
          <p>• Rate limit: 3 syncs per hour maximum</p>
        </div>
      </CardContent>
    </Card>
  );
}
