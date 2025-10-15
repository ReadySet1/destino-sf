'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormField } from '@/components/ui/form/FormField';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormTextarea } from '@/components/ui/form/FormTextarea';
import { FormCheckbox } from '@/components/ui/form/FormCheckbox';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

interface StoreSettings {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  taxRate: number;
  minAdvanceHours: number;
  minOrderAmount: number;
  cateringMinimumAmount: number;
  maxDaysInAdvance: number;
  isStoreOpen: boolean;
  temporaryClosureMsg?: string | null;
}

interface StoreSettingsProps {
  settings: StoreSettings;
}

// Schema for form validation
const settingsSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Store name is required'),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  taxRate: z.preprocess(val => (val === '' ? 0 : Number(val)), z.number().min(0).max(100)),
  minAdvanceHours: z.preprocess(val => (val === '' ? 0 : Number(val)), z.number().int().min(0)),
  minOrderAmount: z.preprocess(val => (val === '' ? 0 : Number(val)), z.number().min(0)),
  cateringMinimumAmount: z.preprocess(val => (val === '' ? 0 : Number(val)), z.number().min(0)),
  maxDaysInAdvance: z.preprocess(val => (val === '' ? 0 : Number(val)), z.number().int().min(1)),
  isStoreOpen: z.boolean(),
  temporaryClosureMsg: z.string().optional().nullable(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

function SettingsForm({ settings }: StoreSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const isStoreOpen = watch('isStoreOpen');

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
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
        throw new Error(errorData.error || 'Failed to update settings');
      }

      toast.success('Store settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormHeader
        title="Store Settings"
        description="Configure your store information and order settings"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <FormStack spacing={10}>
          {/* Store Information */}
          <FormSection
            title="Store Information"
            description="Basic information about your restaurant"
            icon={FormIcons.info}
          >
            <FormStack>
              <FormField label="Store Name" required error={errors.name?.message}>
                <FormInput
                  {...register('name')}
                  placeholder="Enter your store name"
                  error={!!errors.name}
                />
              </FormField>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  {...register('email')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  {...register('address')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  {...register('city')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  {...register('state')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zipCode"
                  {...register('zipCode')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              {/* Order settings section */}
              <div className="col-span-2 mt-6">
                <h3 className="text-lg font-medium mb-4">Order Settings</h3>
              </div>

              <div>
                <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  id="taxRate"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register('taxRate')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.taxRate && (
                  <p className="mt-1 text-sm text-red-600">{errors.taxRate.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="minOrderAmount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Minimum Order Amount ($)
                </label>
                <input
                  type="number"
                  id="minOrderAmount"
                  step="0.01"
                  min="0"
                  {...register('minOrderAmount')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.minOrderAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.minOrderAmount.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="cateringMinimumAmount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  General Catering Minimum Order Amount ($)
                </label>
                <input
                  type="number"
                  id="cateringMinimumAmount"
                  step="0.01"
                  min="0"
                  {...register('cateringMinimumAmount')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.cateringMinimumAmount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.cateringMinimumAmount.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Fallback minimum for catering orders (zone-specific minimums take precedence)
                </p>
              </div>

              <div>
                <label
                  htmlFor="minAdvanceHours"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Minimum Advance Hours
                </label>
                <input
                  type="number"
                  id="minAdvanceHours"
                  min="0"
                  {...register('minAdvanceHours')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.minAdvanceHours && (
                  <p className="mt-1 text-sm text-red-600">{errors.minAdvanceHours.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Minimum number of hours in advance customers need to place orders
                </p>
              </div>

              <div>
                <label
                  htmlFor="maxDaysInAdvance"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Maximum Days in Advance
                </label>
                <input
                  type="number"
                  id="maxDaysInAdvance"
                  min="1"
                  {...register('maxDaysInAdvance')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
                {errors.maxDaysInAdvance && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxDaysInAdvance.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum number of days in advance customers can place orders
                </p>
              </div>

              {/* Store status section */}
              <div className="col-span-2 mt-6">
                <h3 className="text-lg font-medium mb-4">Store Status</h3>
              </div>

              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isStoreOpen"
                  {...register('isStoreOpen')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isStoreOpen" className="text-sm font-medium text-gray-700">
                  Store is Open for Orders
                </label>
              </div>

              {!isStoreOpen && (
                <div className="col-span-2">
                  <label
                    htmlFor="temporaryClosureMsg"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Temporary Closure Message
                  </label>
                  <textarea
                    id="temporaryClosureMsg"
                    rows={3}
                    {...register('temporaryClosureMsg')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Message to display to customers when the store is closed"
                  />
                </div>
              )}
            </FormStack>
          </FormSection>

          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </FormStack>
      </form>
    </FormContainer>
  );
}

export default function SettingsFormWrapper({ settings }: { settings: StoreSettings | null }) {
  if (!settings) return <div className="text-red-600">No store settings found.</div>;
  return <SettingsForm settings={settings} />;
}
