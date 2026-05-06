import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

/**
 * Middleware function to ensure user profiles exist
 * This should be called in API routes or server components where user authentication is required
 */
export async function ensureUserProfile(
  userId: string,
  email?: string
): Promise<{
  success: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    const profile = await prisma.profile.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: email || 'unknown@example.com',
        role: 'CUSTOMER',
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, email: true, role: true, name: true },
    });

    if (process.env.AUTH_DEBUG === 'true') {
      logger.debug(`Profile ensured for user ${userId}`);
    }

    return {
      success: true,
      profile,
    };
  } catch (error) {
    logger.error(`Error ensuring profile for user ${userId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
