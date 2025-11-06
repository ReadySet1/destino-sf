'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  DollarSign,
  Calculator,
  Clock,
  Mail,
  Phone,
  MapPin,
  Save,
  Info,
} from 'lucide-react';
import { z } from 'zod';

// Use the same schema as the API endpoint
const ApiStoreSettingsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  taxRate: z.number().min(0).max(100),
  minAdvanceHours: z.number().int().min(0),
  minOrderAmount: z.number().min(0),
  cateringMinimumAmount: z.number().min(0),
  maxDaysInAdvance: z.number().int().min(1),
  isStoreOpen: z.boolean(),
  temporaryClosureMsg: z.string().optional().nullable(),
});

type ApiStoreSettings = z.infer<typeof ApiStoreSettingsSchema>;

interface EnhancedStoreSettingsFormProps {
  settings: any; // Accept the format from the existing API
}

interface UsageIndicator {
  icon: React.ReactNode;
  label: string;
  description: string;
  isActive: boolean;
}

export default function EnhancedStoreSettingsForm({ settings }: EnhancedStoreSettingsFormProps) {
  const [saving, setSaving] = useState(false);

  const form = useForm<ApiStoreSettings>({
    resolver: zodResolver(ApiStoreSettingsSchema),
    defaultValues: settings || {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      taxRate: 0,
      minOrderAmount: 0,
      cateringMinimumAmount: 0,
      minAdvanceHours: 24,
      maxDaysInAdvance: 30,
      isStoreOpen: true,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const isStoreOpen = watch('isStoreOpen');

  const onSubmit = async (data: ApiStoreSettings) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success('Store settings updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  // Usage indicators for each setting group
  const usageIndicators: Record<string, UsageIndicator[]> = {
    storeInfo: [
      {
        icon: <Mail className="h-4 w-4" />,
        label: 'Customer Communications',
        description: 'Email appears on receipts and order confirmations',
        isActive: !!settings?.email,
      },
      {
        icon: <Store className="h-4 w-4" />,
        label: 'Shipping Labels',
        description: 'Address used for return labels and business identification',
        isActive: !!settings?.address,
      },
    ],
    financial: [
      {
        icon: <Calculator className="h-4 w-4" />,
        label: 'Tax Calculation',
        description: 'Applied to all taxable items at checkout',
        isActive: (settings?.taxRate || 0) > 0,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: 'Order Validation',
        description: 'Prevents orders below minimum amounts',
        isActive: (settings?.minOrderAmount || 0) > 0,
      },
    ],
    catering: [
      {
        icon: <Clock className="h-4 w-4" />,
        label: 'Advance Booking',
        description: 'Controls when customers can place catering orders',
        isActive: (settings?.minAdvanceHours || 0) > 0,
      },
      {
        icon: <DollarSign className="h-4 w-4" />,
        label: 'Catering Minimums',
        description: 'Enforced for catering orders when no zone-specific minimum exists',
        isActive: (settings?.cateringMinimumAmount || 0) > 0,
      },
    ],
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            Store Information
          </CardTitle>
          <CardDescription>
            This information appears on invoices, shipping labels, and customer receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage indicators */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-2">
            <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              How This Information Is Used
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usageIndicators.storeInfo.map((indicator, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {indicator.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-900">{indicator.label}</span>
                      <Badge
                        variant={indicator.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {indicator.isActive ? 'Active' : 'Not Set'}
                      </Badge>
                    </div>
                    <p className="text-blue-700 text-xs">{indicator.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Store Name *
              </Label>
              <Input id="name" {...register('name')} placeholder="Your Store Name" />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Displayed on all customer communications and legal documents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Business Email *
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="business@yourstore.com"
              />
              {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Used for order confirmations and customer support
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Business Phone *
              </Label>
              <Input id="phone" {...register('phone')} placeholder="(555) 123-4567" />
              {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                Business Address *
              </Label>
              <Input id="address" {...register('address')} placeholder="123 Business St" />
              {errors.address && (
                <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                City *
              </Label>
              <Input id="city" {...register('city')} placeholder="San Francisco" />
              {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                  State *
                </Label>
                <Input id="state" {...register('state')} placeholder="CA" />
                {errors.state && (
                  <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700">
                  ZIP Code *
                </Label>
                <Input id="zipCode" {...register('zipCode')} placeholder="94105" />
                {errors.zipCode && (
                  <p className="text-sm text-red-600 mt-1">{errors.zipCode.message}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-green-600" />
            Financial Settings
          </CardTitle>
          <CardDescription>
            Configure tax rates and order minimums for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage indicators */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2">
            <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Financial Controls Impact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usageIndicators.financial.map((indicator, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {indicator.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">{indicator.label}</span>
                      <Badge
                        variant={indicator.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {indicator.isActive ? 'Active' : 'Not Set'}
                      </Badge>
                    </div>
                    <p className="text-green-700 text-xs">{indicator.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="taxRate"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Calculator className="h-4 w-4 text-green-600" />
                Tax Rate (%)
              </Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { valueAsNumber: true })}
                placeholder="8.25"
              />
              {errors.taxRate && (
                <p className="text-sm text-red-600 mt-1">{errors.taxRate.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Applied to all taxable items during checkout
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="minOrderAmount"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <DollarSign className="h-4 w-4 text-green-600" />
                Regular Order Minimum ($)
              </Label>
              <Input
                id="minOrderAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('minOrderAmount', { valueAsNumber: true })}
                placeholder="25.00"
              />
              {errors.minOrderAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.minOrderAmount.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Minimum for regular product orders (empanadas, alfajores)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catering Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Catering Settings
          </CardTitle>
          <CardDescription>
            Configure scheduling rules and minimums for catering orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage indicators */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-2">
            <h4 className="text-sm font-medium text-orange-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Catering Business Rules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usageIndicators.catering.map((indicator, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {indicator.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-orange-900">{indicator.label}</span>
                      <Badge
                        variant={indicator.isActive ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {indicator.isActive ? 'Active' : 'Not Set'}
                      </Badge>
                    </div>
                    <p className="text-orange-700 text-xs">{indicator.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label
                htmlFor="cateringMinimumAmount"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <DollarSign className="h-4 w-4 text-orange-600" />
                General Catering Minimum ($)
              </Label>
              <Input
                id="cateringMinimumAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('cateringMinimumAmount', { valueAsNumber: true })}
                placeholder="500.00"
              />
              {errors.cateringMinimumAmount && (
                <p className="text-sm text-red-600 mt-1">{errors.cateringMinimumAmount.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Fallback minimum for zones without specific minimums
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="minAdvanceHours"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Clock className="h-4 w-4 text-orange-600" />
                Minimum Advance Hours
              </Label>
              <Input
                id="minAdvanceHours"
                type="number"
                min="0"
                {...register('minAdvanceHours', { valueAsNumber: true })}
                placeholder="24"
              />
              {errors.minAdvanceHours && (
                <p className="text-sm text-red-600 mt-1">{errors.minAdvanceHours.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">How far in advance orders must be placed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDaysInAdvance" className="text-sm font-medium text-gray-700">
                Maximum Days Advance
              </Label>
              <Input
                id="maxDaysInAdvance"
                type="number"
                min="1"
                {...register('maxDaysInAdvance', { valueAsNumber: true })}
                placeholder="30"
              />
              {errors.maxDaysInAdvance && (
                <p className="text-sm text-red-600 mt-1">{errors.maxDaysInAdvance.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Maximum days in advance for booking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-purple-600" />
            Store Status
          </CardTitle>
          <CardDescription>Control whether your store is accepting new orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isStoreOpen" className="text-base font-medium">
                Store is Open for Orders
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                When disabled, customers cannot place new orders. Existing orders remain unaffected.
              </p>
            </div>
            <Switch
              id="isStoreOpen"
              checked={isStoreOpen}
              onCheckedChange={checked => setValue('isStoreOpen', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}
