/**
 * /auth/callback route tests
 *
 * The callback route handles the server-side (PKCE `code`) flow and the
 * `token_hash` OTP flow. It can never see the URL fragment, so an implicit-flow
 * landing must be treated as an error rather than silently falling through to a
 * `getUser()` check that would redirect an anonymous visitor.
 */

// === Mocks (must be before imports) ===

const mockVerifyOtp = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockGetUser = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({ getAll: () => [], set: jest.fn() })),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
        exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
        getUser: (...args: unknown[]) => mockGetUser(...args),
      },
    })
  ),
}));

import { GET } from '@/app/auth/callback/route';

// === Helpers ===

const BASE = 'http://localhost:3000';

const buildRequest = (query: string): Request => new Request(`${BASE}/auth/callback${query}`);

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

describe('GET /auth/callback', () => {
  beforeEach(() => {
    mockVerifyOtp.mockReset().mockResolvedValue({ error: null });
    mockExchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    mockGetUser.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redirects to auth-code-error when supabase returns error params', async () => {
    const response = await GET(
      buildRequest(
        '?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
      )
    );

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe(
      `/auth/auth-code-error?error_description=${encodeURIComponent('Email link is invalid or has expired')}`
    );
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects to auth-code-error when neither code nor token_hash is present', async () => {
    const response = await GET(buildRequest(''));

    expect(response.status).toBe(307);
    expect(locationOf(response)).toBe('/auth/auth-code-error');
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('does not fall through to getUser for an implicit-flow landing with only a type', async () => {
    const response = await GET(buildRequest('?type=recovery'));

    expect(locationOf(response)).toBe('/auth/auth-code-error');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('sends a verified recovery token_hash to the reset password page', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=recovery'));

    expect(mockVerifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });
    expect(locationOf(response)).toBe('/protected/reset-password');
  });

  it('sends a verified invite token_hash to the setup password page', async () => {
    const response = await GET(buildRequest('?token_hash=abc&type=invite'));

    expect(locationOf(response)).toBe('/setup-password');
  });

  it('sends a successful code exchange to /protected', async () => {
    const response = await GET(buildRequest('?code=pkce-code'));

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
    expect(locationOf(response)).toBe('/protected');
  });

  it('honours a safe relative redirect_to', async () => {
    const response = await GET(buildRequest('?code=pkce-code&redirect_to=%2Faccount%2Forders'));

    expect(locationOf(response)).toBe('/account/orders');
  });

  it('ignores a protocol-relative redirect_to', async () => {
    const response = await GET(buildRequest('?code=pkce-code&redirect_to=%2F%2Fevil.com'));

    expect(locationOf(response)).toBe('/protected');
    expect(response.headers.get('location')).not.toContain('evil.com');
  });

  it('ignores an absolute redirect_to', async () => {
    const response = await GET(
      buildRequest('?token_hash=abc&type=recovery&redirect_to=https%3A%2F%2Fevil.com')
    );

    expect(locationOf(response)).toBe('/protected/reset-password');
    expect(response.headers.get('location')).not.toContain('evil.com');
  });

  it('redirects to auth-code-error when the code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid request' } });

    const response = await GET(buildRequest('?code=pkce-code'));

    expect(locationOf(response)).toBe(
      `/auth/auth-code-error?error_description=${encodeURIComponent('invalid request')}`
    );
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects to auth-code-error when verifyOtp fails', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'Token has expired' } });

    const response = await GET(buildRequest('?token_hash=abc&type=recovery'));

    expect(locationOf(response)).toBe(
      `/auth/auth-code-error?error_description=${encodeURIComponent('Token has expired')}`
    );
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects to sign-in when the post-exchange user check fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

    const response = await GET(buildRequest('?code=pkce-code'));

    expect(locationOf(response)).toBe('/sign-in?error=User%20verification%20failed');
  });

  /**
   * Regression: behind Traefik + Cloudflare `request.url` resolves to the
   * container bind origin, so an absolute Location built from it pointed at
   * `https://0.0.0.0:3000/...` — unreachable from a browser.
   */
  describe('never emits an absolute Location', () => {
    const queries: Array<[string, string]> = [
      ['error params', '?error=access_denied&error_code=otp_expired'],
      ['no credentials', ''],
      ['recovery token_hash', '?token_hash=abc&type=recovery'],
      ['invite token_hash', '?token_hash=abc&type=invite'],
      ['pkce code', '?code=pkce-code'],
      ['safe redirect_to', '?code=pkce-code&redirect_to=%2Faccount%2Forders'],
      ['hostile redirect_to', '?code=pkce-code&redirect_to=https%3A%2F%2Fevil.com'],
    ];

    it.each(queries)('%s', async (_label, query) => {
      const location = locationOf(await GET(buildRequest(query)));

      expect(location.startsWith('/')).toBe(true);
      expect(location.startsWith('//')).toBe(false);
      expect(location).not.toContain('://');
      expect(location).not.toContain('0.0.0.0');
    });

    it('also holds when the user check fails', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

      const location = locationOf(await GET(buildRequest('?code=pkce-code')));

      expect(location).toBe('/sign-in?error=User%20verification%20failed');
      expect(location).not.toContain('0.0.0.0');
      expect(location).not.toContain('://');
    });

    it('also holds when the request itself arrives on the internal bind origin', async () => {
      const response = await GET(
        new Request('https://0.0.0.0:3000/auth/callback?token_hash=abc&type=recovery')
      );

      expect(locationOf(response)).toBe('/protected/reset-password');
    });
  });
});
