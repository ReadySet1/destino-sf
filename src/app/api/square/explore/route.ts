// src/app/api/square/explore/route.ts

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    logger.info('Exploring Square SDK structure...');

    // Import the entire Square package to explore its exports
    const Square = require('square');

    // Extract top-level APIs and properties
    const squareKeys = Object.keys(Square);

    // Get client properties if available
    let clientProperties: string[] = [];
    try {
      // For v42.0.1 we need to use Square.Client
      if (Square.Client) {
        const client = new Square.Client({
          accessToken: 'FAKE_TOKEN_FOR_EXPLORATION',
          environment: 'sandbox',
        });
        clientProperties = Object.keys(client);
      }
    } catch (error) {
      logger.error('Error exploring client properties:', error);
    }

    // Explore specific APIs
    let catalogApiMethods: string[] = [];
    let locationsApiMethods: string[] = [];
    let ordersApiMethods: string[] = [];

    try {
      if (Square.Client) {
        const client = new Square.Client({
          accessToken: 'FAKE_TOKEN_FOR_EXPLORATION',
          environment: 'sandbox',
        });

        if (client.catalogApi) {
          catalogApiMethods = Object.keys(client.catalogApi);
        }

        if (client.locationsApi) {
          locationsApiMethods = Object.keys(client.locationsApi);
        }

        if (client.ordersApi) {
          ordersApiMethods = Object.keys(client.ordersApi);
        }
      }
    } catch (error) {
      logger.error('Error exploring API methods:', error);
    }

    // Check if it's v42+ by attempting to create a client with Square.Client
    const isVersion42Plus = typeof Square.Client === 'function';

    // For v42+, also explore directly importing named exports
    let directExports = {};
    try {
      // Check if we can directly import named API clients in v42
      const { ApiError, LocationsApi, CatalogApi, OrdersApi } = require('square');
      directExports = {
        hasApiError: typeof ApiError === 'function',
        hasLocationsApi: typeof LocationsApi === 'function',
        hasCatalogApi: typeof CatalogApi === 'function',
        hasOrdersApi: typeof OrdersApi === 'function',
      };
    } catch (error) {
      logger.error('Error exploring direct exports:', error);
    }

    return NextResponse.json({
      success: true,
      version: Square.version || 'unknown',
      topLevelExports: squareKeys,
      clientProperties,
      isVersion42Plus,
      directExports,
      specificApis: {
        catalogApi: catalogApiMethods,
        locationsApi: locationsApiMethods,
        ordersApi: ordersApiMethods,
      },
    });
  } catch (error) {
    logger.error('Error exploring Square SDK:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to explore Square SDK',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
