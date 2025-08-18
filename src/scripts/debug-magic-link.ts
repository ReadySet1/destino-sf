#!/usr/bin/env tsx

import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';

async function debugMagicLink() {
  console.log('🔍 Magic Link Authentication Debug Report');
  console.log('='.repeat(50));

  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(
    'NEXT_PUBLIC_SUPABASE_URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'
  );
  console.log(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY:',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
  );
  console.log(
    'NEXT_PUBLIC_APP_URL:',
    process.env.NEXT_PUBLIC_APP_URL ? `✅ ${process.env.NEXT_PUBLIC_APP_URL}` : '❌ Missing'
  );

  // Test Supabase connection
  console.log('\n🔌 Supabase Connection:');
  try {
    const supabase = await createClient();
    // Note: Using getSession() here is acceptable for debugging purposes only
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Supabase auth error:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
      console.log('Current session:', data.session ? 'Active' : 'None');
    }
  } catch (error) {
    console.log('❌ Supabase connection failed:', error);
  }

  // Test database connection
  console.log('\n🗄️  Database Connection:');
  try {
    const profileCount = await prisma.profile.count();
    console.log(`✅ Database connected - ${profileCount} profiles found`);
  } catch (error) {
    console.log('❌ Database connection failed:', error);
  }

  // Check auth callback route
  console.log('\n🔗 Auth Routes:');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log(`Callback URL: ${baseUrl}/auth/callback`);
  console.log(`Protected URL: ${baseUrl}/protected`);
  console.log(`Sign-in URL: ${baseUrl}/sign-in`);

  console.log('\n📝 Recommendations:');
  console.log('1. Ensure NEXT_PUBLIC_APP_URL is set in Vercel environment variables');
  console.log('2. Check Supabase Auth settings > URL Configuration');
  console.log('3. Verify Site URL and Redirect URLs in Supabase dashboard');
  console.log('4. Test magic link in browser developer tools Network tab');

  console.log('\n🔧 Supabase Auth Settings to Verify:');
  console.log(`Site URL: ${baseUrl}`);
  console.log(`Redirect URLs: ${baseUrl}/auth/callback, ${baseUrl}/auth/callback/**`);
}

debugMagicLink().catch(console.error);
