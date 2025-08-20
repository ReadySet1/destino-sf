import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyRateLimit, shouldBypassInDevelopment } from '@/middleware/rate-limit';



/**
 * Add enhanced security headers to response
 */
function addSecurityHeaders(response: NextResponse, pathname: string): void {
  // Generate nonce for inline scripts if needed
  const nonce = crypto.randomUUID();

  // Add security headers that complement those in next.config.js
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Add nonce for CSP if this is an HTML page
  if (
    !pathname.startsWith('/api/') &&
    !pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
  ) {
    response.headers.set('X-CSP-Nonce', nonce);
  }

  // Add additional cache control for sensitive routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/protected')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Add CSRF protection header
  response.headers.set('X-CSRF-Protection', '1');

  // Add request ID for tracing
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  response.headers.set('X-Request-ID', requestId);
}

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

  // Apply rate limiting before authentication (only for API routes, excluding webhooks)
  // This protects all API endpoints except webhooks which have their own specific rate limiting
  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/webhooks/') &&
    !shouldBypassInDevelopment()
  ) {
    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) {
      return rateLimitResponse; // Return rate limit response if exceeded
    }
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Add enhanced security headers for all responses
  addSecurityHeaders(response, pathname);

  // Optimized authentication check for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/protected')) {
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

      // Check user authentication securely using getUser()
      // This validates the session with the Supabase server for security
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        // Clear any invalid session cookies
        response.cookies.set('sb-access-token', '', { maxAge: 0 });
        response.cookies.set('sb-refresh-token', '', { maxAge: 0 });

        // Redirect to sign-in for admin routes
        if (pathname.startsWith('/admin') || pathname.startsWith('/protected')) {
          return NextResponse.redirect(new URL('/sign-in', request.url));
        }
      } else {
        // User is authenticated, add user info to headers for downstream use
        // This avoids database calls in individual page components
        response.headers.set('X-User-ID', user.id);
        response.headers.set('X-User-Email', user.email || '');
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      response.headers.set('X-Auth-Error', 'true');
      
      // For admin routes, redirect to sign-in on auth errors
      if (pathname.startsWith('/admin') || pathname.startsWith('/protected')) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }
  
  // Only check auth for specific routes that need user context (like account pages)
  // but don't log warnings for public routes
  if (pathname.startsWith('/account/') || pathname.startsWith('/user/')) {
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

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        // Add user info to headers for downstream use
        response.headers.set('X-User-ID', user.id);
        response.headers.set('X-User-Email', user.email || '');
      }
      // Note: No logging for auth failures on account routes - let the page handle redirects
    } catch (error) {
      // Silently fail for account routes - let the page handle auth
    }
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
