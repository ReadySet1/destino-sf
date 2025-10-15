'use server';

import { prisma } from '@/lib/db';
import { Address } from '../types/address';

/**
 * Interface for delivery fee calculation result for regular products
 */
export interface DeliveryFeeResult {
  fee: number;
  zone: string;
  isFreeDelivery: boolean;
  minOrderForFreeDelivery?: number;
}

// Cache for delivery zones to avoid frequent database queries
let deliveryZonesCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active regular product delivery zones from database with caching
 */
async function getActiveDeliveryZones() {
  const now = Date.now();

  // Return cached data if still valid
  if (deliveryZonesCache && now - cacheTimestamp < CACHE_DURATION) {
    return deliveryZonesCache;
  }

  try {
    const zones = await prisma.regularDeliveryZone.findMany({
      where: {
        active: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    deliveryZonesCache = zones;
    cacheTimestamp = now;
    return zones;
  } catch (error) {
    console.error('Error fetching regular delivery zones:', error);

    // Fallback to hardcoded zones if database is unavailable
    return getFallbackZones();
  }
}

/**
 * Fallback zones when database is unavailable (for regular products)
 */
function getFallbackZones() {
  return [
    {
      zone: 'sf_nearby',
      name: 'San Francisco Nearby',
      minimumOrderForFree: 75,
      deliveryFee: 15,
      postalCodes: [
        '94102',
        '94103',
        '94104',
        '94105',
        '94107',
        '94108',
        '94109',
        '94110',
        '94111',
        '94112',
        '94114',
        '94115',
        '94116',
        '94117',
        '94118',
        '94121',
        '94122',
        '94123',
        '94124',
        '94127',
        '94131',
        '94132',
        '94133',
        '94134',
        '94158',
      ],
      cities: [
        'san francisco',
        'south san francisco',
        'daly city',
        'brisbane',
        'millbrae',
        'burlingame',
        'san mateo',
      ],
      active: true,
    },
    {
      zone: 'sf_extended',
      name: 'San Francisco Extended',
      minimumOrderForFree: 0, // No minimum for free delivery
      deliveryFee: 25,
      postalCodes: [
        '94070',
        '94401',
        '94402',
        '94403',
        '94404',
        '94002',
        '94010',
        '94015',
        '94030',
        '94066',
        '94080',
        '94128',
        '94014',
        '94065',
        '94301',
        '94302',
        '94303',
        '94304',
        '94305',
        '94306',
        '94085',
        '94086',
        '94087',
        '94089',
        '94301',
      ],
      cities: [
        'belmont',
        'san carlos',
        'redwood city',
        'menlo park',
        'palo alto',
        'mountain view',
        'sunnyvale',
        'santa clara',
        'san jose',
        'sausalito',
        'mill valley',
        'tiburon',
        'larkspur',
        'corte madera',
        'san rafael',
        'novato',
        'oakland',
        'berkeley',
        'alameda',
        'emeryville',
        'san leandro',
        'hayward',
        'richmond',
      ],
      active: true,
    },
  ];
}

/**
 * Determines delivery zone based on the city and postal code (SERVER ACTION)
 */
async function getDeliveryZone(city: string, postalCode?: string): Promise<any | null> {
  try {
    const zones = await getActiveDeliveryZones();
    const normalizedCity = city.trim().toLowerCase();

    // First try to match by postal code if provided
    if (postalCode) {
      const postalMatch = zones.find(zone => zone.postalCodes.includes(postalCode));
      if (postalMatch) {
        return postalMatch;
      }
    }

    // Then try to match by city name
    const cityMatch = zones.find(zone =>
      zone.cities.some((zoneCity: string) => zoneCity.toLowerCase() === normalizedCity)
    );

    return cityMatch || null;
  } catch (error) {
    console.error('Error determining delivery zone:', error);
    return null;
  }
}

/**
 * SERVER ACTION: Calculates the delivery fee based on the address and order subtotal
 */
export async function calculateDeliveryFeeAction(
  address: Address,
  subtotal: number
): Promise<DeliveryFeeResult | null> {
  try {
    const zone = await getDeliveryZone(address.city, address.postalCode);

    // If address not in a supported zone
    if (!zone) {
      return null;
    }

    const deliveryFee = Number(zone.deliveryFee) || 0;
    const minimumOrderForFree = Number(zone.minimumOrderForFree) || 0;

    // Check if this zone has a minimum order requirement for free delivery
    const hasMinimumForFree = minimumOrderForFree > 0;
    const meetsMinimum = subtotal >= minimumOrderForFree;
    const isFreeDelivery = hasMinimumForFree && meetsMinimum;

    return {
      zone: zone.zone,
      fee: isFreeDelivery ? 0 : deliveryFee,
      isFreeDelivery,
      minOrderForFreeDelivery: hasMinimumForFree ? minimumOrderForFree : undefined,
    };
  } catch (error) {
    console.error('Error calculating delivery fee:', error);
    return null;
  }
}

/**
 * SERVER ACTION: Clear delivery zones cache (useful for testing or when zones are updated)
 */
export async function clearDeliveryZonesCacheAction(): Promise<void> {
  deliveryZonesCache = null;
  cacheTimestamp = 0;
}
