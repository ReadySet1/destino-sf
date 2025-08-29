'use client';

import { useState } from 'react';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { FormStack } from '@/components/ui/form/FormStack';
import { toast } from '@/lib/toast';

interface SimpleSyncTriggerProps {
  onSyncStarted?: (syncId: string) => void;
  disabled?: boolean;
}

type SyncState = 'idle' | 'starting' | 'started' | 'error';

export function SimpleSyncTriggerWithDesignSystem({ onSyncStarted, disabled = false }: SimpleSyncTriggerProps) {
  const [syncState, setSyncState] = useState<SyncState>('idle');

  const handleSync = async () => {
    setSyncState('starting');

    try {
      const response = await fetch('/api/square/unified-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dryRun: false,
          categories: [], // Sync all categories
          forceUpdate: true // Always update existing products with latest Square data
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncState('started');
        
        const syncedCount = data.sync?.syncedProducts || 0;
        const skippedCount = data.sync?.skippedProducts || 0;
        const totalProcessed = syncedCount + skippedCount;
        
        // Improved messaging based on sync results
        let title = "Synchronization completed";
        let description: string;
        
        if (syncedCount > 0) {
          // Some products were updated
          description = `${syncedCount} products synchronized successfully.`;
          if (skippedCount > 0) {
            description += ` ${skippedCount} products were already up to date.`;
          }
        } else if (skippedCount > 0) {
          // All products were already up to date
          title = "Products are up to date";
          description = `All ${skippedCount} products are already synchronized with Square. No updates needed.`;
        } else if (totalProcessed === 0) {
          // No products found to sync
          description = "No products found to synchronize.";
        } else {
          // Fallback
          description = "Synchronization completed successfully.";
        }
        
        toast.success(title, { description });
        
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
      toast.error("Synchronization error", {
        description: error instanceof Error ? error.message : 'Unknown error',
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
    <FormStack spacing={6}>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <RefreshCw className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Synchronization Process
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Products and prices:</strong> Latest data from Square POS</li>
              <li>• <strong>Categories:</strong> Proper categorization and organization</li>
              <li>• <strong>Product images:</strong> High-quality images from Square</li>
              <li>• <strong>Status updates:</strong> Active/inactive product status</li>
            </ul>
          </div>
        </div>
      </div>

      <FormButton
        onClick={handleSync}
        disabled={disabled || isLoading}
        size="lg"
        variant={hasStarted ? "secondary" : hasError ? "danger" : "primary"}
        leftIcon={isLoading ? <Loader2 className="animate-spin" /> : hasStarted ? <CheckCircle2 /> : FormIcons.refresh}
      >
        {isLoading
          ? 'Synchronizing...'
          : hasStarted
          ? 'Synchronization Complete'
          : hasError
          ? 'Error - Try Again'
          : 'Synchronize Products'
        }
      </FormButton>

      {isLoading && (
        <div className="text-sm text-gray-500 text-center">
          This process may take a few minutes...
        </div>
      )}
    </FormStack>
  );
}
