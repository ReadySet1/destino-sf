import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if the request is authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { userId, secretKey, email } = await request.json();

    // Validate secret key to protect this endpoint
    // In production, use environment variables and a more secure approach
    const validSecretKey = process.env.ADMIN_PROMOTION_SECRET || 'destino-sf-admin-secret';

    if (secretKey !== validSecretKey) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }

    // If userId is not provided, use the current authenticated user's ID
    const targetUserId = userId || user.id;
    const targetEmail = email || user.email;

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email is required to create a profile' }, { status: 400 });
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id: targetUserId },
    });

    if (existingProfile) {
      // Update existing profile to ADMIN role
      const updatedProfile = await prisma.profile.update({
        where: { id: targetUserId },
        data: { role: 'ADMIN' },
      });

      return NextResponse.json({
        message: 'User promoted to admin',
        profile: updatedProfile,
      });
    } else {
      // Create new profile with ADMIN role
      const newProfile = await prisma.profile.create({
        data: {
          id: targetUserId,
          email: targetEmail,
          role: 'ADMIN',
          // We'll let the user update name/phone later
        },
      });

      return NextResponse.json({
        message: 'User profile created with admin role',
        profile: newProfile,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error promoting user to admin:', errorMessage);

    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
  }
}
