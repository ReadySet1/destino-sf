'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Image as ImageIcon, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CateringItem {
  id: string;
  name: string;
  price: number | string; // Can be Prisma Decimal (comes as string) or number
  squareItemId: string | null;
  squareProductId: string | null;
  isActive: boolean;
  lastSquareSync: string | null;
  ingredients: string[];
  dietaryTags: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  imageUrl: string | null;
}

interface SyncResult {
  updated: number;
  errors: string[];
}

export default function CateringImageSync() {
  const [items, setItems] = useState<CateringItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  // Helper function to format price safely
  const formatPrice = (price: number | string | null | undefined): string => {
    if (price === null || price === undefined) return '0.00';
    const numPrice = typeof price === 'number' ? price : Number(price);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };
  
  // Fetch current catering items
  const fetchItems = async () => {
    try {
      setIsLoadingItems(true);
      const response = await fetch('/api/admin/catering/items');
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch catering items');
    } finally {
      setIsLoadingItems(false);
    }
  };
  
  // Run image sync
  const runImageSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/catering/sync-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Sync request failed');
      }
      
      const result: SyncResult = await response.json();
      setLastSyncResult(result);
      
      if (result.errors.length > 0) {
        toast.warning(`Sync completed with warnings: ${result.updated} updated, ${result.errors.length} errors`);
      } else {
        toast.success(`Sync complete: ${result.updated} images updated`);
      }
      
      // Refresh the items list
      await fetchItems();
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Image sync failed');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchItems();
  }, []);
  
  // Calculate summary stats
  const unmatchedItems = items.filter(item => !item.squareItemId && !item.squareProductId);
  const matchedItems = items.filter(item => item.squareItemId || item.squareProductId);
  const activeItems = items.filter(item => item.isActive);
  const recentlySynced = items.filter(item => {
    if (!item.lastSquareSync) return false;
    const syncDate = new Date(item.lastSquareSync);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return syncDate > oneDayAgo;
  });
  
  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const DietaryBadges = ({ item }: { item: CateringItem }) => (
    <div className="flex gap-1 flex-wrap">
      {item.isVegetarian && (
        <Badge variant="outline" className="text-green-600 border-green-200">
          VG
        </Badge>
      )}
      {item.isVegan && (
        <Badge variant="outline" className="text-green-700 border-green-300">
          VGN
        </Badge>
      )}
      {item.isGlutenFree && (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          GF
        </Badge>
      )}
    </div>
  );
  
  if (isLoadingItems) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading catering items...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Catering Image Sync</h1>
          <p className="text-muted-foreground">
            Sync appetizer images and availability from Square POS
          </p>
        </div>
        <Button 
          onClick={runImageSync}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Sync Images
            </>
          )}
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Linked to Square
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {matchedItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Will receive image updates
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
              Unlinked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {unmatchedItems.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need manual linking
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4 text-blue-600" />
              Recently Synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {recentlySynced.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Last Sync Result */}
      {lastSyncResult && (
        <Alert className={`mb-6 ${lastSyncResult.errors.length > 0 ? 'border-orange-200' : 'border-green-200'}`}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Last sync result:</strong> {lastSyncResult.updated} items updated
            {lastSyncResult.errors.length > 0 && (
              <div className="mt-2">
                <strong className="text-orange-600">{lastSyncResult.errors.length} errors:</strong>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  {lastSyncResult.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx} className="text-orange-700">{error}</li>
                  ))}
                  {lastSyncResult.errors.length > 5 && (
                    <li className="text-muted-foreground">... and {lastSyncResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Catering Appetizers ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map(item => (
              <div 
                key={item.id}
                className="flex justify-between items-start p-4 border rounded-lg bg-gray-50/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-lg">{item.name}</div>
                      
                      {/* Image preview */}
                      {item.imageUrl && (
                        <div className="mt-2">
                          <Image 
                            src={item.imageUrl} 
                            alt={item.name}
                            width={64}
                            height={64}
                            className="w-16 h-16 object-cover rounded-md border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Ingredients */}
                      {item.ingredients.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <strong>Ingredients:</strong> {item.ingredients.join(', ')}
                        </div>
                      )}
                      
                      {/* Dietary info and sync status */}
                      <div className="flex items-center gap-4 mt-2">
                        <DietaryBadges item={item} />
                        
                        <div className="text-sm">
                          {item.squareItemId || item.squareProductId ? (
                            <span className="text-green-600 flex items-center">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Linked to Square
                            </span>
                          ) : (
                            <span className="text-orange-600 flex items-center">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Not linked to Square
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Last sync time */}
                      <div className="text-xs text-muted-foreground mt-1">
                        Last synced: {formatLastSync(item.lastSquareSync)}
                      </div>
                    </div>
                    
                    {/* Price and status */}
                    <div className="text-right ml-4">
                      <div className="text-xl font-semibold">
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Package Item
                        </Badge>
                      </div>
                      <div className="mt-1">
                        {item.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 mb-4" />
                <p>No catering appetizers found.</p>
                <p className="text-sm mt-1">
                  Run the import script to populate appetizer data from your PDF.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Unmatched Items Warning */}
      {unmatchedItems.length > 0 && (
        <Alert className="mt-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{unmatchedItems.length} items are not linked to Square:</strong>
            <div className="mt-2 space-y-1">
              {unmatchedItems.slice(0, 5).map(item => (
                <div key={item.id} className="text-sm">• {item.name}</div>
              ))}
              {unmatchedItems.length > 5 && (
                <div className="text-sm text-muted-foreground">... and {unmatchedItems.length - 5} more</div>
              )}
            </div>
            <p className="mt-3 text-sm">
              These items won&apos;t receive image updates. Please check if they exist in Square 
              with different names or if they need to be created in Square POS.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Instructions */}
      {items.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How to Link Items to Square</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. <strong>Check Square POS:</strong> Verify the item exists in the &quot;CATERING- APPETIZERS&quot; category</p>
            <p>2. <strong>Match names exactly:</strong> Item names in Square should match the names shown above</p>
            <p>3. <strong>Run sync again:</strong> After updating names in Square, click &quot;Sync Images&quot; to retry</p>
            <p>4. <strong>Manual database update:</strong> For persistent mismatches, update the squareProductId field directly</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
