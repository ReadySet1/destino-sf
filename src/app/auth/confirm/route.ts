import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { sameOriginRedirect } from '@/lib/auth/redirect-response';

export const dynamic = 'force-dynamic';

const AUTH_CODE_ERROR_PATH = '/auth/auth-code-error';

/**
 * Default landing page for a confirmed OTP, derived from the link type.
 * Recovery and invite links must land on a password form; everything else
 * (magic link, signup, email change) goes home.
 */
function defaultDestinationForType(type: EmailOtpType | null): string {
  switch (type) {
    case 'recovery':
      return '/protected/reset-password';
    case 'invite':
      return '/setup-password';
    default:
      return '/';
  }
}

function authCodeErrorPath(description?: string | null): string {
  if (!description) return AUTH_CODE_ERROR_PATH;
  return `${AUTH_CODE_ERROR_PATH}?error_description=${encodeURIComponent(description)}`;
}

/**
 * Handles the `token_hash` email-link style used by the Supabase Recovery,
 * Magic Link and Invite templates:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 *
 * Unlike the implicit flow, everything needed lives in the query string, so the
 * session can be established server-side before the user sees a page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  // Supabase reports expired / already-used links by appending error params
  // rather than a usable token.
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (error || errorCode) {
    return sameOriginRedirect(authCodeErrorPath(errorDescription));
  }

  if (!token_hash || !type) {
    return sameOriginRedirect(AUTH_CODE_ERROR_PATH);
  }

  // `next` is attacker-controllable, so it can only ever narrow the destination
  // to another same-origin path.
  const destination = safeRedirectPath(next, defaultDestinationForType(type));

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash });

  if (verifyError) {
    console.error('Error verifying OTP on /auth/confirm:', verifyError);
    return sameOriginRedirect(authCodeErrorPath(verifyError.message));
  }

  return sameOriginRedirect(destination);
}
