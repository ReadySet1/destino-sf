import { headers } from 'next/headers';
import { prisma } from '@/lib/db-connection';

/**
 * Get user information from request headers (set by middleware)
 * This avoids database calls for basic user info
 */
export async function getUserFromHeaders(): Promise<{
  id?: string;
  email?: string;
  isAuthenticated: boolean;
}> {
  try {
    const headersList = await headers();
    const userId = headersList.get('X-User-ID');
    const userEmail = headersList.get('X-User-Email');

    return {
      id: userId || undefined,
      email: userEmail || undefined,
      isAuthenticated: !!userId,
    };
  } catch (error) {
    // If headers() fails (e.g., in client components), return unauthenticated
    return {
      isAuthenticated: false,
    };
  }
}

/**
 * Get full user profile from database (only when needed)
 * Use this sparingly - prefer getUserFromHeaders for basic info
 */
export async function getUserProfile(userId: string) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if user has admin role (requires database call)
 * Use this only when role-based access control is needed
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return profile?.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

/**
 * Get user role from headers (if available) or database
 * This provides a balance between performance and functionality
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    // First try to get from cache/headers if possible
    // For now, we'll need to fetch from database, but this could be optimized
    // with Redis caching in the future
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return profile?.role || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}
