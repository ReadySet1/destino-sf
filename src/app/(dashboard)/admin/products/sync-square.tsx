'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { manualSyncFromSquare } from './actions';

export function SyncSquareButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    success: boolean;
    message: string;
    syncedProducts: number;
    errors?: string[];
  } | null>(null);

  const handleSync = async () => {
    try {
      setIsLoading(true);
      
      // Call the server action directly
      const result = await manualSyncFromSquare();

      setStats(result);
      
      if (result.success) {
        toast.success(`Successfully synced ${result.syncedProducts} products from Square`);
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error syncing with Square:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync with Square');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSync}
        disabled={isLoading}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sync with Square
      </Button>
      
      {stats && (
        <div className="text-sm bg-muted p-2 rounded mt-2">
          <p className={stats.success ? "text-green-600" : "text-red-600"}>
            {stats.success ? "✓ Success" : "❌ Failed"}: {stats.message}
          </p>
          <p>Products synced: {stats.syncedProducts}</p>
          
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Errors:</p>
              <ul className="list-disc pl-5 text-xs text-red-600">
                {stats.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 