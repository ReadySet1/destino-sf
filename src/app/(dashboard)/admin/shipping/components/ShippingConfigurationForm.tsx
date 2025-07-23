'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Save } from 'lucide-react';
import { type ShippingWeightConfig } from '@/lib/shippingUtils';

interface ShippingConfigurationFormProps {
  configurations: ShippingWeightConfig[];
}

// Schema for form validation
const configurationSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  baseWeightLb: z
    .number()
    .min(0.1, 'Base weight must be at least 0.1 lbs')
    .max(50, 'Base weight cannot exceed 50 lbs'),
  weightPerUnitLb: z
    .number()
    .min(0, 'Per-unit weight cannot be negative')
    .max(50, 'Per-unit weight cannot exceed 50 lbs'),
  isActive: z.boolean(),
  applicableForNationwideOnly: z.boolean(),
});

const formSchema = z.object({
  configurations: z.array(configurationSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function ShippingConfigurationForm({
  configurations,
}: ShippingConfigurationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      configurations: configurations,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'configurations',
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/shipping-configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update shipping configuration');
      }

      toast.success('Shipping configuration updated successfully');

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating shipping configuration:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update shipping configuration'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewConfiguration = () => {
    append({
      productName: '',
      baseWeightLb: 0.5,
      weightPerUnitLb: 0.4,
      isActive: true,
      applicableForNationwideOnly: true,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {form.watch(`configurations.${index}.productName`) ||
                    `Configuration ${index + 1}`}
                </CardTitle>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`configurations.${index}.productName`}>Product Name/Type</Label>
                  <Input
                    {...form.register(`configurations.${index}.productName`)}
                    placeholder="e.g., alfajores, empanadas"
                    className="mt-1"
                  />
                  {form.formState.errors.configurations?.[index]?.productName && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.configurations[index]?.productName?.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor={`configurations.${index}.baseWeightLb`}>Base Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    {...form.register(`configurations.${index}.baseWeightLb`, {
                      valueAsNumber: true,
                    })}
                    className="mt-1"
                  />
                  {form.formState.errors.configurations?.[index]?.baseWeightLb && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.configurations[index]?.baseWeightLb?.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Weight of the first unit including packaging
                  </p>
                </div>

                <div>
                  <Label htmlFor={`configurations.${index}.weightPerUnitLb`}>
                    Per-Unit Weight (lbs)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    {...form.register(`configurations.${index}.weightPerUnitLb`, {
                      valueAsNumber: true,
                    })}
                    className="mt-1"
                  />
                  {form.formState.errors.configurations?.[index]?.weightPerUnitLb && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.configurations[index]?.weightPerUnitLb?.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Additional weight for each extra unit
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      {...form.register(`configurations.${index}.isActive`)}
                      checked={form.watch(`configurations.${index}.isActive`)}
                      onCheckedChange={checked =>
                        form.setValue(`configurations.${index}.isActive`, checked)
                      }
                    />
                    <Label htmlFor={`configurations.${index}.isActive`}>Active</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      {...form.register(`configurations.${index}.applicableForNationwideOnly`)}
                      checked={form.watch(`configurations.${index}.applicableForNationwideOnly`)}
                      onCheckedChange={checked =>
                        form.setValue(
                          `configurations.${index}.applicableForNationwideOnly`,
                          checked
                        )
                      }
                    />
                    <Label htmlFor={`configurations.${index}.applicableForNationwideOnly`}>
                      Nationwide Shipping Only
                    </Label>
                  </div>
                </div>
              </div>

              {/* Weight Calculation Preview */}
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Weight Calculation Preview:
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  {(() => {
                    const baseWeight = form.watch(`configurations.${index}.baseWeightLb`) || 0;
                    const perUnitWeight =
                      form.watch(`configurations.${index}.weightPerUnitLb`) || 0;
                    return (
                      <>
                        <p>• 1 unit: {baseWeight.toFixed(1)} lbs</p>
                        <p>• 3 units: {(baseWeight + 2 * perUnitWeight).toFixed(1)} lbs</p>
                        <p>• 5 units: {(baseWeight + 4 * perUnitWeight).toFixed(1)} lbs</p>
                        <p>• 10 units: {(baseWeight + 9 * perUnitWeight).toFixed(1)} lbs</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={addNewConfiguration}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Configuration
        </Button>

        <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
          {isSubmitting ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
