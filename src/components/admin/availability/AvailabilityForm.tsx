'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DatePickerField, DateRangePickerField } from '@/components/ui/date-picker-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MultiProductSelect } from '@/components/ui/multi-product-select';
import { 
  CalendarIcon, 
  AlertCircle, 
  Info,
  Save,
  X,
  Settings 
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { toast } from 'sonner';
import { 
  AvailabilityRuleSchema,
  type AvailabilityRule,
  AvailabilityState,
  RuleType 
} from '@/types/availability';
import { createAvailabilityRule, updateAvailabilityRule } from '@/actions/availability';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface QuickTemplate {
  name: string;
  ruleType: RuleType;
  state: AvailabilityState;
  priority: number;
  preOrderSettings?: any;
  viewOnlySettings?: any;
}

interface AvailabilityFormProps {
  productId?: string;
  rule?: AvailabilityRule;
  template?: QuickTemplate;
  onSuccess?: (rule: AvailabilityRule) => void;
  onCancel?: () => void;
  className?: string;
  showProductSelector?: boolean;
}

export function AvailabilityForm({
  productId,
  rule,
  template,
  onSuccess,
  onCancel,
  className,
  showProductSelector = false
}: AvailabilityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const form = useForm<any>({
    // Temporarily disable Zod validation - we'll do it server-side
    // resolver: zodResolver(AvailabilityRuleSchema),
    mode: 'onSubmit',
    defaultValues: {
      productId: productId || rule?.productId || '',
      // When editing, pre-populate with the current product; when creating, use provided productId or empty
      productIds: rule?.productId ? [rule.productId] : (productId ? [productId] : []),
      name: rule?.name || template?.name || '',
      enabled: rule?.enabled ?? true,
      priority: rule?.priority ?? template?.priority ?? 0,
      ruleType: rule?.ruleType || template?.ruleType || RuleType.DATE_RANGE,
      state: rule?.state || template?.state || AvailabilityState.AVAILABLE,
      startDate: rule?.startDate ? new Date(rule.startDate) : null,
      endDate: rule?.endDate ? new Date(rule.endDate) : null,
      seasonalConfig: rule?.seasonalConfig ? {
        ...rule.seasonalConfig,
        yearly: rule.seasonalConfig.yearly ?? true,
        timezone: rule.seasonalConfig.timezone || 'America/Los_Angeles'
      } : {
        startMonth: null as any,
        startDay: null as any,
        endMonth: null as any,
        endDay: null as any,
        yearly: true,
        timezone: 'America/Los_Angeles'
      },
      timeRestrictions: rule?.timeRestrictions ? {
        daysOfWeek: rule.timeRestrictions.daysOfWeek || [],
        startTime: rule.timeRestrictions.startTime || '',
        endTime: rule.timeRestrictions.endTime || '',
        timezone: rule.timeRestrictions.timezone || 'America/Los_Angeles'
      } : null,
      preOrderSettings: rule?.preOrderSettings ? {
        ...rule.preOrderSettings,
        depositRequired: rule.preOrderSettings.depositRequired ?? false
      } : template?.preOrderSettings || null,
      viewOnlySettings: rule?.viewOnlySettings || template?.viewOnlySettings || null,
      overrideSquare: rule?.overrideSquare ?? true
    }
  });

  const { watch, setValue, control, handleSubmit, formState: { errors } } = form;
  const selectedRuleType = watch('ruleType');
  const selectedState = watch('state');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const selectedProductId = watch('productId');
  const selectedProductIds = watch('productIds');
  const seasonalStartMonth = watch('seasonalConfig.startMonth');
  const seasonalStartDay = watch('seasonalConfig.startDay');
  const seasonalEndMonth = watch('seasonalConfig.endMonth');
  const seasonalEndDay = watch('seasonalConfig.endDay');

  // Helper function to get max days in a month
  const getMaxDaysInMonth = (month: number | undefined): number => {
    if (!month) return 31;
    // Use 2024 as a leap year to get accurate day counts
    return new Date(2024, month, 0).getDate();
  };

  // Helper function to check if date is valid
  const isValidDate = useCallback((month: number | undefined, day: number | undefined): boolean => {
    if (!month || !day) return true; // Don't validate incomplete dates
    const maxDays = getMaxDaysInMonth(month);
    return day >= 1 && day <= maxDays;
  }, []);

  // Validation state for seasonal dates
  const [seasonalDateErrors, setSeasonalDateErrors] = useState({
    startDate: '',
    endDate: ''
  });

  // Load products for selector
  useEffect(() => {
    if (showProductSelector) {
      loadProducts();
    }
  }, [showProductSelector]);

  // Validate seasonal dates when they change
  useEffect(() => {
    if (selectedRuleType === RuleType.SEASONAL) {
      const errors = { startDate: '', endDate: '' };

      // Validate start date
      if (seasonalStartMonth && seasonalStartDay) {
        if (!isValidDate(seasonalStartMonth, seasonalStartDay)) {
          const maxDays = getMaxDaysInMonth(seasonalStartMonth);
          errors.startDate = `${getMonthName(seasonalStartMonth)} only has ${maxDays} days`;
        }
      }

      // Validate end date
      if (seasonalEndMonth && seasonalEndDay) {
        if (!isValidDate(seasonalEndMonth, seasonalEndDay)) {
          const maxDays = getMaxDaysInMonth(seasonalEndMonth);
          errors.endDate = `${getMonthName(seasonalEndMonth)} only has ${maxDays} days`;
        }
      }

      setSeasonalDateErrors(errors);
    }
  }, [selectedRuleType, seasonalStartMonth, seasonalStartDay, seasonalEndMonth, seasonalEndDay, isValidDate]);

  // Helper to get month name
  const getMonthName = (month: number): string => {
    return new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/products?onlyActive=false&excludeCatering=true');
      if (response.ok) {
        const data = await response.json();
        const productsArray = Array.isArray(data) ? data : data.data || [];
        setProducts(productsArray);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const onSubmit = async (data: any) => {

    try {
      setIsLoading(true);

      // Clean up the data to ensure boolean fields are never null
      const cleanedData = {
        ...data,
        // Only include seasonalConfig if ruleType is seasonal and has valid values
        seasonalConfig: data.ruleType === 'seasonal' && data.seasonalConfig &&
                       data.seasonalConfig.startMonth != null &&
                       data.seasonalConfig.startDay != null &&
                       data.seasonalConfig.endMonth != null &&
                       data.seasonalConfig.endDay != null ? {
          startMonth: Number(data.seasonalConfig.startMonth),
          startDay: Number(data.seasonalConfig.startDay),
          endMonth: Number(data.seasonalConfig.endMonth),
          endDay: Number(data.seasonalConfig.endDay),
          yearly: data.seasonalConfig.yearly ?? true,
          timezone: data.seasonalConfig.timezone || 'America/Los_Angeles'
        } : null,
        preOrderSettings: data.preOrderSettings ? {
          ...data.preOrderSettings,
          message: data.preOrderSettings.message || 'Available for pre-order',
          depositRequired: data.preOrderSettings.depositRequired ?? false
        } : null,
        viewOnlySettings: data.viewOnlySettings ? {
          ...data.viewOnlySettings,
          message: data.viewOnlySettings.message || 'Currently unavailable for purchase',
          showPrice: data.viewOnlySettings.showPrice ?? true,
          allowWishlist: data.viewOnlySettings.allowWishlist ?? false,
          notifyWhenAvailable: data.viewOnlySettings.notifyWhenAvailable ?? true
        } : null
      };

      // Validate product ID(s) are selected
      if (!cleanedData.productIds || cleanedData.productIds.length === 0) {
        toast.error('Please select at least one product');
        setIsLoading(false);
        return;
      }

      // Validate date range for DATE_RANGE rule type
      if (cleanedData.ruleType === 'date_range') {
        if (cleanedData.startDate && cleanedData.endDate) {
          const start = new Date(cleanedData.startDate);
          const end = new Date(cleanedData.endDate);
          if (end < start) {
            toast.error('End date must be after start date');
            setIsLoading(false);
            return;
          }
        }
      }

      // Validate seasonal config if seasonal rule
      if (cleanedData.ruleType === 'seasonal') {
        if (!cleanedData.seasonalConfig) {
          toast.error('Please fill in all seasonal configuration fields');
          setIsLoading(false);
          return;
        }
        const config = cleanedData.seasonalConfig;
        if (!config.startMonth || !config.startDay || !config.endMonth || !config.endDay) {
          toast.error('Please fill in all seasonal configuration fields');
          setIsLoading(false);
          return;
        }

        // Validate date combinations are valid
        if (!isValidDate(config.startMonth, config.startDay)) {
          toast.error(`Invalid start date: ${getMonthName(config.startMonth)} only has ${getMaxDaysInMonth(config.startMonth)} days`);
          setIsLoading(false);
          return;
        }

        if (!isValidDate(config.endMonth, config.endDay)) {
          toast.error(`Invalid end date: ${getMonthName(config.endMonth)} only has ${getMaxDaysInMonth(config.endMonth)} days`);
          setIsLoading(false);
          return;
        }
      }

      const productIds = cleanedData.productIds;
      const successCount: string[] = [];
      const failedCount: Array<{ productId: string; error: string }> = [];

      if (rule?.id) {
        // Editing mode: Update/create rules for all selected products
        const originalProductId = rule.productId;

        for (const productId of productIds) {
          try {
            if (productId === originalProductId) {
              // Update the original rule
              const result = await updateAvailabilityRule(rule.id, {
                ...cleanedData,
                productId
              });

              if (result.success && result.data) {
                successCount.push(productId);
              } else {
                failedCount.push({ productId, error: result.error || 'Update failed' });
              }
            } else {
              // Create new rules for additional products
              const result = await createAvailabilityRule(productId, {
                ...cleanedData,
                productId
              });

              if (result.success && result.data) {
                successCount.push(productId);
              } else {
                failedCount.push({ productId, error: result.error || 'Creation failed' });
              }
            }
          } catch (error) {
            failedCount.push({
              productId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Show summary toast
        if (successCount.length > 0) {
          const wasUpdate = productIds.includes(originalProductId);
          const wasCreate = productIds.some((id: string) => id !== originalProductId);

          if (wasUpdate && wasCreate) {
            toast.success(
              `Rule updated and applied to ${successCount.length} product${successCount.length !== 1 ? 's' : ''}`,
              { duration: 3000 }
            );
          } else if (wasUpdate) {
            toast.success('Rule updated successfully', { duration: 3000 });
          } else {
            toast.success(
              `Rule applied to ${successCount.length} product${successCount.length !== 1 ? 's' : ''}`,
              { duration: 3000 }
            );
          }

          if (onSuccess) {
            onSuccess({} as any);
          }
        }
      } else {
        // Creating mode: Create new rules for all selected products
        for (const productId of productIds) {
          try {
            const result = await createAvailabilityRule(productId, {
              ...cleanedData,
              productId
            });

            if (result.success && result.data) {
              successCount.push(productId);
            } else {
              failedCount.push({ productId, error: result.error || 'Creation failed' });
            }
          } catch (error) {
            failedCount.push({
              productId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Show summary toast
        if (successCount.length > 0) {
          toast.success(
            `Rule created successfully for ${successCount.length} product${successCount.length !== 1 ? 's' : ''}`,
            { duration: 3000 }
          );

          if (onSuccess) {
            onSuccess({} as any);
          }
        }
      }

      // Show errors if any
      if (failedCount.length > 0) {
        toast.error(
          `Failed to process ${failedCount.length} product${failedCount.length !== 1 ? 's' : ''}`,
          { duration: 5000 }
        );
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update form defaults when rule type changes
  useEffect(() => {
    if (selectedRuleType === RuleType.SEASONAL) {
      const currentConfig = watch('seasonalConfig');
      if (!currentConfig) {
        setValue('seasonalConfig', {
          startMonth: 1,
          startDay: 1,
          endMonth: 12,
          endDay: 31,
          yearly: true,
          timezone: 'America/Los_Angeles'
        });
      } else if (currentConfig.yearly === null || currentConfig.yearly === undefined) {
        // Fix null yearly value
        setValue('seasonalConfig', {
          ...currentConfig,
          yearly: true,
          timezone: currentConfig.timezone || 'America/Los_Angeles'
        });
      }
    }

    if (selectedRuleType === RuleType.TIME_BASED) {
      const currentRestrictions = watch('timeRestrictions');
      if (!currentRestrictions || !currentRestrictions.startTime || !currentRestrictions.endTime) {
        setValue('timeRestrictions', {
          daysOfWeek: currentRestrictions?.daysOfWeek || [1, 2, 3, 4, 5], // Monday-Friday
          startTime: currentRestrictions?.startTime || '09:00',
          endTime: currentRestrictions?.endTime || '17:00',
          timezone: currentRestrictions?.timezone || 'America/Los_Angeles'
        });
      }
    }
  }, [selectedRuleType, setValue, watch]);

  // Update state-specific settings when state changes
  useEffect(() => {
    if (selectedState === AvailabilityState.PRE_ORDER) {
      const currentSettings = watch('preOrderSettings');
      if (!currentSettings) {
        setValue('preOrderSettings', {
          message: 'Available for pre-order',
          expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          maxQuantity: null,
          depositRequired: false,
          depositAmount: null
        });
      } else if (currentSettings.depositRequired === null || currentSettings.depositRequired === undefined) {
        // Fix null depositRequired value
        setValue('preOrderSettings', {
          ...currentSettings,
          depositRequired: false
        });
      }
    } else {
      // Clear pre-order settings when not in pre-order state
      setValue('preOrderSettings', null);
    }

    if (selectedState === AvailabilityState.VIEW_ONLY) {
      if (!watch('viewOnlySettings')) {
        setValue('viewOnlySettings', {
          message: 'Currently unavailable for purchase',
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true
        });
      }
    } else if (selectedState !== AvailabilityState.PRE_ORDER) {
      // Clear view-only settings when not in view-only or pre-order state
      setValue('viewOnlySettings', null);
    }
  }, [selectedState, setValue, watch]);

  return (
    <div className={cn("w-full max-w-6xl space-y-6 pb-32", className)}>
      {/* Form Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {rule ? 'Edit Availability Rule' : 'Create New Availability Rule'}
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {rule
                ? 'Update rule settings and apply to multiple products'
                : 'Configure availability settings for one or more products'}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >

        {/* Basic Information Card */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Info className="h-5 w-5 text-indigo-600" />
              Rule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Product Selector */}
            {showProductSelector && (
              <div className="space-y-3 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="productIds" className="text-base font-semibold">
                    Products *
                  </Label>
                  {rule && (
                    <Badge variant="secondary" className="text-xs">
                      Editing Mode
                    </Badge>
                  )}
                </div>

                {/* Always use multi-product selector */}
                <Controller
                  name="productIds"
                  control={control}
                  render={({ field }) => (
                    <MultiProductSelect
                      products={products}
                      selectedIds={field.value || []}
                      onChange={field.onChange}
                      placeholder={loadingProducts ? "Loading products..." : "Select products to apply this rule"}
                      disabled={loadingProducts}
                    />
                  )}
                />

                {errors.productId && (
                  <p className="text-sm text-red-500">{String(errors.productId.message || 'Invalid product selection')}</p>
                )}
                {errors.productIds && (
                  <p className="text-sm text-red-500">{String(errors.productIds.message || 'Invalid product selection')}</p>
                )}

                {rule ? (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">Editing Multiple Products</p>
                        <p>
                          Select additional products to apply this rule configuration to. This will update the rule for all selected products.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Select one or more products to apply this rule to. The same rule configuration will be created for each product.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rule Name</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Holiday Special Availability"
                      className={errors.name ? 'border-red-500' : ''}
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{String(errors.name.message || 'Invalid name')}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      placeholder="0"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      className={errors.priority ? 'border-red-500' : ''}
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority rules override lower priority ones
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type</Label>
                <Controller
                  name="ruleType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={RuleType.DATE_RANGE}>Date Range</SelectItem>
                        <SelectItem value={RuleType.SEASONAL}>Seasonal</SelectItem>
                        <SelectItem value={RuleType.TIME_BASED}>Time Based</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Availability State</Label>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AvailabilityState.AVAILABLE}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Available
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value={AvailabilityState.PRE_ORDER}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Pre-Order
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value={AvailabilityState.VIEW_ONLY}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              View Only
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value={AvailabilityState.HIDDEN}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                              Hidden
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value={AvailabilityState.COMING_SOON}>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              Coming Soon
                            </Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule & Calendar Card */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <CalendarIcon className="h-5 w-5 text-indigo-600" />
              Schedule & Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {selectedRuleType === RuleType.DATE_RANGE && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="font-medium text-base">Date Range Configuration</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the start and end dates for this availability rule
                  </p>
                </div>

                {/* Date Range Picker */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Start Date Section */}
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium">
                      Start Date
                    </Label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <DatePickerField
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Select start date"
                          ariaLabel="Rule start date"
                        />
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      When this rule becomes active
                    </p>
                  </div>

                  {/* End Date Section */}
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-medium">
                      End Date (Optional)
                    </Label>
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <DatePickerField
                          value={field.value}
                          onSelect={field.onChange}
                          placeholder="Select end date"
                          minDate={startDate || undefined}
                          ariaLabel="Rule end date"
                        />
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no end date
                    </p>
                  </div>
                </div>

                {/* Date Range Validation Feedback */}
                {startDate && endDate && endDate < startDate && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 mt-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">
                        End date must be after start date
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedRuleType === RuleType.SEASONAL && (
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Seasonal Configuration</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Start Month *</Label>
                    <Controller
                      name="seasonalConfig.startMonth"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger className={!field.value ? 'border-amber-300 bg-amber-50' : ''}>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {!watch('seasonalConfig.startMonth') && (
                      <p className="text-xs text-amber-600">Required for seasonal rules</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Start Day *</Label>
                    <Controller
                      name="seasonalConfig.startDay"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="1"
                          max={getMaxDaysInMonth(seasonalStartMonth)}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className={seasonalDateErrors.startDate ? 'border-red-500 bg-red-50' : !field.value ? 'border-amber-300 bg-amber-50' : ''}
                        />
                      )}
                    />
                    {seasonalDateErrors.startDate ? (
                      <p className="text-xs text-red-600">{seasonalDateErrors.startDate}</p>
                    ) : !watch('seasonalConfig.startDay') ? (
                      <p className="text-xs text-amber-600">Required for seasonal rules</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Max: {getMaxDaysInMonth(seasonalStartMonth)} days
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>End Month *</Label>
                    <Controller
                      name="seasonalConfig.endMonth"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger className={!field.value ? 'border-amber-300 bg-amber-50' : ''}>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {!watch('seasonalConfig.endMonth') && (
                      <p className="text-xs text-amber-600">Required for seasonal rules</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>End Day *</Label>
                    <Controller
                      name="seasonalConfig.endDay"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="1"
                          max={getMaxDaysInMonth(seasonalEndMonth)}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className={seasonalDateErrors.endDate ? 'border-red-500 bg-red-50' : !field.value ? 'border-amber-300 bg-amber-50' : ''}
                        />
                      )}
                    />
                    {seasonalDateErrors.endDate ? (
                      <p className="text-xs text-red-600">{seasonalDateErrors.endDate}</p>
                    ) : !watch('seasonalConfig.endDay') ? (
                      <p className="text-xs text-amber-600">Required for seasonal rules</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Max: {getMaxDaysInMonth(seasonalEndMonth)} days
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name="seasonalConfig.yearly"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value ?? true}
                        onCheckedChange={(checked) => field.onChange(checked)}
                      />
                    )}
                  />
                  <Label>Repeat yearly</Label>
                </div>
              </div>
            )}

            {selectedRuleType === RuleType.TIME_BASED && (
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Time Restrictions</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Controller
                      name="timeRestrictions.startTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          className="w-full"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Controller
                      name="timeRestrictions.endTime"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="time"
                          className="w-full"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <Controller
                        key={day}
                        name="timeRestrictions.daysOfWeek"
                        control={control}
                        render={({ field }) => {
                          const isSelected = field.value?.includes(index);
                          return (
                            <Button
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                const current = field.value || [];
                                if (isSelected) {
                                  field.onChange(current.filter((d: number) => d !== index));
                                } else {
                                  field.onChange([...current, index].sort());
                                }
                              }}
                            >
                              {day}
                            </Button>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* State-specific Settings Card */}
        {(selectedState === AvailabilityState.PRE_ORDER || selectedState === AvailabilityState.VIEW_ONLY) && (
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Settings className="h-5 w-5 text-indigo-600" />
                {selectedState === AvailabilityState.PRE_ORDER ? 'Pre-Order Settings' : 'View-Only Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {selectedState === AvailabilityState.PRE_ORDER && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer Message</Label>
                    <Controller
                      name="preOrderSettings.message"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="e.g., Available for pre-order. Expected delivery in 2 weeks."
                          rows={2}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Controller
                      name="preOrderSettings.expectedDeliveryDate"
                      control={control}
                      render={({ field }) => (
                        <>
                          <DatePickerField
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Select expected delivery date"
                            disablePastDates
                            ariaLabel="Expected delivery date"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            When customers can expect to receive their pre-order
                          </p>
                        </>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Quantity (Optional)</Label>
                      <Controller
                        name="preOrderSettings.maxQuantity"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            placeholder="No limit"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Deposit Amount (Optional)</Label>
                      <Controller
                        name="preOrderSettings.depositAmount"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="preOrderSettings.depositRequired"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => field.onChange(checked)}
                        />
                      )}
                    />
                    <Label>Require deposit</Label>
                  </div>
                </div>
              )}

              {selectedState === AvailabilityState.VIEW_ONLY && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer Message</Label>
                    <Controller
                      name="viewOnlySettings.message"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="e.g., Currently unavailable for purchase. Check back soon!"
                          rows={2}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Controller
                        name="viewOnlySettings.showPrice"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label>Show price</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="viewOnlySettings.allowWishlist"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label>Allow wishlist</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Controller
                        name="viewOnlySettings.notifyWhenAvailable"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label>Notify when available</Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Advanced Settings Card */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Settings className="h-5 w-5 text-indigo-600" />
              Advanced Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center space-x-2">
              <Controller
                name="enabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>Rule enabled</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="overrideSquare"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>Override Square settings</Label>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Priority Rules</p>
                  <p className="mt-1">
                    Rules with higher priority numbers will override lower priority rules when conflicts occur.
                    Consider the interaction with other rules for this product.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sticky Action Bar */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Preview Toggle */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
                size="sm"
                className="text-gray-600 hover:text-gray-900"
              >
                <Info className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="min-w-[100px]"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[140px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  onClick={(e) => {
                    console.log('=== BUTTON CLICKED ===');
                    console.log('Form errors:', errors);
                    console.log('Form is valid:', Object.keys(errors).length === 0);
                    console.log('Current form values:', watch());
                  }}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {rule ? 'Save Changes' : 'Create Rule'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm mb-3 text-gray-900">Rule Preview</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium text-gray-900">{watch('name') || 'Unnamed rule'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium text-gray-900">{watch('ruleType')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">State:</span>
                    <p className="font-medium text-gray-900">{watch('state')}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <p className="font-medium text-gray-900">{watch('priority')}</p>
                  </div>
                  {selectedProductIds && selectedProductIds.length > 0 && (
                    <div>
                      <span className="text-gray-600">Products:</span>
                      <p className="font-medium text-gray-900">{selectedProductIds.length} selected</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className="font-medium text-gray-900">{watch('enabled') ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  {startDate && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Start:</span>
                      <p className="font-medium text-gray-900">{format(startDate, 'PPP', { locale: enUS })}</p>
                    </div>
                  )}
                  {endDate && (
                    <div className="col-span-2">
                      <span className="text-gray-600">End:</span>
                      <p className="font-medium text-gray-900">{format(endDate, 'PPP', { locale: enUS })}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
