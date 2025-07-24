import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function getAdminUserData() {
  // Create the Supabase client for authentication
  const supabase = await createClient();

  // Fetch the user from Supabase auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('No user found, redirecting to sign-in');
    redirect('/sign-in');
  }

  // Default values in case profile check fails
  let profileRole = 'No profile';
  let isUserAdmin = false;

  try {
    logger.debug('Looking up profile for user ID:', user.id);

    // Verify database connection
    try {
      await prisma.$connect();
      logger.debug('Database connection verified');
    } catch (connErr) {
      logger.error('Database connection failed:', connErr);
      redirect('/');
    }

    // Get the profile with minimal fields needed
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    logger.debug('Profile data:', profile);

    if (!profile) {
      logger.warn('No profile found for user ID:', user.id);
      redirect('/');
    }

    // Stringified role comparison - works with any type of enum
    profileRole = String(profile.role || '');
    logger.debug('Raw role value:', profileRole, 'Type:', typeof profile.role);

    // Check for ADMIN in any form, case-insensitive
    isUserAdmin = profileRole.toUpperCase().includes('ADMIN');
    logger.debug('Is admin check result:', isUserAdmin);

    if (!isUserAdmin) {
      logger.warn("User doesn't have admin role");
      redirect('/');
    }
  } catch (error) {
    logger.error('Error in admin access check:', error);
    redirect('/');
  }

  return {
    user: {
      id: user.id,
      email: user.email || '',
    },
    profileRole,
    isUserAdmin,
  };
} 