import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { uploadSpotlightImage } from '@/lib/storage/spotlight-storage';
import { SpotlightUploadResult } from '@/types/spotlight';

// Check if user is admin
async function isUserAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminProfile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  return adminProfile?.role === 'ADMIN';
}

// POST: Handle image upload
export async function POST(request: NextRequest): Promise<NextResponse<SpotlightUploadResult>> {
  try {
    const supabase = await createClient();

    // Check admin authentication and get user
    const { data: { user } } = await supabase.auth.getUser();

    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const position = formData.get('position') as string;

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    if (!position) {
      return NextResponse.json({ 
        success: false, 
        error: 'No position provided' 
      }, { status: 400 });
    }

    const positionNumber = parseInt(position);
    if (isNaN(positionNumber) || positionNumber < 1 || positionNumber > 4) {
      return NextResponse.json({ 
        success: false, 
        error: 'Position must be between 1 and 4' 
      }, { status: 400 });
    }

    // Pass user ID for tracking
    const result = await uploadSpotlightImage(file, positionNumber, user?.id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Spotlight image upload failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 