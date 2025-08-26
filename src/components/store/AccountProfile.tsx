'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@prisma/client';
import { Mail, Phone, User as UserIcon, LogOut, Save } from 'lucide-react';

export interface AccountProfileProps {
  user: User | null;
  profile: Profile | null;
  onSignOut: () => Promise<void> | void;
}

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function AccountProfile({ user, profile, onSignOut }: AccountProfileProps) {
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) {
      toast.error('User not found. Cannot update profile.');
      return;
    }
    setIsSaving(true);
    console.log('Attempting to update profile with data:', data);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: data.name || null,
          phone: data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', JSON.stringify(error, null, 2));

        if (error.code === '42501') {
          throw new Error('Permission denied. You might not be allowed to update this profile.');
        }
        throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
      }

      toast.success('Profile updated successfully');
      reset(data); // Reset the form with new data to clear isDirty state
    } catch (error: unknown) {
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gray-100 p-3">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info Display */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="rounded-full bg-amber-100 p-2">
            <Mail className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Email Address</p>
            <p className="text-sm text-gray-900 truncate">{user.email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Your email address is verified and cannot be changed here.
        </p>
      </div>

      <Separator />

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Full Name
            </Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSaving}
              placeholder="Enter your full name"
              className={`${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'} focus:ring-amber-500`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              disabled={isSaving}
              placeholder="Enter your phone number"
              className={`${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-amber-500'} focus:ring-amber-500`}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            disabled={isSaving || !isDirty}
            className="flex-1 bg-destino-yellow hover:bg-yellow-400 text-destino-charcoal hover:text-destino-charcoal transition-all duration-200"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onSignOut}
            disabled={isSaving}
            className="flex-1 border-destino-orange/40 text-destino-charcoal hover:bg-destino-cream/50 hover:border-destino-orange hover:text-destino-charcoal transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </form>
    </div>
  );
}
