/**
 * Unit tests for the Square write-side service.
 *
 * Mocks `https.request` at the Node module boundary so we exercise the full
 * payload shaping + error classification logic without touching the network.
 */

import { EventEmitter } from 'events';
import https from 'https';
import {
  SquareWriteError,
  archiveSquareItem,
  createSquareItem,
  dollarsToCents,
  updateSquareItem,
} from '@/lib/square/catalog-write';

jest.mock('@/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

type MockResponse = {
  statusCode: number;
  body?: unknown;
};

interface CapturedRequest {
  options: https.RequestOptions;
  body?: string;
}

function mockHttps(response: MockResponse): { captured: CapturedRequest[] } {
  const captured: CapturedRequest[] = [];
  const requestSpy = jest.spyOn(https, 'request').mockImplementation(((
    options: https.RequestOptions,
    cb?: (res: any) => void
  ) => {
    const req = new EventEmitter() as any;
    let body = '';
    req.write = (chunk: string) => {
      body += chunk;
    };
    req.end = () => {
      captured.push({ options, body });
      const res = new EventEmitter() as any;
      res.statusCode = response.statusCode;
      cb?.(res);
      const payload = response.body === undefined ? '' : JSON.stringify(response.body);
      // deliver body chunk then end on next tick so listeners attach
      setImmediate(() => {
        res.emit('data', payload);
        res.emit('end');
      });
    };
    req.setTimeout = jest.fn();
    req.destroy = jest.fn();
    return req;
  }) as unknown as typeof https.request);
  return { captured };
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env.SQUARE_PRODUCTION_TOKEN = 'test-token-prod';
  process.env.USE_SQUARE_SANDBOX = '';
  process.env.SQUARE_CATALOG_USE_PRODUCTION = '';
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...ORIG_ENV };
});

describe('dollarsToCents', () => {
  it('converts with Math.round semantics', () => {
    expect(dollarsToCents(12.99)).toBe(1299);
    expect(dollarsToCents(12.995)).toBe(1300);
    expect(dollarsToCents(0)).toBe(0);
    expect(dollarsToCents(1)).toBe(100);
  });
});

describe('createSquareItem', () => {
  it('shapes the CatalogObject payload with ITEM + variation + price in cents', async () => {
    const { captured } = mockHttps({
      statusCode: 200,
      body: {
        catalog_object: {
          id: 'SQ-ITEM-1',
          version: 17,
          item_data: { variations: [{ id: 'SQ-VAR-1' }] },
        },
      },
    });

    const result = await createSquareItem({
      idempotencyKey: 'idem-1',
      name: 'Gluten-Free Beef Empanada',
      description: 'GF',
      priceDollars: 8.99,
      squareCategoryId: 'CAT-123',
    });

    expect(result).toEqual({
      squareId: 'SQ-ITEM-1',
      squareVariationId: 'SQ-VAR-1',
      version: 17n,
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].options.path).toBe('/v2/catalog/object');
    expect(captured[0].options.method).toBe('POST');
    const body = JSON.parse(captured[0].body!);
    expect(body.idempotency_key).toBe('idem-1');
    expect(body.object.type).toBe('ITEM');
    expect(body.object.present_at_all_locations).toBe(true);
    expect(body.object.item_data.name).toBe('Gluten-Free Beef Empanada');
    expect(body.object.item_data.category_id).toBe('CAT-123');
    const variation = body.object.item_data.variations[0];
    expect(variation.type).toBe('ITEM_VARIATION');
    expect(variation.item_variation_data.pricing_type).toBe('FIXED_PRICING');
    expect(variation.item_variation_data.price_money).toEqual({ amount: 899, currency: 'USD' });
  });

  it('classifies VERSION_MISMATCH from Square error body', async () => {
    mockHttps({
      statusCode: 400,
      body: { errors: [{ code: 'VERSION_MISMATCH', category: 'CONFLICT_ERROR' }] },
    });

    await expect(
      createSquareItem({ idempotencyKey: 'idem-2', name: 'x', priceDollars: 1 })
    ).rejects.toMatchObject({ name: 'SquareWriteError', code: 'VERSION_MISMATCH' });
  });

  it('classifies 5xx as SERVER (retryable)', async () => {
    mockHttps({ statusCode: 502, body: { errors: [{ code: 'INTERNAL_SERVER_ERROR' }] } });
    const err = await createSquareItem({ idempotencyKey: 'idem-3', name: 'x', priceDollars: 1 })
      .then(() => null)
      .catch(e => e);
    expect(err).toBeInstanceOf(SquareWriteError);
    expect(err.code).toBe('SERVER');
    expect(err.retryable).toBe(true);
  });

  it('classifies 401 as UNAUTHORIZED (non-retryable)', async () => {
    mockHttps({ statusCode: 401, body: { errors: [{ code: 'UNAUTHORIZED' }] } });
    const err = await createSquareItem({ idempotencyKey: 'idem-4', name: 'x', priceDollars: 1 })
      .then(() => null)
      .catch(e => e);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.retryable).toBe(false);
  });
});

describe('updateSquareItem', () => {
  it('sends the current squareVersion in the payload for optimistic locking', async () => {
    const { captured } = mockHttps({
      statusCode: 200,
      body: { catalog_object: { version: 42 } },
    });

    const res = await updateSquareItem({
      idempotencyKey: 'upd-1',
      squareId: 'SQ-ITEM-1',
      squareVariationId: 'SQ-VAR-1',
      currentVersion: 41n,
      name: 'x',
      priceDollars: 2,
    });

    expect(res.version).toBe(42n);
    const body = JSON.parse(captured[0].body!);
    expect(body.object.version).toBe('41');
    expect(body.object.id).toBe('SQ-ITEM-1');
    expect(body.object.item_data.variations[0].id).toBe('SQ-VAR-1');
  });

  it('rejects when currentVersion is missing', async () => {
    await expect(
      updateSquareItem({
        idempotencyKey: 'upd-2',
        squareId: 'SQ-1',
        squareVariationId: 'V-1',
        // @ts-expect-error intentional: test runtime guard
        currentVersion: undefined,
        name: 'x',
        priceDollars: 1,
      })
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('archiveSquareItem', () => {
  it('uses DELETE when mode is "delete"', async () => {
    const { captured } = mockHttps({ statusCode: 200, body: { deleted_object_ids: ['SQ-1'] } });
    await archiveSquareItem({ idempotencyKey: 'arch-1', squareId: 'SQ-1', mode: 'delete' });
    expect(captured[0].options.method).toBe('DELETE');
    expect(captured[0].options.path).toBe('/v2/catalog/object/SQ-1');
  });

  it('uses POST upsert with present_at_all_locations=false when mode is "hide"', async () => {
    const { captured } = mockHttps({
      statusCode: 200,
      body: { catalog_object: { version: 2 } },
    });
    await archiveSquareItem({
      idempotencyKey: 'arch-2',
      squareId: 'SQ-2',
      squareVariationId: 'V-2',
      currentVersion: 1n,
      name: 'x',
      priceDollars: 1,
      mode: 'hide',
    });
    expect(captured[0].options.method).toBe('POST');
    const body = JSON.parse(captured[0].body!);
    expect(body.object.present_at_all_locations).toBe(false);
  });
});
