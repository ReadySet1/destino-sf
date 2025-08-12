import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { CateringImageSyncService } from '@/lib/square/catering-price-sync';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    logger.info('🚀 Admin initiated catering image sync', { 
      userId: user.id, 
      userEmail: user.email 
    });
    
    // Validate Square access token
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      logger.error('SQUARE_ACCESS_TOKEN not configured');
      return NextResponse.json(
        { error: 'Square integration not configured' },
        { status: 500 }
      );
    }
    
    // Initialize sync service
    const syncService = new CateringImageSyncService();
    
    // Perform image sync
    const result = await syncService.syncImagesAndAvailability();
    
    logger.info('✅ Catering image sync completed', { 
      updated: result.updated, 
      errors: result.errors.length,
      userId: user.id
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('❌ Image sync failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        message: errorMessage,
        updated: 0,
        errors: [errorMessage]
      },
      { status: 500 }
    );
  }
}
