import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString();

  const supabase = await createClient();

  // Handle magic link / email verification (OTP) - Check this first
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (error) {
      console.error('Error verifying OTP:', error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  }
  // Handle PKCE flow (authorization code) - Only if no OTP tokens
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Error exchanging code for session:', error);

      // Check if this might be a magic link incorrectly sent as PKCE
      if (error.message?.includes('code challenge') || error.message?.includes('code verifier')) {
        // Try to extract potential magic link parameters from the URL
        const urlFragment = requestUrl.hash;
        if (urlFragment) {
          const hashParams = new URLSearchParams(urlFragment.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Failed to set session from URL fragment:', sessionError);
              return NextResponse.redirect(`${origin}/auth/auth-code-error`);
            }
          } else {
            return NextResponse.redirect(`${origin}/auth/auth-code-error`);
          }
        } else {
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }
      } else {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }
    }
  }

  // Verify user is authenticated
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('User verification error:', userError);
    return NextResponse.redirect(`${origin}/sign-in?error=User verification failed`);
  }

  // If we have a redirect_to parameter, use it
  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Default redirect after successful authentication
  return NextResponse.redirect(`${origin}/protected`);
}
