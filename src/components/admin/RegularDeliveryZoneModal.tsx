'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Clock, MapPin, Save, X } from 'lucide-react';
import PostalCodeInput from '@/components/admin/PostalCodeInput';

// Validation schema for regular delivery zones
const regularDeliveryZoneSchema = z.object({
  zone: z.string().min(1, 'Zone identifier is required'),
  name: z.string().min(1, 'Zone name is required'),
  description: z.string().optional(),
  minimumOrderForFree: z.number().min(0, 'Minimum cannot be negative'),
  deliveryFee: z.number().min(0, 'Delivery fee cannot be negative'),
  estimatedDeliveryTime: z.string().optional(),
  isActive: z.boolean(),
  postalCodes: z.string(),
  cities: z.string(),
  displayOrder: z.number().int(),
});

type RegularDeliveryZoneFormData = z.infer<typeof regularDeliveryZoneSchema>;

interface RegularDeliveryZone {
  id: string;
  zone: string;
  name: string;
  description?: string | null;
  minimumOrderForFree: number;
  deliveryFee: number;
  estimatedDeliveryTime?: string | null;
  isActive: boolean;
  postalCodes: string[];
  cities: string[];
  displayOrder: number;
}

interface RegularDeliveryZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: RegularDeliveryZone | null;
  onSuccess: () => void;
  totalZones: number;
}

export default function RegularDeliveryZoneModal({
  open,
  onOpenChange,
  zone,
  onSuccess,
  totalZones,
}: RegularDeliveryZoneModalProps) {
  const isEditMode = !!zone;

  const form = useForm<RegularDeliveryZoneFormData>({
    resolver: zodResolver(regularDeliveryZoneSchema),
    defaultValues: {
      zone: '',
      name: '',
      description: '',
      minimumOrderForFree: 75,
      deliveryFee: 25,
      estimatedDeliveryTime: '30-60 minutes',
      isActive: true,
      postalCodes: '',
      cities: '',
      displayOrder: totalZones,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const isActive = watch('isActive');

  // Reset form when zone changes or modal opens/closes
  useEffect(() => {
    if (open) {
      if (zone) {
        // Edit mode - populate with existing data
        reset({
          zone: zone.zone,
          name: zone.name,
          description: zone.description || '',
          minimumOrderForFree: zone.minimumOrderForFree,
          deliveryFee: zone.deliveryFee,
          estimatedDeliveryTime: zone.estimatedDeliveryTime || '',
          isActive: zone.isActive,
          postalCodes: zone.postalCodes.join(', '),
          cities: zone.cities.join(', '),
          displayOrder: zone.displayOrder,
        });
      } else {
        // New zone mode - reset to defaults
        reset({
          zone: '',
          name: '',
          description: '',
          minimumOrderForFree: 75,
          deliveryFee: 25,
          estimatedDeliveryTime: '30-60 minutes',
          isActive: true,
          postalCodes: '',
          cities: '',
          displayOrder: totalZones,
        });
      }
    }
  }, [open, zone, reset, totalZones]);

  const onSubmit = async (data: RegularDeliveryZoneFormData) => {
    try {
      const zoneData = {
        ...data,
        id: zone?.id,
        postalCodes: data.postalCodes
          .split(',')
          .map(code => code.trim())
          .filter(code => code.length > 0),
        cities: data.cities
          .split(',')
          .map(city => city.trim())
          .filter(city => city.length > 0),
      };

      const response = await fetch('/api/admin/regular-delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneData),
      });

      if (!response.ok) {
        throw new Error('Failed to save regular delivery zone');
      }

      const result = await response.json();
      toast.success(result.message || 'Regular delivery zone saved successfully');

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving regular delivery zone:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save regular delivery zone'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-600" />
            {isEditMode ? 'Edit Regular Zone' : 'Add New Regular Zone'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the delivery settings for this regular product zone'
              : 'Configure delivery fees for regular products in a new delivery area'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Zone Identifier and Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone">
                  Zone Identifier <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zone"
                  {...register('zone')}
                  placeholder="e.g., sf_nearby"
                  disabled={isEditMode}
                />
                {errors.zone && <p className="text-sm text-red-600">{errors.zone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Zone Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., San Francisco Nearby"
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Brief description of the delivery zone"
                rows={2}
              />
            </div>

            {/* Financial Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryFee" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  Delivery Fee ($)
                </Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  step="0.01"
                  {...register('deliveryFee', { valueAsNumber: true })}
                />
                {errors.deliveryFee && (
                  <p className="text-sm text-red-600">{errors.deliveryFee.message}</p>
                )}
                <p className="text-xs text-gray-500">Fixed delivery charge to this zone</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumOrderForFree" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Free Delivery Over ($)
                </Label>
                <Input
                  id="minimumOrderForFree"
                  type="number"
                  step="0.01"
                  {...register('minimumOrderForFree', { valueAsNumber: true })}
                />
                {errors.minimumOrderForFree && (
                  <p className="text-sm text-red-600">{errors.minimumOrderForFree.message}</p>
                )}
                <p className="text-xs text-gray-500">0 = no free delivery</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDeliveryTime" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Estimated Time
                </Label>
                <Input
                  id="estimatedDeliveryTime"
                  {...register('estimatedDeliveryTime')}
                  placeholder="e.g., 30-60 minutes"
                />
                <p className="text-xs text-gray-500">Typical delivery time</p>
              </div>
            </div>

            {/* Coverage Areas */}
            <div className="space-y-2">
              <Label htmlFor="cities">Cities (comma-separated)</Label>
              <Input
                id="cities"
                {...register('cities')}
                placeholder="San Francisco, Daly City, South San Francisco"
              />
              <p className="text-xs text-gray-500">
                Cities included in this delivery zone, separated by commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCodes">Postal Codes</Label>
              <PostalCodeInput
                value={watch('postalCodes')}
                onChange={value => setValue('postalCodes', value)}
                placeholder="Type postal code and press Enter"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-3 rounded-lg border p-4 bg-gray-50">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={checked => setValue('isActive', checked)}
              />
              <div className="flex-1">
                <Label htmlFor="isActive" className="cursor-pointer font-medium">
                  Zone is active
                </Label>
                <p className="text-sm text-gray-500">
                  When enabled, customers can select this zone during checkout
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Zone' : 'Create Zone'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
