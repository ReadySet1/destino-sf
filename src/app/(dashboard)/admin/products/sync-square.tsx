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
    syncedCategories?: number;
    newCategories?: number;
    cateringCategories?: number;
    cateringCategoryNames?: string[];
    errors?: string[];
    imagesUpdated?: number;
    imagesNoChange?: number;
    imagesErrors?: number;
  } | null>(null);

  const handleSync = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Call the server action to sync products
      const result = await manualSyncFromSquare();
      
      // Step 2: Call the image refresh API
      const imageResponse = await fetch('/api/square/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!imageResponse.ok) {
        throw new Error(`HTTP error ${imageResponse.status} refreshing images`);
      }
      
      const imageResult = await imageResponse.json();
      
      // Combine results
      setStats({
        ...result,
        imagesUpdated: imageResult.results?.updated || 0,
        imagesNoChange: imageResult.results?.noChange || 0,
        imagesErrors: imageResult.results?.errors || 0
      });
      
      if (result.success) {
        toast.success(`Successfully synced ${result.syncedProducts} products and updated ${imageResult.results?.updated || 0} images from Square`);
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
        Sync Products & Images from Square
      </Button>
      
      {stats && (
        <div className="text-sm bg-muted p-2 rounded mt-2">
          <p className={stats.success ? "text-green-600" : "text-red-600"}>
            {stats.success ? "✓ Success" : "❌ Failed"}: {stats.message}
          </p>
          <p>Products synced: {stats.syncedProducts}</p>
          
          {/* Category information */}
          <div className="mt-1 border-t border-gray-200 pt-1">
            <h3 className="font-medium">Categories</h3>
            <p>Total categories: {stats.syncedCategories || 0}</p>
            {stats.newCategories !== undefined && (
              <p className="text-green-600">Newly created categories: {stats.newCategories}</p>
            )}
          </div>
          
          {/* Enhanced catering categories display */}
          {stats.cateringCategories !== undefined && (
            <div className="mt-1 border-t border-gray-200 pt-1">
              <h3 className="font-medium">Catering Categories ({stats.cateringCategories})</h3>
              {stats.cateringCategoryNames && stats.cateringCategoryNames.length > 0 ? (
                <ul className="list-disc pl-5 text-xs">
                  {stats.cateringCategoryNames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-600 text-xs">No catering categories found!</p>
              )}
            </div>
          )}
          
          {/* Image statistics */}
          <div className="mt-1 border-t border-gray-200 pt-1">
            <h3 className="font-medium">Images</h3>
            <p>Updated: {stats.imagesUpdated}</p>
            <p>Unchanged: {stats.imagesNoChange}</p>
            <p>Errors: {stats.imagesErrors}</p>
          </div>
          
          {/* Error display */}
          {stats.errors && stats.errors.length > 0 && (
            <div className="mt-2 border-t border-gray-200 pt-1">
              <p className="font-semibold text-red-600">Errors ({stats.errors.length}):</p>
              <ul className="list-disc pl-5 text-xs text-red-600 max-h-40 overflow-y-auto">
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