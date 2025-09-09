import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma, withRetry } from '@/lib/db-unified';
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
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Since individual catering items are now managed through Square integration,
    // this setup route is no longer needed
    logger.info(`📦 Individual catering item setup is no longer needed - items managed via Square`, { 
      userId: user.id 
    });
    
    return NextResponse.json({
      message: 'Individual catering item setup is no longer needed',
      note: 'Items are now managed through Square integration',
      status: 'deprecated',
      createdItems: 0,
      updatedItems: 0,
      errors: ['This API endpoint has been deprecated in favor of Square-based item management']
    });
    
  } catch (error) {
    logger.error('❌ Failed to setup catering menu:', error);
    
    return NextResponse.json(
      { error: 'Failed to setup catering menu' },
      { status: 500 }
    );
  }
}
