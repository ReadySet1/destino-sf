import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { 
  cleanupOrphanedSpotlightImages, 
  getSpotlightImageStats 
} from '@/lib/storage/spotlight-storage';

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

// GET: Get statistics about spotlight image uploads
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const statsResult = await getSpotlightImageStats();
    
    return NextResponse.json(statsResult);
  } catch (error) {
    console.error('❌ Failed to get spotlight image stats:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// POST: Clean up orphaned spotlight images
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    if (!(await isUserAdmin(supabase))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { olderThanMinutes = 60 } = body;

    // Validate input
    if (olderThanMinutes < 1 || olderThanMinutes > 10080) { // Max 1 week
      return NextResponse.json({ 
        success: false, 
        error: 'olderThanMinutes must be between 1 and 10080 (1 week)' 
      }, { status: 400 });
    }

    console.log(`🧹 Starting cleanup of orphaned images older than ${olderThanMinutes} minutes`);
    
    const cleanupResult = await cleanupOrphanedSpotlightImages(olderThanMinutes);
    
    return NextResponse.json(cleanupResult);
  } catch (error) {
    console.error('❌ Spotlight image cleanup failed:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 