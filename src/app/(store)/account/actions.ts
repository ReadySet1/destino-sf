'use server';

import { signOutAction } from '@/app/actions/auth';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Re-export the centralized signOutAction for consistency
export async function handleSignOut() {
  return signOutAction();
}

export async function updateProfileAction(data: {
  name?: string | null;
  phone?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'User not authenticated. Please sign in again.',
      };
    }

    // Update the profile using the server-side client with proper auth context
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: data.name || null,
        phone: data.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return {
        success: false,
        error: `Failed to update profile: ${updateError.message}`,
      };
    }

    // Revalidate the account page to show updated data
    revalidatePath('/account');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error in updateProfileAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
