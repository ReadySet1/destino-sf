'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';

interface User {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
}

interface AccountProfileProps {
  user: User;
  onSignOut: () => Promise<void>;
}

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function AccountProfile({ user, onSignOut }: AccountProfileProps) {
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  // Initialize the form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: async () => {
      try {
        // Fetch current profile data
        const { data, error } = await supabase
          .from('profiles')
          .select('name, phone')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Failed to fetch profile:', error);
          return { name: '', phone: '' };
        }

        return {
          name: data?.name || '',
          phone: data?.phone || '',
        };
      } catch (err) {
        console.error('Error loading profile data:', err);
        return { name: '', phone: '' };
      }
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true);

    try {
      // Create or update profile record
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email || '', // Include email field from user object
          name: data.name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        }
      );

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      toast.success('Profile updated successfully');

      // Verify the update succeeded
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.warn('Failed to fetch updated profile:', fetchError);
      } else {
        console.log('Profile updated:', updatedProfile);
      }
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account details and preferences.</CardDescription>
      </CardHeader>

      <form onSubmit={void handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Email field (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Your email address is used for account login and cannot be changed.
            </p>
          </div>

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Phone field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              {...register('phone')}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={void onSignOut}>
            Sign Out
          </Button>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
