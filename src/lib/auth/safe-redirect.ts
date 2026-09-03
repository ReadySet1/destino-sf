/**
 * Open-redirect guard for auth callbacks.
 *
 * Supabase email links carry a caller-supplied destination (`next` on
 * /auth/confirm, `redirect_to` on /auth/callback). Those values reach us
 * straight from the query string, so they must never be handed to a redirect
 * without validation.
 */

/** ASCII control characters, including newline, carriage return and tab. */
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

/**
 * Any RFC 3986 scheme prefix (`https:`, `javascript:`, `data:`, …). Matched
 * anywhere in the value so that a scheme smuggled inside a nested query string
 * is rejected too.
 */
const URL_SCHEME = /[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * A value is safe only when the browser can resolve it as a same-origin path
 * with no chance of being reinterpreted as an authority component.
 */
function isSafeRelativePath(value: string): boolean {
  if (value.length === 0) return false;
  if (CONTROL_CHARACTERS.test(value)) return false;
  // Browsers normalise backslashes to slashes, so `/\evil.com` is protocol relative.
  if (value.includes('\\')) return false;
  if (URL_SCHEME.test(value)) return false;
  // Must be rooted, and must not be protocol relative (`//host`).
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  return true;
}

/**
 * Returns `value` when it is a safe same-origin relative path, otherwise the
 * caller's `fallback`. The fallback is returned verbatim — callers always pass
 * a literal path they control.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (value === null || value === undefined) return fallback;
  if (value.trim().length === 0) return fallback;

  if (!isSafeRelativePath(value)) return fallback;

  // Percent-encoding must not be able to smuggle a rejected shape past the
  // checks above (e.g. `/%2F%2Fevil.com` decoding to `//evil.com`).
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!isSafeRelativePath(decoded)) return fallback;

  return value;
}
