/**
 * Manual test script for webhook 403 retry fix (Issue #46)
 *
 * Run with: npx tsx scripts/test-webhook-retry-fix.ts
 */

import { determineShouldRetry } from '../src/lib/webhook-retry-utils';
import {
  MerchantMismatchError,
  UnauthorizedError,
  RateLimitError,
  ServerError,
} from '../src/lib/errors/webhook-errors';

console.log('🧪 Testing Webhook 403 Retry Fix (Issue #46)\n');
console.log('=' .repeat(60));

// Test cases
const testCases = [
  {
    name: '403 Merchant Mismatch (Issue #46 scenario)',
    error: { statusCode: 403, message: 'Cannot fetch orders for a different merchant' },
    expectedRetry: false,
  },
  {
    name: 'MerchantMismatchError class',
    error: new MerchantMismatchError('sq_order_123', 'Cannot fetch orders for a different merchant'),
    expectedRetry: false,
  },
  {
    name: '401 Unauthorized',
    error: { statusCode: 401, message: 'Invalid access token' },
    expectedRetry: false,
  },
  {
    name: '400 Bad Request',
    error: { statusCode: 400, message: 'Invalid order ID' },
    expectedRetry: false,
  },
  {
    name: '429 Rate Limit (should retry)',
    error: new RateLimitError(30000),
    expectedRetry: true,
  },
  {
    name: '500 Server Error (should retry)',
    error: new ServerError(500, 'Internal server error'),
    expectedRetry: true,
  },
  {
    name: 'Database connection error (should retry)',
    error: { code: 'P1001', message: "Can't reach database server" },
    expectedRetry: true,
  },
  {
    name: 'Unknown error (should NOT retry - new default)',
    error: new Error('Some random error'),
    expectedRetry: false,
  },
];

let passed = 0;
let failed = 0;

for (const { name, error, expectedRetry } of testCases) {
  console.log(`\n📋 Test: ${name}`);

  const result = determineShouldRetry(error, 'order.created');
  const status = result === expectedRetry ? '✅ PASS' : '❌ FAIL';

  console.log(`   Expected: shouldRetry = ${expectedRetry}`);
  console.log(`   Actual:   shouldRetry = ${result}`);
  console.log(`   Result:   ${status}`);

  if (result === expectedRetry) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n' + '=' .repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! The fix is working correctly.');
  console.log('\n✅ Safe to commit and merge.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
