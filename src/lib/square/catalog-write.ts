/**
 * Destino → Square catalog write API.
 *
 * Issues direct HTTPS calls to Square's Catalog v2 endpoints. Read paths go through
 * `catalog-api.ts`; this module owns writes (upsert / delete / image upload).
 *
 * All mutations carry an `idempotency_key`. Updates carry the current `squareVersion`
 * so Square enforces optimistic concurrency for us.
 */

import https from 'https';
import { logger } from '@/utils/logger';

const SQUARE_API_TIMEOUT_MS = 45_000;
const SQUARE_SOCKET_TIMEOUT_MS = 50_000;
// Match the version used by the rest of the codebase (orders, payments, labor,
// checkout-links, client-adapter). Square deprecates API versions ~1 year after
// release, so keep this in sync with the other Square integration modules.
const SQUARE_VERSION_HEADER = '2025-05-21';

export type WriteErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'VERSION_MISMATCH'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'UNKNOWN';

export class SquareWriteError extends Error {
  constructor(
    public readonly code: WriteErrorCode,
    message: string,
    public readonly status?: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'SquareWriteError';
  }

  get retryable(): boolean {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT' || this.code === 'SERVER' || this.code === 'RATE_LIMITED';
  }
}

interface SquareEnv {
  host: string;
  token: string;
  useSandbox: boolean;
}

function resolveSquareEnv(): SquareEnv {
  const forceCatalogProduction = process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
  const forceTransactionSandbox = process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
  const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

  let token: string | undefined;
  let host: string;
  let env: 'sandbox' | 'production';

  if (forceCatalogProduction || (!useSandbox && !forceTransactionSandbox)) {
    env = 'production';
    token = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    host = 'connect.squareup.com';
  } else {
    env = 'sandbox';
    token = process.env.SQUARE_SANDBOX_TOKEN;
    host = 'connect.squareupsandbox.com';
  }

  if (!token) {
    throw new SquareWriteError('UNAUTHORIZED', `Square token not configured for ${env}`);
  }

  return { host, token: token.trim().replace(/[\r\n\t\s]/g, ''), useSandbox: env === 'sandbox' };
}

function classifyError(status: number | undefined, body: unknown): WriteErrorCode {
  if (!status) return 'NETWORK';
  if (status === 401 || status === 403) return 'UNAUTHORIZED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER';

  const errors = (body as { errors?: Array<{ code?: string; category?: string }> })?.errors ?? [];
  if (errors.some(e => e.code === 'VERSION_MISMATCH' || e.category === 'CONFLICT_ERROR')) {
    return 'VERSION_MISMATCH';
  }
  if (status >= 400) return 'VALIDATION';
  return 'UNKNOWN';
}

function request<T>(
  method: 'POST' | 'DELETE',
  path: string,
  body: unknown,
  env: SquareEnv
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const serialized = body !== undefined ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: env.host,
        path,
        method,
        headers: {
          Authorization: `Bearer ${env.token}`,
          'Square-Version': SQUARE_VERSION_HEADER,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          ...(serialized ? { 'Content-Length': Buffer.byteLength(serialized).toString() } : {}),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          let parsed: unknown = null;
          if (data.length > 0) {
            try {
              parsed = JSON.parse(data);
            } catch {
              /* keep as string below */
            }
          }
          if (status >= 200 && status < 300) {
            resolve(parsed as T);
            return;
          }
          const code = classifyError(status, parsed);
          reject(new SquareWriteError(code, `Square ${method} ${path} failed (${status})`, status, parsed ?? data));
        });
      }
    );

    const timer = setTimeout(() => {
      req.destroy(new SquareWriteError('TIMEOUT', `Square ${method} ${path} timed out after ${SQUARE_API_TIMEOUT_MS}ms`));
    }, SQUARE_API_TIMEOUT_MS);
    req.setTimeout(SQUARE_SOCKET_TIMEOUT_MS, () => {
      req.destroy(new SquareWriteError('TIMEOUT', `Square ${method} ${path} socket timeout`));
    });

    req.on('error', err => {
      clearTimeout(timer);
      if (err instanceof SquareWriteError) {
        reject(err);
        return;
      }
      reject(new SquareWriteError('NETWORK', err.message));
    });
    req.on('close', () => clearTimeout(timer));

    if (serialized) req.write(serialized);
    req.end();
  });
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function catalogItemPayload(input: {
  squareId?: string;
  name: string;
  description?: string | null;
  priceCents: number;
  categoryId?: string | null;
  imageIds?: string[];
  variationId?: string;
  variationName?: string;
  currentVersion?: bigint;
}) {
  const itemId = input.squareId ?? '#new-item';
  const variationId = input.variationId ?? '#new-variation';
  const variationName = input.variationName ?? 'Regular';

  return {
    type: 'ITEM',
    id: itemId,
    ...(input.currentVersion !== undefined ? { version: input.currentVersion.toString() } : {}),
    present_at_all_locations: true,
    item_data: {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      ...(input.categoryId ? { category_id: input.categoryId } : {}),
      ...(input.imageIds && input.imageIds.length > 0 ? { image_ids: input.imageIds } : {}),
      variations: [
        {
          type: 'ITEM_VARIATION',
          id: variationId,
          present_at_all_locations: true,
          item_variation_data: {
            name: variationName,
            pricing_type: 'FIXED_PRICING',
            price_money: {
              amount: input.priceCents,
              currency: 'USD',
            },
          },
        },
      ],
    },
  };
}

