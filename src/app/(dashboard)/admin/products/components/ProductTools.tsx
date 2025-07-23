'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProductTools() {
  const [isRefreshingImages, setIsRefreshingImages] = useState(false);
  const [refreshResults, setRefreshResults] = useState<any>(null);

  const refreshProductImages = async () => {
    try {
      setIsRefreshingImages(true);
      setRefreshResults(null);

      const response = await fetch('/api/square/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      console.log('Image refresh results:', result);
      setRefreshResults(result.results);

      toast.success(`Successfully refreshed images for ${result.results.updated} products`);
    } catch (error) {
      console.error('Failed to refresh images:', error);
      toast.error('Failed to refresh product images');
    } finally {
      setIsRefreshingImages(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-medium">Product Tools</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Image Management</h4>
          <Button onClick={refreshProductImages} disabled={isRefreshingImages} variant="outline">
            {isRefreshingImages && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh Product Images from Square
          </Button>

          {refreshResults && (
            <div className="mt-4 text-sm">
              <h5 className="font-medium">Results:</h5>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Total products: {refreshResults.total}</li>
                <li>Updated with new images: {refreshResults.updated}</li>
                <li>No images found: {refreshResults.noChange}</li>
                <li>Errors: {refreshResults.errors}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
