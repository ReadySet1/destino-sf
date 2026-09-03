/**
 * sameOriginRedirect tests
 *
 * Production runs the app in a container behind Traefik + Cloudflare, so
 * `request.url` inside a route handler carries the internal bind origin
 * (`https://0.0.0.0:3000`). Every same-origin redirect must therefore emit a
 * relative `Location`, which the browser resolves against the URL it actually
 * requested.
 */

import { sameOriginRedirect } from '@/lib/auth/redirect-response';

describe('sameOriginRedirect', () => {
  it('defaults to a 307 with the path as a relative Location', () => {
    const response = sameOriginRedirect('/protected/reset-password');

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/protected/reset-password');
  });

  it('honours an explicit 308 status', () => {
    const response = sameOriginRedirect('/menu', 308);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/menu');
  });

  it('preserves query strings verbatim', () => {
    const response = sameOriginRedirect('/sign-in?error=User%20verification%20failed');

    expect(response.headers.get('location')).toBe('/sign-in?error=User%20verification%20failed');
  });

  it('sends no body', async () => {
    const response = sameOriginRedirect('/');

    expect(await response.text()).toBe('');
  });

  describe('defensively falls back to / for anything that is not a rooted path', () => {
    const rejected: Array<[string, string]> = [
      ['absolute https url', 'https://evil.com/x'],
      ['protocol relative url', '//evil.com'],
      ['bare segment', 'menu'],
      ['empty string', ''],
      ['internal bind origin', 'https://0.0.0.0:3000/sign-in'],
    ];

    it.each(rejected)('rejects %s', (_label, value) => {
      expect(sameOriginRedirect(value).headers.get('location')).toBe('/');
    });
  });

  it('never emits an absolute Location', () => {
    const locations = [
      '/protected',
      '/setup-password?email=x%40y.com',
      'https://0.0.0.0:3000/sign-in',
      '//evil.com',
    ].map(path => sameOriginRedirect(path).headers.get('location') as string);

    for (const location of locations) {
      expect(location.startsWith('/')).toBe(true);
      expect(location.startsWith('//')).toBe(false);
      expect(location).not.toContain('://');
      expect(location).not.toContain('0.0.0.0');
    }
  });
});
