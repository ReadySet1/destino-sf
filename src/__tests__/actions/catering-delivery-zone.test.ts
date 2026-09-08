/**
 * validateCateringOrderWithDeliveryZone must use the DB-backed zone resolver
 * (`@/lib/delivery-zones`), not the hardcoded ZIP ranges that used to live in
 * `@/types/catering`. QA round 4 (D2): Oakland / Marin / Sunnyvale were being
 * rejected or mispriced because the catering checkout resolved zones from a
 * stale in-code table while the admin edited `catering_delivery_zones`.
 */

jest.mock('@/lib/delivery-zones', () => ({
  determineDeliveryZone: jest.fn(),
  getZoneConfig: jest.fn(),
  validateMinimumPurchase: jest.fn(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import {
  determineDeliveryZone,
  getZoneConfig,
  validateMinimumPurchase,
} from '@/lib/delivery-zones';
import { validateCateringOrderWithDeliveryZone } from '@/actions/catering';
import { DeliveryZone } from '@/types/catering';

const mockDetermine = determineDeliveryZone as jest.MockedFunction<typeof determineDeliveryZone>;
const mockZoneConfig = getZoneConfig as jest.MockedFunction<typeof getZoneConfig>;
const mockValidateMin = validateMinimumPurchase as jest.MockedFunction<
  typeof validateMinimumPurchase
>;

const eastBayConfig = {
  zone: DeliveryZone.EAST_BAY,
  name: 'East Bay',
  minimumAmount: 400,
  deliveryFee: 65,
  active: true,
};

describe('validateCateringOrderWithDeliveryZone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves the zone from the DB using postal code and city separately', async () => {
    mockDetermine.mockResolvedValue('east_bay' as DeliveryZone);
    mockZoneConfig.mockResolvedValue(eastBayConfig);
    mockValidateMin.mockResolvedValue({
      isValid: true,
      currentAmount: 500,
      minimumRequired: 400,
      zone: DeliveryZone.EAST_BAY,
    });

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Oakland', postalCode: '94612' },
      500
    );

    expect(mockDetermine).toHaveBeenCalledWith('94612', 'Oakland');
    expect(result).toEqual({
      success: true,
      deliveryZone: DeliveryZone.EAST_BAY,
      deliveryFee: 65,
      minimumPurchase: 400,
    });
  });

  it('normalizes the DB zone identifier to the DeliveryZone enum value', async () => {
    mockDetermine.mockResolvedValue('marin_county' as DeliveryZone);
    mockZoneConfig.mockResolvedValue({ ...eastBayConfig, zone: DeliveryZone.MARIN_COUNTY });
    mockValidateMin.mockResolvedValue({
      isValid: true,
      currentAmount: 500,
      minimumRequired: 400,
      zone: DeliveryZone.MARIN_COUNTY,
    });

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'San Rafael', postalCode: '94901' },
      500
    );

    expect(result.deliveryZone).toBe(DeliveryZone.MARIN_COUNTY);
    expect(mockZoneConfig).toHaveBeenCalledWith(DeliveryZone.MARIN_COUNTY);
    expect(mockValidateMin).toHaveBeenCalledWith(500, DeliveryZone.MARIN_COUNTY);
  });

  it('returns "not supported" when no active DB zone matches', async () => {
    mockDetermine.mockResolvedValue(null);

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Sacramento', postalCode: '95814' },
      500
    );

    expect(result).toEqual({ success: false, error: 'Delivery zone not supported' });
    expect(mockZoneConfig).not.toHaveBeenCalled();
  });

  it('surfaces the DB minimum when the order is below it', async () => {
    mockDetermine.mockResolvedValue('south_bay' as DeliveryZone);
    mockZoneConfig.mockResolvedValue({
      zone: DeliveryZone.SOUTH_BAY,
      name: 'South Bay',
      minimumAmount: 400,
      deliveryFee: 75,
      active: true,
    });
    mockValidateMin.mockResolvedValue({
      isValid: false,
      currentAmount: 300,
      minimumRequired: 400,
      zone: DeliveryZone.SOUTH_BAY,
      shortfall: 100,
      message: 'Minimum order of $400.00 required for South Bay. You need $100.00 more.',
    });

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Sunnyvale', postalCode: '94089' },
      300
    );

    expect(result).toEqual({
      success: false,
      error: 'Minimum order of $400.00 required for South Bay. You need $100.00 more.',
      deliveryZone: DeliveryZone.SOUTH_BAY,
      deliveryFee: 75,
      minimumPurchase: 400,
    });
  });

  it('tolerates a missing postal code and still tries the city', async () => {
    mockDetermine.mockResolvedValue(null);

    await validateCateringOrderWithDeliveryZone({ city: 'Oakland', postalCode: '' }, 500);

    expect(mockDetermine).toHaveBeenCalledWith('', 'Oakland');
  });

  it('passes an admin-created zone identifier through, uppercased', async () => {
    mockDetermine.mockResolvedValue('north_bay' as DeliveryZone);
    mockZoneConfig.mockResolvedValue({ ...eastBayConfig, zone: 'NORTH_BAY' as DeliveryZone });
    mockValidateMin.mockResolvedValue({
      isValid: true,
      currentAmount: 500,
      minimumRequired: 400,
      zone: 'NORTH_BAY' as DeliveryZone,
    });

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Napa', postalCode: '94558' },
      500
    );

    expect(result.success).toBe(true);
    expect(result.deliveryZone).toBe('NORTH_BAY');
  });

  it('returns a generic failure when a zone lookup throws', async () => {
    mockDetermine.mockResolvedValue('east_bay' as DeliveryZone);
    mockZoneConfig.mockRejectedValue(new Error('db down'));

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Oakland', postalCode: '94612' },
      500
    );

    expect(result).toEqual({ success: false, error: 'Failed to validate delivery zone' });
  });

  it('fails closed when the zone config row is missing', async () => {
    mockDetermine.mockResolvedValue('east_bay' as DeliveryZone);
    mockZoneConfig.mockResolvedValue(null);

    const result = await validateCateringOrderWithDeliveryZone(
      { city: 'Oakland', postalCode: '94612' },
      500
    );

    expect(result).toEqual({
      success: false,
      error: 'Delivery zone configuration not found',
    });
  });
});
