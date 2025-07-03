'use client';

import React, { useState, useEffect } from 'react';
import { SpotlightPick, SpotlightPickFormData, SpotlightPicksManagerProps } from '@/types/spotlight';
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
      return existingPick || {
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
      } as SpotlightPick;
    });
  }, [picks]);

  const handleProductSelect = async (position: number, productId: string) => {
    if (!productId) return;
    
    const formData: SpotlightPickFormData = { 
      position: position as 1 | 2 | 3 | 4, 
      productId, 
      isActive: true 
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-8xl">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8 lg:mb-10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Spotlight Picks Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Manage the 4 featured products that appear in the &quot;Spotlight Picks&quot; section on the homepage
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={refreshPicks}
            disabled={isLoading}
            className="flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 text-sm"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 text-sm"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" />
              View Live
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 lg:mb-10">
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Active Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{activePicksCount}</div>
            <p className="text-xs sm:text-sm text-gray-600">out of 4 positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">
              {Math.round((activePicksCount / 4) * 100)}%
            </div>
            <p className="text-xs sm:text-sm text-gray-600">of positions filled</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {activePicksCount === 0 && (
        <Alert className="mb-6 sm:mb-8 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            No spotlight picks are currently active. Add some picks to showcase your featured products on the homepage.
          </AlertDescription>
        </Alert>
      )}

      {activePicksCount === 4 && (
        <Alert className="mb-6 sm:mb-8 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            All spotlight pick positions are filled! Your homepage is showcasing 4 featured items.
          </AlertDescription>
        </Alert>
      )}

      {/* Spotlight Picks Grid */}
      <div className="mb-8 lg:mb-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Spotlight Pick Positions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {normalizedPicks.map((pick) => (
            <SpotlightPickCard
              key={pick.position}
              pick={pick}
              onProductSelect={(productId) => handleProductSelect(pick.position, productId)}
              onClear={() => handleClearPick(pick.position)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 text-base sm:text-lg">
            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            How to Use Spotlight Picks
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-xs sm:text-sm">
            <li>• <strong>Product Selection:</strong> Choose an existing product to feature in each position</li>
            <li>• <strong>Automatic Content:</strong> Product details (title, description, image, price) are automatically used</li>
            <li>• <strong>Flexible Positioning:</strong> Any position can be left empty if you want fewer than 4 picks</li>
            <li>• <strong>Live Updates:</strong> Changes are reflected immediately on your homepage</li>
          </ul>
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