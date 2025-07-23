import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { id, email, role = 'CUSTOMER' } = await request.json();

    if (!id || !email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID and email are required',
        },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { id },
    });

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Profile already exists for this user ID',
          profile: existingProfile,
        },
        { status: 409 }
      );
    }

    // Create new profile
    const profile = await prisma.profile.create({
      data: {
        id,
        email,
        role: role === 'ADMIN' ? UserRole.ADMIN : UserRole.CUSTOMER,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile,
    });
  } catch (error) {
    console.error('Create profile error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating profile',
      },
      { status: 500 }
    );
  }
}
