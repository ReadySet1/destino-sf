/**
 * Filtered Square Sync Button
 *
 * Simplified sync UI that uses the new filtered sync process.
 * Only syncs alfajores and empanadas while protecting catering items.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Eye, Play, RotateCcw, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SyncResult {
  success: boolean;
  message: string;
  syncedProducts: number;
  protectedItems: number;
  productDetails?: {
    created: number;
    updated: number;
    withImages: number;
    withoutImages: number;
    skipped: number;
  };
  errors: string[];
  warnings: string[];
  metadata?: {
    syncId: string;
    startedAt: string;
    completedAt?: string;
  };
}

interface PreviewResult {
  productsToSync: Array<{
    id: string;
    name: string;
    category: string;
    action: 'CREATE' | 'UPDATE';
  }>;
  itemsToSkip: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  summary: {
    totalProducts: number;
    willSync: number;
    willSkip: number;
    protectedItems: number;
  };
}

export function FilteredSyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);

  const handlePreview = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/square/sync-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Preview failed');
      }

      setPreviewData(result.data);
      setShowPreview(true);

      toast.success(`Preview loaded: ${result.data.summary.willSync} products will be synced`);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setShowPreview(false);

      const response = await fetch('/api/square/sync-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setSyncResult(result);

      if (result.success) {
        toast.success(
          `Sync completed: ${result.data.syncedProducts} products synced, ${result.data.protectedItems} items protected`
        );
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!syncResult?.metadata?.syncId) {
      toast.error('No sync to rollback');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/square/sync-filtered/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncId: syncResult.metadata.syncId,
          confirmRollback: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Rollback completed: ${result.data.productsRestored} products affected`);
        setSyncResult(null);
      } else {
        toast.error(`Rollback failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Rollback error:', error);
      toast.error(error instanceof Error ? error.message : 'Rollback failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handlePreview} disabled={isLoading} variant="outline" className="gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Eye className="h-4 w-4" />
          Preview Sync
        </Button>

        <Button
          onClick={handleSync}
          disabled={isLoading}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Play className="h-4 w-4" />
          Sync Alfajores & Empanadas
        </Button>

        {syncResult?.metadata?.syncId && (
          <Button
            onClick={handleRollback}
            disabled={isLoading}
            variant="destructive"
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <RotateCcw className="h-4 w-4" />
            Rollback Last Sync
          </Button>
        )}
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <History className="h-4 w-4" />
            Filtered Sync Information
          </CardTitle>
          <CardDescription className="text-blue-600">
            This sync only imports alfajores and empanadas from Square while protecting all catering
            items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">✅ Syncs: Alfajores</Badge>
            <Badge variant="secondary">✅ Syncs: Empanadas</Badge>
            <Badge variant="outline">🛡️ Protects: All Catering Items</Badge>
            <Badge variant="outline">🛡️ Protects: Custom Images</Badge>
          </div>
          <p className="text-blue-700">
            <strong>Safe:</strong> Catering items, packages, and custom implementations are fully
            protected from modification.
          </p>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card
          className={`border-2 ${syncResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <CardHeader>
            <CardTitle
              className={`flex items-center gap-2 ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}
            >
              {syncResult.success ? '✅ Sync Completed' : '❌ Sync Failed'}
            </CardTitle>
            <CardDescription className={syncResult.success ? 'text-green-600' : 'text-red-600'}>
              {syncResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-2xl font-bold text-green-600">{syncResult.syncedProducts}</div>
                <div className="text-xs text-gray-600">Products Synced</div>
              </div>
              <div className="text-center p-2 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600">{syncResult.protectedItems}</div>
                <div className="text-xs text-gray-600">Items Protected</div>
              </div>
              {syncResult.productDetails && (
                <>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-2xl font-bold text-amber-600">
                      {syncResult.productDetails.created}
                    </div>
                    <div className="text-xs text-gray-600">Created</div>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <div className="text-2xl font-bold text-purple-600">
                      {syncResult.productDetails.updated}
                    </div>
                    <div className="text-xs text-gray-600">Updated</div>
                  </div>
                </>
              )}
            </div>

            {/* Errors and Warnings */}
            {syncResult.errors.length > 0 && (
              <div className="bg-red-100 border border-red-300 rounded p-3">
                <h4 className="font-semibold text-red-800 mb-2">
                  Errors ({syncResult.errors.length})
                </h4>
                <ul className="list-disc pl-5 text-sm text-red-700 space-y-1">
                  {syncResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {syncResult.warnings.length > 0 && (
              <div className="bg-amber-100 border border-amber-300 rounded p-3">
                <h4 className="font-semibold text-amber-800 mb-2">
                  Warnings ({syncResult.warnings.length})
                </h4>
                <ul className="list-disc pl-5 text-sm text-amber-700 space-y-1">
                  {syncResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            {syncResult.metadata && (
              <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
                <strong>Sync ID:</strong> {syncResult.metadata.syncId}
                <br />
                <strong>Started:</strong> {new Date(syncResult.metadata.startedAt).toLocaleString()}
                <br />
                {syncResult.metadata.completedAt && (
                  <>
                    <strong>Completed:</strong>{' '}
                    {new Date(syncResult.metadata.completedAt).toLocaleString()}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Preview</DialogTitle>
            <DialogDescription>Review what will be synced before proceeding</DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{previewData.summary.totalProducts}</div>
                      <div className="text-sm text-gray-600">Total Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.summary.willSync}
                      </div>
                      <div className="text-sm text-gray-600">Will Sync</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {previewData.summary.willSkip}
                      </div>
                      <div className="text-sm text-gray-600">Will Skip</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {previewData.summary.protectedItems}
                      </div>
                      <div className="text-sm text-gray-600">Protected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products to Sync */}
              {previewData.productsToSync.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-800">
                      Products to Sync ({previewData.productsToSync.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {previewData.productsToSync.map((product, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-green-50 rounded border"
                        >
                          <span className="font-medium">{product.name}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline">{product.category}</Badge>
                            <Badge variant={product.action === 'CREATE' ? 'default' : 'secondary'}>
                              {product.action}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items to Skip */}
              {previewData.itemsToSkip.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-amber-800">
                      Items to Skip ({previewData.itemsToSkip.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {previewData.itemsToSkip.slice(0, 10).map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-amber-50 rounded border"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-amber-700">{item.reason}</span>
                        </div>
                      ))}
                      {previewData.itemsToSkip.length > 10 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... and {previewData.itemsToSkip.length - 10} more items
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSync} className="bg-green-600 hover:bg-green-700">
                  Proceed with Sync
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
