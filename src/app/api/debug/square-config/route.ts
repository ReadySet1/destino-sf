import { NextResponse } from 'next/server';
import { resetSquareClient } from '@/lib/square/client';

export async function GET() {
  try {
    // Reset the client to force reinitialization
    resetSquareClient();

    // Check environment variables (without exposing actual tokens)
    const envConfig = {
      NODE_ENV: process.env.NODE_ENV,
      USE_SQUARE_SANDBOX: process.env.USE_SQUARE_SANDBOX,
      SQUARE_PRODUCTION_TOKEN_EXISTS: !!process.env.SQUARE_PRODUCTION_TOKEN,
      SQUARE_SANDBOX_TOKEN_EXISTS: !!process.env.SQUARE_SANDBOX_TOKEN,
      SQUARE_ACCESS_TOKEN_EXISTS: !!process.env.SQUARE_ACCESS_TOKEN,
      SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,

      // Show token lengths for debugging (but not actual tokens)
      SQUARE_PRODUCTION_TOKEN_LENGTH: process.env.SQUARE_PRODUCTION_TOKEN?.length || 0,
      SQUARE_SANDBOX_TOKEN_LENGTH: process.env.SQUARE_SANDBOX_TOKEN?.length || 0,
      SQUARE_ACCESS_TOKEN_LENGTH: process.env.SQUARE_ACCESS_TOKEN?.length || 0,
    };

    // Test the token selection logic
    const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
    let selectedToken: string | undefined;
    let tokenSource: string;

    if (useSandbox) {
      selectedToken = process.env.SQUARE_SANDBOX_TOKEN;
      tokenSource = 'SQUARE_SANDBOX_TOKEN';
    } else {
      selectedToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
      tokenSource = process.env.SQUARE_PRODUCTION_TOKEN
        ? 'SQUARE_PRODUCTION_TOKEN'
        : 'SQUARE_ACCESS_TOKEN';
    }

    const tokenSelection = {
      useSandbox,
      selectedTokenSource: tokenSource,
      hasSelectedToken: !!selectedToken,
      selectedTokenLength: selectedToken?.length || 0,
    };

    return NextResponse.json({
      success: true,
      envConfig,
      tokenSelection,
      timestamp: new Date().toISOString(),
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
