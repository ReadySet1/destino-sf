/**
 * The DB-backed zone resolver that catering checkout and regular orders share.
 * QA round 4 (D2) moved catering onto this path; these tests drive the REAL
 * implementation against a mocked `catering_delivery_zones` table.
 */
const findMany = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: { cateringDeliveryZone: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

import {
  clearDeliveryZonesCache,
  determineDeliveryZone,
  getActiveDeliveryZones,
  getZoneConfig,
  validateMinimumPurchase,
} from '@/lib/delivery-zones';
import { DeliveryZone } from '@/types/catering';

const rows = [
  {
    zone: 'east_bay',
    name: 'East Bay',
    active: true,
    displayOrder: 4,
    minimumAmount: 400,
    deliveryFee: 65,
    description: 'Oakland, Berkeley, and surrounding East Bay cities',
    estimatedDeliveryTime: '2-3 hours',
    postalCodes: ['94601', '94612'],
    cities: ['Oakland', 'Berkeley', 'Alameda'],
  },
  {
    zone: 'marin_county',
    name: 'Marin County',
    active: true,
    displayOrder: 5,
    minimumAmount: 400,
    deliveryFee: 65,
    description: null,
    estimatedDeliveryTime: null,
    postalCodes: ['94901', '94903'],
    cities: ['San Rafael', 'Novato'],
  },
];

describe('delivery-zones (DB-backed)', () => {
  beforeEach(() => {
    clearDeliveryZonesCache();
    findMany.mockReset();
    findMany.mockResolvedValue(rows);
  });

  describe('determineDeliveryZone', () => {
    it('matches by postal code first', async () => {
      await expect(determineDeliveryZone('94612', 'Somewhere')).resolves.toBe('east_bay');
    });

    it('falls back to a case-insensitive city match', async () => {
      await expect(determineDeliveryZone('', 'oakland')).resolves.toBe('east_bay');
      await expect(determineDeliveryZone('00000', 'SAN RAFAEL')).resolves.toBe('marin_county');
    });

    it('returns null when nothing matches', async () => {
      await expect(determineDeliveryZone('95814', 'Sacramento')).resolves.toBeNull();
    });

    it('normalizes ZIP+4, padding and stray characters before matching', async () => {
      await expect(determineDeliveryZone('94612-1234')).resolves.toBe('east_bay');
      await expect(determineDeliveryZone(' 94612 ')).resolves.toBe('east_bay');
      await expect(determineDeliveryZone('CA 94612')).resolves.toBe('east_bay');
    });

    it('trims the city before matching', async () => {
      await expect(determineDeliveryZone('', '  Oakland ')).resolves.toBe('east_bay');
    });

    it('does not match a partial or empty postal code by accident', async () => {
      await expect(determineDeliveryZone('946', 'Nowhere')).resolves.toBeNull();
      await expect(determineDeliveryZone('', '')).resolves.toBeNull();
    });

    it('returns null and logs when the zones table has no active rows', async () => {
      const err = jest.spyOn(console, 'error').mockImplementation(() => {});
      findMany.mockResolvedValue([]);
      await expect(determineDeliveryZone('94612', 'Oakland')).resolves.toBeNull();
      expect(err).toHaveBeenCalledWith(expect.stringContaining('no active rows'));
      err.mockRestore();
    });

    it('only considers active zones', async () => {
      await determineDeliveryZone('94612', 'Oakland');
      expect(findMany).toHaveBeenCalledWith({ where: { active: true } });
    });

    it('returns null instead of throwing when the DB is down', async () => {
      findMany.mockRejectedValue(new Error('connection refused'));
      await expect(determineDeliveryZone('94612', 'Oakland')).resolves.toBeNull();
    });
  });

  describe('getZoneConfig', () => {
    it('resolves the enum value against the lowercase DB identifier', async () => {
      const config = await getZoneConfig(DeliveryZone.EAST_BAY);
      expect(config).toMatchObject({ name: 'East Bay', minimumAmount: 400, deliveryFee: 65 });
    });

    it('returns null for a zone the DB does not have', async () => {
      await expect(getZoneConfig(DeliveryZone.PENINSULA)).resolves.toBeNull();
    });

    it('serves repeat lookups from the cache', async () => {
      await getZoneConfig(DeliveryZone.EAST_BAY);
      await getZoneConfig(DeliveryZone.MARIN_COUNTY);
      expect(findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateMinimumPurchase', () => {
    it('accepts an order at or above the DB minimum', async () => {
      await expect(validateMinimumPurchase(400, DeliveryZone.EAST_BAY)).resolves.toMatchObject({
        isValid: true,
        minimumRequired: 400,
      });
    });

    it('reports the shortfall with the zone name from the DB', async () => {
      await expect(validateMinimumPurchase(300, DeliveryZone.EAST_BAY)).resolves.toEqual({
        isValid: false,
        currentAmount: 300,
        minimumRequired: 400,
        zone: DeliveryZone.EAST_BAY,
        shortfall: 100,
        message: 'Minimum order of $400.00 required for East Bay. You need $100.00 more.',
      });
    });

    it('fails closed for an unknown zone', async () => {
      await expect(validateMinimumPurchase(1000, DeliveryZone.PENINSULA)).resolves.toMatchObject({
        isValid: false,
        message: 'Invalid delivery zone',
      });
    });
  });

  describe('getActiveDeliveryZones', () => {
    it('maps DB rows into display config (numbers, optional fields)', async () => {
      const zones = await getActiveDeliveryZones();
      expect(zones).toHaveLength(2);
      expect(zones[1]).toEqual({
        zone: 'marin_county',
        name: 'Marin County',
        minimumAmount: 400,
        description: undefined,
        deliveryFee: 65,
        estimatedDeliveryTime: undefined,
        active: true,
      });
    });

    it('falls back to the in-code defaults when the DB is down', async () => {
      findMany.mockRejectedValue(new Error('connection refused'));
      const zones = await getActiveDeliveryZones();
      expect(zones.length).toBeGreaterThan(0);
      expect(zones.map(z => z.zone)).toContain(DeliveryZone.SAN_FRANCISCO);
    });
  });
});
