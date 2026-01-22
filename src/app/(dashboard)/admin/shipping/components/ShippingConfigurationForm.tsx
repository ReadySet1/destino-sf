'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2, Plus, Save, Package, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type ShippingWeightConfig, type ShippingGlobalConfigData } from '@/lib/shippingUtils';
import { type BoxConfig } from '@/lib/shipping/box-selection';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormField } from '@/components/ui/form/FormField';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormCheckbox } from '@/components/ui/form/FormCheckbox';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

interface ShippingConfigurationFormProps {
  configurations: ShippingWeightConfig[];
  globalConfig?: ShippingGlobalConfigData;
  boxConfigs?: BoxConfig[];
}

// Schema for per-product configuration
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

// Schema for global configuration
const globalConfigSchema = z.object({
  packagingWeightLb: z
    .number()
    .min(0, 'Packaging weight cannot be negative')
    .max(20, 'Packaging weight cannot exceed 20 lbs'),
  minimumTotalWeightLb: z
    .number()
    .min(0.1, 'Minimum total weight must be at least 0.1 lbs')
    .max(10, 'Minimum total weight cannot exceed 10 lbs'),
  isActive: z.boolean(),
});

// Schema for box configuration
const boxConfigSchema = z.object({
  boxSize: z.string().min(1, 'Box size is required'),
  template: z.string().min(1, 'Template is required'),
  maxWeightLb: z
    .number()
    .min(0.1, 'Max weight must be at least 0.1 lbs')
    .max(70, 'Max weight cannot exceed 70 lbs (USPS limit)'),
  maxItemCount: z.number().min(1, 'Max item count must be at least 1').max(100, 'Max item count cannot exceed 100'),
  isActive: z.boolean(),
  sortOrder: z.number().min(0, 'Sort order cannot be negative'),
});

