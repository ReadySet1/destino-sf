import { NextRequest, NextResponse } from 'next/server';
import {
  calculateShippingWeight,
  getShippingGlobalConfig,
  getAllShippingConfigurations,
} from '@/lib/shippingUtils';
import { isBuildTime } from '@/lib/build-time-utils';
import { selectBoxTemplateSync, getAllBoxConfigs } from '@/lib/shipping/box-selection';

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

    // Calculate total item count
    const totalItemCount = normalizedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // Get box selection
    const boxSelection = selectBoxTemplateSync(calculatedWeight, totalItemCount);

    // Get configs
    const globalConfig = await getShippingGlobalConfig();
    const productConfigs = await getAllShippingConfigurations();
    const boxConfigs = await getAllBoxConfigs();

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
        totalItemCount,
        fulfillmentMethod: 'nationwide_shipping',
      },
      result: {
        calculatedWeight,
        boxSelection: {
          template: boxSelection.template,
          boxSize: boxSelection.boxSize,
          reason: boxSelection.reason,
        },
        expectedBreakdown: {
          note: 'Flat per-unit: quantity × weightPerUnitLb + packaging weight',
          formula: `Weight = (items × perUnitWeight) + packagingWeight`,
        },
      },
      config: {
        globalConfig,
        productConfigs,
        boxConfigs,
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
