/**
 * setupPasswordCallbackUrl tests
 *
 * The admin "invite user" / "resend setup" flows previously concatenated
 * `NEXT_PUBLIC_SITE_URL` (which carries a trailing slash) with a raw nested
 * query string, producing
 * `https://www.destinosf.com//auth/callback?redirect_to=/setup-password?email=…`
 * — a double slash plus a malformed second `?`.
 */

import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { setupPasswordCallbackUrl } from '@/lib/auth/invite-links';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe('setupPasswordCallbackUrl', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.destinosf.com/';
  });

  it('never emits a double slash after the origin', () => {
    const url = setupPasswordCallbackUrl('user@example.com');

    expect(url.startsWith('https://www.destinosf.com/auth/callback?')).toBe(true);
    expect(url).not.toContain('.com//');
  });

  it('carries the destination as a single encoded redirect_to parameter', () => {
    const url = new URL(setupPasswordCallbackUrl('user@example.com'));

    expect([...url.searchParams.keys()]).toEqual(['redirect_to']);
    expect(url.searchParams.get('redirect_to')).toBe('/setup-password?email=user%40example.com');
  });

  it('encodes a plus-addressed email without losing the tag', () => {
    const url = new URL(setupPasswordCallbackUrl('user+tag@example.com'));
    const redirectTo = url.searchParams.get('redirect_to') as string;

    expect(redirectTo).toBe('/setup-password?email=user%2Btag%40example.com');
    expect(new URLSearchParams(redirectTo.split('?')[1]).get('email')).toBe('user+tag@example.com');
  });

  it('falls back to localhost when the site url is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(
      setupPasswordCallbackUrl('user@example.com').startsWith('http://localhost:3000/auth/')
    ).toBe(true);
  });

  /**
   * The callback route reads `redirect_to` with `searchParams.get()`, which
   * percent-decodes once. Whatever that yields has to survive the open-redirect
   * guard, or the invite silently lands on `/protected` instead.
   */
  describe('survives the /auth/callback validation chain', () => {
    const emails = ['user@example.com', 'user+tag@example.com', "o'brien@example.com"];

    it.each(emails)('%s', email => {
      const decodedOnce = new URL(setupPasswordCallbackUrl(email)).searchParams.get(
        'redirect_to'
      ) as string;

      expect(safeRedirectPath(decodedOnce, '/protected')).toBe(decodedOnce);
      expect(decodedOnce.startsWith('/setup-password?email=')).toBe(true);
    });
  });
});
