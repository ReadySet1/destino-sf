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
    cateringImagesProtected?: number;
    appetizerPackagesRestored?: number;
    appetizerItemsRestored?: number;
    cateringSetupSuccess?: boolean;
  } | null>(null);

  const handleSync = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Create backup of catering images before sync
      const backupResponse = await fetch('/api/catering/backup-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      let backup = {};
      if (backupResponse.ok) {
        const backupResult = await backupResponse.json();
        backup = backupResult.backup || {};
        console.log(`Created backup of ${Object.keys(backup).length} catering images`);
      }
      
      // Step 2: Call the server action to sync products
      const result = await manualSyncFromSquare();
      
      // Step 3: Call the image refresh API
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
      
      // Step 4: Protect/restore catering images
      const protectionResponse = await fetch('/api/catering/protect-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup })
      });
      
      let protectionResult = { protected: 0, skipped: 0, errors: 0 };
      if (protectionResponse.ok) {
        protectionResult = await protectionResponse.json();
        console.log(`Protected ${protectionResult.protected} catering images`);
      }
      
      // Step 5: Restore appetizer packages and catering menu
      console.log('Restoring appetizer packages and catering menu...');
      const cateringSetupResponse = await fetch('/api/catering/setup-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      let cateringSetupResult = { 
        success: false, 
        packagesCreated: 0, 
        itemsCreated: 0,
        message: 'Failed to setup catering menu'
      };
      
      if (cateringSetupResponse.ok) {
        cateringSetupResult = await cateringSetupResponse.json();
        console.log(`Restored ${cateringSetupResult.packagesCreated} appetizer packages and ${cateringSetupResult.itemsCreated} catering items`);
      } else {
        console.error('Failed to setup catering menu:', await cateringSetupResponse.text());
      }
      
      // Combine results
      setStats({
        ...result,
        imagesUpdated: imageResult.results?.updated || 0,
        imagesNoChange: imageResult.results?.noChange || 0,
        imagesErrors: imageResult.results?.errors || 0,
        cateringImagesProtected: protectionResult.protected,
        appetizerPackagesRestored: cateringSetupResult.packagesCreated,
        appetizerItemsRestored: cateringSetupResult.itemsCreated,
        cateringSetupSuccess: cateringSetupResult.success
      });
      
      if (result.success) {
        const successMessage = [
          `Successfully synced ${result.syncedProducts} products`,
          `updated ${imageResult.results?.updated || 0} images`,
          `protected ${protectionResult.protected} catering images`
        ];
        
        if (cateringSetupResult.success) {
          successMessage.push(`restored ${cateringSetupResult.packagesCreated} appetizer packages`);
        }
        
        toast.success(successMessage.join(', '));
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
        Sync Products, Images & Catering Menu
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
            {stats.cateringImagesProtected !== undefined && (
              <p className="text-green-600">Catering images protected: {stats.cateringImagesProtected}</p>
            )}
          </div>
          
          {/* Appetizer packages and catering menu restoration */}
          <div className="mt-1 border-t border-gray-200 pt-1">
            <h3 className="font-medium">Appetizer Packages & Catering Menu</h3>
            {stats.cateringSetupSuccess !== undefined && (
              <p className={stats.cateringSetupSuccess ? "text-green-600" : "text-red-600"}>
                {stats.cateringSetupSuccess ? "✓ Restored" : "❌ Failed"}
                {stats.appetizerPackagesRestored !== undefined && 
                  ` - ${stats.appetizerPackagesRestored} packages`}
                {stats.appetizerItemsRestored !== undefined && 
                  `, ${stats.appetizerItemsRestored} items`}
              </p>
            )}
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