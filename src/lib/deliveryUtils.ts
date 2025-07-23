import { Address } from '../types/address';

/**
 * Delivery zone types used for fee calculation
 */
export enum DeliveryZone {
  NEARBY = 'nearby', // San Francisco, South San Francisco hasta San Mateo
  DISTANT = 'distant', // San Mateo a San José, Marin County, East Bay/Oakland
}

/**
 * Interface for delivery fee calculation result
 */
export interface DeliveryFeeResult {
  fee: number;
  zone: DeliveryZone;
  isFreeDelivery: boolean;
  minOrderForFreeDelivery?: number;
}

/**
 * Configuration for delivery zones and fees
 */
interface NearbyZoneConfig {
  minOrderForFreeDelivery: number;
  baseFee: number;
}

interface DistantZoneConfig {
  baseFee: number;
}

const DELIVERY_CONFIG: Record<DeliveryZone, NearbyZoneConfig | DistantZoneConfig> = {
  [DeliveryZone.NEARBY]: {
    minOrderForFreeDelivery: 75,
    baseFee: 15,
  },
  [DeliveryZone.DISTANT]: {
    baseFee: 25,
  },
};

/**
 * Cities and their corresponding delivery zones
 */
const CITY_ZONES: Record<string, DeliveryZone> = {
  // Nearby zone
  'san francisco': DeliveryZone.NEARBY,
  'south san francisco': DeliveryZone.NEARBY,
  'daly city': DeliveryZone.NEARBY,
  brisbane: DeliveryZone.NEARBY,
  millbrae: DeliveryZone.NEARBY,
  burlingame: DeliveryZone.NEARBY,
  'san mateo': DeliveryZone.NEARBY,

  // Distant zone - San Mateo to San Jose
  belmont: DeliveryZone.DISTANT,
  'san carlos': DeliveryZone.DISTANT,
  'redwood city': DeliveryZone.DISTANT,
  'menlo park': DeliveryZone.DISTANT,
  'palo alto': DeliveryZone.DISTANT,
  'mountain view': DeliveryZone.DISTANT,
  sunnyvale: DeliveryZone.DISTANT,
  'santa clara': DeliveryZone.DISTANT,
  'san jose': DeliveryZone.DISTANT,

  // Distant zone - Marin County
  sausalito: DeliveryZone.DISTANT,
  'mill valley': DeliveryZone.DISTANT,
  tiburon: DeliveryZone.DISTANT,
  larkspur: DeliveryZone.DISTANT,
  'corte madera': DeliveryZone.DISTANT,
  'san rafael': DeliveryZone.DISTANT,
  novato: DeliveryZone.DISTANT,

  // Distant zone - East Bay/Oakland
  oakland: DeliveryZone.DISTANT,
  berkeley: DeliveryZone.DISTANT,
  alameda: DeliveryZone.DISTANT,
  emeryville: DeliveryZone.DISTANT,
  'san leandro': DeliveryZone.DISTANT,
  hayward: DeliveryZone.DISTANT,
  richmond: DeliveryZone.DISTANT,
};

/**
 * Determines delivery zone based on the city
 *
 * @param city The delivery city
 * @returns The delivery zone or null if outside of service area
 */
export function getDeliveryZone(city: string): DeliveryZone | null {
  const normalizedCity = city.trim().toLowerCase();
  return CITY_ZONES[normalizedCity] || null;
}

/**
 * Calculates the delivery fee based on the address and order subtotal
 *
 * @param address The delivery address
 * @param subtotal The order subtotal before taxes and fees
 * @returns DeliveryFeeResult with calculated fee and zone information
 */
export function calculateDeliveryFee(address: Address, subtotal: number): DeliveryFeeResult | null {
  const zone = getDeliveryZone(address.city);

  // If address not in a supported zone
  if (!zone) {
    return null;
  }

  const config = DELIVERY_CONFIG[zone];

  // For nearby zone
  if (zone === DeliveryZone.NEARBY) {
    const nearbyConfig = config as NearbyZoneConfig;
    const isFreeDelivery = subtotal >= nearbyConfig.minOrderForFreeDelivery;
    return {
      zone,
      fee: isFreeDelivery ? 0 : nearbyConfig.baseFee,
      isFreeDelivery,
      minOrderForFreeDelivery: nearbyConfig.minOrderForFreeDelivery,
    };
  }

  // For distant zone - always charge fee
  return {
    zone,
    fee: config.baseFee,
    isFreeDelivery: false,
  };
}

/**
 * Gets the delivery fee message to display to the user
 *
 * @param feeResult The delivery fee calculation result
 * @returns A human-readable message about the delivery fee
 */
export function getDeliveryFeeMessage(feeResult: DeliveryFeeResult | null): string {
  if (!feeResult) {
    return 'This address is outside our delivery area.';
  }

  if (feeResult.zone === DeliveryZone.NEARBY) {
    if (feeResult.isFreeDelivery) {
      return 'Free delivery for orders over $75!';
    }
    return `$${feeResult.fee} delivery fee. Orders over $${feeResult.minOrderForFreeDelivery} qualify for free delivery!`;
  }

  return `$${feeResult.fee} delivery fee for this area.`;
}