export interface CreateItemInput {
  idempotencyKey: string;
  name: string;
  description?: string | null;
  priceDollars: number;
  squareCategoryId?: string | null;
  imageIds?: string[];
}

export interface CreateItemResult {
  squareId: string;
  squareVariationId: string;
  version: bigint;
}

export async function createSquareItem(input: CreateItemInput): Promise<CreateItemResult> {
  const env = resolveSquareEnv();
  const priceCents = dollarsToCents(input.priceDollars);

  const body = {
    idempotency_key: input.idempotencyKey,
    object: catalogItemPayload({
      name: input.name,
      description: input.description,
      priceCents,
      categoryId: input.squareCategoryId,
      imageIds: input.imageIds,
    }),
  };

  logger.info('[square-write] createSquareItem', { name: input.name, priceCents });
  const res = await request<{
    catalog_object: { id: string; version: number | string; item_data?: { variations?: Array<{ id: string }> } };
    id_mappings?: Array<{ client_object_id: string; object_id: string }>;
  }>('POST', '/v2/catalog/object', body, env);

  const obj = res.catalog_object;
  const variation = obj.item_data?.variations?.[0];
  if (!obj?.id || !variation?.id) {
    throw new SquareWriteError('UNKNOWN', 'Square did not return expected catalog object shape', 200, res);
  }

  return {
    squareId: obj.id,
    squareVariationId: variation.id,
    version: BigInt(obj.version ?? 0),
  };
}

export interface UpdateItemInput {
  idempotencyKey: string;
  squareId: string;
  squareVariationId: string;
  currentVersion: bigint;
  name: string;
  description?: string | null;
  priceDollars: number;
  squareCategoryId?: string | null;
  imageIds?: string[];
}

export interface UpdateItemResult {
  version: bigint;
}

export async function updateSquareItem(input: UpdateItemInput): Promise<UpdateItemResult> {
  if (input.currentVersion === undefined || input.currentVersion === null) {
    throw new SquareWriteError('VALIDATION', 'updateSquareItem requires currentVersion for optimistic locking');
  }

  const env = resolveSquareEnv();
  const body = {
    idempotency_key: input.idempotencyKey,
    object: catalogItemPayload({
      squareId: input.squareId,
      variationId: input.squareVariationId,
      name: input.name,
      description: input.description,
      priceCents: dollarsToCents(input.priceDollars),
      categoryId: input.squareCategoryId,
      imageIds: input.imageIds,
      currentVersion: input.currentVersion,
    }),
  };

  logger.info('[square-write] updateSquareItem', { squareId: input.squareId, version: input.currentVersion.toString() });
  const res = await request<{ catalog_object: { version: number | string } }>(
    'POST',
    '/v2/catalog/object',
    body,
    env
  );

  return { version: BigInt(res.catalog_object.version ?? 0) };
}

