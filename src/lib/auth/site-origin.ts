/**
 * Public origin resolution for links we put in outbound email.
 *
 * Supabase invite / recovery / magic-link emails need an absolute URL, so unlike
 * the in-app redirects (see `redirect-response.ts`) these call sites really do
 * have to build one. Two footguns live here:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` is configured with a trailing slash
 *     (`https://www.destinosf.com/`), so naive concatenation produced
 *     `https://www.destinosf.com//auth/callback`.
 *  2. The `origin` request header is absent on some requests, and
 *     `` `${null}/auth/callback` `` silently yields `"null/auth/callback"`.
 */

const DEFAULT_SITE_ORIGIN = 'http://localhost:3000';

/** Removes every trailing slash so the result can be concatenated with a rooted path. */
function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * The configured public origin, never with a trailing slash. Falls back to the
 * local dev origin when `NEXT_PUBLIC_SITE_URL` is unset or blank.
 */
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return DEFAULT_SITE_ORIGIN;

  return stripTrailingSlashes(configured) || DEFAULT_SITE_ORIGIN;
}

/**
 * The origin to build an emailed link from: the request's own `origin` header
 * when it is usable, otherwise the configured site origin. Never returns
 * `null`/`undefined`, so it is safe in a template literal.
 *
 * A literal `"null"` is treated as unusable — that is what browsers send for an
 * opaque origin.
 */
export function resolveRequestOrigin(originHeader: string | null | undefined): string {
  const header = originHeader?.trim();
  if (!header || header === 'null') return siteOrigin();

  return stripTrailingSlashes(header) || siteOrigin();
}
