#!/usr/bin/env tsx

import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * Test webhook signature validation locally
 * This simulates exactly what Square sends to verify our signature calculation
 */

// Test payload from your logs
const testPayload = {
  merchant_id: 'MLJD4JJXS3YSP',
  type: 'order.created',
  event_id: '7947971b-10f9-36cd-a749-5e953c70f8',
};

const bodyText = JSON.stringify(testPayload);

// Signature from your logs
const receivedSignature = '4vlL2vffXfrn5EWZd8xSWJ5/tdTB4eSullpSAhi2H48=';

// Test with both secrets
const sandboxSecret = process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
const productionSecret = process.env.SQUARE_WEBHOOK_SECRET;

console.log('🔍 Testing Square Webhook Signature Validation\n');
console.log('📦 Test Payload:', bodyText);
console.log('🔏 Received Signature:', receivedSignature);
console.log('');

console.log('🔑 Environment Variables:');
console.log(
  '  SQUARE_WEBHOOK_SECRET (Production):',
  productionSecret ? `${productionSecret.substring(0, 4)}...` : 'NOT SET'
);
console.log(
  '  SQUARE_WEBHOOK_SECRET_SANDBOX:',
  sandboxSecret ? `${sandboxSecret.substring(0, 4)}...` : 'NOT SET'
);
console.log('');

// Test with sandbox secret
if (sandboxSecret) {
  console.log('🧪 Testing with SANDBOX secret:');
  const sandboxSignature = crypto
    .createHmac('sha256', sandboxSecret)
    .update(bodyText)
    .digest('base64');

  console.log('  Expected:', sandboxSignature);
  console.log('  Received:', receivedSignature);
  console.log('  Match:', sandboxSignature === receivedSignature ? '✅ YES' : '❌ NO');
  console.log('');
}

// Test with production secret
if (productionSecret) {
  console.log('🧪 Testing with PRODUCTION secret:');
  const productionSignature = crypto
    .createHmac('sha256', productionSecret)
    .update(bodyText)
    .digest('base64');

  console.log('  Expected:', productionSignature);
  console.log('  Received:', receivedSignature);
  console.log('  Match:', productionSignature === receivedSignature ? '✅ YES' : '❌ NO');
  console.log('');
}

// Test with actual body from logs (partial)
const actualBody =
  '{"merchant_id":"MLJD4JJXS3YSP","type":"order.created","event_id":"7947971b-10f9-36cd-a749-5e953c70f8';

console.log('🧪 Testing with actual body preview from logs:');
if (sandboxSecret) {
  const actualSandboxSignature = crypto
    .createHmac('sha256', sandboxSecret)
    .update(actualBody)
    .digest('base64');

  console.log('  Sandbox Expected:', actualSandboxSignature);
  console.log('  Received:', receivedSignature);
  console.log('  Match:', actualSandboxSignature === receivedSignature ? '✅ YES' : '❌ NO');
}

// Additional debug info
console.log('\n📊 Debug Information:');
console.log('  Body Length:', bodyText.length);
console.log(
  '  Body as Hex (first 100 chars):',
  Buffer.from(bodyText).toString('hex').substring(0, 100)
);

// Test URL encoding scenarios
console.log('\n🔄 Testing URL encoding scenarios:');
const urlEncodedBody = encodeURIComponent(bodyText);
const urlDecodedBody = decodeURIComponent(bodyText);

if (sandboxSecret) {
  const urlEncodedSignature = crypto
    .createHmac('sha256', sandboxSecret)
    .update(urlEncodedBody)
    .digest('base64');

  const urlDecodedSignature = crypto
    .createHmac('sha256', sandboxSecret)
    .update(urlDecodedBody)
    .digest('base64');

  console.log('  URL Encoded Signature:', urlEncodedSignature);
  console.log('  URL Decoded Signature:', urlDecodedSignature);
  console.log(
    '  Normal Signature:',
    crypto.createHmac('sha256', sandboxSecret).update(bodyText).digest('base64')
  );
}

console.log('\n💡 Recommendations:');
if (!sandboxSecret) {
  console.log('  ⚠️  SQUARE_WEBHOOK_SECRET_SANDBOX is not set!');
  console.log('  👉 Add it to your .env.local and Vercel environment variables');
}

console.log('\n🔧 To fix in Vercel:');
console.log('  1. Go to Vercel Dashboard > Settings > Environment Variables');
console.log('  2. Ensure SQUARE_WEBHOOK_SECRET_SANDBOX is set with the sandbox webhook secret');
console.log('  3. The value should be from Square Sandbox Dashboard > Webhooks > Endpoint Details');
console.log('  4. Redeploy your application after adding/updating the variable');
