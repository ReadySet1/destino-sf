import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Forward the request to the existing alerts/customer endpoint
    const body = await request.json();

    // Ensure the request has the correct type for contact form
    const contactData = {
      ...body,
      type: 'contact_form',
    };

    // Make internal request to the alerts/customer endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/alerts/customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to process contact form' },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in contact API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Handle GET requests (optional - could return contact info or redirect)
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Contact API endpoint',
      description: 'Use POST to submit contact form data',
    },
    { status: 200 }
  );
}
