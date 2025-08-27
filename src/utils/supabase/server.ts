import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              // Enhanced cookie security for auth tokens
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              // Longer max age for refresh tokens
              maxAge: name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days for refresh, 1 day for access
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Failed to set cookie in Server Component:', name, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              maxAge: 0,
              expires: new Date(0),
            });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Failed to remove cookie in Server Component:', name, error);
          }
        },
      },
      auth: {
        // Server-side auth configuration
        persistSession: true,
        autoRefreshToken: true,
        // Disable session detection from URL on server
        detectSessionInUrl: false,
        // Use PKCE for enhanced security
        flowType: 'pkce',
      },
      // Global configuration
      global: {
        headers: {
          'X-Client-Info': 'destino-sf-server',
        },
      },
    }
  );
}
