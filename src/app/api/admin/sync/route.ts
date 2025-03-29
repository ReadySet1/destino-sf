import { NextResponse } from 'next/server';
import { syncSquareToSanity } from '@/lib/square/sync-with-sanity';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get the current user and check if they're an admin
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify if user is an admin (you'll need to implement this logic)
    const { data: userRole } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (!userRole || userRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Perform the sync
    await syncSquareToSanity();
    
    return NextResponse.json({
      success: true,
      message: 'Square catalog synced to Sanity successfully'
    });
  } catch (error) {
    console.error('Error in sync API:', error);
    
    return NextResponse.json(
      { error: 'Failed to sync catalog' },
      { status: 500 }
    );
  }
}
