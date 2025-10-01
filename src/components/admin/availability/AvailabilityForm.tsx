'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

  const form = useForm<AvailabilityRule>({
    // Temporarily disable Zod validation - we'll do it server-side
    // resolver: zodResolver(AvailabilityRuleSchema),
    mode: 'onSubmit',
    defaultValues: {
      productId: productId || rule?.productId || '',
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

  const onSubmit = async (data: AvailabilityRule) => {

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
          depositRequired: data.preOrderSettings.depositRequired ?? false
        } : null,
        viewOnlySettings: data.viewOnlySettings ? {
          ...data.viewOnlySettings,
          showPrice: data.viewOnlySettings.showPrice ?? true,
          allowWishlist: data.viewOnlySettings.allowWishlist ?? false,
          notifyWhenAvailable: data.viewOnlySettings.notifyWhenAvailable ?? true
        } : null
      };

      // Validate product ID is selected
      if (!cleanedData.productId) {
        toast.error('Please select a product');
        setIsLoading(false);
        return;
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

      const result = rule?.id
        ? await updateAvailabilityRule(rule.id, cleanedData)
        : await createAvailabilityRule(cleanedData.productId, cleanedData);

      if (result.success && result.data) {
        toast.success(rule ? 'Rule updated successfully' : 'Rule created successfully');
        onSuccess?.(result.data);
      } else {
        // Show detailed error message
        console.error('Form submission failed:', result.error);
        toast.error(result.error || 'Failed to save rule', {
          duration: 6000,
        });
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
    <div className={cn("w-full max-w-6xl space-y-6", className)}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Rule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Selector */}
            {showProductSelector && (
              <div className="space-y-2 pb-4 border-b">
                <Label htmlFor="productId">Product *</Label>
                <Controller
                  name="productId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!rule}
                    >
                      <SelectTrigger className={errors.productId ? 'border-red-500' : ''}>
                        <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              {product.category && (
                                <span className="text-xs text-muted-foreground">
                                  {product.category.name}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.productId && (
                  <p className="text-sm text-red-500">{errors.productId.message}</p>
                )}
                {rule && (
                  <p className="text-xs text-muted-foreground">
                    Product cannot be changed when editing a rule
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
                  <p className="text-sm text-red-500">{errors.name.message}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule & Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedRuleType === RuleType.DATE_RANGE && (
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Date Range Configuration</h4>
                
                {/* Date Selection Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Start Date Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Start Date</Label>
                    <Controller
                      name="startDate"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-11",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => {/* Calendar will be shown inline below */}}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP', { locale: enUS }) : 'Select start date'}
                          </Button>
                          {/* Inline Calendar */}
                          <div className="border rounded-lg p-3 bg-muted/20">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              className="w-full"
                              classNames={{
                                months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
                                month: "space-y-4 w-full flex flex-col",
                                table: "w-full h-full border-collapse space-y-1",
                                head_row: "",
                                row: "w-full mt-2"
                              }}
                            />
                          </div>
                        </div>
                      )}
                    />
                  </div>

                  {/* End Date Section */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">End Date</Label>
                    <Controller
                      name="endDate"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-11",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => {/* Calendar will be shown inline below */}}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP', { locale: enUS }) : 'Select end date'}
                          </Button>
                          {/* Inline Calendar */}
                          <div className="border rounded-lg p-3 bg-muted/20">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                startDate ? date < startDate : false
                              }
                              className="w-full"
                              classNames={{
                                months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
                                month: "space-y-4 w-full flex flex-col",
                                table: "w-full h-full border-collapse space-y-1",
                                head_row: "",
                                row: "w-full mt-2"
                              }}
                            />
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
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
                                  field.onChange(current.filter(d => d !== index));
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {selectedState === AvailabilityState.PRE_ORDER ? 'Pre-Order Settings' : 'View-Only Settings'}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    <Label>Expected Delivery Date</Label>
                    <Controller
                      name="preOrderSettings.expectedDeliveryDate"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-11",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, 'PPP', { locale: enUS }) : 'Select expected delivery date'}
                          </Button>
                          {/* Inline Calendar for Delivery Date */}
                          <div className="border rounded-lg p-3 bg-muted/20">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              className="w-full"
                              classNames={{
                                months: "flex w-full flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 flex-1",
                                month: "space-y-4 w-full flex flex-col",
                                table: "w-full h-full border-collapse space-y-1",
                                head_row: "",
                                row: "w-full mt-2"
                              }}
                            />
                          </div>
                        </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Advanced Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Form Actions Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  size="sm"
                >
                  <Info className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="min-w-[120px]"
                  onClick={(e) => {
                    console.log('=== BUTTON CLICKED ===');
                    console.log('Form errors:', errors);
                    console.log('Detailed errors:', JSON.stringify(errors, null, 2));
                    console.log('Form is valid:', Object.keys(errors).length === 0);
                    console.log('Current form values:', watch());
                    console.log('Seasonal config values:', {
                      startMonth: seasonalStartMonth,
                      startDay: seasonalStartDay,
                      endMonth: seasonalEndMonth,
                      endDay: seasonalEndDay
                    });
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
                      {rule ? 'Update Rule' : 'Create Rule'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview Section */}
            {showPreview && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Rule Preview</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {watch('name') || 'Unnamed rule'}</p>
                  <p><strong>Type:</strong> {watch('ruleType')}</p>
                  <p><strong>State:</strong> {watch('state')}</p>
                  <p><strong>Priority:</strong> {watch('priority')}</p>
                  {startDate && <p><strong>Start:</strong> {format(startDate, 'PPP', { locale: enUS })}</p>}
                  {endDate && <p><strong>End:</strong> {format(endDate, 'PPP', { locale: enUS })}</p>}
                  <p><strong>Enabled:</strong> {watch('enabled') ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
