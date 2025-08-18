'use client';

import { useState } from 'react';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SimpleSyncTriggerProps {
  onSyncStarted?: (syncId: string) => void;
  disabled?: boolean;
}

type SyncState = 'idle' | 'starting' | 'started' | 'error';

export function SimpleSyncTrigger({ onSyncStarted, disabled = false }: SimpleSyncTriggerProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncState('starting');

    try {
      const response = await fetch('/api/square/fix-sync', {
        method: 'GET',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncState('started');
        toast({
          title: "Synchronization completed",
          description: `${data.sync?.syncedProducts || 0} products synchronized successfully.`,
        });
        
        // Note: This sync is synchronous - no need for progress tracking
        // Only call onSyncStarted if parent component specifically needs it
        onSyncStarted?.('sync-completed');
        
        // Reset state after showing success
        setTimeout(() => {
          setSyncState('idle');
        }, 3000);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      setSyncState('error');
      toast({
        title: "Synchronization error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      
      setTimeout(() => {
        setSyncState('idle');
      }, 3000);
    }
  };

  const isLoading = syncState === 'starting';
  const hasStarted = syncState === 'started';
  const hasError = syncState === 'error';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Square Synchronization
        </CardTitle>
        <CardDescription>
          Synchronize products, categories, and images from Square POS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            This synchronization will update:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Products and prices</li>
              <li>Correct categories</li>
              <li>Product images</li>
              <li>Active/inactive status</li>
            </ul>
          </div>

          <Button
            onClick={handleSync}
            disabled={disabled || isLoading}
            size="lg"
            className="w-full"
            variant={hasStarted ? "default" : hasError ? "destructive" : "default"}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasStarted && <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isLoading
              ? 'Synchronizing...'
              : hasStarted
              ? 'Synchronization Complete'
              : hasError
              ? 'Error - Try Again'
              : 'Synchronize Products'
            }
          </Button>

          {isLoading && (
            <div className="text-xs text-muted-foreground text-center">
              This process may take a few minutes...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
