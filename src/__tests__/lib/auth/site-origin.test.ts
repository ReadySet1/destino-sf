/**
 * siteOrigin / resolveRequestOrigin tests
 *
 * `NEXT_PUBLIC_SITE_URL` is configured with a trailing slash in the repo Actions
 * variables (`https://www.destinosf.com/`). Concatenating it directly produced
 * `https://www.destinosf.com//auth/callback`, so every caller must go through
 * `siteOrigin()` instead.
 */

import { resolveRequestOrigin, siteOrigin } from '@/lib/auth/site-origin';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const setSiteUrl = (value: string | undefined): void => {
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    return;
  }
  process.env.NEXT_PUBLIC_SITE_URL = value;
};

afterEach(() => {
  setSiteUrl(ORIGINAL_SITE_URL);
});

describe('siteOrigin', () => {
  it('strips a single trailing slash', () => {
    setSiteUrl('https://www.destinosf.com/');

    expect(siteOrigin()).toBe('https://www.destinosf.com');
  });

  it('strips multiple trailing slashes', () => {
    setSiteUrl('https://www.destinosf.com///');

    expect(siteOrigin()).toBe('https://www.destinosf.com');
  });

  it('leaves an origin without a trailing slash unchanged', () => {
    setSiteUrl('https://development.destinosf.com');

    expect(siteOrigin()).toBe('https://development.destinosf.com');
  });

  it('falls back to localhost when unset', () => {
    setSiteUrl(undefined);

    expect(siteOrigin()).toBe('http://localhost:3000');
  });

  it('falls back to localhost when empty', () => {
    setSiteUrl('');

    expect(siteOrigin()).toBe('http://localhost:3000');
  });

  it('falls back to localhost when only whitespace', () => {
    setSiteUrl('   ');

    expect(siteOrigin()).toBe('http://localhost:3000');
  });

  it('produces a single slash when joined with a rooted path', () => {
    setSiteUrl('https://www.destinosf.com/');

    expect(`${siteOrigin()}/auth/callback`).toBe('https://www.destinosf.com/auth/callback');
  });
});

describe('resolveRequestOrigin', () => {
  it('prefers the request origin header', () => {
    setSiteUrl('https://www.destinosf.com/');

    expect(resolveRequestOrigin('https://development.destinosf.com')).toBe(
      'https://development.destinosf.com'
    );
  });

  it('strips a trailing slash from the header value', () => {
    expect(resolveRequestOrigin('https://www.destinosf.com/')).toBe('https://www.destinosf.com');
  });

  describe('falls back to siteOrigin when the header is unusable', () => {
    const unusable: Array<[string, string | null | undefined]> = [
      ['missing header', null],
      ['undefined header', undefined],
      ['empty header', ''],
      ['whitespace header', '  '],
      ['literal null origin', 'null'],
    ];

    it.each(unusable)('%s', (_label, header) => {
      setSiteUrl('https://www.destinosf.com/');

      expect(resolveRequestOrigin(header)).toBe('https://www.destinosf.com');
    });
  });

  it('never yields the string "null" in a template literal', () => {
    setSiteUrl(undefined);

    expect(`${resolveRequestOrigin(null)}/auth/callback`).toBe(
      'http://localhost:3000/auth/callback'
    );
  });
});
