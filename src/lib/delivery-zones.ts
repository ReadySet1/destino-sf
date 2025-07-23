import { prisma } from '@/lib/db';
import { DeliveryZone, ZoneMinimumConfig } from '@/types/catering';

// Cache for delivery zones to avoid frequent database queries
let zonesCache: ZoneMinimumConfig[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch delivery zones from database with caching
 */
export async function getDeliveryZones(): Promise<ZoneMinimumConfig[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (zonesCache && now - cacheTimestamp < CACHE_DURATION) {
    return zonesCache;
  }

  try {
    const zones = await prisma.cateringDeliveryZone.findMany({
      where: {
        active: true,
      },
      orderBy: { displayOrder: 'asc' },
    });

    // Convert database records to ZoneMinimumConfig format
    zonesCache = zones.map(zone => ({
      zone: zone.zone as DeliveryZone,
      name: zone.name,
      minimumAmount: Number(zone.minimumAmount),
      description: zone.description || undefined,
      deliveryFee: Number(zone.deliveryFee),
      estimatedDeliveryTime: zone.estimatedDeliveryTime || undefined,
      active: zone.active,
    }));

    cacheTimestamp = now;
    return zonesCache;
  } catch (error) {
    console.error('Error fetching delivery zones from database:', error);

    // Fallback to hardcoded values if database is unavailable
    return getFallbackDeliveryZones();
  }
}

/**
 * Get delivery zone configuration by zone identifier
 */
export async function getZoneConfig(zone: DeliveryZone): Promise<ZoneMinimumConfig | null> {
  const zones = await getDeliveryZones();
  return zones.find(z => z.zone === zone) || null;
}

/**
 * Get active delivery zones
 */
export async function getActiveDeliveryZones(): Promise<ZoneMinimumConfig[]> {
  const zones = await getDeliveryZones();
  return zones.filter(zone => zone.active);
}

/**
 * Determine delivery zone from postal code and city
 */
export async function determineDeliveryZone(
  postalCode: string,
  city?: string
): Promise<DeliveryZone | null> {
  try {
    const zones = await prisma.cateringDeliveryZone.findMany({
      where: {
        active: true,
      },
    });

    // Find zone that matches postal code
    const postalMatch = zones.find(zone => zone.postalCodes.includes(postalCode));

    if (postalMatch) {
      return postalMatch.zone as DeliveryZone;
    }

    // Find zone that matches city (case-insensitive)
    if (city) {
      const cityMatch = zones.find(zone =>
        zone.cities.some(zoneCity => zoneCity.toLowerCase() === city.toLowerCase())
      );

      if (cityMatch) {
        return cityMatch.zone as DeliveryZone;
      }
    }

    return null;
  } catch (error) {
    console.error('Error determining delivery zone:', error);
    return null;
  }
}

/**
 * Validate minimum purchase for a delivery zone
 */
export async function validateMinimumPurchase(
  orderAmount: number,
  zone: DeliveryZone
): Promise<{
  isValid: boolean;
  currentAmount: number;
  minimumRequired: number;
  zone: DeliveryZone;
  shortfall?: number;
  message?: string;
}> {
  const zoneConfig = await getZoneConfig(zone);

  if (!zoneConfig) {
    return {
      isValid: false,
      currentAmount: orderAmount,
      minimumRequired: 0,
      zone,
      message: 'Invalid delivery zone',
    };
  }

  const isValid = orderAmount >= zoneConfig.minimumAmount;

  const validation = {
    isValid,
    currentAmount: orderAmount,
    minimumRequired: zoneConfig.minimumAmount,
    zone,
  };

  if (!isValid) {
    const shortfall = zoneConfig.minimumAmount - orderAmount;
    return {
      ...validation,
      shortfall,
      message: `Minimum order of $${zoneConfig.minimumAmount.toFixed(2)} required for ${zoneConfig.name}. You need $${shortfall.toFixed(2)} more.`,
    };
  }

  return validation;
}

/**
 * Calculate order total including delivery fee
 */
export async function calculateOrderTotal(
  subtotal: number,
  zone: DeliveryZone,
  includeDeliveryFee: boolean = true
): Promise<number> {
  if (!includeDeliveryFee) {
    return subtotal;
  }

  const zoneConfig = await getZoneConfig(zone);
  return subtotal + (zoneConfig?.deliveryFee || 0);
}

/**
 * Get minimum purchase message for display
 */
export async function getMinimumPurchaseMessage(zone: DeliveryZone): Promise<string> {
  const zoneConfig = await getZoneConfig(zone);
  if (!zoneConfig) {
    return 'Invalid delivery zone';
  }
  return `Minimum order: $${zoneConfig.minimumAmount.toFixed(2)} for ${zoneConfig.name}`;
}

/**
 * Clear delivery zones cache (useful for testing or when zones are updated)
 */
export function clearDeliveryZonesCache(): void {
  zonesCache = null;
  cacheTimestamp = 0;
}

/**
 * Fallback delivery zones (same as hardcoded values)
 */
function getFallbackDeliveryZones(): ZoneMinimumConfig[] {
  return [
    {
      zone: DeliveryZone.SAN_FRANCISCO,
      name: 'San Francisco',
      minimumAmount: 250.0,
      description: 'San Francisco and surrounding areas',
      deliveryFee: 50.0,
      estimatedDeliveryTime: '1-2 hours',
      active: true,
    },
    {
      zone: DeliveryZone.SOUTH_BAY,
      name: 'South Bay',
      minimumAmount: 350.0,
      description: 'San José, Santa Clara, Sunnyvale and surrounding areas',
      deliveryFee: 75.0,
      estimatedDeliveryTime: '2-3 hours',
      active: true,
    },
    {
      zone: DeliveryZone.LOWER_PENINSULA,
      name: 'Lower Peninsula',
      minimumAmount: 400.0,
      description: 'Redwood City, Palo Alto, Mountain View and surrounding areas',
      deliveryFee: 100.0,
      estimatedDeliveryTime: '2-3 hours',
      active: true,
    },
    {
      zone: DeliveryZone.PENINSULA,
      name: 'Peninsula',
      minimumAmount: 500.0,
      description: 'San Ramón, Walnut Creek and far Peninsula areas',
      deliveryFee: 150.0,
      estimatedDeliveryTime: '3-4 hours',
      active: true,
    },
  ];
}
