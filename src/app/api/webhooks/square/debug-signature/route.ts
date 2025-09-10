import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { debugWebhookSignature } from '@/lib/square/webhook-signature-fix';

/**
 * Debug endpoint for troubleshooting Square webhook signature validation
 * Use this to test signature validation without impacting production webhooks
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Debug signature endpoint called');
    
    // Read body as buffer for accurate signature validation
    const bodyBuffer = await request.arrayBuffer();
    const bodyText = new TextDecoder().decode(bodyBuffer);
    
    console.log('📄 Raw body length:', bodyBuffer.byteLength);
    console.log('📄 Text body length:', bodyText.length);
    
    // Run comprehensive signature debug
    const debugResult = await debugWebhookSignature(request, bodyText);
    
    console.log('🔐 Complete debug result:', debugResult);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      signature_validation: debugResult,
      raw_body_length: bodyBuffer.byteLength,
      text_body_length: bodyText.length,
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * GET endpoint to verify the debug endpoint is accessible
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'webhook signature debug',
    timestamp: new Date().toISOString(),
    usage: 'POST to this endpoint with the same payload and headers Square sends',
  });
}
