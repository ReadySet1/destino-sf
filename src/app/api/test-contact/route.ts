import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test contact API - POST request received');

    const body = await request.json();
    console.log('Test contact API - Request body:', body);

    // Validate required fields
    if (!body.name || !body.email || !body.message) {
      return NextResponse.json({ error: 'name, email, and message required' }, { status: 400 });
    }

    // Simulate successful submission
    return NextResponse.json({
      success: true,
      message: 'Test contact form submitted successfully',
      data: body,
    });
  } catch (error) {
    console.error('Test contact API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test contact API is working',
    timestamp: new Date().toISOString(),
  });
}

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
