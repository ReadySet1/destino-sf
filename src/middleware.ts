import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Lightweight middleware optimized for edge runtime
export async function middleware(request: NextRequest) {
  // Early return for static assets to improve performance
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets
  if (
    pathname.includes('/_next/') || 
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
  ) {
    return NextResponse.next();
  }
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Initialize Supabase client with minimal operations
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    // Minimal auth check - just get the user, don't perform additional operations
    await supabase.auth.getUser();
  } catch (error) {
    // Log error but don't block the request
    console.error('Middleware error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. robots.txt)
     * - file extensions (to avoid processing static files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|ico)$).*)',
  ],
};
