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
import { CateringPackage, CateringPackageType } from '@/types/catering';
import { createCateringPackage, updateCateringPackage } from '@/actions/catering';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(3, {
    message: 'Package name must be at least 3 characters.',
  }),
  description: z.string().optional(),
  minPeople: z.coerce.number().int().positive({
    message: 'Minimum people must be a positive number.',
  }),
  pricePerPerson: z.coerce.number().positive({
    message: 'Price per person must be a positive number.',
  }),
  type: z.nativeEnum(CateringPackageType, {
    message: 'Please select a valid package type.',
  }),
  imageUrl: z.string().optional(),
  dietaryOptions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  featuredOrder: z.coerce.number().int().optional(),
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
        }
      } else {
        // Create new package
        const result = await createCateringPackage(data);
        if (result.success) {
          router.push('/admin/catering');
          router.refresh();
        } else {
          console.error('Failed to create package:', result.error);
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
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
                <Input placeholder="Enter package name" {...field} />
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
                  placeholder="Enter package description"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Package Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={CateringPackageType.INDIVIDUAL} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Individual (separately packaged meals)
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={CateringPackageType.BUFFET} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Buffet (large format, self-serve)
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={CateringPackageType.FAMILY_STYLE} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Family Style (served in shared platters at the table)
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="pricePerPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Per Person</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minPeople"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum People</FormLabel>
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

        <FormField
          control={form.control}
          name="dietaryOptions"
          render={() => (
            <FormItem>
              <FormLabel>Dietary Options</FormLabel>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((option) => (
                    <Badge
                      key={option}
                      variant={dietaryOptions.includes(option) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handlePredefinedOption(option)}
                    >
                      {option}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add custom dietary option"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addDietaryOption}
                    disabled={!newOption}
                  >
                    Add
                  </Button>
                </div>
                
                {dietaryOptions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">Selected Options:</p>
                    <div className="flex flex-wrap gap-2">
                      {dietaryOptions.map((option) => (
                        <Badge key={option} className="flex items-center gap-1">
                          {option}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeDietaryOption(option)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Provide a URL to an image of this package (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                Lower numbers appear first. Set to 0 for not featured.
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
                  This package is visible and available for ordering
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Package' : 'Create Package'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 