/**
 * How an archive propagates to Square. Note that "archive" here means the
 * admin-visible action in the Destino dashboard; Square itself doesn't have
 * an "archive" concept — we either delete the object or hide it at all
 * locations.
 *
 * - `'hide'` (default) — upserts the object with `present_at_all_locations=false`,
 *   removing it from every location without deleting. The object stays in
 *   Square's catalog with the same ID/version, so the admin's "restore"
 *   action can just UPDATE it back to `present_at_all_locations=true`. This
 *   preserves the round-trip archive/restore semantics the admin UI expects.
 * - `'delete'` — true soft-delete via `DELETE /v2/catalog/object/{id}`. Square
 *   sets `is_deleted=true` server-side; the object is retained for history
 *   but becomes un-updateable via the API. Unarchiving a delete-archived
 *   product would require recreating it as a new Square object (NOT supported
 *   by the current UNARCHIVE path). Use this only for permanent removal.
 *
 * Override via `SQUARE_ARCHIVE_MODE=delete` or by passing `mode` explicitly.
 */
export type ArchiveMode = 'delete' | 'hide';

export interface ArchiveItemInput {
  idempotencyKey: string;
  squareId: string;
  squareVariationId?: string;
  currentVersion?: bigint;
  name?: string;
  priceDollars?: number;
  mode?: ArchiveMode;
}

export async function archiveSquareItem(input: ArchiveItemInput): Promise<void> {
  const env = resolveSquareEnv();
  const mode: ArchiveMode =
    input.mode ?? (process.env.SQUARE_ARCHIVE_MODE === 'delete' ? 'delete' : 'hide');

  if (mode === 'delete') {
    logger.info('[square-write] archiveSquareItem (delete)', { squareId: input.squareId });
    await request<unknown>('DELETE', `/v2/catalog/object/${encodeURIComponent(input.squareId)}`, undefined, env);
    return;
  }

  if (
    input.currentVersion === undefined ||
    input.squareVariationId === undefined ||
    input.name === undefined ||
    input.priceDollars === undefined
  ) {
    throw new SquareWriteError(
      'VALIDATION',
      'archiveSquareItem (hide mode) requires currentVersion, squareVariationId, name, and priceDollars'
    );
  }

  const body = {
    idempotency_key: input.idempotencyKey,
    object: {
      ...catalogItemPayload({
        squareId: input.squareId,
        variationId: input.squareVariationId,
        name: input.name,
        priceCents: dollarsToCents(input.priceDollars),
        currentVersion: input.currentVersion,
      }),
      present_at_all_locations: false,
    },
  };

  logger.info('[square-write] archiveSquareItem (hide)', { squareId: input.squareId });
  await request<unknown>('POST', '/v2/catalog/object', body, env);
}

export interface UnarchiveItemInput extends UpdateItemInput {}

export async function unarchiveSquareItem(input: UnarchiveItemInput): Promise<UpdateItemResult> {
  return updateSquareItem(input);
}

export interface UploadImageInput {
  idempotencyKey: string;
  imageUrl: string;
  attachToSquareId?: string;
  caption?: string;
}

export interface UploadImageResult {
  imageId: string;
}

/**
 * If `imageUrl` already points at Square CDN, return its embedded object ID
 * (format: `https://items-images-*.s3.amazonaws.com/...` or similar).
 * Otherwise uploads via the catalog image endpoint.
 *
 * NOTE: Square's `/v2/catalog/images` endpoint requires multipart/form-data.
 * The HTTPS helper above only handles JSON, so multipart uploads live in a
 * separate implementation path. For now, image URLs from Supabase are left
 * in the local DB and not pushed to Square — admins who want Square images
 * should upload through Square Dashboard. See TODO below.
 */
export async function uploadSquareImage(_input: UploadImageInput): Promise<UploadImageResult | null> {
  // TODO(phase-2): implement multipart upload to POST /v2/catalog/images.
  // Current Phase 1 behavior: skip image push — local DB keeps full URL list,
  // Square catalog will not show these images until admin uploads via Square UI.
  logger.warn('[square-write] uploadSquareImage is a no-op in Phase 1; image not pushed to Square');
  return null;
}
