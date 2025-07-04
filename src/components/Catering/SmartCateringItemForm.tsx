'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, AlertTriangle, Square, Database, Image as ImageIcon } from 'lucide-react';
import { 
  type EnhancedCateringItem, 
  type ItemEditCapabilities,
  CateringItemCategory,
  ItemSource
} from '@/types/catering';
import { 
  getEnhancedCateringItem, 
  getItemEditCapabilities,
  updateCateringItemWithOverrides 
} from '@/actions/catering-overrides';
import { toast } from 'sonner';
import Image from 'next/image';

interface SmartCateringItemFormProps {
  itemId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SmartCateringItemForm: React.FC<SmartCateringItemFormProps> = ({
  itemId,
  onSuccess,
  onCancel
}) => {
  const [item, setItem] = useState<EnhancedCateringItem | null>(null);
  const [capabilities, setCapabilities] = useState<ItemEditCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    localDescription: '',
    price: 0,
    category: CateringItemCategory.STARTER,
    localIsVegetarian: false,
    localIsVegan: false,
    localIsGlutenFree: false,
    localServingSize: '',
    localImageUrl: '',
    isActive: true
  });

  // Override flags
  const [overrides, setOverrides] = useState({
    overrideDescription: false,
    overrideImage: false,
    overrideDietary: false,
    overrideServingSize: false
  });

  // Load item data
  const loadItemData = useCallback(async () => {
    if (!itemId) return;
    
    try {
      setLoading(true);
      const [itemData, capabilitiesData] = await Promise.all([
        getEnhancedCateringItem(itemId),
        getItemEditCapabilities(itemId)
      ]);

      if (itemData) {
        setItem(itemData);
        setFormData({
          name: itemData.name,
          localDescription: itemData.finalDescription,
          price: itemData.price,
          category: itemData.category,
          localIsVegetarian: itemData.finalIsVegetarian,
          localIsVegan: itemData.finalIsVegan,
          localIsGlutenFree: itemData.finalIsGlutenFree,
          localServingSize: itemData.finalServingSize || '',
          localImageUrl: itemData.finalImageUrl || '',
          isActive: itemData.isActive
        });

        // Set override flags based on existing overrides
        if (itemData.overrides) {
          setOverrides({
            overrideDescription: itemData.overrides.overrideDescription,
            overrideImage: itemData.overrides.overrideImage,
            overrideDietary: itemData.overrides.overrideDietary,
            overrideServingSize: itemData.overrides.overrideServingSize
          });
        }
      }

      setCapabilities(capabilitiesData);
    } catch (error) {
      console.error('Error loading item:', error);
      toast.error('Failed to load item data');
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) {
      loadItemData();
    } else {
      setLoading(false);
    }
  }, [itemId, loadItemData]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !itemId) return;

    setUploading(true);
    toast.loading('Uploading image...', { id: 'upload-image' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemId', itemId);

      const response = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.success && result.url) {
        setFormData(prev => ({ ...prev, localImageUrl: result.url }));
        toast.success('Image uploaded successfully!', { id: 'upload-image' });
      } else {
        toast.error(result.error || 'Upload failed', { id: 'upload-image' });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Upload failed', { id: 'upload-image' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capabilities) return;

    setSaving(true);
    toast.loading('Saving changes...', { id: 'save-item' });

    try {
      const updateData: any = {
        isActive: formData.isActive
      };

      // Handle based on item source
      if (capabilities.source === ItemSource.SQUARE) {
        // Square item - use overrides
        updateData.localDescription = formData.localDescription;
        updateData.localImageUrl = formData.localImageUrl;
        updateData.localIsVegetarian = formData.localIsVegetarian;
        updateData.localIsVegan = formData.localIsVegan;
        updateData.localIsGlutenFree = formData.localIsGlutenFree;
        updateData.localServingSize = formData.localServingSize;
        
        // Set override flags
        updateData.overrideDescription = overrides.overrideDescription;
        updateData.overrideImage = overrides.overrideImage;
        updateData.overrideDietary = overrides.overrideDietary;
        updateData.overrideServingSize = overrides.overrideServingSize;
      } else {
        // Local item - direct updates
        updateData.name = formData.name;
        updateData.price = formData.price;
        updateData.category = formData.category;
        updateData.localDescription = formData.localDescription;
        updateData.localImageUrl = formData.localImageUrl;
        updateData.localIsVegetarian = formData.localIsVegetarian;
        updateData.localIsVegan = formData.localIsVegan;
        updateData.localIsGlutenFree = formData.localIsGlutenFree;
        updateData.localServingSize = formData.localServingSize;
      }

      const result = await updateCateringItemWithOverrides(itemId!, updateData);
      
      if (result.success) {
        toast.success('Item updated successfully!', { id: 'save-item' });
        onSuccess?.();
      } else {
        toast.error(result.error || 'Save failed', { id: 'save-item' });
      }
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Save failed', { id: 'save-item' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading item...</span>
      </div>
    );
  }

  if (!capabilities) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to determine editing capabilities for this item.
        </AlertDescription>
      </Alert>
    );
  }

  const isSquareItem = capabilities.source === ItemSource.SQUARE;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header with item source */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold">
            {itemId ? 'Edit Item' : 'New Item'}
          </h2>
          {isSquareItem ? (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Square className="h-3 w-3" />
              <span>Square Item</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span>Local Item</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Warnings for Square items */}
      {isSquareItem && capabilities.warnings && capabilities.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1">
              {capabilities.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!capabilities.canEditName || saving}
              className={!capabilities.canEditName ? 'bg-gray-50' : ''}
            />
            {!capabilities.canEditName && (
              <p className="text-xs text-gray-500 mt-1">
                Name syncs from Square and cannot be edited
              </p>
            )}
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              disabled={!capabilities.canEditPrice || saving}
              className={!capabilities.canEditPrice ? 'bg-gray-50' : ''}
            />
            {!capabilities.canEditPrice && (
              <p className="text-xs text-gray-500 mt-1">
                Price syncs from Square and cannot be edited
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as CateringItemCategory }))}
              disabled={!capabilities.canEditCategory || saving}
            >
              <SelectTrigger className={!capabilities.canEditCategory ? 'bg-gray-50' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CateringItemCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!capabilities.canEditCategory && (
              <p className="text-xs text-gray-500 mt-1">
                Category syncs from Square and cannot be edited
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              disabled={!capabilities.canEditActive || saving}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Description Override */}
      {capabilities.canEditDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Description
              {isSquareItem && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="override-description" className="text-sm font-normal">
                    Override
                  </Label>
                  <Switch
                    id="override-description"
                    checked={overrides.overrideDescription}
                    onCheckedChange={(checked) => setOverrides(prev => ({ ...prev, overrideDescription: checked }))}
                    disabled={saving}
                  />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.localDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, localDescription: e.target.value }))}
              placeholder="Enter item description..."
              disabled={saving || (isSquareItem && !overrides.overrideDescription)}
              className={isSquareItem && !overrides.overrideDescription ? 'bg-gray-50' : ''}
              rows={3}
            />
            {isSquareItem && !overrides.overrideDescription && (
              <p className="text-xs text-gray-500 mt-1">
                Enable override to customize description locally
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Override */}
      {capabilities.canEditImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Image
              {isSquareItem && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="override-image" className="text-sm font-normal">
                    Override
                  </Label>
                  <Switch
                    id="override-image"
                    checked={overrides.overrideImage}
                    onCheckedChange={(checked) => setOverrides(prev => ({ ...prev, overrideImage: checked }))}
                    disabled={saving}
                  />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Image */}
            {formData.localImageUrl && (
              <div className="relative">
                <Image
                  src={formData.localImageUrl}
                  alt="Item image"
                  width={128}
                  height={128}
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={() => setFormData(prev => ({ ...prev, localImageUrl: '' }))}
                  disabled={saving}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Upload */}
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading || saving || (isSquareItem && !overrides.overrideImage)}
                className={isSquareItem && !overrides.overrideImage ? 'bg-gray-50' : ''}
              />
              {uploading && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </div>
              )}
              {isSquareItem && !overrides.overrideImage && (
                <p className="text-xs text-gray-500 mt-1">
                  Enable override to upload custom image
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dietary Information Override */}
      {capabilities.canEditDietary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Dietary Information
              {isSquareItem && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="override-dietary" className="text-sm font-normal">
                    Override
                  </Label>
                  <Switch
                    id="override-dietary"
                    checked={overrides.overrideDietary}
                    onCheckedChange={(checked) => setOverrides(prev => ({ ...prev, overrideDietary: checked }))}
                    disabled={saving}
                  />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="vegetarian"
                  checked={formData.localIsVegetarian}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, localIsVegetarian: checked }))}
                  disabled={saving || (isSquareItem && !overrides.overrideDietary)}
                />
                <Label htmlFor="vegetarian">Vegetarian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="vegan"
                  checked={formData.localIsVegan}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, localIsVegan: checked }))}
                  disabled={saving || (isSquareItem && !overrides.overrideDietary)}
                />
                <Label htmlFor="vegan">Vegan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="glutenFree"
                  checked={formData.localIsGlutenFree}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, localIsGlutenFree: checked }))}
                  disabled={saving || (isSquareItem && !overrides.overrideDietary)}
                />
                <Label htmlFor="glutenFree">Gluten Free</Label>
              </div>
            </div>
            {isSquareItem && !overrides.overrideDietary && (
              <p className="text-xs text-gray-500">
                Enable override to customize dietary options locally
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Serving Size Override */}
      {capabilities.canEditServingSize && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Serving Size
              {isSquareItem && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="override-serving" className="text-sm font-normal">
                    Override
                  </Label>
                  <Switch
                    id="override-serving"
                    checked={overrides.overrideServingSize}
                    onCheckedChange={(checked) => setOverrides(prev => ({ ...prev, overrideServingSize: checked }))}
                    disabled={saving}
                  />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.localServingSize}
              onChange={(e) => setFormData(prev => ({ ...prev, localServingSize: e.target.value }))}
              placeholder="e.g., Serves 2-3 people"
              disabled={saving || (isSquareItem && !overrides.overrideServingSize)}
              className={isSquareItem && !overrides.overrideServingSize ? 'bg-gray-50' : ''}
            />
            {isSquareItem && !overrides.overrideServingSize && (
              <p className="text-xs text-gray-500 mt-1">
                Enable override to customize serving size locally
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}; 