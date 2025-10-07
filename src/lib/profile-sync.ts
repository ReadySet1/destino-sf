'use server';

import { prisma, withRetry } from '@/lib/db-unified';
import { logger } from '@/utils/logger';

/**
 * Syncs customer phone number to their profile
 * This ensures phone numbers are consistent across all orders and the user profile
 *
 * @param userId - The user's ID (optional for guest checkouts)
 * @param email - The customer's email (used to find profile if no userId)
 * @param phone - The phone number to sync
 * @returns Promise<boolean> - Success status
 */
export async function syncPhoneToProfile(
  userId: string | null | undefined,
  email: string,
  phone: string
): Promise<boolean> {
  try {
    // Validate phone number
    if (!phone || phone.trim().length === 0) {
      logger.warn('[PROFILE-SYNC] No phone number provided, skipping sync');
      return false;
    }

    const trimmedPhone = phone.trim();

    // Find the profile by userId or email
    const profile = await withRetry(async () => {
      if (userId) {
        return await prisma.profile.findUnique({
          where: { id: userId },
          select: { id: true, email: true, phone: true },
        });
      } else {
        return await prisma.profile.findUnique({
          where: { email },
          select: { id: true, email: true, phone: true },
        });
      }
    }, 3, 'findProfileForPhoneSync');

    if (!profile) {
      logger.warn(`[PROFILE-SYNC] No profile found for ${userId ? `userId: ${userId}` : `email: ${email}`}`);
      return false;
    }

    // Only update if phone is different or missing
    if (profile.phone !== trimmedPhone) {
      logger.info(`[PROFILE-SYNC] Updating phone for profile ${profile.id}: ${profile.phone || 'none'} -> ${trimmedPhone}`);

      await withRetry(async () => {
        return await prisma.profile.update({
          where: { id: profile.id },
          data: {
            phone: trimmedPhone,
            updated_at: new Date(),
          },
        });
      }, 3, 'updateProfilePhone');

      logger.info(`[PROFILE-SYNC] Successfully updated phone for profile ${profile.id}`);
      return true;
    } else {
      logger.debug(`[PROFILE-SYNC] Phone already up-to-date for profile ${profile.id}`);
      return true;
    }
  } catch (error) {
    logger.error('[PROFILE-SYNC] Error syncing phone to profile:', error);
    // Don't throw - we don't want to fail the order if profile sync fails
    return false;
  }
}

/**
 * Syncs multiple customer fields to their profile
 * This is a more comprehensive sync for name, email, and phone
 *
 * @param userId - The user's ID (optional for guest checkouts)
 * @param data - Customer data to sync
 * @returns Promise<boolean> - Success status
 */
export async function syncCustomerToProfile(
  userId: string | null | undefined,
  data: {
    email: string;
    name?: string;
    phone?: string;
  }
): Promise<boolean> {
  try {
    // Find the profile by userId or email
    const profile = await withRetry(async () => {
      if (userId) {
        return await prisma.profile.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, phone: true },
        });
      } else {
        return await prisma.profile.findUnique({
          where: { email: data.email },
          select: { id: true, email: true, name: true, phone: true },
        });
      }
    }, 3, 'findProfileForCustomerSync');

    if (!profile) {
      logger.warn(`[PROFILE-SYNC] No profile found for ${userId ? `userId: ${userId}` : `email: ${data.email}`}`);
      return false;
    }

    // Build update data object with only changed fields
    const updateData: any = {
      updated_at: new Date(),
    };

    let hasChanges = false;

    if (data.name && data.name.trim() !== profile.name) {
      updateData.name = data.name.trim();
      hasChanges = true;
      logger.info(`[PROFILE-SYNC] Name update: ${profile.name || 'none'} -> ${data.name.trim()}`);
    }

    if (data.phone && data.phone.trim() !== profile.phone) {
      updateData.phone = data.phone.trim();
      hasChanges = true;
      logger.info(`[PROFILE-SYNC] Phone update: ${profile.phone || 'none'} -> ${data.phone.trim()}`);
    }

    if (hasChanges) {
      await withRetry(async () => {
        return await prisma.profile.update({
          where: { id: profile.id },
          data: updateData,
        });
      }, 3, 'updateProfileCustomerData');

      logger.info(`[PROFILE-SYNC] Successfully updated profile ${profile.id}`);
      return true;
    } else {
      logger.debug(`[PROFILE-SYNC] No changes needed for profile ${profile.id}`);
      return true;
    }
  } catch (error) {
    logger.error('[PROFILE-SYNC] Error syncing customer data to profile:', error);
    // Don't throw - we don't want to fail the order if profile sync fails
    return false;
  }
}
