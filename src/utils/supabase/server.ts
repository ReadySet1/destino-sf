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
              // IMPORTANT: httpOnly must be false for client-side session access
              // Supabase SSR requires client to read cookies for session management
              // The cookies are already protected by sameSite and secure flags
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              // Longer max age for refresh tokens
              maxAge: name.includes('refresh') ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days for refresh, 1 day for access
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored since middleware handles session refreshing.
            // Silently ignore the error to prevent application crashes.
            // Only log if explicitly debugging auth issues
            if (process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true') {
              console.warn(
                'Failed to set cookie in Server Component:',
                name,
                'This is expected and handled by middleware'
              );
            }
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
            // This can be ignored since middleware handles session refreshing.
            // Silently ignore the error to prevent application crashes.
            // Only log if explicitly debugging auth issues
            if (process.env.NODE_ENV === 'development' && process.env.AUTH_DEBUG === 'true') {
              console.warn(
                'Failed to remove cookie in Server Component:',
                name,
                'This is expected and handled by middleware'
              );
            }
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
