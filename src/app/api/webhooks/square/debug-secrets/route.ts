import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '@/env';

/**
 * Debug endpoint to verify Square webhook secret configuration
 * This endpoint helps troubleshoot webhook signature validation issues
 * by showing configuration details WITHOUT exposing actual secret values
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get environment variables
    const prodSecret = process.env.SQUARE_WEBHOOK_SECRET;
    const sandboxSecret = process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
    
    // Environment detection logic (enhanced - same as in webhook-validator.ts)
    const envHeader = request.headers.get('x-square-env') || request.headers.get('square-environment');
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    const userAgent = request.headers.get('user-agent') || '';
    
    const isDevelopmentHost = host.includes('development') || 
                             host.includes('staging') || 
                             host.includes('test') || 
                             host.includes('dev') ||
                             host.includes('localhost');
    const isSandboxUserAgent = userAgent.toLowerCase().includes('sandbox');
    
    const detectedEnv = envHeader?.toLowerCase() === 'sandbox' ? 'sandbox' :
                       (isDevelopmentHost || isSandboxUserAgent) ? 'sandbox' : 'production';
    
    // Build safe debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      
      environment_detection: {
        header_value: envHeader,
        detected_environment: detectedEnv,
        detection_factors: {
          explicit_header: envHeader?.toLowerCase() === 'sandbox',
          development_host: isDevelopmentHost,
          sandbox_user_agent: isSandboxUserAgent,
          host_value: host,
          user_agent_value: userAgent
        },
        headers_checked: ['x-square-env', 'square-environment']
      },
      
      secrets_configuration: {
        production: {
          exists: !!prodSecret,
          length: prodSecret?.length || 0,
          prefix: prodSecret ? prodSecret.substring(0, 8) + '...' : 'NOT_SET',
          source: 'SQUARE_WEBHOOK_SECRET'
        },
        sandbox: {
          exists: !!sandboxSecret,
          length: sandboxSecret?.length || 0,
          prefix: sandboxSecret ? sandboxSecret.substring(0, 8) + '...' : 'NOT_SET',
          source: 'SQUARE_WEBHOOK_SECRET_SANDBOX'
        }
      },
      
      secret_selection_logic: {
        for_sandbox: {
          primary: 'SQUARE_WEBHOOK_SECRET_SANDBOX',
          fallback: 'SQUARE_WEBHOOK_SECRET',
          selected_secret: sandboxSecret ? 'SQUARE_WEBHOOK_SECRET_SANDBOX' : 
                          prodSecret ? 'SQUARE_WEBHOOK_SECRET (fallback)' : 'NONE'
        },
        for_production: {
          primary: 'SQUARE_WEBHOOK_SECRET',
          fallback: 'none',
          selected_secret: prodSecret ? 'SQUARE_WEBHOOK_SECRET' : 'NONE'
        }
      },
      
      current_request_info: {
        url: request.url,
        pathname: request.nextUrl.pathname,
        protocol: request.headers.get('x-forwarded-proto') || 'https',
        host: request.headers.get('host') || request.headers.get('x-forwarded-host'),
        constructed_notification_url: `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || request.headers.get('x-forwarded-host')}${request.nextUrl.pathname.replace('/debug-secrets', '')}`
      },
      
      env_variable_cleaning: {
        production_trimmed: prodSecret ? prodSecret.trim() === prodSecret : 'N/A',
        sandbox_trimmed: sandboxSecret ? sandboxSecret.trim() === sandboxSecret : 'N/A',
        whitespace_detected: {
          production: prodSecret ? prodSecret !== prodSecret.trim() : false,
          sandbox: sandboxSecret ? sandboxSecret !== sandboxSecret.trim() : false
        }
      },
      
      test_signature_calculation: {
        test_body: '{"hello":"world"}',
        notification_url_for_webhook: `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || request.headers.get('x-forwarded-host')}/api/webhooks/square`,
        would_use_secret: detectedEnv === 'sandbox' ? 
          (sandboxSecret ? 'SQUARE_WEBHOOK_SECRET_SANDBOX' : 'SQUARE_WEBHOOK_SECRET (fallback)') :
          'SQUARE_WEBHOOK_SECRET'
      },
      
      recommendations: [] as string[]
    };
    
    // Add recommendations based on findings
    if (!prodSecret && !sandboxSecret) {
      debugInfo.recommendations.push('⚠️ No webhook secrets configured. Set SQUARE_WEBHOOK_SECRET and SQUARE_WEBHOOK_SECRET_SANDBOX');
    } else if (!sandboxSecret) {
      debugInfo.recommendations.push('⚠️ No sandbox secret. Set SQUARE_WEBHOOK_SECRET_SANDBOX for sandbox webhooks');
    } else if (!prodSecret) {
      debugInfo.recommendations.push('⚠️ No production secret. Set SQUARE_WEBHOOK_SECRET for production webhooks');
    } else {
      debugInfo.recommendations.push('✅ Both secrets configured correctly');
    }
    
    if (debugInfo.env_variable_cleaning.whitespace_detected.production || 
        debugInfo.env_variable_cleaning.whitespace_detected.sandbox) {
      debugInfo.recommendations.push('⚠️ Whitespace detected in secrets. Check for trailing newlines in environment variables');
    }
    
    return NextResponse.json({
      status: 'debug_info',
      debug: debugInfo,
      warning: '🔒 This endpoint shows configuration but not actual secret values'
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST endpoint to test signature calculation with a sample payload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const testPayload = body || '{"hello":"world","test":true}';
    
    // Import the signature calculation function
    const crypto = await import('crypto');
    
    const prodSecret = process.env.SQUARE_WEBHOOK_SECRET;
    const sandboxSecret = process.env.SQUARE_WEBHOOK_SECRET_SANDBOX;
    
    // Build notification URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const notificationUrl = `${protocol}://${host}/api/webhooks/square`;
    
    const calculateTestSignature = (url: string, body: string, secret: string) => {
      const combined = url + body;
      return crypto.createHmac('sha256', secret.trim()).update(combined).digest('base64');
    };
    
    const testResults = {
      test_payload: testPayload,
      notification_url: notificationUrl,
      signatures: {
        ...(prodSecret && {
          production_secret: {
            signature: calculateTestSignature(notificationUrl, testPayload, prodSecret),
            algorithm: 'HMAC-SHA256(notificationUrl + body, SQUARE_WEBHOOK_SECRET)'
          }
        }),
        ...(sandboxSecret && {
          sandbox_secret: {
            signature: calculateTestSignature(notificationUrl, testPayload, sandboxSecret),
            algorithm: 'HMAC-SHA256(notificationUrl + body, SQUARE_WEBHOOK_SECRET_SANDBOX)'
          }
        })
      },
      usage_instructions: {
        curl_example: `curl -X POST ${notificationUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-square-hmacsha256-signature: [USE_SIGNATURE_ABOVE]" \\
  -d '${testPayload}'`
      }
    };
    
    return NextResponse.json({
      status: 'signature_test',
      test: testResults
    });
    
  } catch (error) {
    console.error('❌ Signature test error:', error);
    
    return NextResponse.json({
      status: 'error',
      error: 'Signature test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
