import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@prisma/client';
import { ensureUserProfile } from '@/middleware/profile-sync';

export interface AdminAuthResult {
  authorized: boolean;
  error?: string;
  statusCode?: number;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Centralized admin authentication guard
 * Verifies user is authenticated and has admin role
 */
export async function verifyAdminAccess(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        authorized: false, 
        error: 'Authentication required',
        statusCode: 401 
      };
    }

    // Ensure profile exists and get it (this will create one if needed, but won't overwrite existing roles)
    const profileResult = await ensureUserProfile(user.id, user.email);
    
    if (!profileResult.success || !profileResult.profile) {
      return { 
        authorized: false, 
        error: 'Profile not found',
        statusCode: 404 
      };
    }
    
    const profile = profileResult.profile;

    if (profile.role !== UserRole.ADMIN) {
      return { 
        authorized: false, 
        error: 'Admin access required',
        statusCode: 403 
      };
    }

    return { 
      authorized: true, 
      user: { 
        id: user.id, 
        email: profile.email,
        role: profile.role 
      } 
    };
  } catch (error) {
    console.error('Admin auth guard error:', error);
    return {
      authorized: false,
      error: 'Authentication system error',
      statusCode: 500
    };
  }
}

/**
 * Helper function for API routes - returns NextResponse if unauthorized
 */
export async function requireAdminAccess() {
  const authResult = await verifyAdminAccess();
  
  if (!authResult.authorized) {
    const { NextResponse } = await import('next/server');
    return {
      response: NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      ),
      authorized: false
    };
  }
  
  return {
    response: null,
    authorized: true,
    user: authResult.user!
  };
}
