import { NextRequest, NextResponse } from 'next/server';
import { validateCSPConfig, SECURITY_HEADERS } from '@/lib/security/csp-config';

export async function GET(request: NextRequest) {
  try {
    // Validate CSP configuration
    const cspValidation = validateCSPConfig();

    // Get current headers from the request
    const requestHeaders = Object.fromEntries(request.headers.entries());

    // Expected security headers that should be present
    const expectedHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
      'content-security-policy',
    ];

    // Check which headers are missing (these will be added by middleware/Next.js config)
    const headerStatus = expectedHeaders.map(header => ({
      header,
      present: header in requestHeaders || header.toLowerCase() in requestHeaders,
      value: requestHeaders[header] || requestHeaders[header.toLowerCase()] || null,
    }));

    const response = {
      success: true,
      message: 'Security headers validation endpoint',
      timestamp: new Date().toISOString(),
      cspValidation,
      securityHeaders: {
        configured: SECURITY_HEADERS,
        expected: expectedHeaders,
        status: headerStatus,
      },
      recommendations: [
        'Verify all expected headers are present in browser dev tools',
        'Check Content-Security-Policy is not blocking required resources',
        'Validate HTTPS is enforced in production',
        'Test that iframe embedding is properly blocked',
      ],
      testInstructions: {
        browser: 'Open browser dev tools → Network tab → Check response headers',
        curl: 'curl -I https://your-domain.com/api/security/headers-test',
        online: 'Use https://securityheaders.com/ to scan your domain',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Security headers test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Security headers test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Simulate CSP violation report endpoint
    if (body.cspReport || body['csp-report']) {
      const report = body.cspReport || body['csp-report'];

      console.warn('CSP Violation Report:', {
        timestamp: new Date().toISOString(),
        report,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        message: 'CSP violation report received',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Security test endpoint - POST received',
      receivedData: body,
    });
  } catch (error) {
    console.error('Security headers POST test error:', error);
    return NextResponse.json({ error: 'POST request failed' }, { status: 500 });
  }
}
