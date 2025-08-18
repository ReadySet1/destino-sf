import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { env } from '@/env'; // Import the validated environment configuration

interface Recommendation {
  issue: string;
  fix: string;
  details?: string[];
  priority: string;
}

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      urls: {
        current_site_url: env.NEXT_PUBLIC_APP_URL,
        callback_url: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        magic_link_redirect: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?redirect_to=/admin`,
      },
      supabase_config_check: {},
      recommendations: [] as Recommendation[],
    };

    // Test Supabase connection
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();

      diagnostics.supabase_config_check = {
        connection_status: error ? 'ERROR' : 'SUCCESS',
        error_message: error?.message || null,
        auth_available: true,
      };
    } catch (err) {
      diagnostics.supabase_config_check = {
        connection_status: 'FAILED',
        error_message: (err as Error).message,
        auth_available: false,
      };
    }

    // Generate recommendations
    const recommendations: Recommendation[] = [];

    if (!env.NEXT_PUBLIC_APP_URL) {
      recommendations.push({
        issue: 'Missing NEXT_PUBLIC_APP_URL',
        fix: 'Add NEXT_PUBLIC_APP_URL=https://development.destinosf.com to your Vercel environment variables',
        priority: 'HIGH',
      });
    }

    if (
      env.NEXT_PUBLIC_APP_URL &&
      !env.NEXT_PUBLIC_APP_URL.startsWith('https://')
    ) {
      recommendations.push({
        issue: 'APP_URL not using HTTPS',
        fix: 'Update NEXT_PUBLIC_APP_URL to use https:// in production',
        priority: 'HIGH',
      });
    }

    recommendations.push({
      issue: 'Supabase Auth Settings',
      fix: 'In your Supabase dashboard, go to Authentication > Settings and verify:',
      details: [
        `Site URL: ${diagnostics.urls.current_site_url}`,
        `Redirect URLs: ${diagnostics.urls.callback_url}`,
        `Additional redirect URLs: ${diagnostics.urls.callback_url}/**`,
        'Confirm email settings are enabled for magic links',
        'Check that "Enable email confirmations" is set correctly',
      ],
      priority: 'HIGH',
    });

    recommendations.push({
      issue: 'Magic Link Flow Configuration',
      fix: 'Ensure Supabase is configured for OTP flow, not PKCE flow for magic links',
      details: [
        'In Supabase dashboard, check Authentication > Settings',
        'Verify "Enable email confirmations" setting',
        'Make sure PKCE is not forced for all flows',
      ],
      priority: 'MEDIUM',
    });

    diagnostics.recommendations = recommendations;

    return NextResponse.json(diagnostics, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to generate diagnostics',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
