import { useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ProfileSyncResult {
  success: boolean;
  action?: 'profile_exists' | 'profile_created' | 'error';
  profile?: any;
  error?: string;
}

/**
 * Custom hook for ensuring user profiles exist
 * This hook provides functions to sync user profiles with the database
 */
export const useProfileSync = () => {
  const ensureProfile = useCallback(
    async (
      userId: string,
      email?: string,
      role: string = 'CUSTOMER'
    ): Promise<ProfileSyncResult> => {
      try {
        const supabase = createClient();

        // Call the database function to ensure profile exists
        const { data, error } = await supabase.rpc('ensure_user_profile', {
          user_id: userId,
          user_email: email,
          user_role: role,
        });

        if (error) {
          console.error('Error ensuring profile:', error);
          return {
            success: false,
            action: 'error',
            error: error.message,
          };
        }

        return {
          success: true,
          action: data?.action || 'profile_exists',
          profile: data?.profile,
        };
      } catch (error) {
        console.error('Error in ensureProfile:', error);
        return {
          success: false,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    []
  );

  const queueUserSync = useCallback(
    async (
      userId: string,
      email?: string,
      action: string = 'CREATE'
    ): Promise<ProfileSyncResult> => {
      try {
        const supabase = createClient();

        // Add user to sync queue
        const { data, error } = await supabase.rpc('queue_user_sync', {
          user_id: userId,
          user_email: email,
          sync_action: action,
        });

        if (error) {
          console.error('Error queuing user sync:', error);
          return {
            success: false,
            action: 'error',
            error: error.message,
          };
        }

        return {
          success: true,
          action: 'profile_exists',
          profile: data,
        };
      } catch (error) {
        console.error('Error in queueUserSync:', error);
        return {
          success: false,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    []
  );

  return {
    ensureProfile,
    queueUserSync,
  };
};
