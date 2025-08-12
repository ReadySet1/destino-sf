'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Download, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface SyncResult {
  success: boolean;
  message: string;
  data: {
    syncedItems: number;
    skippedItems: number;
    protectedItems: number;
    newCategories: string[];
    categoryBreakdown: Array<{
      category: string;
      synced: number;
      skipped: number;
      protected: number;
    }>;
    errors: string[];
  };
}

interface MissingItemsPreview {
  totalMissing: number;
  categories: Array<{
    name: string;
    squareItems: number;
    dbItems: number;
    missing: number;
    items: Array<{
      id: string;
      name: string;
      price: number;
      hasImage: boolean;
    }>;
  }>;
}

export function EnhancedSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<MissingItemsPreview | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const handlePreview = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/square/enhanced-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.data);
        setShowPreview(true);
        toast.success(`Found ${result.data.totalMissing} missing items across ${result.data.categories.length} categories`);
      } else {
        toast.error(`Preview failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(error instanceof Error ? error.message : 'Preview failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setShowPreview(false);
      
      const response = await fetch('/api/square/enhanced-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      setSyncResult(result);

      if (result.success) {
        toast.success(
          `Enhanced sync completed: ${result.data.syncedItems} items synced, ${result.data.protectedItems} items protected`
        );
      } else {
        toast.error(`Enhanced sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Enhanced sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Enhanced sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handlePreview}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          Preview Missing Items
        </Button>

        <Button
          onClick={handleSync}
          disabled={isLoading || !previewData}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Enhanced Sync All Missing
        </Button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 mb-1">Enhanced Square Sync</p>
            <p className="text-blue-700">
              Syncs ALL missing catering items from Square while protecting existing appetizers, 
              empanadas, and alfajores. Uses intelligent duplicate detection to prevent conflicts.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Results */}
      {showPreview && previewData && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Missing Items Preview
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{previewData.totalMissing}</div>
              <div className="text-sm text-blue-700">Total Missing Items</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{previewData.categories.length}</div>
              <div className="text-sm text-green-700">Categories Affected</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {previewData.categories.reduce((acc, cat) => acc + cat.items.filter(item => item.hasImage).length, 0)}
              </div>
              <div className="text-sm text-purple-700">Items with Images</div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Missing Items by Category:</h4>
            {previewData.categories.map((category, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{category.name}</h5>
                  <div className="text-sm text-gray-600">
                    {category.missing} missing of {category.squareItems} total
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {category.items.slice(0, 6).map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className={`w-2 h-2 rounded-full ${item.hasImage ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto text-xs font-medium">
                        {item.price === 0 ? 'FREE' : `$${item.price}`}
                      </span>
                    </div>
                  ))}
                  {category.items.length > 6 && (
                    <div className="text-xs text-gray-500 p-2">
                      ... and {category.items.length - 6} more items
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Protected Items</p>
                <p className="text-yellow-700">
                  Existing appetizers, empanadas, and alfajores will be protected from modification. 
                  Only new items will be added.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sync Results */}
      {syncResult && (
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {syncResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            Enhanced Sync Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{syncResult.data.syncedItems}</div>
              <div className="text-sm text-green-700">Items Synced</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{syncResult.data.protectedItems}</div>
              <div className="text-sm text-blue-700">Items Protected</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{syncResult.data.skippedItems}</div>
              <div className="text-sm text-yellow-700">Items Skipped</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{syncResult.data.newCategories.length}</div>
              <div className="text-sm text-purple-700">New Categories</div>
            </div>
          </div>

          {syncResult.data.categoryBreakdown.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Category Breakdown:</h4>
              <div className="space-y-1">
                {syncResult.data.categoryBreakdown.map((cat, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="font-medium">{cat.category}</span>
                    <div className="text-sm text-gray-600">
                      {cat.synced} synced, {cat.protected} protected, {cat.skipped} skipped
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {syncResult.data.errors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
              <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {syncResult.data.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}