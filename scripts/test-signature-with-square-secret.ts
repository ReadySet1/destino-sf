#!/usr/bin/env npx tsx

/**
 * Test script to verify what webhook secret should generate the correct signature
 *
 * This will help you verify the correct webhook secret from Square Dashboard
 */

import crypto from 'crypto';

// From your webhook logs - the exact payload Square sent
const webhookBody =
  '{"merchant_id":"MLJD4JJXS3YSP","type":"order.fulfillment.updated","event_id":"7022c8e9-1c8f-399e-90cc-cbec0c43e334","created_at":"2025-09-10T21:34:26.864221978Z","data":{"type":"order_fulfillment_updated","id":"7022c8e9-1c8f-399e-90cc-cbec0c43e334","object":{"order_fulfillment_updated":{"created_at":"2025-09-10T21:34:26.864221978Z","updated_at":"2025-09-10T21:34:26.864221978Z","order_id":"9rVjvNw8NMXgEa88pFJ6C4PqofF","fulfillment_update":{"uid":"nvOEfwlWdl3iYM2X8NKVGC","type":"PICKUP","state":"PROPOSED","pickup_details":{"recipient":{"display_name":"Destino Guest"}},"metadata":{"destination_id":"1234567890"}}}}}}';

// The exact signature Square sent
const squareSignature = 'B+Xpj6r3vIPEq5Ms0E/QWzsQg9rKOx3pUdBsZh2w7Q8=';

console.log('🔐 Testing webhook secret validation\n');
console.log('Square sent signature:', squareSignature);
console.log('Body length:', webhookBody.length);
console.log('Body preview:', webhookBody.substring(0, 100) + '...\n');

// Function to test a webhook secret
function testSecret(secretName: string, secret: string): void {
  if (!secret) {
    console.log(`❌ ${secretName}: NOT SET`);
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(webhookBody)
    .digest('base64');

  const matches = expectedSignature === squareSignature;
  const icon = matches ? '✅' : '❌';

  console.log(`${icon} ${secretName}:`);
  console.log(`   Preview: ${secret.substring(0, 4)}...`);
  console.log(`   Expected: ${expectedSignature}`);
  console.log(`   Matches: ${matches}\n`);
}

// Test with common webhook secret formats
function testCommonSecrets(): void {
  console.log('🧪 Testing common webhook secret formats:\n');

  // Test the hex-decoded version of what we see in logs
  const secretFromLogs = Buffer.from(
    '7879734c63577769686256575932305742762d455851',
    'hex'
  ).toString();
  testSecret('Secret from logs (hex decoded)', secretFromLogs);

  // Test some common prefixes/formats
  const commonSecrets = [
    'whsec_', // Webhook secret prefix
    'xysL', // From your logs preview
    secretFromLogs, // Decoded from logs
  ];

  commonSecrets.forEach((secret, index) => {
    testSecret(`Test secret ${index + 1}`, secret);
  });
}

// Instructions for finding the correct secret
function printInstructions(): void {
  console.log('📋 To find the correct webhook secret:\n');
  console.log('1. Go to https://developer.squareup.com/apps');
  console.log('2. Select your application');
  console.log('3. Click on "Webhooks" in the sidebar');
  console.log('4. Look for your webhook endpoint');
  console.log('5. Click "Show Signature Key" or similar button');
  console.log('6. Copy the webhook signature key EXACTLY (usually starts with "whsec_")');
  console.log('7. Update SQUARE_WEBHOOK_SECRET_SANDBOX in Vercel with this value\n');

  console.log('📝 Command to update Vercel environment variable:');
  console.log('vercel env add SQUARE_WEBHOOK_SECRET_SANDBOX development');
  console.log('vercel env add SQUARE_WEBHOOK_SECRET_SANDBOX preview');
  console.log('vercel env add SQUARE_WEBHOOK_SECRET_SANDBOX production\n');
}

// Main execution
testCommonSecrets();
printInstructions();

console.log('🎯 Once you update the webhook secret:');
console.log('1. Redeploy: vercel --prod (for production) or git push (for preview)');
console.log('2. Test webhook: trigger a new webhook from Square');
console.log('3. Check logs for ✅ signature validation success');
