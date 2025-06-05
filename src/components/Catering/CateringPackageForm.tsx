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
import { CateringPackage, CateringPackageType } from '@/types/catering';
import { createCateringPackage, updateCateringPackage } from '@/actions/catering';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Eye } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';

// Enhanced form schema with validation
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Package name must be at least 3 characters.',
  }).max(100, {
    message: 'Package name must be less than 100 characters.',
  }),
  description: z.string().optional().refine((val) => {
    if (val && val.length > 1000) {
      return false;
    }
    return true;
  }, {
    message: 'Description must be less than 1000 characters.',
  }),
  minPeople: z.coerce.number().int().min(1, {
    message: 'Minimum people must be at least 1.',
  }).max(1000, {
    message: 'Minimum people cannot exceed 1000.',
  }),
  pricePerPerson: z.coerce.number().min(0.01, {
    message: 'Price per person must be greater than $0.00.',
  }).max(1000, {
    message: 'Price per person cannot exceed $1000.',
  }),
  type: z.nativeEnum(CateringPackageType, {
    message: 'Please select a valid package type.',
  }),
  imageUrl: z.string().optional().refine((val) => {
    if (!val) return true;
    // Allow relative paths and full URLs
    return val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://');
  }, {
    message: 'Image URL must be a valid path (starting with /) or full URL (starting with http:// or https://)',
  }),
  dietaryOptions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  featuredOrder: z.coerce.number().int().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CateringPackageFormProps {
  package?: CateringPackage;
  isEditing?: boolean;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Halal',
  'Kosher',
];

export default function CateringPackageForm({ package: cateringPackage, isEditing = false }: CateringPackageFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [dietaryOptions, setDietaryOptions] = useState<string[]>(
    cateringPackage?.dietaryOptions || []
  );
  const [imagePreview, setImagePreview] = useState<string | null>(cateringPackage?.imageUrl || null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: cateringPackage?.name || '',
      description: cateringPackage?.description || '',
      minPeople: cateringPackage?.minPeople || 2,
      pricePerPerson: cateringPackage?.pricePerPerson || 0,
      type: cateringPackage?.type || CateringPackageType.INDIVIDUAL,
      imageUrl: cateringPackage?.imageUrl || '',
      dietaryOptions: cateringPackage?.dietaryOptions || [],
      isActive: cateringPackage?.isActive ?? true,
      featuredOrder: cateringPackage?.featuredOrder || 0,
    },
  });

  const onSubmit = async (data: FormData) => {
    // Set the form's dietary options to our state
    data.dietaryOptions = dietaryOptions;

    setIsSubmitting(true);
    try {
      if (isEditing && cateringPackage) {
        // Update existing package
        const result = await updateCateringPackage(cateringPackage.id, data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to update package:', result.error);
          // TODO: Show error toast
        }
      } else {
        // Create new package
        const result = await createCateringPackage(data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to create package:', result.error);
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

  const addDietaryOption = () => {
    if (newOption && !dietaryOptions.includes(newOption)) {
      setDietaryOptions([...dietaryOptions, newOption]);
      setNewOption('');
    }
  };

  const removeDietaryOption = (option: string) => {
    setDietaryOptions(dietaryOptions.filter((o) => o !== option));
  };

  const handlePredefinedOption = (option: string) => {
    if (!dietaryOptions.includes(option)) {
      setDietaryOptions([...dietaryOptions, option]);
    } else {
      removeDietaryOption(option);
    }
  };

  const handleImageUrlChange = (value: string) => {
    setImagePreview(value || null);
  };

  return (
    <div className="space-y-6">
      {/* Local Data Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Local Catering Package Management</strong>
          <br />
          This form manages packages stored locally in your database. These packages are separate from Square-synced products and will appear on your customer-facing catering menu.
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
                  <FormLabel>Package Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Appetizer Selection Package" {...field} />
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
                      placeholder="Describe what's included in this package, the experience, and why customers would choose it..."
                      rows={4}
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

          {/* Package Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Package Type</h3>
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Service Style *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value={CateringPackageType.INDIVIDUAL} className="mt-1" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal text-base">
                            Individual Packaging
                          </FormLabel>
                          <FormDescription>
                            Each guest receives their own individually packaged meal. Perfect for corporate meetings and events requiring individual portions.
                          </FormDescription>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value={CateringPackageType.BUFFET} className="mt-1" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal text-base">
                            Buffet Style
                          </FormLabel>
                          <FormDescription>
                            Large format, self-serve setup. Great for casual gatherings and events where guests can serve themselves.
                          </FormDescription>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value={CateringPackageType.FAMILY_STYLE} className="mt-1" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal text-base">
                            Family Style
                          </FormLabel>
                          <FormDescription>
                            Served in shared platters at the table. Creates a more intimate dining experience for smaller groups.
                          </FormDescription>
                        </div>
                      </FormItem>
                      <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <RadioGroupItem value={CateringPackageType.BOXED_LUNCH} className="mt-1" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal text-base">
                            Boxed Lunch
                          </FormLabel>
                          <FormDescription>
                            Individual boxed meals with protein choices and sides. Perfect for business lunches and grab-and-go events.
                          </FormDescription>
                        </div>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing & Requirements</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="pricePerPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Person *</FormLabel>
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
                      Price per person in USD
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minPeople"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum People *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2" {...field} />
                    </FormControl>
                    <FormDescription>
                      Minimum number of people required for this package
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Dietary Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dietary Options</h3>
            
            <FormField
              control={form.control}
              name="dietaryOptions"
              render={() => (
                <FormItem>
                  <FormLabel>Available Dietary Accommodations</FormLabel>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {DIETARY_OPTIONS.map((option) => (
                        <Button
                          key={option}
                          type="button"
                          variant={dietaryOptions.includes(option) ? "default" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => handlePredefinedOption(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Add custom dietary option"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addDietaryOption();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={addDietaryOption}
                        disabled={!newOption}
                        size="sm"
                      >
                        Add
                      </Button>
                    </div>
                    
                    {dietaryOptions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Selected Options:</p>
                        <div className="flex flex-wrap gap-2">
                          {dietaryOptions.map((option) => (
                            <Badge key={option} className="flex items-center gap-1">
                              {option}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-600"
                                onClick={() => removeDietaryOption(option)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormDescription>
                    Select or add dietary options that this package can accommodate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Package Image</h3>
            
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input 
                        placeholder="/images/catering/package-name.jpg or https://example.com/image.jpg" 
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
                    Provide a URL to an image of this package (optional). Use full URLs (https://...) for external images or paths (/images/catering/...) for images in your public directory. Recommended size: 800x600px or larger.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Advanced Options</h3>
            
            <FormField
              control={form.control}
              name="featuredOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured Order</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} value={field.value || 0} />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first on the menu. Set to 0 for not featured.
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
                    <FormLabel>Active Package</FormLabel>
                    <FormDescription>
                      When checked, this package will be visible and available for ordering on the catering menu
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
                : (isEditing ? 'Update Package' : 'Create Package')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 