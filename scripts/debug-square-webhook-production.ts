#!/usr/bin/env ts-node
/**
 * Debug script for Square webhook signature issues in production
 * This script helps diagnose and fix webhook signature validation problems
 */
import { config } from 'dotenv';

// Load environment variables
config();

interface WebhookDebugInfo {
  environment: {
    NODE_ENV: string | undefined;
    VERCEL_ENV: string | undefined;
    hasWebhookSecret: boolean;
    hasWebhookSecretSandbox: boolean;
    secretLength: number;
    secretSandboxLength: number;
  };
  recommendations: string[];
  nextSteps: string[];
}

function debugSquareWebhookConfiguration(): WebhookDebugInfo {
  const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
  const webhookSecretSandbox = process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;

  const debugInfo: WebhookDebugInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      hasWebhookSecret: !!webhookSecret,
      hasWebhookSecretSandbox: !!webhookSecretSandbox,
      secretLength: webhookSecret?.length || 0,
      secretSandboxLength: webhookSecretSandbox?.length || 0,
    },
    recommendations: [],
    nextSteps: [],
  };

  // Analyze the configuration
  if (!webhookSecret) {
    debugInfo.recommendations.push(
      '❌ SQUARE_WEBHOOK_SECRET is missing from environment variables'
    );
    debugInfo.nextSteps.push('Add SQUARE_WEBHOOK_SECRET to your production environment');
  } else {
    debugInfo.recommendations.push('✅ SQUARE_WEBHOOK_SECRET is properly configured');
  }

  if (!webhookSecretSandbox) {
    debugInfo.recommendations.push(
      '⚠️ SQUARE_WEBHOOK_SECRET_SANDBOX is missing from environment variables'
    );
    debugInfo.nextSteps.push(
      'Add SQUARE_WEBHOOK_SECRET_SANDBOX to your sandbox environment for testing'
    );
  } else {
    debugInfo.recommendations.push('✅ SQUARE_WEBHOOK_SECRET_SANDBOX is properly configured');
  }

  // Environment-specific recommendations
  if (debugInfo.environment.NODE_ENV === 'production') {
    debugInfo.recommendations.push('🔍 Running in PRODUCTION environment');
    if (!webhookSecret) {
      debugInfo.nextSteps.push('CRITICAL: Production requires SQUARE_WEBHOOK_SECRET');
    }
  }

  // Square Developer Dashboard recommendations
  debugInfo.nextSteps.push('🔧 Verify Square Developer Dashboard webhook configuration:');
  debugInfo.nextSteps.push('   1. Go to https://developer.squareup.com/apps');
  debugInfo.nextSteps.push('   2. Select your application');
  debugInfo.nextSteps.push('   3. Navigate to "Webhooks" section');
  debugInfo.nextSteps.push('   4. Ensure webhook endpoint URL is correct');
  debugInfo.nextSteps.push('   5. Verify "Enable Signature" is checked');
  debugInfo.nextSteps.push('   6. Confirm webhook events are properly configured');

  return debugInfo;
}

async function testWebhookEndpoint(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/square/debug`;

  console.log('🧪 Testing webhook debug endpoint...');

  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const debugData = await response.json();
      console.log('✅ Webhook debug endpoint is accessible');
      console.log('Debug data:', JSON.stringify(debugData, null, 2));
    } else {
      console.log('❌ Webhook debug endpoint returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Failed to reach webhook debug endpoint:', error);
  }
}

function generateSquareWebhookTestCurl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app';
  const webhookUrl = `${baseUrl}/api/webhooks/square`;

  const testPayload = {
    merchant_id: 'test_merchant',
    type: 'order.created',
    event_id: 'test_event_' + Date.now(),
    created_at: new Date().toISOString(),
    data: {
      type: 'order',
      id: 'test_order_123',
      object: {
        order: {
          id: 'test_order_123',
          state: 'OPEN',
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    },
  };

  return `# Test Square webhook endpoint (without signature)
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Square-Webhooks/1.0" \\
  -d '${JSON.stringify(testPayload, null, 2)}'

# Test with debug headers
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: Square-Webhooks/1.0" \\
  -H "X-Debug-Test: true" \\
  -d '${JSON.stringify(testPayload, null, 2)}'`;
}

async function main() {
  console.log('🔍 Square Webhook Production Debug Tool\n');

  console.log('1. Environment Configuration Analysis:');
  console.log('=====================================');
  const debugInfo = debugSquareWebhookConfiguration();

  console.log('Environment Details:');
  console.log(JSON.stringify(debugInfo.environment, null, 2));

  console.log('\nRecommendations:');
  debugInfo.recommendations.forEach(rec => console.log(`  ${rec}`));

  console.log('\nNext Steps:');
  debugInfo.nextSteps.forEach(step => console.log(`  ${step}`));

  console.log('\n2. Webhook Endpoint Test:');
  console.log('=========================');
  await testWebhookEndpoint();

  console.log('\n3. Manual Test Commands:');
  console.log('========================');
  console.log(generateSquareWebhookTestCurl());

  console.log('\n4. Production Monitoring:');
  console.log('=========================');
  console.log('After deploying the fix, monitor these:');
  console.log('  • Vercel function logs for webhook signature debugging info');
  console.log('  • Error monitoring alerts for "signature_missing_non_blocking" events');
  console.log('  • Square Developer Dashboard webhook delivery status');
  console.log('  • Webhook processing success/failure rates');

  console.log('\n5. If Square is not sending signatures:');
  console.log('======================================');
  console.log('  • Check Square Developer Dashboard webhook configuration');
  console.log('  • Ensure "Enable Signature" checkbox is checked');
  console.log('  • Verify webhook endpoint URL matches your production URL');
  console.log('  • Contact Square support if signature headers are still missing');
  console.log(
    '  • The updated code now allows processing without signatures in production (with logging)'
  );
}

// Run the debug script
if (require.main === module) {
  main().catch(console.error);
}

export { debugSquareWebhookConfiguration, testWebhookEndpoint, generateSquareWebhookTestCurl };
