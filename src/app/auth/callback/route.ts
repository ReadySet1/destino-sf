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

  console.log('🔗 Auth callback received:', {
    code: code ? 'present' : 'missing',
    token_hash: token_hash ? 'present' : 'missing',
    type,
    redirectTo,
    origin
  });

  const supabase = await createClient();

  // Handle PKCE flow (authorization code)
  if (code) {
    console.log('🔄 Processing PKCE code exchange...');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('❌ Error exchanging code for session:', error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
    console.log('✅ PKCE code exchange successful');
  }

  // Handle magic link / email verification (OTP)
  if (token_hash && type) {
    console.log('🪄 Processing magic link OTP verification...');
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (error) {
      console.error('❌ Error verifying OTP:', error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
    console.log('✅ Magic link OTP verification successful');
  }

  // Verify session was created
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('❌ Session verification error:', sessionError);
    return NextResponse.redirect(`${origin}/sign-in?error=Session verification failed`);
  }

  if (!session) {
    console.error('❌ No session found after authentication');
    return NextResponse.redirect(`${origin}/sign-in?error=Authentication failed - no session created`);
  }

  console.log('✅ Session verified for user:', session.user.email);

  // If we have a redirect_to parameter, use it
  if (redirectTo) {
    console.log('🎯 Redirecting to specified URL:', redirectTo);
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Default redirect after successful authentication
  console.log('🎯 Redirecting to default protected page');
  return NextResponse.redirect(`${origin}/protected`);
}
