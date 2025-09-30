'use client';

import { useState, useEffect } from 'react';
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

interface AvailabilityFormProps {
  productId: string;
  rule?: AvailabilityRule;
  onSuccess?: (rule: AvailabilityRule) => void;
  onCancel?: () => void;
  className?: string;
}

export function AvailabilityForm({
  productId,
  rule,
  onSuccess,
  onCancel,
  className
}: AvailabilityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const form = useForm<AvailabilityRule>({
    resolver: zodResolver(AvailabilityRuleSchema),
    defaultValues: {
      productId,
      name: rule?.name || '',
      enabled: rule?.enabled ?? true,
      priority: rule?.priority || 0,
      ruleType: rule?.ruleType || RuleType.DATE_RANGE,
      state: rule?.state || AvailabilityState.AVAILABLE,
      startDate: rule?.startDate ? new Date(rule.startDate) : null,
      endDate: rule?.endDate ? new Date(rule.endDate) : null,
      seasonalConfig: rule?.seasonalConfig || null,
      timeRestrictions: rule?.timeRestrictions || null,
      preOrderSettings: rule?.preOrderSettings || null,
      viewOnlySettings: rule?.viewOnlySettings || null,
      overrideSquare: rule?.overrideSquare ?? true
    }
  });

  const { watch, setValue, control, handleSubmit, formState: { errors } } = form;
  const selectedRuleType = watch('ruleType');
  const selectedState = watch('state');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const onSubmit = async (data: AvailabilityRule) => {
    try {
      setIsLoading(true);
      
      let result;
      if (rule?.id) {
        result = await updateAvailabilityRule(rule.id, data);
      } else {
        result = await createAvailabilityRule(productId, data);
      }

      if (result.success && result.data) {
        toast.success(rule ? 'Rule updated successfully' : 'Rule created successfully');
        onSuccess?.(result.data);
      } else {
        toast.error(result.error || 'Failed to save rule');
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
      if (!watch('seasonalConfig')) {
        setValue('seasonalConfig', {
          startMonth: 1,
          startDay: 1,
          endMonth: 12,
          endDay: 31,
          yearly: true,
          timezone: 'America/Los_Angeles'
        });
      }
    }

    if (selectedRuleType === RuleType.TIME_BASED) {
      if (!watch('timeRestrictions')) {
        setValue('timeRestrictions', {
          daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'America/Los_Angeles'
        });
      }
    }
  }, [selectedRuleType, setValue, watch]);

  // Update state-specific settings when state changes
  useEffect(() => {
    if (selectedState === AvailabilityState.PRE_ORDER && !watch('preOrderSettings')) {
      setValue('preOrderSettings', {
        message: 'Available for pre-order',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        maxQuantity: null,
        depositRequired: false,
        depositAmount: null
      });
    }

    if (selectedState === AvailabilityState.VIEW_ONLY && !watch('viewOnlySettings')) {
      setValue('viewOnlySettings', {
        message: 'Currently unavailable for purchase',
        showPrice: true,
        allowWishlist: false,
        notifyWhenAvailable: true
      });
    }
  }, [selectedState, setValue, watch]);

  return (
    <div className={cn("w-full max-w-6xl space-y-6", className)}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Rule Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        <SelectItem value={RuleType.INVENTORY}>Inventory Based</SelectItem>
                        <SelectItem value={RuleType.CUSTOM}>Custom</SelectItem>
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
                    <Label>Start Month</Label>
                    <Controller
                      name="seasonalConfig.startMonth"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
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
                  </div>

                  <div className="space-y-2">
                    <Label>Start Day</Label>
                    <Controller
                      name="seasonalConfig.startDay"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="31"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Month</Label>
                    <Controller
                      name="seasonalConfig.endMonth"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
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
                  </div>

                  <div className="space-y-2">
                    <Label>End Day</Label>
                    <Controller
                      name="seasonalConfig.endDay"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="31"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 31)}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name="seasonalConfig.yearly"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
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
                          {...field}
                          type="time"
                          className="w-full"
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
                          {...field}
                          type="time"
                          className="w-full"
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
                          checked={field.value}
                          onCheckedChange={field.onChange}
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
                            checked={field.value}
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
                            checked={field.value}
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
                            checked={field.value}
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
