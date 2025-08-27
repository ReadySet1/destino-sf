import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Enhanced auth options for better session management
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        // Storage options for better persistence
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Flow type for consistent auth handling
        flowType: 'pkce',
      },
      // Global configuration
      global: {
        headers: {
          'X-Client-Info': 'destino-sf-web',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );
}
