import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
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
      select: { role: true },
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Since individual catering items are now managed through Square integration,
    // return an empty array with a message
    logger.info(`📦 Individual catering items are now managed via Square integration`, { 
      userId: user.id 
    });
    
    return NextResponse.json({
      items: [],
      message: 'Individual catering items are now managed through Square integration',
      note: 'This API endpoint has been deprecated in favor of Square-based item management'
    });
    
  } catch (error) {
    logger.error('❌ Failed to fetch catering items:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    // return an error indicating this operation is no longer supported
    logger.info(`📦 Individual catering item updates are now managed via Square integration`, { 
      userId: user.id 
    });
    
    return NextResponse.json(
      { 
        error: 'Individual catering item updates are no longer supported',
        message: 'Items are now managed through Square integration',
        note: 'This API endpoint has been deprecated in favor of Square-based item management'
      },
      { status: 410 } // Gone - resource no longer available
    );
    
  } catch (error) {
    logger.error('❌ Failed to update catering item:', error);
    
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
