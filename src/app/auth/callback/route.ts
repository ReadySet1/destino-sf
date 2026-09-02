import { createClient } from '@/utils/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { sameOriginRedirect } from '@/lib/auth/redirect-response';

const AUTH_CODE_ERROR_PATH = '/auth/auth-code-error';

/**
 * Default landing page after a successful exchange, derived from the link type.
 * Recovery and invite links must land on a password form; everything else keeps
 * the historical `/protected` destination.
 */
function defaultDestinationForType(type: EmailOtpType | null): string {
  switch (type) {
    case 'recovery':
      return '/protected/reset-password';
    case 'invite':
      return '/setup-password';
    default:
      return '/protected';
  }
}

function authCodeErrorPath(description?: string | null): string {
  if (!description) return AUTH_CODE_ERROR_PATH;
  return `${AUTH_CODE_ERROR_PATH}?error_description=${encodeURIComponent(description)}`;
}

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  //
  // Only query-string credentials are visible here. Implicit-flow links put the
  // tokens in the URL fragment, which browsers never send to the server — those
  // are rescued client-side by <AuthFragmentHandler />.
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const redirectTo = requestUrl.searchParams.get('redirect_to');

  const error = requestUrl.searchParams.get('error');
  const errorCode = requestUrl.searchParams.get('error_code');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (error || errorCode) {
    return sameOriginRedirect(authCodeErrorPath(errorDescription));
  }

  // `redirect_to` is attacker-controllable, so it can only ever narrow the
  // destination to another same-origin path.
  const destination = safeRedirectPath(redirectTo, defaultDestinationForType(type));

  if (!code && !token_hash) {
    // Nothing to exchange. Falling through to getUser() here would bounce an
    // anonymous visitor to the sign-in page with a misleading error.
    return sameOriginRedirect(AUTH_CODE_ERROR_PATH);
  }

  const supabase = await createClient();

  // Handle magic link / email verification (OTP) - check this first
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash });
    if (verifyError) {
      console.error('Error verifying OTP:', verifyError);
      return sameOriginRedirect(authCodeErrorPath(verifyError.message));
    }
  }
  // Handle PKCE flow (authorization code) - only if no OTP tokens
  else if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return sameOriginRedirect(authCodeErrorPath(exchangeError.message));
    }
  } else {
    // `token_hash` without a `type` is not a usable credential.
    return sameOriginRedirect(AUTH_CODE_ERROR_PATH);
  }

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('User verification error:', userError);
    return sameOriginRedirect('/sign-in?error=User%20verification%20failed');
  }

  return sameOriginRedirect(destination);
}
