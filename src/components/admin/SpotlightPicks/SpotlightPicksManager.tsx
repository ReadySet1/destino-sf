'use client';

import React, { useState, useEffect } from 'react';
import { SpotlightPick, SpotlightPickFormData, SpotlightPicksManagerProps } from '@/types/spotlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Plus, Eye, RefreshCw } from 'lucide-react';
import { SpotlightPickCard } from './SpotlightPickCard';
import { SpotlightPickModal } from './SpotlightPickModal';
import { toast } from 'sonner';

export function SpotlightPicksManager({ initialPicks }: SpotlightPicksManagerProps) {
  const [picks, setPicks] = useState<SpotlightPick[]>(initialPicks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Ensure we have all 4 positions
  const normalizedPicks = React.useMemo(() => {
    const positions = [1, 2, 3, 4] as const;
    return positions.map(position => {
      const existingPick = picks.find(p => p.position === position);
      return existingPick || {
        position,
        isCustom: false,
        isActive: false,
      };
    });
  }, [picks]);

  // Fetch categories for the modal
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditPick = (position: 1 | 2 | 3 | 4) => {
    setCurrentPosition(position);
    setIsModalOpen(true);
  };

  const handleSavePick = async (formData: SpotlightPickFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the picks data
        await refreshPicks();
        setIsModalOpen(false);
        toast.success('Spotlight pick saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save spotlight pick');
      }
    } catch (error) {
      console.error('Error saving spotlight pick:', error);
      toast.error('An error occurred while saving');
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
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPicks(result.data);
        }
      }
    } catch (error) {
      console.error('Error refreshing picks:', error);
    }
  };

  const activePicksCount = normalizedPicks.filter(pick => pick.isActive).length;
  const customPicksCount = normalizedPicks.filter(pick => pick.isCustom && pick.isActive).length;
  const productPicksCount = normalizedPicks.filter(pick => !pick.isCustom && pick.isActive).length;

  const currentPick = normalizedPicks.find(p => p.position === currentPosition);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Spotlight Picks Management</h1>
          <p className="text-gray-600 mt-2">
            Manage the 4 featured products that appear in the &quot;Spotlight Picks&quot; section on the homepage
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={refreshPicks}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" />
              View Live
            </a>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{activePicksCount}</div>
            <p className="text-sm text-gray-600">out of 4 positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Product-Based</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{productPicksCount}</div>
            <p className="text-sm text-gray-600">using existing products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Custom Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{customPicksCount}</div>
            <p className="text-sm text-gray-600">with custom content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {Math.round((activePicksCount / 4) * 100)}%
            </div>
            <p className="text-sm text-gray-600">of positions filled</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {activePicksCount === 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            No spotlight picks are currently active. Add some picks to showcase your featured products on the homepage.
          </AlertDescription>
        </Alert>
      )}

      {activePicksCount === 4 && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            All spotlight pick positions are filled! Your homepage is showcasing 4 featured items.
          </AlertDescription>
        </Alert>
      )}

      {/* Spotlight Picks Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Spotlight Pick Positions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {normalizedPicks.map((pick) => (
            <SpotlightPickCard
              key={pick.position}
              pick={pick}
              onEdit={() => handleEditPick(pick.position)}
              onClear={() => handleClearPick(pick.position)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Plus className="h-5 w-5" />
            How to Use Spotlight Picks
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Product-Based:</strong> Select an existing product to automatically use its title, description, image, and price</li>
            <li>• <strong>Custom Content:</strong> Create completely custom spotlight picks with your own images and content</li>
            <li>• <strong>Mix & Match:</strong> You can combine both approaches - some picks from products, others completely custom</li>
            <li>• <strong>Flexible Positioning:</strong> Any position can be left empty if you want fewer than 4 picks</li>
            <li>• <strong>Live Updates:</strong> Changes are reflected immediately on your homepage</li>
          </ul>
        </CardContent>
      </Card>

      {/* Modal */}
      <SpotlightPickModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePick}
        currentPick={currentPick}
        position={currentPosition}
        categories={categories}
      />
    </div>
  );
} 