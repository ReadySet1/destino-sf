'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@prisma/client';

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
    formState: { errors },
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
      const { error } = await supabase.from('profiles')
        .update({
          name: data.name || null,
          phone: data.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '42501') {
          throw new Error('Permission denied. You might not be allowed to update this profile.');
        }
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      toast.success('Profile updated successfully');
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
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading profile...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your account details.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user!.email || ''}
              disabled
              className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Your email address cannot be changed here.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSaving}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              disabled={isSaving}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6">
          <Button type="button" variant="outline" onClick={onSignOut} disabled={isSaving}>
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
