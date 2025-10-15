#!/usr/bin/env node

/**
 * Verify Vercel Environment Variables for Square Webhooks
 * Run this locally to check your Vercel configuration
 */

const { execSync } = require('child_process');

console.log('🔍 Checking Vercel Environment Variables for Square Webhooks\n');

try {
  // Get Vercel environment variables
  const output = execSync('vercel env ls', { encoding: 'utf-8' });

  console.log('📋 All Environment Variables:');
  console.log(output);

  // Check for specific webhook-related variables
  const lines = output.split('\n');
  const webhookVars = lines.filter(
    line =>
      line.includes('SQUARE_WEBHOOK') ||
      line.includes('DATABASE_URL') ||
      line.includes('DIRECT_DATABASE_URL')
  );

  console.log('\n🔑 Webhook-Related Variables:');
  if (webhookVars.length > 0) {
    webhookVars.forEach(v => console.log('  ', v));
  } else {
    console.log('  ❌ No webhook-related variables found!');
  }

  // Check for required variables
  const hasProductionSecret = lines.some(
    line => line.includes('SQUARE_WEBHOOK_SECRET') && !line.includes('SANDBOX')
  );
  const hasSandboxSecret = lines.some(line => line.includes('SQUARE_WEBHOOK_SECRET_SANDBOX'));
  const hasDatabaseUrl = lines.some(line => line.includes('DATABASE_URL'));

  console.log('\n✅ Required Variables Check:');
  console.log('  DATABASE_URL:', hasDatabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('  SQUARE_WEBHOOK_SECRET:', hasProductionSecret ? '✅ Set' : '❌ Missing');
  console.log(
    '  SQUARE_WEBHOOK_SECRET_SANDBOX:',
    hasSandboxSecret ? '✅ Set' : '⚠️  Missing (needed for sandbox)'
  );

  if (!hasSandboxSecret) {
    console.log('\n⚠️  WARNING: SQUARE_WEBHOOK_SECRET_SANDBOX is not set!');
    console.log('This is required to validate webhooks from Square Sandbox environment.\n');
    console.log('To fix this:');
    console.log('1. Get your sandbox webhook signature key from Square Dashboard:');
    console.log('   https://sandbox.squareup.com/dashboard/webhooks');
    console.log('2. Add it to Vercel:');
    console.log('   vercel env add SQUARE_WEBHOOK_SECRET_SANDBOX');
    console.log('3. Or add it via Vercel Dashboard:');
    console.log('   https://vercel.com/[your-team]/[your-project]/settings/environment-variables');
    console.log('4. Redeploy your application after adding the variable');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. Ensure all required environment variables are set in Vercel');
  console.log('2. The webhook secrets must match exactly what Square provides');
  console.log('3. After adding/updating variables, redeploy your application');
  console.log('4. Test webhooks using Square Sandbox webhook tester');
} catch (error) {
  console.error('❌ Error checking Vercel environment:', error.message);
  console.log('\nMake sure you have Vercel CLI installed and are logged in:');
  console.log('  npm i -g vercel');
  console.log('  vercel login');
}
