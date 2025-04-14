'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function SyncSquareButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/square/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync with Square');
      }

      toast.success(data.message || 'Successfully synced with Square');
    } catch (error) {
      console.error('Error syncing with Square:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync with Square');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      Sync with Square
    </Button>
  );
} 