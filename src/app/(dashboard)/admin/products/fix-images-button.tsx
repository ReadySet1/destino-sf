'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function FixImagesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    fixedCount: number;
    errorCount: number;
    resetProductsCount: number;
    customProductsCount: number;
  } | null>(null);

  const handleFixImages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/square/fix-images', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix product images');
      }

      setStats(data.stats);
      toast.success(`Successfully fixed ${data.stats.fixedCount} products`);
    } catch (error) {
      console.error('Error fixing product images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fix product images');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleFixImages}
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        Fix Product Images
      </Button>
      
      {stats && (
        <div className="text-sm bg-muted p-2 rounded mt-2">
          <p>✓ Fixed: {stats.fixedCount} products</p>
          <p>❌ Errors: {stats.errorCount}</p>
          <p>📊 Processed {stats.resetProductsCount} reset products and {stats.customProductsCount} custom products</p>
        </div>
      )}
    </div>
  );
} 