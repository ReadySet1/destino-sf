import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      configuration: {
        SQUARE_CATALOG_USE_PRODUCTION: process.env.SQUARE_CATALOG_USE_PRODUCTION,
        SQUARE_TRANSACTIONS_USE_SANDBOX: process.env.SQUARE_TRANSACTIONS_USE_SANDBOX,
        USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
      },
      tokens: {
        production: {
          configured: !!process.env.SQUARE_PRODUCTION_TOKEN,
          length: process.env.SQUARE_PRODUCTION_TOKEN?.length || 0,
          startsWithEAAA: process.env.SQUARE_PRODUCTION_TOKEN?.startsWith('EAAA') || false,
        },
        sandbox: {
          configured: !!process.env.SQUARE_SANDBOX_TOKEN,
          length: process.env.SQUARE_SANDBOX_TOKEN?.length || 0,
          startsWithEAAA: process.env.SQUARE_SANDBOX_TOKEN?.startsWith('EAAA') || false,
        },
        legacy: {
          configured: !!process.env.SQUARE_ACCESS_TOKEN,
          length: process.env.SQUARE_ACCESS_TOKEN?.length || 0,
          startsWithEAAA: process.env.SQUARE_ACCESS_TOKEN?.startsWith('EAAA') || false,
        },
      },
      locationId: {
        configured: !!process.env.SQUARE_LOCATION_ID,
        startsWithL: process.env.SQUARE_LOCATION_ID?.startsWith('L') || false,
      },
      tests: {} as any,
    };

    // Test production token if available
    if (process.env.SQUARE_PRODUCTION_TOKEN) {
      try {
        const response = await fetch('https://connect.squareup.com/v2/locations', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.SQUARE_PRODUCTION_TOKEN}`,
            'Square-Version': '2024-05-15',
            'Content-Type': 'application/json',
          },
        });

        results.tests.production = {
          status: response.status,
          success: response.status === 200,
          error: response.status !== 200 ? await response.text() : null,
        };
      } catch (error) {
        results.tests.production = {
          status: 'error',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Test sandbox token if available
    if (process.env.SQUARE_SANDBOX_TOKEN) {
      try {
        const response = await fetch('https://connect.squareupsandbox.com/v2/locations', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.SQUARE_SANDBOX_TOKEN}`,
            'Square-Version': '2024-05-15',
            'Content-Type': 'application/json',
          },
        });

        results.tests.sandbox = {
          status: response.status,
          success: response.status === 200,
          error: response.status !== 200 ? await response.text() : null,
        };
      } catch (error) {
        results.tests.sandbox = {
          status: 'error',
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return NextResponse.json(results);
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
