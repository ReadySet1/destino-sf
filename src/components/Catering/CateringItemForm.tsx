'use client';

import React from 'react';
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
import { CateringItem, CateringItemCategory } from '@/types/catering';
import { createCateringItem, updateCateringItem } from '@/actions/catering';
import { useRouter } from 'next/navigation';

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Item name must be at least 3 characters.',
  }),
  description: z.string().optional(),
  price: z.coerce.number().positive({
    message: 'Price must be a positive number.',
  }),
  category: z.nativeEnum(CateringItemCategory, {
    message: 'Please select a valid category.',
  }),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  servingSize: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface CateringItemFormProps {
  item?: CateringItem;
  isEditing?: boolean;
}

export default function CateringItemForm({ item, isEditing = false }: CateringItemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
        }
      } else {
        // Create new item
        const result = await createCateringItem(data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to create item:', result.error);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter item name" {...field} />
              </FormControl>
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
                  placeholder="Enter item description"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
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
                <Input placeholder="e.g., 6 Ounces" {...field} value={field.value || ''} />
              </FormControl>
              <FormDescription>
                Optional information about the serving size (e.g., 6 Ounces, 25 Pieces)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    This item is suitable for vegetarians
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
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Vegan</FormLabel>
                  <FormDescription>
                    This item is suitable for vegans
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
                    This item is gluten-free
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="Enter image URL" {...field} value={field.value || ''} />
              </FormControl>
              <FormDescription>
                Provide a URL to an image of this item (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  This item is visible and available for ordering
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/catering')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Item' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper function to format category names for display
function formatCategoryName(category: CateringItemCategory): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
} 