import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cwd } from 'process';

export async function GET() {
  try {
    logger.info('Diagnosing Square client issues...');

    // Try the CommonJS require approach
    const Square = require('square');
    const squareKeys = Object.keys(Square);

    // Attempt to create a client with the Square.Client pattern
    let clientInfoV1 = null;
    let hasSquareClient = false;

    try {
      // Check if SquareClient exists
      hasSquareClient = typeof Square.SquareClient === 'function';

      if (hasSquareClient) {
        const client = new Square.SquareClient({
          accessToken: 'FAKE_TOKEN_FOR_DIAGNOSIS',
          environment: Square.SquareEnvironment.Sandbox,
        });

        clientInfoV1 = {
          keys: Object.keys(client),
          hasLocationsApi: !!client.locationsApi,
          hasCatalogApi: !!client.catalogApi,
          hasOrdersApi: !!client.ordersApi,
        };
      }
    } catch (error) {
      logger.error('Error creating SquareClient:', error);
    }

    // Attempt to create a client with the newer Square.Client pattern
    let clientInfoV2 = null;
    let hasExplicitClient = false;

    try {
      // Check if Square.Client exists (newer pattern)
      hasExplicitClient = typeof Square.Client === 'function';

      if (hasExplicitClient) {
        const client = new Square.Client({
          accessToken: 'FAKE_TOKEN_FOR_DIAGNOSIS',
          environment: 'sandbox',
        });

        clientInfoV2 = {
          keys: Object.keys(client),
          hasLocationsApi: !!client.locationsApi,
          hasCatalogApi: !!client.catalogApi,
          hasOrdersApi: !!client.ordersApi,
        };
      }
    } catch (error) {
      logger.error('Error creating Square.Client:', error);
    }

    // Try with token instead of accessToken
    let clientInfoWithToken = null;

    try {
      if (hasSquareClient) {
        const client = new Square.SquareClient({
          token: 'FAKE_TOKEN_FOR_DIAGNOSIS',
          environment: Square.SquareEnvironment.Sandbox,
        });

        clientInfoWithToken = {
          keys: Object.keys(client),
          hasLocationsApi: !!client.locationsApi,
          hasCatalogApi: !!client.catalogApi,
          hasOrdersApi: !!client.ordersApi,
        };
      }
    } catch (error) {
      logger.error('Error creating client with token param:', error);
    }

    // Check package.json for Square version
    let squareVersion = 'unknown';
    try {
      // Read package.json using fs instead of require
      const packageJsonPath = join(cwd(), 'package.json');
      const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      squareVersion = packageJson?.dependencies?.square || 'unknown';
    } catch (error) {
      logger.error('Error loading package.json:', error);
    }

    // Determine the best client pattern
    const bestPattern =
      clientInfoV1 && clientInfoV1.hasLocationsApi
        ? 'SquareClient with accessToken'
        : clientInfoWithToken && clientInfoWithToken.hasLocationsApi
          ? 'SquareClient with token'
          : clientInfoV2 && clientInfoV2.hasLocationsApi
            ? 'Square.Client with accessToken'
            : 'Could not determine - try reinstalling the Square package';

    // Return diagnostic info
    return NextResponse.json({
      success: true,
      diagnostics: {
        squareKeys,
        squareClientPattern: {
          exists: hasSquareClient,
          works: !!(clientInfoV1 && clientInfoV1.hasLocationsApi),
          clientInfo: clientInfoV1,
        },
        squareClientWithToken: {
          works: !!(clientInfoWithToken && clientInfoWithToken.hasLocationsApi),
          clientInfo: clientInfoWithToken,
        },
        clientPattern: {
          exists: hasExplicitClient,
          works: !!(clientInfoV2 && clientInfoV2.hasLocationsApi),
          clientInfo: clientInfoV2,
        },
        squareVersion,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
      },
      bestPattern,
      recommendation: `Use the "${bestPattern}" pattern based on your Square SDK version`,
    });
  } catch (error) {
    logger.error('Error in Square diagnose API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error running Square diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
