import { NextResponse } from 'next/server';
import { syncSquareToSanity } from '@/lib/square/sync-with-sanity';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper function moved outside the POST handler
async function getSupabaseClient() {
  const _cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieList = Array.from(_cookieStore.getAll());
          return cookieList.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(_cookies) {
          // Route handlers can't set cookies directly
          // This is just a stub to satisfy the type requirements
        }
      }
    }
  );
}

export async function POST(_request: Request) {
  try {
    // Get the Supabase client
    const supabase = await getSupabaseClient();
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify if user is an admin
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