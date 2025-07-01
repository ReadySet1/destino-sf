#!/usr/bin/env tsx

/**
 * Test script to verify magic link configuration
 * Run this after updating Vercel environment variables
 */

async function testMagicLinkConfig() {
  console.log('🧪 Testing Magic Link Configuration');
  console.log('=' .repeat(50));

  // Test environment variables
  console.log('\n🔍 Environment Check:');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missingVars: string[] = [];
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 30)}...`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('\n⚠️  Missing environment variables. Add these to Vercel:');
    missingVars.forEach(varName => {
      console.log(`   ${varName}=your_value_here`);
    });
  }

  // Test URLs
  console.log('\n🔗 Expected Magic Link Flow:');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log('1. User requests magic link at:', `${baseUrl}/sign-in`);
  console.log('2. Magic link email contains link to:', `${baseUrl}/auth/callback?token_hash=...&type=magiclink`);
  console.log('3. After verification, redirects to:', `${baseUrl}/protected or ${baseUrl}/admin`);

  console.log('\n📧 Supabase Settings to Verify:');
  console.log(`Site URL: ${baseUrl}`);
  console.log(`Redirect URLs:`);
  console.log(`  - ${baseUrl}/auth/callback`);
  console.log(`  - ${baseUrl}/auth/callback/**`);
  
  if (baseUrl.includes('localhost')) {
    console.log('\n💡 For production, also add:');
    console.log('  - https://your-production-domain.vercel.app/auth/callback');
    console.log('  - https://your-production-domain.vercel.app/auth/callback/**');
  }

  console.log('\n🔧 Debugging Steps:');
  console.log('1. Check browser network tab when clicking magic link');
  console.log('2. Look for console errors in auth/callback route');
  console.log('3. Verify email contains correct callback URL');
  console.log('4. Test with different browsers/incognito mode');
}

testMagicLinkConfig().catch(console.error); 