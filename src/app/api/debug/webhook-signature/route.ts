import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to diagnose webhook signature issues
 * Usage: GET /api/debug/webhook-signature
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      isProduction: process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production',
      // Check for webhook secret
      SQUARE_WEBHOOK_SECRET_EXISTS: !!process.env.SQUARE_WEBHOOK_SECRET,
      SQUARE_WEBHOOK_SECRET_LENGTH: process.env.SQUARE_WEBHOOK_SECRET?.length || 0,
      SQUARE_WEBHOOK_SECRET_PREFIX: process.env.SQUARE_WEBHOOK_SECRET?.substring(0, 8) || 'NOT_SET',
      // Check for alternative secret names
      SQUARE_WEBHOOK_SIGNATURE_KEY_EXISTS: !!process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
      WEBHOOK_SECRET_EXISTS: !!process.env.WEBHOOK_SECRET,
      // Check Square environment
      SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT,
      USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
      SQUARE_TRANSACTIONS_USE_SANDBOX: process.env.SQUARE_TRANSACTIONS_USE_SANDBOX,
    },
    recommendations: [] as string[]
  };

  // Add recommendations based on findings
  if (!debug.environment.SQUARE_WEBHOOK_SECRET_EXISTS) {
    debug.recommendations.push('❌ SQUARE_WEBHOOK_SECRET environment variable is missing');
    debug.recommendations.push('📝 Add SQUARE_WEBHOOK_SECRET to your Vercel environment variables');
    debug.recommendations.push('🔑 Get webhook secret from Square Developer Dashboard → Webhooks → Show Signature Key');
  }

  if (debug.environment.SQUARE_WEBHOOK_SECRET_LENGTH > 0 && debug.environment.SQUARE_WEBHOOK_SECRET_LENGTH < 10) {
    debug.recommendations.push('⚠️ SQUARE_WEBHOOK_SECRET seems too short - check for truncation');
  }

  if (debug.environment.SQUARE_ENVIRONMENT !== 'production' && debug.environment.NODE_ENV === 'production') {
    debug.recommendations.push('🔄 Square environment mismatch - check SQUARE_ENVIRONMENT setting');
  }

  return NextResponse.json(debug, { status: 200 });
}

/**
 * Test webhook signature validation with sample data
 * Usage: POST /api/debug/webhook-signature with test payload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const timestamp = request.headers.get('x-square-hmacsha256-timestamp');
    
    const result = {
      timestamp: new Date().toISOString(),
      receivedData: {
        bodyLength: body.length,
        bodyPreview: body.substring(0, 200),
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        signatureLength: signature?.length,
        timestampValue: timestamp,
        allHeaders: Object.fromEntries(request.headers.entries())
      },
      validation: {
        webhookSecretExists: !!process.env.SQUARE_WEBHOOK_SECRET,
        secretLength: process.env.SQUARE_WEBHOOK_SECRET?.length || 0,
      }
    };

    if (signature && timestamp && process.env.SQUARE_WEBHOOK_SECRET) {
      // Test signature validation
      const crypto = require('crypto');
      const payload = timestamp + body;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.SQUARE_WEBHOOK_SECRET)
        .update(payload)
        .digest('base64');
      
      result.validation = {
        ...result.validation,
        expectedSignature: expectedSignature.substring(0, 20) + '...',
        receivedSignature: signature.substring(0, 20) + '...',
        signaturesMatch: expectedSignature === signature,
        payloadForSigning: payload.substring(0, 100) + '...'
      };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
