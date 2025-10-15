import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check webhook environment variables and incoming headers
 * Usage: GET /api/webhooks/square/debug
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SQUARE_WEBHOOK_SECRET_EXISTS: !!process.env.SQUARE_WEBHOOK_SECRET,
      SQUARE_WEBHOOK_SECRET_LENGTH: process.env.SQUARE_WEBHOOK_SECRET?.length || 0,
      SQUARE_WEBHOOK_SECRET_PREFIX: process.env.SQUARE_WEBHOOK_SECRET?.substring(0, 8) || 'NOT_SET',
      SQUARE_WEBHOOK_SECRET_SANDBOX_EXISTS: !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX,
      SQUARE_WEBHOOK_SECRET_SANDBOX_LENGTH: process.env.SQUARE_WEBHOOK_SECRET_SANDBOX?.length || 0,
      SQUARE_WEBHOOK_SECRET_SANDBOX_PREFIX:
        process.env.SQUARE_WEBHOOK_SECRET_SANDBOX?.substring(0, 8) || 'NOT_SET',
    },
    headers: {
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      'x-square-hmacsha256-signature': request.headers.get('x-square-hmacsha256-signature')
        ? 'PRESENT'
        : 'MISSING',
      'x-square-hmacsha256-timestamp': request.headers.get('x-square-hmacsha256-timestamp')
        ? 'PRESENT'
        : 'MISSING',
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      host: request.headers.get('host'),
    },
    url: request.url,
    method: request.method,
  };

  return NextResponse.json(debug, { status: 200 });
}

/**
 * Debug POST endpoint to simulate webhook processing
 * Usage: POST /api/webhooks/square/debug with webhook data
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('=== WEBHOOK DEBUG MODE ===');

  const debug: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      SQUARE_WEBHOOK_SECRET_EXISTS: !!process.env.SQUARE_WEBHOOK_SECRET,
      SQUARE_WEBHOOK_SECRET_LENGTH: process.env.SQUARE_WEBHOOK_SECRET?.length || 0,
      SQUARE_WEBHOOK_SECRET_PREFIX: process.env.SQUARE_WEBHOOK_SECRET?.substring(0, 8) || 'NOT_SET',
      SQUARE_WEBHOOK_SECRET_SANDBOX_EXISTS: !!process.env.SQUARE_WEBHOOK_SECRET_SANDBOX,
      SQUARE_WEBHOOK_SECRET_SANDBOX_LENGTH: process.env.SQUARE_WEBHOOK_SECRET_SANDBOX?.length || 0,
      SQUARE_WEBHOOK_SECRET_SANDBOX_PREFIX:
        process.env.SQUARE_WEBHOOK_SECRET_SANDBOX?.substring(0, 8) || 'NOT_SET',
    },
    headers: {
      'content-type': request.headers.get('content-type'),
      'x-square-hmacsha256-signature': request.headers.get('x-square-hmacsha256-signature')
        ? 'PRESENT'
        : 'MISSING',
      'x-square-hmacsha256-timestamp': request.headers.get('x-square-hmacsha256-timestamp')
        ? 'PRESENT'
        : 'MISSING',
      'x-square-hmacsha256-signature-value':
        request.headers.get('x-square-hmacsha256-signature')?.substring(0, 20) + '...' || 'MISSING',
      'x-square-hmacsha256-timestamp-value':
        request.headers.get('x-square-hmacsha256-timestamp') || 'MISSING',
    },
  };

  let bodyText = '';
  try {
    bodyText = await request.text();
    debug.body = {
      length: bodyText.length,
      preview: bodyText.substring(0, 200),
      canParse: true,
    };
  } catch (error) {
    debug.body = {
      error: 'Failed to read body',
      canParse: false,
    };
  }

  try {
    const payload = JSON.parse(bodyText);
    debug.payload = {
      type: payload.type,
      event_id: payload.event_id,
      merchant_id: payload.merchant_id,
    };
  } catch (error) {
    debug.payload = {
      error: 'Failed to parse JSON',
    };
  }

  console.log('WEBHOOK DEBUG:', JSON.stringify(debug, null, 2));

  return NextResponse.json(
    {
      message: 'Debug webhook processed',
      debug,
    },
    { status: 200 }
  );
}
