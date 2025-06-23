import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    // Get auth user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile directly from database
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
    });

    // Return debug info
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: profile,
      systemTime: new Date().toISOString(),
      profileDates: profile
        ? {
            created_at: profile.created_at.toISOString(),
            updated_at: profile.updated_at.toISOString(),
            year: profile.created_at.getFullYear(),
          }
        : null,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Debug profile error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
