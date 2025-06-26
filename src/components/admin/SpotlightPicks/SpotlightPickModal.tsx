'use client';

import React, { useState, useEffect } from 'react';
import { SpotlightPickModalProps, SpotlightPickFormData } from '@/types/spotlight';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CardDescription } from '@/components/ui/card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Package, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { ProductSelector } from './ProductSelector';
import { ImageUploader } from './ImageUploader';
import { toast } from 'sonner';

export function SpotlightPickModal({
  isOpen,
  onClose,
  onSave,
  currentPick,
  position,
  categories,
}: SpotlightPickModalProps) {
  const [formData, setFormData] = useState<SpotlightPickFormData>({
    position,
    isCustom: false,
    isActive: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Initialize form data when modal opens or currentPick changes
  useEffect(() => {
    if (isOpen) {
      if (currentPick && currentPick.isActive) {
        setFormData({
          position: currentPick.position,
          isCustom: currentPick.isCustom,
          productId: currentPick.productId || undefined,
          customTitle: currentPick.customTitle || undefined,
          customDescription: currentPick.customDescription || undefined,
          customImageUrl: currentPick.customImageUrl || undefined,
          customPrice: currentPick.customPrice || undefined,
          personalizeText: currentPick.personalizeText || undefined,
          customLink: currentPick.customLink || undefined,
          showNewFeatureModal: currentPick.showNewFeatureModal || false,
          newFeatureTitle: currentPick.newFeatureTitle || undefined,
          newFeatureDescription: currentPick.newFeatureDescription || undefined,
          newFeatureBadgeText: currentPick.newFeatureBadgeText || undefined,
          isActive: currentPick.isActive,
        });
        
        // Set selected product if it's a product-based pick
        if (!currentPick.isCustom && currentPick.product) {
          setSelectedProduct(currentPick.product);
        } else {
          setSelectedProduct(null);
        }
      } else {
        // Reset form for new pick
        setFormData({
          position,
          isCustom: false,
          isActive: true,
        });
        setSelectedProduct(null);
      }
    }
  }, [isOpen, currentPick, position]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.isCustom) {
      if (!formData.customTitle?.trim()) {
        toast.error('Custom title is required');
        return;
      }
    } else {
      if (!formData.productId) {
        toast.error('Please select a product');
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving spotlight pick:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      productId: product.id,
    }));
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      customImageUrl: url,
    }));
  };

  const handleTypeToggle = (isCustom: boolean) => {
    setFormData(prev => ({
      ...prev,
      isCustom,
      // Clear the opposite type's data
      ...(isCustom
        ? { productId: undefined }
        : {
            customTitle: undefined,
            customDescription: undefined,
            customImageUrl: undefined,
            customPrice: undefined,
            personalizeText: undefined,
          }),
    }));
    
    if (isCustom) {
      setSelectedProduct(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Spotlight Pick - Position {position}</DialogTitle>
          <DialogDescription>
            Configure what appears in position {position} of the spotlight picks section
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Content Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    !formData.isCustom
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTypeToggle(false)}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    <div>
                      <h3 className="font-medium">Use Existing Product</h3>
                      <p className="text-sm text-gray-600">
                        Select a product from your catalog
                      </p>
                    </div>
                  </div>
                </div>
                
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.isCustom
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTypeToggle(true)}
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5" />
                    <div>
                      <h3 className="font-medium">Custom Content</h3>
                      <p className="text-sm text-gray-600">
                        Create custom content with your own image
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          {!formData.isCustom && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductSelector
                  categories={categories}
                  selectedProduct={selectedProduct}
                  onProductSelect={handleProductSelect}
                />
                
                {selectedProduct && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Product Preview:</h4>
                    <div className="flex gap-3">
                      {selectedProduct.images?.[0] && (
                        <img
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{selectedProduct.name}</p>
                        <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                        <p className="text-sm font-medium text-green-600">
                          ${typeof selectedProduct.price === 'number' ? selectedProduct.price.toFixed(2) : selectedProduct.price}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custom Content */}
          {formData.isCustom && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Custom Title */}
                <div>
                  <Label htmlFor="customTitle">Title *</Label>
                  <Input
                    id="customTitle"
                    type="text"
                    placeholder="Enter custom title..."
                    value={formData.customTitle || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customTitle: e.target.value
                    }))}
                    className="mt-1"
                    required
                  />
                </div>

                {/* Custom Description */}
                <div>
                  <Label htmlFor="customDescription">Description</Label>
                  <Textarea
                    id="customDescription"
                    placeholder="Enter custom description..."
                    value={formData.customDescription || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customDescription: e.target.value
                    }))}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Personalize Text */}
                <div>
                  <Label htmlFor="personalizeText">Personalize Text</Label>
                  <Input
                    id="personalizeText"
                    type="text"
                    placeholder="Add personalized message (e.g., 'Perfect for your special occasion')"
                    value={formData.personalizeText || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalizeText: e.target.value
                    }))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional personalized message that appears with the spotlight pick
                  </p>
                </div>

                {/* Custom Link */}
                <div>
                  <Label htmlFor="customLink">Custom Link</Label>
                  <Input
                    id="customLink"
                    type="url"
                    placeholder="https://example.com or /products/category/alfajores"
                    value={formData.customLink || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customLink: e.target.value
                    }))}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Optional custom link (external URL or internal path). If not provided, will use default product link behavior.
                  </p>
                </div>

                {/* Custom Price */}
                <div>
                  <Label htmlFor="customPrice">Price ($)</Label>
                  <Input
                    id="customPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.customPrice || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customPrice: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    className="mt-1"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Custom Image</Label>
                  <ImageUploader
                    position={position}
                    currentImageUrl={formData.customImageUrl}
                    onImageUpload={handleImageUpload}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Feature Modal Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Feature Modal</CardTitle>
              <CardDescription>
                Configure this spotlight pick to show a special modal showcasing new features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show New Feature Modal Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showNewFeatureModal" className="text-base font-medium">
                    Show New Feature Modal
                  </Label>
                  <p className="text-sm text-gray-600">
                    When clicked, this item will show a special modal instead of navigating to a product page
                  </p>
                </div>
                <Switch
                  id="showNewFeatureModal"
                  checked={formData.showNewFeatureModal || false}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, showNewFeatureModal: checked }))
                  }
                />
              </div>

              {/* New Feature Modal Fields (shown only when toggle is on) */}
              {formData.showNewFeatureModal && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Badge Text */}
                  <div>
                    <Label htmlFor="newFeatureBadgeText">Badge Text</Label>
                    <Input
                      id="newFeatureBadgeText"
                      type="text"
                      placeholder="NEW, FEATURED, BETA, etc."
                      value={formData.newFeatureBadgeText || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        newFeatureBadgeText: e.target.value
                      }))}
                      className="mt-1"
                    />
                                         <p className="text-sm text-gray-500 mt-1">
                       Text that appears on the badge (defaults to &ldquo;NEW&rdquo; if not provided)
                     </p>
                  </div>

                  {/* Modal Title */}
                  <div>
                    <Label htmlFor="newFeatureTitle">Modal Title</Label>
                    <Input
                      id="newFeatureTitle"
                      type="text"
                      placeholder="Introducing Amazing New Feature!"
                      value={formData.newFeatureTitle || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        newFeatureTitle: e.target.value
                      }))}
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Title that appears in the modal (will use product name if not provided)
                    </p>
                  </div>

                  {/* Modal Description */}
                  <div>
                    <Label htmlFor="newFeatureDescription">Modal Description</Label>
                    <Textarea
                      id="newFeatureDescription"
                      placeholder="Discover exciting new features and improvements..."
                      value={formData.newFeatureDescription || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        newFeatureDescription: e.target.value
                      }))}
                      className="mt-1"
                      rows={3}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Description that appears in the modal
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive" className="text-base font-medium">
                    Active
                  </Label>
                  <p className="text-sm text-gray-600">
                    Show this spotlight pick on the homepage
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <DialogFooter className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Spotlight Pick'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 