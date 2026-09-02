'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const AUTH_CODE_ERROR_PATH = '/auth/auth-code-error';

/**
 * Default landing page for an implicit-flow session, derived from the link type.
 * Mirrors the server-side mapping in /auth/confirm and /auth/callback.
 */
function defaultDestinationForType(type: string | null): string {
  switch (type) {
    case 'recovery':
      return '/protected/reset-password';
    case 'invite':
      return '/setup-password';
    default:
      return '/menu';
  }
}

/**
 * Rescues Supabase implicit-flow links.
 *
 * When the Supabase redirect allowlist rejects a `redirect_to`, the user is
 * dropped on the Site URL (typically the homepage) with the credentials in the
 * URL fragment:
 *
 *   https://www.destinosf.com/#access_token=...&refresh_token=...&type=recovery
 *   https://www.destinosf.com/#error=access_denied&error_code=otp_expired
 *
 * Fragments are never sent to the server, so no Route Handler can see them.
 * This component reads the fragment on mount, establishes the session, scrubs
 * the tokens from the address bar and forwards the user to the right page.
 */
export function AuthFragmentHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawHash = window.location.hash;
    if (!rawHash || rawHash === '#') return;

    const params = new URLSearchParams(rawHash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const errorParam = params.get('error');
    const errorCode = params.get('error_code');

    // Not an auth fragment - leave in-page anchors alone.
    if (!accessToken && !errorParam && !errorCode) return;

    const clearFragment = () => {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    if (errorParam || errorCode) {
      const errorDescription = params.get('error_description');
      clearFragment();
      router.replace(
        errorDescription
          ? `${AUTH_CODE_ERROR_PATH}?error_description=${encodeURIComponent(errorDescription)}`
          : AUTH_CODE_ERROR_PATH
      );
      return;
    }

    if (!accessToken || !refreshToken) return;

    const destination = defaultDestinationForType(params.get('type'));

    const establishSession = async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        clearFragment();

        if (error) {
          console.error('Failed to establish session from URL fragment:', error);
          router.replace(AUTH_CODE_ERROR_PATH);
          return;
        }

        router.replace(destination);
        // Let server components observe the freshly written auth cookies.
        router.refresh();
      } catch (caught) {
        console.error('Unexpected error handling auth URL fragment:', caught);
        clearFragment();
        router.replace(AUTH_CODE_ERROR_PATH);
      }
    };

    void establishSession();
    // Runs once on mount: the fragment is only ever present on the initial load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default AuthFragmentHandler;
