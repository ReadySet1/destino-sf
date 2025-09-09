/**
 * Debug endpoint to check user authentication and role
 * This helps diagnose authentication issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        success: false,
        error: 'Authentication error',
        details: authError.message,
        debug: {
          step: 'auth_check',
          authenticated: false
        }
      });
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'No user found',
        debug: {
          step: 'user_check',
          authenticated: false
        }
      });
    }

    // Check if profile exists
    let profile = null;
    let profileError = null;
    
    try {
      profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { 
          id: true,
          email: true,
          role: true,
          name: true,
          created_at: true
        }
      });
    } catch (dbError) {
      profileError = dbError instanceof Error ? dbError.message : 'Database error';
    }

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile: profile ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          name: profile.name,
          created_at: profile.created_at
        } : null,
        profileError,
        isAdmin: profile?.role === 'ADMIN',
        authenticated: true
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        step: 'general_error'
      }
    }, { status: 500 });
  }
}
