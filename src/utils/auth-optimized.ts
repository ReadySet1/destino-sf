import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AuthResult {
  isLoggedIn: boolean;
  userData: UserProfileData | null;
}

/**
 * Cached function to get user profile - prevents repeated database queries
 * Uses React's cache function for automatic request deduplication
 */
export const getUserProfile = cache(async (userId: string): Promise<AuthResult> => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return {
      isLoggedIn: !!profile,
      userData: profile ? {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      } : null,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { isLoggedIn: false, userData: null };
  }
});

/**
 * Optimized function to check if user is admin
 */
export const getUserRole = cache(async (userId: string): Promise<'ADMIN' | 'CUSTOMER' | null> => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        role: true,
      },
    });

    return profile?.role || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
});

/**
 * Batch fetch multiple user profiles efficiently
 */
export const getBatchUserProfiles = cache(async (userIds: string[]): Promise<Map<string, UserProfileData>> => {
  try {
    const profiles = await prisma.profile.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    const profileMap = new Map<string, UserProfileData>();
    profiles.forEach(profile => {
      profileMap.set(profile.id, {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    });

    return profileMap;
  } catch (error) {
    console.error('Error fetching batch user profiles:', error);
    return new Map();
  }
}); 