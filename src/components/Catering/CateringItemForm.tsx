'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CateringItem, CateringItemCategory } from '@/types/catering';
import { createCateringItem, updateCateringItem } from '@/actions/catering';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Upload, Eye } from 'lucide-react';
import Image from 'next/image';

// Enhanced form schema with better validation
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Item name must be at least 3 characters.',
  }).max(100, {
    message: 'Item name must be less than 100 characters.',
  }),
  description: z.string().optional().refine((val) => {
    if (val && val.length > 500) {
      return false;
    }
    return true;
  }, {
    message: 'Description must be less than 500 characters.',
  }),
  price: z.coerce.number().min(0.01, {
    message: 'Price must be greater than $0.00.',
  }).max(10000, {
    message: 'Price cannot exceed $10,000.',
  }),
  category: z.nativeEnum(CateringItemCategory, {
    message: 'Please select a valid category.',
  }),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  servingSize: z.string().optional(),
  imageUrl: z.string().optional().refine((val) => {
    if (!val) return true;
    // Allow relative paths and full URLs
    return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
  }, {
    message: 'Image URL must be a valid path (starting with /) or full URL (starting with http:// or https://)',
  }),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CateringItemFormProps {
  item?: CateringItem;
  isEditing?: boolean;
}

export default function CateringItemForm({ item, isEditing = false }: CateringItemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      category: item?.category || CateringItemCategory.ENTREE,
      isVegetarian: item?.isVegetarian || false,
      isVegan: item?.isVegan || false,
      isGlutenFree: item?.isGlutenFree || false,
      servingSize: item?.servingSize || '',
      imageUrl: item?.imageUrl || '',
      isActive: item?.isActive ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && item) {
        // Update existing item
        const result = await updateCateringItem(item.id, data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to update item:', result.error);
          // TODO: Show error toast
        }
      } else {
        // Create new item
        const result = await createCateringItem(data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to create item:', result.error);
          // TODO: Show error toast
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUrlChange = (value: string) => {
    setImagePreview(value || null);
  };

  // Helper to determine if vegan checkbox should be disabled when vegetarian is not checked
  const isVegetarian = form.watch('isVegetarian');

  return (
    <div className="space-y-6">
      {/* Local Data Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Local Catering Item Management</strong>
          <br />
          This form manages items stored locally in your database. These items are separate from Square-synced products and will appear on your customer-facing catering menu.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Tray of Chicken Empanadas" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The name that will appear on the catering menu
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the item, ingredients, and any special notes..."
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed description that customers will see
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pricing and Category */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing & Category</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          className="pl-8"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Price in USD
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(CateringItemCategory).map((category) => (
                          <SelectItem key={category} value={category}>
                            {formatCategoryName(category)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines which tab this item appears under
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="servingSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serving Size</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., 25 Pieces, 6 Ounces, Serves 10-12" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Help customers understand the quantity (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Dietary Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dietary Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="isVegetarian"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Vegetarian</FormLabel>
                      <FormDescription>
                        Contains no meat or fish
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isVegan"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isVegetarian}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={!isVegetarian ? 'text-gray-400' : ''}>
                        Vegan
                      </FormLabel>
                      <FormDescription>
                        {!isVegetarian ? 'Must be vegetarian first' : 'Contains no animal products'}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isGlutenFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Gluten-Free</FormLabel>
                      <FormDescription>
                        Contains no gluten
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Image</h3>
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input 
                        placeholder="/images/catering/item-name.jpg or https://example.com/image.jpg" 
                        {...field} 
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e);
                          handleImageUrlChange(e.target.value);
                        }}
                      />
                      
                      {/* Image Preview */}
                      {imagePreview && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">Preview:</span>
                          </div>
                          <div className="relative w-full max-w-md h-48 border rounded-lg overflow-hidden">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover"
                              onError={() => setImagePreview(null)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Provide a URL to an image of this item (optional). Use full URLs (https://...) for external images or paths (/images/catering/...) for images in your public directory. Recommended size: 800x600px or larger.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status</h3>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      When checked, this item will be visible and available for ordering on the catering menu
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/catering')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Item' : 'Create Item')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Helper function to format category names for display
function formatCategoryName(category: CateringItemCategory): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
} 