const formSchema = z.object({
  configurations: z.array(configurationSchema),
  globalConfig: globalConfigSchema,
  boxConfigs: z.array(boxConfigSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

// USPS flat rate box templates
const USPS_TEMPLATES = [
  { value: 'USPS_SmallFlatRateBox', label: 'Small Flat Rate Box' },
  { value: 'USPS_MediumFlatRateBox1', label: 'Medium Flat Rate Box' },
  { value: 'USPS_MediumFlatRateBox2', label: 'Medium Flat Rate Box (Side-Loading)' },
  { value: 'USPS_LargeFlatRateBox', label: 'Large Flat Rate Box' },
  { value: 'USPS_LargeFlatRateBoardGameBox', label: 'Large Flat Rate Board Game Box' },
];

export default function ShippingConfigurationForm({
  configurations,
  globalConfig,
  boxConfigs,
}: ShippingConfigurationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default box configs if none provided
  const defaultBoxConfigs: BoxConfig[] = [
    { boxSize: 'small', template: 'USPS_SmallFlatRateBox', maxWeightLb: 3.0, maxItemCount: 2, isActive: true, sortOrder: 1 },
    { boxSize: 'medium', template: 'USPS_MediumFlatRateBox1', maxWeightLb: 10.0, maxItemCount: 6, isActive: true, sortOrder: 2 },
    { boxSize: 'large', template: 'USPS_LargeFlatRateBox', maxWeightLb: 20.0, maxItemCount: 12, isActive: true, sortOrder: 3 },
  ];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      configurations: configurations,
      globalConfig: globalConfig || {
        packagingWeightLb: 1.5,
        minimumTotalWeightLb: 1.0,
        isActive: true,
      },
      boxConfigs: boxConfigs && boxConfigs.length > 0 ? boxConfigs : defaultBoxConfigs,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'configurations',
  });

  const { fields: boxFields, append: appendBox, remove: removeBox } = useFieldArray({
    control: form.control,
    name: 'boxConfigs',
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

  const addNewBoxConfig = () => {
    const currentBoxes = form.getValues('boxConfigs') || [];
    const nextSortOrder = currentBoxes.length > 0
      ? Math.max(...currentBoxes.map(b => b.sortOrder)) + 1
      : 1;

    appendBox({
      boxSize: '',
      template: 'USPS_MediumFlatRateBox1',
      maxWeightLb: 10.0,
      maxItemCount: 6,
      isActive: true,
      sortOrder: nextSortOrder,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Global Shipping Settings */}
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg text-orange-900">Packaging & Materials Weight</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            This weight is added to every shipment for box, ice packs, padding, and insulation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="globalConfig.packagingWeightLb">Packaging Weight (lbs)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="20"
                {...form.register('globalConfig.packagingWeightLb', {
                  valueAsNumber: true,
                })}
                className="mt-1 bg-white"
              />
              {form.formState.errors.globalConfig?.packagingWeightLb && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.globalConfig.packagingWeightLb.message}
                </p>
              )}
              <p className="text-xs text-orange-700 mt-1">
                Weight for shipping box, ice packs, padding, tape, etc.
              </p>
            </div>

            <div>
              <Label htmlFor="globalConfig.minimumTotalWeightLb">Minimum Total Weight (lbs)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                {...form.register('globalConfig.minimumTotalWeightLb', {
                  valueAsNumber: true,
                })}
                className="mt-1 bg-white"
              />
              {form.formState.errors.globalConfig?.minimumTotalWeightLb && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.globalConfig.minimumTotalWeightLb.message}
                </p>
              )}
              <p className="text-xs text-orange-700 mt-1">
                Shippo minimum weight requirement
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch('globalConfig.isActive')}
              onCheckedChange={checked => form.setValue('globalConfig.isActive', checked)}
            />
            <Label>Active</Label>
          </div>

          {/* Weight Preview */}
          <div className="bg-white p-3 rounded-md border border-orange-200">
            <p className="text-sm font-medium text-orange-900 mb-2">
              Total Weight Example:
            </p>
            <div className="text-xs text-orange-700 space-y-1">
              {(() => {
                const packagingWeight = form.watch('globalConfig.packagingWeightLb') || 0;
                const productWeight = 2.0; // Example product weight
                const total = productWeight + packagingWeight;
                return (
                  <>
                    <p>Product weight: {productWeight.toFixed(1)} lbs</p>
                    <p>+ Packaging weight: {packagingWeight.toFixed(1)} lbs</p>
                    <p className="font-semibold pt-1 border-t border-orange-200">
                      = Total to Shippo: {total.toFixed(1)} lbs
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Product Configurations */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Per-Product Weight Configuration</h3>
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
                    min="0"
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
                    Set to 0 for flat per-unit calculation (recommended)
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
                    Weight per unit (if base=0, total = qty × per-unit)
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
                    // Use flat calculation if baseWeight is 0
                    if (baseWeight === 0) {
                      return (
                        <>
                          <p className="text-green-700 font-medium">Flat per-unit calculation:</p>
                          <p>• 1 unit: {(1 * perUnitWeight).toFixed(1)} lbs</p>
                          <p>• 3 units: {(3 * perUnitWeight).toFixed(1)} lbs</p>
                          <p>• 5 units: {(5 * perUnitWeight).toFixed(1)} lbs</p>
                          <p>• 10 units: {(10 * perUnitWeight).toFixed(1)} lbs</p>
                        </>
                      );
                    }
                    return (
                      <>
                        <p className="text-amber-700">Legacy calculation (base + extra × per-unit):</p>
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

      {/* USPS Flat Rate Box Configuration */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">USPS Flat Rate Box Selection</CardTitle>
          </div>
          <CardDescription className="text-blue-700">
            Configure which USPS flat rate box to use based on weight and item count thresholds.
            Boxes are evaluated in order (smallest to largest).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {boxFields.map((field, index) => (
            <div key={field.id} className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-blue-900 capitalize">
                  {form.watch(`boxConfigs.${index}.boxSize`) || `Box ${index + 1}`}
                </h4>
                {boxFields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBox(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`boxConfigs.${index}.boxSize`}>Box Size Name</Label>
                  <Input
                    {...form.register(`boxConfigs.${index}.boxSize`)}
                    placeholder="e.g., small, medium, large"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`boxConfigs.${index}.template`}>USPS Template</Label>
                  <select
                    {...form.register(`boxConfigs.${index}.template`)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {USPS_TEMPLATES.map(template => (
                      <option key={template.value} value={template.value}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor={`boxConfigs.${index}.sortOrder`}>Sort Order</Label>
                  <Input
                    type="number"
                    min="0"
                    {...form.register(`boxConfigs.${index}.sortOrder`, {
                      valueAsNumber: true,
                    })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`boxConfigs.${index}.maxWeightLb`}>Max Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="70"
                    {...form.register(`boxConfigs.${index}.maxWeightLb`, {
                      valueAsNumber: true,
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-blue-600 mt-1">Max weight for this box size</p>
                </div>

                <div>
                  <Label htmlFor={`boxConfigs.${index}.maxItemCount`}>Max Item Count</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    {...form.register(`boxConfigs.${index}.maxItemCount`, {
                      valueAsNumber: true,
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-blue-600 mt-1">Max items for this box size</p>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={form.watch(`boxConfigs.${index}.isActive`)}
                    onCheckedChange={checked =>
                      form.setValue(`boxConfigs.${index}.isActive`, checked)
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addNewBoxConfig}
            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-4 w-4" />
            Add Box Size
          </Button>

          {/* Box Selection Preview */}
          <div className="bg-white p-3 rounded-md border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">
              Box Selection Logic:
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p>Orders are matched to the smallest box that fits both weight AND item count limits.</p>
              <p>If no box fits, the largest box is used with a warning.</p>
              <p className="mt-2 font-medium">Current thresholds:</p>
              {(form.watch('boxConfigs') || [])
                .filter(b => b.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((box, i) => (
                  <p key={i}>
                    • {box.boxSize}: ≤{box.maxWeightLb}lb AND ≤{box.maxItemCount} items
                  </p>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
