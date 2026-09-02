/**
 * /auth/confirm route tests
 *
 * The confirm route handles the `token_hash` email-link style (Recovery, Magic
 * Link, Invite). It must never follow an attacker-controlled `next`, and must
 * land on /auth/auth-code-error for every failure mode.
 */

import { NextRequest } from 'next/server';

// === Mocks (must be before imports) ===

const mockVerifyOtp = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: jest.fn() })),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      },
    })
  ),
}));

import { GET } from '@/app/auth/confirm/route';

// === Helpers ===

const BASE = 'http://localhost:3000';

const buildRequest = (query: string): NextRequest =>
  new NextRequest(`${BASE}/auth/confirm${query}`);

/**
 * The route must emit a *relative* Location, so the raw header is the assertion
 * target. Parsing it as an absolute URL would hide the very regression these
 * tests exist to catch.
 */
const locationOf = (response: Response): string => {
  const location = response.headers.get('location');
  if (!location) throw new Error('Expected a location header');
  return location;
};

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    mockVerifyOtp.mockReset();
    mockVerifyOtp.mockResolvedValue({ error: null });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redirects to auth-code-error when token_hash is missing', async () => {
    const response = await GET(buildRequest('?type=recovery'));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe('/auth/auth-code-error');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('redirects to auth-code-error when type is missing', async () => {
    const response = await GET(buildRequest('?token_hash=abc'));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe('/auth/auth-code-error');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('redirects to auth-code-error on supabase error params without calling verifyOtp', async () => {
    const response = await GET(
      buildRequest(
        '?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&token_hash=abc&type=recovery'
      )
    );

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe(
      `/auth/auth-code-error?error_description=${encodeURIComponent('Email link is invalid or has expired')}`
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('redirects to auth-code-error when only error_code is present', async () => {
    const response = await GET(
      buildRequest('?error_code=otp_expired&token_hash=abc&type=recovery')
    );

    expect(locationOf(response)).toBe('/auth/auth-code-error');
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('sends a successful recovery confirmation to the reset password page', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=recovery'));

    expect(response.status).toBe(307);
    expect(mockVerifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });
    expect(locationOf(response)).toBe('/protected/reset-password');
  });

  it('sends a successful invite confirmation to the setup password page', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=invite'));

    expect(locationOf(response)).toBe('/setup-password');
  });

  it('sends any other successful confirmation to the home page', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=magiclink'));

    expect(locationOf(response)).toBe('/');
  });

  it('ignores an absolute `next` and falls back to the type default', async () => {
    const response = await GET(
      buildRequest('?token_hash=abc&type=recovery&next=https%3A%2F%2Fevil.com')
    );

    expect(locationOf(response)).toBe('/protected/reset-password');
    expect(response.headers.get('location')).not.toContain('evil.com');
  });

  it('ignores a protocol-relative `next` and falls back to the type default', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=recovery&next=%2F%2Fevil.com'));

    expect(locationOf(response)).toBe('/protected/reset-password');
    expect(response.headers.get('location')).not.toContain('evil.com');
  });

  it('honours a safe relative `next`', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=magiclink&next=%2Faccount'));

    expect(locationOf(response)).toBe('/account');
  });

  it('redirects to auth-code-error when verifyOtp fails', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } });

    const response = await GET(buildRequest('?token_hash=abc&type=recovery'));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe(
      `/auth/auth-code-error?error_description=${encodeURIComponent('Token has expired')}`
    );
  });

  it('never redirects to /error', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'nope' } });

    const response = await GET(buildRequest('?token_hash=abc&type=recovery'));

    expect(locationOf(response).split('?')[0]).not.toBe('/error');
  });

  /**
   * Regression: behind Traefik + Cloudflare `request.url` resolves to the
   * container bind origin, so an absolute Location built from it pointed at
   * `https://0.0.0.0:3000/...` — unreachable from a browser.
   */
  describe('never emits an absolute Location', () => {
    const queries: Array<[string, string]> = [
      ['missing token_hash', '?type=recovery'],
      ['missing type', '?token_hash=abc'],
      ['error params', '?error=access_denied&error_code=otp_expired'],
      ['recovery confirmation', '?token_hash=abc&type=recovery'],
      ['invite confirmation', '?token_hash=abc&type=invite'],
      ['magic link confirmation', '?token_hash=abc&type=magiclink'],
      ['safe next', '?token_hash=abc&type=magiclink&next=%2Faccount'],
      ['hostile next', '?token_hash=abc&type=recovery&next=https%3A%2F%2Fevil.com'],
    ];

    it.each(queries)('%s', async (_label, query) => {
      const location = locationOf(await GET(buildRequest(query)));

      expect(location.startsWith('/')).toBe(true);
      expect(location.startsWith('//')).toBe(false);
      expect(location).not.toContain('://');
      expect(location).not.toContain('0.0.0.0');
    });

    it('also holds when verifyOtp fails', async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } });

      const location = locationOf(await GET(buildRequest('?token_hash=abc&type=recovery')));

      expect(location).not.toContain('0.0.0.0');
      expect(location).not.toContain('://');
      expect(location.startsWith('/')).toBe(true);
    });

    it('also holds when the request itself arrives on the internal bind origin', async () => {
      const response = await GET(
        new NextRequest('https://0.0.0.0:3000/auth/confirm?token_hash=abc&type=recovery')
      );

      expect(locationOf(response)).toBe('/protected/reset-password');
    });
  });
});
