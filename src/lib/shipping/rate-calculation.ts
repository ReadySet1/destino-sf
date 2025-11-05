import { withTimeout, TimeoutError } from '@/lib/utils/http-timeout';

/**
 * Timeout configuration for Shippo API calls
 * DES-60 Phase 3: Network & Timeout Resilience
 */
const SHIPPO_API_TIMEOUT = 20000; // 20 seconds for shipping rate calculation

export interface ShippingAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Parcel {
  length: number;
  width: number;
  height: number;
  weight: number;
  distance_unit?: string;
  mass_unit?: string;
}

export interface RateCalculationParams {
  fromAddress: ShippingAddress;
  toAddress: ShippingAddress;
  parcel: Parcel;
}

export interface ShippingRate {
  object_id: string;
  amount: string;
  currency: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  estimated_days: number;
}

export interface RateCalculationResult {
  success: boolean;
  rates?: ShippingRate[];
  error?: string;
}

export async function calculateShippingRates(
  params: RateCalculationParams
): Promise<RateCalculationResult> {
  try {
    const { ShippoClientManager } = await import('@/lib/shippo/client');
    const shippoClient = ShippoClientManager.getInstance();

    if (!shippoClient) {
      return {
        success: false,
        error: 'Shippo client not available',
      };
    }

    // Note: This is a placeholder for shipment creation
    // The actual Shippo SDK v2.15+ API structure may be different
    // This would need to be updated based on the actual Shippo v2.15+ documentation

    // DES-60 Phase 3: Wrap Shippo SDK call with timeout protection
    const shipment = await withTimeout(
      shippoClient.shipments?.create?.({
        address_from: params.fromAddress,
        address_to: params.toAddress,
        parcels: [params.parcel],
      }),
      SHIPPO_API_TIMEOUT,
      `Shippo rate calculation timed out after ${SHIPPO_API_TIMEOUT}ms`,
      'shippoRateCalculation'
    );

    return {
      success: true,
      rates: (shipment as any)?.rates || [],
    };
  } catch (error) {
    // DES-60 Phase 3: Enhanced error handling for timeout errors
    if (error instanceof TimeoutError) {
      return {
        success: false,
        error: `Rate calculation timed out after ${error.timeoutMs}ms. Please try again.`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rate calculation failed',
    };
  }
}
