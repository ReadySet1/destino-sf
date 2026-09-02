import { siteOrigin } from '@/lib/auth/site-origin';

/**
 * Absolute links handed to Supabase for invite / password-setup emails.
 *
 * Supabase needs an absolute `redirectTo`, so these cannot use the relative
 * `sameOriginRedirect` treatment applied to in-app redirects.
 */

/**
 * `${siteOrigin()}/auth/callback?redirect_to=<encoded path>`.
 *
 * Two things this exists to get right:
 *
 *  - `siteOrigin()` strips the trailing slash carried by
 *    `NEXT_PUBLIC_SITE_URL`, so the result has one slash before `/auth`.
 *  - the destination is a *single* percent-encoded `redirect_to` value. Passing
 *    `/setup-password?email=…` raw appended a second `?` to the callback URL,
 *    so `email` arrived as a sibling of `redirect_to` instead of part of it.
 *
 * `/auth/callback` reads this back with `searchParams.get('redirect_to')`, which
 * decodes exactly once, yielding `/setup-password?email=<encoded email>` — a
 * rooted, scheme-free path that `safeRedirectPath` accepts.
 */
export function setupPasswordCallbackUrl(email: string): string {
  const next = `/setup-password?email=${encodeURIComponent(email)}`;

  return `${siteOrigin()}/auth/callback?redirect_to=${encodeURIComponent(next)}`;
}
