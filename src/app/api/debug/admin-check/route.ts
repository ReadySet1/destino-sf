import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';

export async function GET(_request: NextRequest) {
  try {
    // Get auth user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Database connection test
    let dbStatus;
    try {
      const testCount = await prisma.profile.count();
      dbStatus = { connected: true, profileCount: testCount };
    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      dbStatus = { connected: false, error: errorMessage };
    }

    // Get profile directly from database
    let profileResult;
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
      });

      if (profile) {
        profileResult = {
          found: true,
          profile: {
            id: profile.id,
            email: profile.email,
            role: profile.role,
            roleType: typeof profile.role,
            roleStringValue: String(profile.role),
            roleUppercase: String(profile.role).toUpperCase(),
            isAdmin: String(profile.role).toUpperCase() === 'ADMIN',
          },
        };
      } else {
        profileResult = { found: false };
      }
    } catch (profileError) {
      const errorMessage =
        profileError instanceof Error ? profileError.message : 'Unknown profile error';
      profileResult = { error: errorMessage };
    }

    // Return comprehensive debug info
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      database: dbStatus,
      profile: profileResult,
      systemTime: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Admin check debug error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
