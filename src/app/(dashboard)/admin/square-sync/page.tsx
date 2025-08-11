'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Eye, Play } from 'lucide-react';



interface PreviewProductEntry {
  id: string;
  name: string;
  category: string;
  action: 'CREATE' | 'UPDATE';
}

interface PreviewSkipEntry {
  id: string;
  name: string;
  reason: string;
}

interface PreviewSummary {
  totalProducts: number;
  willSync: number;
  willSkip: number;
  protectedItems: number;
}

interface PreviewResponse {
  success: true;
  preview: true;
  data: {
    productsToSync: PreviewProductEntry[];
    itemsToSkip: PreviewSkipEntry[];
    summary: PreviewSummary;
  };
}

interface SyncResultDetails {
  created: number;
  updated: number;
  withImages: number;
  withoutImages: number;
  skipped: number;
}

interface RunResponse {
  success: boolean;
  message: string;
  data: {
    syncedProducts: number;
    protectedItems: number;
    productDetails?: SyncResultDetails;
    errors: string[];
    warnings: string[];
  };
}

export default function SquareSyncAdminPage(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse['data'] | null>(null);
  const [lastRun, setLastRun] = useState<RunResponse['data'] | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [forceImageUpdate, setForceImageUpdate] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => !isLoading && !isPreviewLoading, [isLoading, isPreviewLoading]);

  const fetchPreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/square/sync-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: true,
          options: {
            dryRun,
            forceImageUpdate,
            batchSize,
          },
        }),
      });

      const json = (await resp.json()) as PreviewResponse | { success: false; error?: string };
      if (!resp.ok || (json as any).success === false) {
        const message = (json as any).error || 'Failed to fetch preview';
        throw new Error(message);
      }
      const data = (json as PreviewResponse).data;
      setPreview(data);
      setLastRun(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [batchSize, dryRun, forceImageUpdate]);

  const runSync = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/square/sync-filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: false,
          options: {
            dryRun,
            forceImageUpdate,
            batchSize,
          },
        }),
      });

      const json = (await resp.json()) as RunResponse | { success: false; error?: string; message?: string };
      if (!resp.ok || (json as any).success === false) {
        const message = (json as any).error || (json as any).message || 'Sync failed';
        throw new Error(message);
      }
      const data = (json as RunResponse).data;
      setLastRun(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }, [batchSize, dryRun, forceImageUpdate]);

  // Removed auto-loading to prevent unwanted API calls

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Square Product Sync</h1>
          <p className="text-muted-foreground">Sync alfajores and empanadas from Square while protecting catering items</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchPreview} disabled={!canRun} variant="outline" size="lg">
            {isPreviewLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Preview Sync
              </>
            )}
          </Button>
          <Button onClick={runSync} disabled={!canRun} size="lg">
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Sync Alfajores & Empanadas
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filtered Sync Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="text-blue-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Filtered Sync Information</h3>
              <p className="text-blue-800 mb-4">
                This sync only imports alfajores and empanadas from Square while protecting all catering items.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">✅ Syncs:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Alfajores</li>
                    <li>• Empanadas</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">🛡️ Protects:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• All Catering Items</li>
                    <li>• Custom Images</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-blue-600 mt-4 font-medium">
                Safe: Catering items, packages, and custom implementations are fully protected from modification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
          <CardDescription>Configure sync behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <input
                id="dry-run"
                type="checkbox"
                className="h-4 w-4"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                aria-describedby="dry-run-desc"
              />
              <div>
                <Label htmlFor="dry-run">Dry run</Label>
                <p id="dry-run-desc" className="text-xs text-muted-foreground">
                  Simulate without persisting changes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="force-images"
                type="checkbox"
                className="h-4 w-4"
                checked={forceImageUpdate}
                onChange={(e) => setForceImageUpdate(e.target.checked)}
                aria-describedby="force-images-desc"
              />
              <div>
                <Label htmlFor="force-images">Force image update</Label>
                <p id="force-images-desc" className="text-xs text-muted-foreground">
                  Replace existing images if available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-full">
                <Label htmlFor="batch-size">Batch size</Label>
                <Input
                  id="batch-size"
                  type="number"
                  min={10}
                  max={100}
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value) || 50)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {preview.summary.willSync} of {preview.summary.totalProducts} products will be synced
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Stat label="Total" value={preview.summary.totalProducts} />
              <Stat label="Will Sync" value={preview.summary.willSync} />
              <Stat label="Will Skip" value={preview.summary.willSkip} />
            </div>

            <section aria-labelledby="to-sync-heading" className="space-y-2">
              <h3 id="to-sync-heading" className="text-sm font-semibold">
                Products to Sync
              </h3>
              {preview.productsToSync.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {preview.productsToSync.slice(0, 20).map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                      <span className="truncate" title={p.name}>
                        {p.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.action === 'CREATE' ? 'default' : 'secondary'}>
                          {p.action}
                        </Badge>
                        <Badge variant="outline">{p.category || 'Uncategorized'}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="skipped-heading" className="space-y-2">
              <h3 id="skipped-heading" className="text-sm font-semibold">
                Items to Skip (top 20)
              </h3>
              {preview.itemsToSkip.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {preview.itemsToSkip.slice(0, 20).map((p) => (
                    <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                      <span className="truncate" title={p.name}>
                        {p.name}
                      </span>
                      <Badge variant="outline">{p.reason}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      )}

      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle>Last Run</CardTitle>
            <CardDescription>
              {lastRun.syncedProducts} products processed, {lastRun.protectedItems} protected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Stat label="Processed" value={lastRun.syncedProducts} />
              <Stat label="Created" value={lastRun.productDetails?.created ?? 0} />
              <Stat label="Updated" value={lastRun.productDetails?.updated ?? 0} />
              <Stat label="With Images" value={lastRun.productDetails?.withImages ?? 0} />
              <Stat label="Skipped" value={lastRun.productDetails?.skipped ?? 0} />
            </div>

            {(lastRun.errors?.length ?? 0) > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>
                  Errors: {(lastRun.errors || []).slice(0, 5).join('; ')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Section */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="text-amber-600 mt-1">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Important Notes</h3>
              <div className="text-amber-800 space-y-2">
                <p className="text-sm">
                  <strong>Products can only be edited in Square Dashboard.</strong> Use the &ldquo;Sync Products & Images from Square&rdquo; button to update your products.
                </p>
                <p className="text-sm">
                  This filtered sync protects your catering menu from accidental changes while keeping alfajores and empanadas up-to-date.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
