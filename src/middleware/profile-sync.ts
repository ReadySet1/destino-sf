import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

/**
 * Middleware function to ensure user profiles exist
 * This should be called in API routes or server components where user authentication is required
 */
export async function ensureUserProfile(userId: string, email?: string): Promise<{
  success: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    // First, check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true }
    });

    if (existingProfile) {
      // Only log in debug mode to reduce noise
      if (process.env.AUTH_DEBUG === 'true') {
        logger.debug(`Profile already exists for user ${userId}`);
      }
      return {
        success: true,
        profile: existingProfile
      };
    }

    // If profile doesn't exist, create it using the database function
    if (process.env.AUTH_DEBUG === 'true') {
      logger.info(`Profile not found for user ${userId}, creating...`);
    }
    
    const profileResult = await prisma.$queryRaw`
      SELECT public.ensure_user_profile(
        ${userId}::uuid, 
        ${email || 'unknown@example.com'}::text, 
        'CUSTOMER'::text
      ) as result
    `;
    
    const result = (profileResult as any)[0]?.result;
    
    if (result?.action === 'error') {
      logger.error(`Failed to create profile for user ${userId}:`, result.error);
      return {
        success: false,
        error: `Profile creation failed: ${result.error}`
      };
    }
    
    // Fetch the newly created profile
    if (result?.action === 'profile_created' || result?.action === 'profile_exists') {
      const newProfile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, name: true }
      });
      
      if (process.env.AUTH_DEBUG === 'true') {
        logger.info(`Profile created successfully for user ${userId}`);
      }
      return {
        success: true,
        profile: newProfile
      };
    }
    
    // Fallback: try to create profile directly
    logger.warn(`Database function didn't work as expected for user ${userId}, trying fallback`);
    
    const fallbackProfile = await prisma.profile.create({
      data: {
        id: userId,
        email: email || 'unknown@example.com',
        role: 'CUSTOMER',
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, email: true, role: true, name: true }
    });
    
    if (process.env.AUTH_DEBUG === 'true') {
      logger.info(`Profile created using fallback method for user ${userId}`);
    }
    return {
      success: true,
      profile: fallbackProfile
    };
    
  } catch (error) {
    logger.error(`Error ensuring profile for user ${userId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Middleware function to sync user with the sync queue
 * This is useful for background processing
 */
export async function queueUserForSync(
  userId: string, 
  email?: string, 
  action: string = 'CREATE'
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await prisma.$queryRaw`
      SELECT public.queue_user_sync(
        ${userId}::uuid, 
        ${email || 'unknown@example.com'}::text, 
        ${action}::text
      ) as result
    `;
    
    const syncResult = (result as any)[0]?.result;
    
    if (syncResult?.success) {
      if (process.env.AUTH_DEBUG === 'true') {
        logger.info(`User ${userId} queued for sync successfully`);
      }
      return { success: true };
    } else {
      logger.error(`Failed to queue user ${userId} for sync:`, syncResult?.error);
      return { 
        success: false, 
        error: syncResult?.error || 'Unknown error' 
      };
    }
  } catch (error) {
    logger.error(`Error queuing user ${userId} for sync:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
