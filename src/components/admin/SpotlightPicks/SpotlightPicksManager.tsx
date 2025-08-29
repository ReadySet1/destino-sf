'use client';

import React, { useState, useEffect } from 'react';
import {
  SpotlightPick,
  SpotlightPickFormData,
  SpotlightPicksManagerProps,
} from '@/types/spotlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SpotlightPickCard } from './SpotlightPickCard';
import { FeaturedProducts } from '@/components/Marketing/FeaturedProducts';
import { toast } from 'sonner';

export function SpotlightPicksManager({ initialPicks }: SpotlightPicksManagerProps) {
  const [picks, setPicks] = useState<SpotlightPick[]>(initialPicks);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure we have all 4 positions
  const normalizedPicks = React.useMemo(() => {
    const positions = [1, 2, 3, 4] as const;
    return positions.map(position => {
      const existingPick = picks.find(p => p.position === position);
      return (
        existingPick ||
        ({
          id: `empty-${position}`,
          position,
          productId: '',
          isActive: false,
          product: {
            id: '',
            name: 'No product selected',
            description: null,
            images: [],
            price: 0,
            slug: null,
            category: undefined,
          },
        } as SpotlightPick)
      );
    });
  }, [picks]);

  const handleProductSelect = async (position: number, productId: string) => {
    if (!productId) return;

    const formData: SpotlightPickFormData = {
      position: position as 1 | 2 | 3 | 4,
      productId,
      isActive: true,
    };
    await handleSavePick(formData);
  };

  const handleSavePick = async (formData: SpotlightPickFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/spotlight-picks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Spotlight pick updated successfully');
        await refreshPicks();
      } else {
        console.error('Failed to update spotlight pick:', result.error);
        if (result.validationErrors) {
          toast.error(result.validationErrors.join('\n'));
        } else {
          toast.error(result.error || 'Failed to update spotlight pick');
        }
      }
    } catch (error) {
      console.error('Error updating spotlight pick:', error);
      toast.error('Failed to update spotlight pick');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearPick = async (position: 1 | 2 | 3 | 4) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/spotlight-picks?position=${position}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await refreshPicks();
        toast.success('Spotlight pick cleared successfully!');
      } else {
        toast.error(result.error || 'Failed to clear spotlight pick');
      }
    } catch (error) {
      console.error('Error clearing spotlight pick:', error);
      toast.error('An error occurred while clearing');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPicks = async () => {
    try {
      const response = await fetch('/api/admin/spotlight-picks');
      const result = await response.json();

      if (result.success && result.data) {
        setPicks(result.data);
      }
    } catch (error) {
      console.error('Error refreshing picks:', error);
    }
  };

  const activePicksCount = normalizedPicks.filter(pick => pick.isActive).length;

  return (
    <div className="space-y-10">
      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <Button
              variant="secondary"
              onClick={refreshPicks}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-2"
            >
              <Eye />
              Preview
            </Button>
            <Button asChild variant="secondary" className="flex items-center gap-2">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <Eye />
                View Live
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Spotlight Picks Statistics
          </CardTitle>
          <p className="text-sm text-gray-600">Overview of your current spotlight pick configuration</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">{activePicksCount}</div>
              <p className="text-sm text-blue-700">Active Picks</p>
              <p className="text-xs text-blue-600">out of 4 positions</p>
            </div>

            <div className="text-center p-6 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-3xl font-bold text-amber-600 mb-2">
                {Math.round((activePicksCount / 4) * 100)}%
              </div>
              <p className="text-sm text-amber-700">Completion</p>
              <p className="text-xs text-amber-600">of positions filled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {activePicksCount === 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            No spotlight picks are currently active. Add some picks to showcase your featured
            products on the homepage.
          </AlertDescription>
        </Alert>
      )}

      {activePicksCount === 4 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            All spotlight pick positions are filled! Your homepage is showcasing 4 featured items.
          </AlertDescription>
        </Alert>
      )}

      {/* Spotlight Picks Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Spotlight Pick Positions
          </CardTitle>
          <p className="text-sm text-gray-600">Configure which products appear in each of the 4 spotlight positions on your homepage</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            {normalizedPicks.map(pick => (
              <SpotlightPickCard
                key={pick.position}
                pick={pick}
                onProductSelect={productId => handleProductSelect(pick.position, productId)}
                onClear={() => handleClearPick(pick.position)}
                isLoading={isLoading}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-purple-600" />
            How to Use Spotlight Picks
          </CardTitle>
          <p className="text-sm text-gray-600">Guidelines for managing your featured products effectively</p>
        </CardHeader>
        <CardContent>
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <Eye className="h-5 w-5 text-purple-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-semibold text-purple-900 mb-2">
                  Best Practices
                </h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• <strong>Product Selection:</strong> Choose an existing product to feature in each position</li>
                  <li>• <strong>Automatic Content:</strong> Product details (title, description, image, price) are automatically used</li>
                  <li>• <strong>Flexible Positioning:</strong> Any position can be left empty if you want fewer than 4 picks</li>
                  <li>• <strong>Live Updates:</strong> Changes are reflected immediately on your homepage</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Spotlight Picks Preview</DialogTitle>
            <p className="text-sm text-gray-600">
              This is exactly how your spotlight picks will appear on the homepage
            </p>
          </DialogHeader>
          <div className="mt-4">
            <FeaturedProducts />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
