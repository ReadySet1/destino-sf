'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Search, Plus, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface SyncSummary {
  totalInSquare: number;
  totalInDatabase: number;
  potentialNewItems: number;
  lastSync: string | null;
}

interface NewItem {
  squareId: string;
  name: string;
  status: 'created' | 'skipped' | 'error';
  reason?: string;
}

interface SyncResult {
  detected: number;
  created: number;
  skipped: number;
  errors: string[];
  newItems: NewItem[];
}

export default function NewAppetizersSyncPage() {
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Fetch current summary
  const fetchSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const response = await fetch('/api/admin/catering/new-appetizers-sync?action=summary');
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Summary fetch error:', error);
      toast.error('Failed to fetch sync summary');
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  // Run preview sync (dry run)
  const runPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/admin/catering/new-appetizers-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: true }),
      });
      
      if (!response.ok) {
        throw new Error('Preview request failed');
      }
      
      const result: SyncResult = await response.json();
      setLastSyncResult(result);
      
      if (result.detected === 0) {
        toast.success('No new appetizers found in Square');
      } else {
        toast.info(`Preview: ${result.detected} new appetizers detected`);
      }
      
      // Refresh summary
      await fetchSummary();
      
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Preview sync failed');
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  // Run actual sync
  const runSync = async () => {
    setIsLoadingSync(true);
    try {
      const response = await fetch('/api/admin/catering/new-appetizers-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun: false }),
      });
      
      if (!response.ok) {
        throw new Error('Sync request failed');
      }
      
      const result: SyncResult = await response.json();
      setLastSyncResult(result);
      
      if (result.created > 0) {
        toast.success(`Sync complete: ${result.created} new appetizers created`);
      } else if (result.detected === 0) {
        toast.success('Sync complete: No new appetizers found');
      } else {
        toast.warning(`Sync completed with issues: ${result.created} created, ${result.errors.length} errors`);
      }
      
      // Refresh summary
      await fetchSummary();
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setIsLoadingSync(false);
    }
  };
  
  useEffect(() => {
    fetchSummary();
  }, []);
  
  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (isLoadingSummary) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading sync status...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">New Appetizers Sync</h1>
          <p className="text-muted-foreground">
            Detect and sync new catering appetizers from Square POS
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={runPreview}
            disabled={isLoadingPreview || isLoadingSync}
            variant="outline"
            size="lg"
          >
            {isLoadingPreview ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Preview New Items
              </>
            )}
          </Button>
          <Button 
            onClick={runSync}
            disabled={isLoadingSync || isLoadingPreview || summary?.potentialNewItems === 0}
            size="lg"
          >
            {isLoadingSync ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Sync New Appetizers
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Sync Flow Information */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="text-blue-600">
              <Search className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Complete Sync Flow</h3>
              <p className="text-blue-800 mb-4">
                This fills the gap between Square sync and Catering sync by detecting NEW appetizers.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">1. Square Sync</h4>
                  <p className="text-sm text-blue-700">Alfajores & Empanadas</p>
                  <p className="text-xs text-blue-600">Protects catering items</p>
                </div>
                <div className="bg-blue-100 p-3 rounded border-2 border-blue-300">
                  <h4 className="font-medium text-blue-900 mb-1">2. This Sync ⭐</h4>
                  <p className="text-sm text-blue-700">New Catering Appetizers</p>
                  <p className="text-xs text-blue-600">Detects & creates missing items</p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-1">3. Catering Sync</h4>
                  <p className="text-sm text-blue-700">Images & Availability</p>
                  <p className="text-xs text-blue-600">Updates existing items</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Search className="mr-2 h-4 w-4 text-blue-600" />
                In Square
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.totalInSquare}</div>
              <p className="text-xs text-muted-foreground">Total appetizers in Square</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                In Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.totalInDatabase}</div>
              <p className="text-xs text-muted-foreground">Synced to our system</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Plus className="mr-2 h-4 w-4 text-orange-600" />
                Potential New
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.potentialNewItems}</div>
              <p className="text-xs text-muted-foreground">
                {summary.potentialNewItems === 0 ? 'All synced!' : 'Need to be imported'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
                Last Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-purple-600">
                {formatLastSync(summary.lastSync)}
              </div>
              <p className="text-xs text-muted-foreground">Most recent update</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* No new items message */}
      {summary?.potentialNewItems === 0 && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>All appetizers are synced!</strong> No new items detected in Square.
            All catering appetizers from Square are already in your database.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Potential new items warning */}
      {summary && summary.potentialNewItems > 0 && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{summary.potentialNewItems} new appetizers detected in Square!</strong>
            <div className="mt-2">
              <p className="text-sm">These items exist in Square but not in your database:</p>
              <p className="text-sm mt-1">• Run &quot;Preview&quot; to see what will be imported</p>
              <p className="text-sm">• Run &quot;Sync&quot; to add them to your catering menu</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Last Sync Result */}
      {lastSyncResult && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Last Sync Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastSyncResult.detected}</div>
                <div className="text-sm text-muted-foreground">Detected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastSyncResult.created}</div>
                <div className="text-sm text-muted-foreground">Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{lastSyncResult.skipped}</div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lastSyncResult.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
            
            {/* New Items List */}
            {lastSyncResult.newItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Processed Items:</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {lastSyncResult.newItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          item.status === 'created' ? 'default' :
                          item.status === 'skipped' ? 'secondary' : 'danger'
                        }>
                          {item.status}
                        </Badge>
                        {item.reason && (
                          <span className="text-xs text-muted-foreground">{item.reason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Errors */}
            {lastSyncResult.errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{lastSyncResult.errors.length} errors occurred:</strong>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    {lastSyncResult.errors.slice(0, 3).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {lastSyncResult.errors.length > 3 && (
                      <li className="text-muted-foreground">... and {lastSyncResult.errors.length - 3} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How This Sync Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">🔍 Detection Process:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Scans Square for &quot;CATERING- APPETIZERS&quot; category</li>
                <li>• Compares with existing database items</li>
                <li>• Identifies items that exist in Square but not in database</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">✅ What Gets Created:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• New CateringItem with Square linkage</li>
                <li>• Image URL from Square (if available)</li>
                <li>• Basic data structure ready for manual configuration</li>
              </ul>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">🔄 Recommended Workflow:</h4>
            <ol className="space-y-1 text-muted-foreground">
              <li>1. Add new appetizers to Square POS in &quot;CATERING- APPETIZERS&quot; category</li>
              <li>2. Run this sync to import them to the database</li>
              <li>3. Configure dietary info, ingredients manually in admin</li>
              <li>4. Run Catering Sync to update images and availability</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
