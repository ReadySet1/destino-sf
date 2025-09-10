#!/usr/bin/env tsx
import crypto from 'crypto';

/**
 * Test script to verify HMAC calculation matches Square's expected result
 */

// Test data from the latest webhook
const testSecret = 'xysLcWwihbVWY20WBv-EXQ';
const testBodyStart = '{"merchant_id":"MLJD4JJXS3YSP","type":"order.fulfillment.updated","event_id":"a5eaf03d-4f19-336d-8e1';
const expectedFromSquare = 'erToRvNuEMnxpBktSfWWGyuVhPiqZsFp4VPt3hLAfk4=';

console.log('🔍 HMAC Verification Test');
console.log('========================');
console.log('Secret:', testSecret);
console.log('Secret length:', testSecret.length);
console.log('Secret as hex:', Buffer.from(testSecret, 'utf8').toString('hex'));
console.log('Body start:', testBodyStart);
console.log('Expected from Square:', expectedFromSquare);
console.log('');

// Test with the partial body we have
function testHMAC(body: string, label: string) {
  console.log(`🧪 Testing: ${label}`);
  console.log('Body length:', body.length);
  console.log('Body as hex:', Buffer.from(body, 'utf8').toString('hex'));
  
  const hmac = crypto.createHmac('sha256', testSecret);
  hmac.update(body, 'utf8');
  const result = hmac.digest('base64');
  
  console.log('Our calculation:', result);
  console.log('Square expected:', expectedFromSquare);
  console.log('Match:', result === expectedFromSquare);
  console.log('');
  
  return result === expectedFromSquare;
}

// Test with what we know
testHMAC(testBodyStart, 'Partial body from logs');

// Test common variations
testHMAC(testBodyStart + '"', 'Partial body + quote');
testHMAC(testBodyStart + '"}', 'Partial body + closing');

// Test if there are additional characters we're missing
console.log('🔍 Possible issues:');
console.log('1. The full body might have additional content we can\'t see in the preview');
console.log('2. There might be encoding differences between local and Vercel');
console.log('3. Square might be calculating the signature differently');
console.log('');

// Try to reverse-engineer what body would produce the expected signature
console.log('🔄 Reverse engineering...');
console.log('If we need to get:', expectedFromSquare);
console.log('And we use secret:', testSecret);
console.log('The body would need to be something different from what we received');
