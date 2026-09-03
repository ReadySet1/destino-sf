/**
 * safeRedirectPath tests
 *
 * Guards the auth redirect surface against open-redirect payloads. Anything that
 * is not an unambiguous same-origin relative path must fall back to the caller's
 * literal default.
 */

import { safeRedirectPath } from '@/lib/auth/safe-redirect';

const FALLBACK = '/fallback';

describe('safeRedirectPath', () => {
  describe('accepts safe same-origin relative paths', () => {
    const accepted: Array<[string, string]> = [
      ['root', '/'],
      ['single segment', '/menu'],
      ['nested segment', '/protected/reset-password'],
      ['path with query string', '/account/orders?tab=1'],
      ['path with fragment', '/a#b'],
      ['path with encoded segment', '/menu/empanadas%20box'],
      ['trailing slash', '/menu/'],
    ];

    it.each(accepted)('returns the value for %s', (_label, value) => {
      expect(safeRedirectPath(value, FALLBACK)).toBe(value);
    });
  });

  describe('rejects unsafe or absent values', () => {
    const rejected: Array<[string, string | null | undefined]> = [
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['whitespace only', '   '],
      ['tab only', '\t'],
      ['relative path without leading slash', 'menu'],
      ['bare host', 'evil.com'],
      ['absolute https url', 'https://evil.com'],
      ['absolute http url', 'http://evil.com'],
      ['uppercase scheme', 'HTTPS://evil.com'],
      ['javascript scheme', 'javascript:alert(1)'],
      ['data scheme', 'data:text/html,<script>alert(1)</script>'],
      ['scheme embedded in a path', '/go?next=https://evil.com'],
      ['protocol relative', '//evil.com'],
      ['protocol relative with path', '//evil.com/menu'],
      ['backslash protocol relative', '/\\evil.com'],
      ['double backslash protocol relative', '/\\\\evil.com'],
      ['leading backslash', '\\evil.com'],
      ['backslash inside path', '/menu\\evil.com'],
      ['leading whitespace before path', ' /menu'],
      ['newline injection', '/menu\nSet-Cookie: a=b'],
      ['carriage return injection', '/menu\r\nLocation: https://evil.com'],
      ['tab injection', '/menu\tevil'],
      ['null byte', '/menu\u0000'],
      ['encoded protocol relative', '/%2F%2Fevil.com'],
      ['encoded protocol relative lowercase', '/%2f%2fevil.com'],
      ['encoded path without leading slash', '%2Fevil'],
      ['encoded backslash', '/%5Cevil.com'],
      ['encoded newline', '/menu%0ASet-Cookie:%20a=b'],
      ['encoded tab', '/menu%09evil'],
      ['encoded scheme', '/%6A%61vascript:alert(1)'],
      ['malformed percent encoding', '/%E0%A4%A'],
      ['lone percent', '/%'],
    ];

    it.each(rejected)('returns the fallback for %s', (_label, value) => {
      expect(safeRedirectPath(value, FALLBACK)).toBe(FALLBACK);
    });
  });

  it('returns the fallback verbatim', () => {
    expect(safeRedirectPath('https://evil.com', '/protected/reset-password')).toBe(
      '/protected/reset-password'
    );
  });

  it('never returns a value that resolves to a foreign origin', () => {
    const payloads = ['//evil.com', '/\\evil.com', 'https://evil.com', '/%2F%2Fevil.com'];

    for (const payload of payloads) {
      const resolved = new URL(safeRedirectPath(payload, FALLBACK), 'https://www.destinosf.com');
      expect(resolved.origin).toBe('https://www.destinosf.com');
    }
  });
});
