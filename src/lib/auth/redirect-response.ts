import { NextResponse } from 'next/server';

/**
 * Same-origin redirects for route handlers, emitted as a *relative* `Location`.
 *
 * WHY RELATIVE — do not "fix" this back to an absolute URL:
 *
 * The app runs in a container behind Traefik + Cloudflare. Inside a Next.js
 * Route Handler `request.url` carries the internal bind origin, not the public
 * one, so `new URL('/sign-in', request.url)` resolved to
 * `https://0.0.0.0:3000/sign-in` and shipped that to the browser as an absolute
 * `Location`. Every auth callback redirect in production therefore landed on an
 * unreachable host. `NextResponse.redirect()` requires an absolute URL, which is
 * exactly the trap, so it cannot be used here.
 *
 * A relative `Location` is permitted by RFC 7231 §7.1.2, is resolved by every
 * browser against the URL that was actually requested, and is immune to
 * proxy/origin confusion. It also preserves whichever host the user reached us
 * on (apex vs `www`) instead of silently moving them to a canonical one.
 */

/**
 * Builds a redirect to a same-origin path.
 *
 * `path` must already have been validated — `safeRedirectPath` is the real
 * validator for anything caller-supplied. The guard here is defence in depth:
 * a value that is not an unambiguous rooted path (including a protocol-relative
 * `//host`, which a browser would resolve cross-origin) degrades to `/` rather
 * than leaving the app.
 */
export function sameOriginRedirect(path: string, status: 307 | 308 = 307): NextResponse {
  const location = path.startsWith('/') && !path.startsWith('//') ? path : '/';

  return new NextResponse(null, {
    status,
    headers: { Location: location },
  });
}
