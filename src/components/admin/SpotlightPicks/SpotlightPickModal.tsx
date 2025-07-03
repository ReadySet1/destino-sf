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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, Package, Image as ImageIcon, AlertCircle, Edit, MousePointer, Sparkles, Info, Eye } from 'lucide-react';
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

  // Robust toggle state calculation
  const getToggleState = (): boolean => {
    if (formData.showNewFeatureModal !== undefined) {
      return formData.showNewFeatureModal;
    }
    return currentPick?.showNewFeatureModal || false;
  };

  // Robust field value calculation
  const getFieldValue = (
    formField: string | null | undefined, 
    currentPickField: string | null | undefined, 
    defaultValue: string = ''
  ): string => {
    if (formField !== undefined && formField !== null) {
      return formField;
    }
    if (currentPickField !== undefined && currentPickField !== null) {
      return currentPickField;
    }
    return defaultValue;
  };

  // Initialize form data when modal opens or currentPick changes
  useEffect(() => {
    if (isOpen && currentPick) {
      const newFormData = {
        position: currentPick.position,
        isCustom: currentPick.isCustom,
        productId: currentPick.productId || undefined,
        customTitle: currentPick.customTitle || undefined,
        customDescription: currentPick.customDescription || undefined,
        customImageUrl: currentPick.customImageUrl || undefined,
        customPrice: currentPick.customPrice || undefined,
        personalizeText: currentPick.personalizeText || undefined,
        customLink: currentPick.customLink || undefined,
        showNewFeatureModal: Boolean(currentPick.showNewFeatureModal),
        newFeatureTitle: currentPick.newFeatureTitle || '',
        newFeatureDescription: currentPick.newFeatureDescription || '',
        newFeatureBadgeText: currentPick.newFeatureBadgeText || '',
        isActive: currentPick.isActive,
      };
      
      setFormData(newFormData);
      
      // Set selected product if it's a product-based pick
      if (!currentPick.isCustom && currentPick.product) {
        setSelectedProduct(currentPick.product);
      } else {
        setSelectedProduct(null);
      }
    } else if (isOpen && !currentPick) {
      // Reset form for new pick
      setFormData({
        position,
        isCustom: false,
        isActive: true,
      });
      setSelectedProduct(null);
    }
  }, [isOpen, currentPick, position]);

  // Watch for formData changes
  useEffect(() => {
    // Additional debug for currentPick.showNewFeatureModal changes
    if (currentPick && isOpen) {
      if (currentPick.showNewFeatureModal !== formData.showNewFeatureModal) {
        setFormData(prev => ({
          ...prev,
          showNewFeatureModal: Boolean(currentPick.showNewFeatureModal),
          newFeatureTitle: currentPick.newFeatureTitle || '',
          newFeatureDescription: currentPick.newFeatureDescription || '',
          newFeatureBadgeText: currentPick.newFeatureBadgeText || '',
        }));
      }
    }
  }, [currentPick?.showNewFeatureModal, currentPick?.newFeatureTitle, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation with better UX feedback
    const errors: string[] = [];
    
    if (formData.isCustom) {
      if (!formData.customTitle?.trim()) {
        errors.push('Custom title is required');
      }
      if (formData.customImageUrl && formData.customImageUrl.trim() !== '') {
        try {
          new URL(formData.customImageUrl);
        } catch {
          errors.push('Please provide a valid image URL or leave empty');
        }
      }
      if (formData.customPrice !== undefined && formData.customPrice !== null && formData.customPrice < 0) {
        errors.push('Price must be 0 or greater');
      }
    } else {
      if (!formData.productId) {
        errors.push('Please select a product');
      }
    }

    if (formData.customLink && formData.customLink.trim() !== '') {
      try {
        new URL(formData.customLink);
      } catch {
        errors.push('Please provide a valid URL for custom link or leave empty');
      }
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'), {
        duration: 5000,
        style: {
          whiteSpace: 'pre-line',
        },
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clean the data before sending
      const cleanedFormData = {
        ...formData,
        customImageUrl: formData.customImageUrl?.trim() || undefined,
        customLink: formData.customLink?.trim() || undefined,
        customTitle: formData.customTitle?.trim() || undefined,
        customDescription: formData.customDescription?.trim() || undefined,
        personalizeText: formData.personalizeText?.trim() === '' ? null : formData.personalizeText?.trim() || null, // Allow empty string to be null
        // Fix: Better cleaning logic for newFeature fields
        newFeatureTitle: formData.newFeatureTitle?.trim() ? formData.newFeatureTitle.trim() : null,
        newFeatureDescription: formData.newFeatureDescription?.trim() ? formData.newFeatureDescription.trim() : null,
        newFeatureBadgeText: formData.newFeatureBadgeText?.trim() ? formData.newFeatureBadgeText.trim() : null,
      };

      await onSave(cleanedFormData);
      // Success toast is handled by the parent SpotlightPicksManager - do NOT add toast here
    } catch (error) {
      console.error('Error saving spotlight pick:', error);
      if (error instanceof Error) {
        toast.error(`Failed to save: ${error.message}`);
      } else {
        toast.error('Failed to save spotlight pick. Please try again.');
      }
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
          {/* Step 1: Content Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">1</span>
                Choose Content Type
              </CardTitle>
              <CardDescription>
                Select whether to use an existing product from your catalog or create custom content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleTypeToggle(false)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    !formData.isCustom
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      !formData.isCustom ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">Use Existing Product</div>
                      <div className="text-sm opacity-75">Select a product from your catalog</div>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleTypeToggle(true)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.isCustom
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.isCustom ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Edit className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">Custom Content</div>
                      <div className="text-sm opacity-75">Create custom content with your own image</div>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Configure Content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">2</span>
                Configure Display Content
              </CardTitle>
              <CardDescription>
                {formData.isCustom 
                  ? "Set up your custom spotlight pick with title, description, and image"
                  : "Select which product to showcase in this spotlight position"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selection */}
              {!formData.isCustom && (
                <div>
                  <Label htmlFor="product">Select Product *</Label>
                  <ProductSelector
                    categories={categories}
                    selectedProduct={selectedProduct}
                    onProductSelect={handleProductSelect}
                  />
                  {!formData.productId && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ Please select a product
                    </p>
                  )}
                </div>
              )}

              {/* Custom Content Fields */}
              {formData.isCustom && (
                <div className="space-y-4">
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
                      className={`mt-1 ${!formData.customTitle?.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                      required
                    />
                    {!formData.customTitle?.trim() && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ Title is required for custom items
                      </p>
                    )}
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
                      className={`mt-1 ${
                        formData.customPrice !== undefined && formData.customPrice !== null && formData.customPrice < 0
                          ? 'border-red-300 focus:border-red-500' : ''
                      }`}
                    />
                    {formData.customPrice !== undefined && formData.customPrice !== null && formData.customPrice < 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        ⚠️ Price must be 0 or greater
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Set the display price for this custom item
                    </p>
                  </div>

                  {/* Custom Image */}
                  <div>
                    <Label>Custom Image</Label>
                    <ImageUploader
                      position={position}
                      currentImageUrl={formData.customImageUrl}
                      onImageUpload={handleImageUpload}
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
                      className={`mt-1 ${
                        formData.customLink && formData.customLink.trim() !== '' && 
                        (() => {
                          try {
                            new URL(formData.customLink);
                            return false;
                          } catch {
                            return true;
                          }
                        })() ? 'border-red-300 focus:border-red-500' : ''
                      }`}
                    />
                    {formData.customLink && formData.customLink.trim() !== '' && 
                      (() => {
                        try {
                          new URL(formData.customLink);
                          return false;
                        } catch {
                          return true;
                        }
                      })() && (
                        <p className="text-sm text-red-600 mt-1">
                          ⚠️ Please provide a valid URL (e.g., https://example.com)
                        </p>
                      )}
                    <p className="text-sm text-gray-500 mt-1">
                      Optional custom link (external URL or internal path). If not provided, will use default product link behavior.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Click Behavior (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">3</span>
                Click Behavior
                <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
              </CardTitle>
              <CardDescription>
                Choose what happens when users click this spotlight pick. By default, it will navigate to the product page or custom link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default Behavior Info */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MousePointer className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">Default Click Behavior</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formData.isCustom 
                        ? (formData.customLink 
                            ? `Navigate to: ${formData.customLink}` 
                            : "No navigation (static display)")
                        : "Navigate to the product&apos;s detail page"
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* New Feature Modal Toggle */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.showNewFeatureModal ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <Label htmlFor="showNewFeatureModal" className="text-base font-medium cursor-pointer">
                        Show New Feature Modal Instead
                      </Label>
                      <p className="text-sm text-gray-600">
                        Override default behavior to show a special feature announcement modal
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="showNewFeatureModal"
                    checked={getToggleState()}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        showNewFeatureModal: checked
                      }));
                    }}
                  />
                </div>

                {/* New Feature Modal Configuration */}
                {getToggleState() && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Info className="w-4 h-4" />
                        <span className="text-sm font-medium">New Feature Modal Active</span>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        When users click this spotlight pick, they&apos;ll see a special modal instead of navigating away.
                      </p>
                    </div>

                    {/* Badge Text */}
                    <div>
                      <Label htmlFor="newFeatureBadgeText">Badge Text</Label>
                      <Input
                        id="newFeatureBadgeText"
                        type="text"
                        placeholder="NEW, FEATURED, BETA, etc."
                        value={getFieldValue(formData.newFeatureBadgeText, currentPick?.newFeatureBadgeText)}
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
                        placeholder="Coming Soon! Our Monthly Subscription service is currently in development."
                        value={getFieldValue(formData.newFeatureTitle, currentPick?.newFeatureTitle)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newFeatureTitle: e.target.value
                        }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Title that appears in the modal (will use the spotlight pick title if not provided)
                      </p>
                    </div>

                    {/* Modal Description */}
                    <div>
                      <Label htmlFor="newFeatureDescription">Modal Description</Label>
                      <Textarea
                        id="newFeatureDescription"
                        placeholder="Stay tuned for delicious monthly deliveries!"
                        value={getFieldValue(formData.newFeatureDescription, currentPick?.newFeatureDescription)}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          newFeatureDescription: e.target.value
                        }))}
                        className="mt-1"
                        rows={3}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Description that appears in the modal body
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 4: Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-700 rounded-full text-sm font-semibold">4</span>
                Activation Status
              </CardTitle>
              <CardDescription>
                Control whether this spotlight pick appears on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    formData.isActive ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <Label htmlFor="isActive" className="text-base font-medium cursor-pointer">
                      Active on Homepage
                    </Label>
                    <p className="text-sm text-gray-600">
                      Show this spotlight pick to visitors on the homepage
                    </p>
                  </div>
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