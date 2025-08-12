import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { NewCateringAppetizerSync } from '@/scripts/sync-new-catering-appetizers';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
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

    // Get action from query params
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';

    logger.info('📊 Admin requested new appetizers sync summary', { 
      userId: user.id, 
      userEmail: user.email,
      action 
    });

    // Initialize sync service
    const syncService = new NewCateringAppetizerSync();

    if (action === 'summary') {
      // Get sync summary
      const summary = await syncService.getSyncSummary();
      
      logger.info('✅ New appetizers sync summary retrieved', { 
        totalInSquare: summary.totalInSquare,
        totalInDatabase: summary.totalInDatabase,
        potentialNewItems: summary.potentialNewItems,
        userId: user.id
      });
      
      return NextResponse.json(summary);
    }

    // Default response for unknown actions
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    logger.error('❌ New appetizers sync summary failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to get sync summary', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

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

    // Parse request body
    const body = await request.json();
    const { dryRun = false } = body;
    
    logger.info('🚀 Admin initiated new appetizers sync', { 
      userId: user.id, 
      userEmail: user.email,
      dryRun
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
    const syncService = new NewCateringAppetizerSync();
    
    // Perform sync (dry run or actual)
    const result = await syncService.syncNewAppetizers(dryRun);
    
    logger.info(`✅ New appetizers sync ${dryRun ? 'preview' : 'execution'} completed`, { 
      detected: result.detected,
      created: result.created,
      skipped: result.skipped,
      errors: result.errors.length,
      dryRun,
      userId: user.id
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    logger.error('❌ New appetizers sync failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        message: errorMessage,
        detected: 0,
        created: 0,
        skipped: 0,
        errors: [errorMessage],
        newItems: []
      },
      { status: 500 }
    );
  }
}
