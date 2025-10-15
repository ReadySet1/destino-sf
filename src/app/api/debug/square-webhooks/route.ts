import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
        USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      webhookSecrets: {
        hasProductionSecret: !!process.env.SQUARE_WEBHOOK_SECRET,
        hasSandboxSecret: !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX,
        productionSecretLength: process.env.SQUARE_WEBHOOK_SECRET?.length || 0,
        sandboxSecretLength: process.env.SQUARE_WEBHOOK_SECRET_SANDBOX?.length || 0,
      },
      squareTokens: {
        hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
        hasProductionToken: !!process.env.SQUARE_ACCESS_TOKEN_PRODUCTION,
        hasSandboxToken: !!process.env.SQUARE_SANDBOX_TOKEN,
        accessTokenLength: process.env.SQUARE_ACCESS_TOKEN?.length || 0,
        locationId: process.env.SQUARE_LOCATION_ID?.substring(0, 8) + '...' || 'Not set',
      },
      expectedWebhookURL: {
        development: `http://localhost:3000/api/webhooks/square`,
        production: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/webhooks/square`,
      },
      requiredWebhookEvents: [
        'order.created',
        'order.updated',
        'payment.created',
        'payment.updated',
        'order.fulfillment.updated',
      ],
      troubleshooting: {
        currentIssue: 'Payment webhooks not being received',
        likelyReasons: [
          'Square webhook configuration missing payment.* events',
          'Webhook URL pointing to wrong environment',
          'Square sandbox not configured for payment webhooks',
          'Payment processing not completing in Square checkout',
        ],
        nextSteps: [
          '1. Check Square Developer Dashboard webhook configuration',
          '2. Ensure payment.created and payment.updated events are enabled',
          '3. Verify webhook URL matches current environment',
          '4. Test with Square webhook testing tool',
          '5. Check Square payment logs for failed/incomplete payments',
        ],
      },
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config,
      recommendations: {
        immediate: [
          'Go to Square Developer Dashboard',
          'Check webhook configuration for this application',
          'Ensure payment.created and payment.updated events are enabled',
          'Verify webhook URL matches your current development/production environment',
        ],
        testing: [
          'Use Square webhook testing tool to manually send payment.updated event',
          'Create a test order and complete payment to trigger webhooks',
          'Monitor /api/webhooks/square endpoint for incoming requests',
        ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
