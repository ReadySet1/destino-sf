/**
 * AuthFragmentHandler tests
 *
 * Supabase implicit-flow links drop the user on an arbitrary page with the
 * tokens in the URL fragment. The fragment is never sent to the server, so this
 * client component is the only thing that can rescue that session.
 */

import { render, waitFor } from '@testing-library/react';

// === Mocks (must be before imports) ===

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockSetSession = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
    push: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...args),
    },
  })),
}));

import { AuthFragmentHandler } from '@/components/auth/AuthFragmentHandler';

// === Helpers ===

const setHash = (hash: string): void => {
  window.history.replaceState(null, '', `/${hash}`);
};

describe('AuthFragmentHandler', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockRefresh.mockReset();
    mockSetSession.mockReset().mockResolvedValue({ data: { session: {} }, error: null });
    window.history.replaceState(null, '', '/');
  });

  it('renders nothing', () => {
    const { container } = render(<AuthFragmentHandler />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does nothing when there is no fragment', async () => {
    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does nothing for an unrelated fragment', async () => {
    setHash('#section-menu');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#section-menu');
  });

  it('routes an error fragment to auth-code-error without touching the session', async () => {
    setHash(
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    );

    render(<AuthFragmentHandler />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/auth/auth-code-error?error_description=${encodeURIComponent('Email link is invalid or has expired')}`
      )
    );
    expect(mockSetSession).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('routes an error_code-only fragment to auth-code-error', async () => {
    setHash('#error_code=otp_expired');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/auth-code-error'));
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('sets the session and routes a recovery fragment to the reset password page', async () => {
    setHash('#access_token=a&refresh_token=b&type=recovery');

    render(<AuthFragmentHandler />);

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'b' })
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/protected/reset-password'));
    expect(mockRefresh).toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('routes an invite fragment to the setup password page', async () => {
    setHash('#access_token=a&refresh_token=b&type=invite');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/setup-password'));
  });

  it('routes any other successful fragment to the menu', async () => {
    setHash('#access_token=a&refresh_token=b&type=magiclink');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/menu'));
  });

  it('routes to auth-code-error when setSession fails', async () => {
    mockSetSession.mockResolvedValue({ data: { session: null }, error: { message: 'bad token' } });
    setHash('#access_token=a&refresh_token=b&type=recovery');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/auth-code-error'));
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('routes to auth-code-error when setSession throws', async () => {
    mockSetSession.mockRejectedValue(new Error('network down'));
    setHash('#access_token=a&refresh_token=b&type=recovery');

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/auth/auth-code-error'));

    consoleError.mockRestore();
  });

  it('ignores an access_token fragment with no refresh_token', async () => {
    setHash('#access_token=a&type=recovery');

    render(<AuthFragmentHandler />);

    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
