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

export async function calculateShippingRates(params: RateCalculationParams): Promise<RateCalculationResult> {
  try {
    const shippo = await import('shippo');
    
    const shipment = await shippo.default.shipment.create({
      address_from: params.fromAddress,
      address_to: params.toAddress,
      parcels: [params.parcel]
    });
    
    return {
      success: true,
      rates: shipment.rates || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Rate calculation failed'
    };
  }
}
