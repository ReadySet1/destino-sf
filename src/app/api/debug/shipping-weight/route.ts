import { NextRequest, NextResponse } from 'next/server';
import {
  calculateShippingWeight,
  getShippingGlobalConfig,
  getAllShippingConfigurations,
} from '@/lib/shippingUtils';
import { isBuildTime } from '@/lib/build-time-utils';

/**
 * Debug endpoint to verify shipping weight calculation
 * GET /api/debug/shipping-weight?items=[{"name":"Alfajores","quantity":3}]
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const itemsParam = searchParams.get('items');

    // Default test items if none provided
    const items = itemsParam
      ? JSON.parse(itemsParam)
      : [{ id: 'test-1', name: 'Alfajores Box (6 pack)', quantity: 3 }];

    // Add required id field if missing
    const normalizedItems = items.map((item: any, index: number) => ({
      id: item.id || `item-${index}`,
      name: item.name,
      quantity: item.quantity,
    }));

    // Calculate weight
    const calculatedWeight = await calculateShippingWeight(normalizedItems, 'nationwide_shipping');

    // Get configs
    const globalConfig = await getShippingGlobalConfig();
    const productConfigs = await getAllShippingConfigurations();

    // Check build time status
    const buildTimeStatus = isBuildTime();

    // Environment info
    const envInfo = {
      NEXT_PHASE: process.env.NEXT_PHASE || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      VERCEL: process.env.VERCEL || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set',
      CI: process.env.CI || 'not set',
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      input: {
        items: normalizedItems,
        fulfillmentMethod: 'nationwide_shipping',
      },
      result: {
        calculatedWeight,
        expectedBreakdown: {
          note: 'For 3 alfajores: base 1.0 + (2 × 0.8) = 2.6 lbs product + 4.0 lbs packaging = 6.6 lbs',
        },
      },
      config: {
        globalConfig,
        productConfigs,
      },
      debug: {
        isBuildTime: buildTimeStatus,
        envInfo,
      },
    });
  } catch (error) {
    console.error('Debug shipping weight error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
