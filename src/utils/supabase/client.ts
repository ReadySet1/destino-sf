import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Use document.cookie to read cookies in the browser
          if (typeof document === 'undefined') return undefined;

          const cookies = document.cookie.split(';');
          const cookie = cookies.find(c => c.trim().startsWith(`${name}=`));
          return cookie?.split('=')[1];
        },
        set(name: string, value: string, options: any) {
          // Use document.cookie to set cookies in the browser
          if (typeof document === 'undefined') return;

          let cookieString = `${name}=${value}`;

          if (options?.maxAge) {
            cookieString += `; max-age=${options.maxAge}`;
          }
          if (options?.path) {
            cookieString += `; path=${options.path}`;
          } else {
            cookieString += '; path=/';
          }
          if (options?.sameSite) {
            cookieString += `; samesite=${options.sameSite}`;
          }
          if (options?.secure) {
            cookieString += '; secure';
          }

          document.cookie = cookieString;
        },
        remove(name: string, options: any) {
          // Remove cookie by setting it with max-age=0
          if (typeof document === 'undefined') return;

          document.cookie = `${name}=; path=${options?.path || '/'}; max-age=0`;
        },
      },
    }
  );
}
