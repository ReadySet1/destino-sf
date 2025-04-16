import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  // Linter seems to incorrectly infer Promise type here.
  const cookieStore: ReturnType<typeof cookies> = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // @ts-expect-error - Linter incorrect on cookieStore type
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // @ts-expect-error - Linter incorrect on cookieStore type
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            console.warn('Supabase SSR: Error setting cookie from server', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // @ts-expect-error - Linter incorrect on cookieStore type
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            console.warn('Supabase SSR: Error removing cookie from server', error);
          }
        },
      },
    }
  );
}
