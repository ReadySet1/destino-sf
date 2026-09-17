/**
 * Self-heal regression tests for the shared Prisma singleton in
 * src/lib/db-unified.ts.
 *
 * Background (2026-09-16 outage): the shared client's engine was disconnected
 * mid-flight and every recovery path reset the singleton slots only AFTER
 * `await client.$disconnect()`. When that call rejects or never settles, the
 * dead client stays published and every query fails with "Engine is not yet
 * connected" until the container is restarted.
 *
 * These tests drive the REAL module (jest.setup.enhanced.js normally replaces
 * it with stubs) against a fake PrismaClient whose `$disconnect` can hang or
 * reject, and assert that recovery always publishes a fresh client.
 */

type QueryRawTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

interface FakeClient {
  $connect: jest.Mock<Promise<void>, []>;
  $disconnect: jest.Mock<Promise<void>, []>;
  $queryRaw: jest.Mock<Promise<unknown>, Parameters<QueryRawTag>>;
  $transaction: jest.Mock<Promise<unknown>, [(client: FakeClient) => unknown]>;
  $on: jest.Mock<void, [string, (...args: unknown[]) => void]>;
}

// Every client the module constructs through `new PrismaClient(...)`, in order.
const mockConstructed: FakeClient[] = [];
// Optional per-index hooks so a test can shape a client before the module
// starts using it (the constructor is called deep inside the module).
const mockOnConstruct: Array<((client: FakeClient) => void) | undefined> = [];

function mockBuildFakeClient(): FakeClient {
  const client: FakeClient = {
    $connect: jest.fn<Promise<void>, []>(() => Promise.resolve()),
    $disconnect: jest.fn<Promise<void>, []>(() => Promise.resolve()),
    $queryRaw: jest.fn<Promise<unknown>, Parameters<QueryRawTag>>(() =>
      Promise.resolve([{ ok: 1 }])
    ),
    $transaction: jest.fn<Promise<unknown>, [(client: FakeClient) => unknown]>(fn =>
      Promise.resolve(fn(client))
    ),
    $on: jest.fn<void, [string, (...args: unknown[]) => void]>(),
  };
  return client;
}

jest.mock('@prisma/client', () => ({
  __esModule: true,
  PrismaClient: jest.fn(() => {
    const client = mockBuildFakeClient();
    const index = mockConstructed.push(client) - 1;
    mockOnConstruct[index]?.(client);
    return client;
  }),
  Prisma: {
    TransactionIsolationLevel: { ReadCommitted: 'ReadCommitted' },
  },
}));

jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((fn: (scope: unknown) => void) => fn({})),
  startSpan: jest.fn((_opts: unknown, fn: () => unknown) => fn()),
}));

type DbUnified = typeof import('@/lib/db-unified');

function loadRealDbUnified(): DbUnified {
  let mod!: DbUnified;
  jest.isolateModules(() => {
    mod = jest.requireActual('@/lib/db-unified');
  });
  return mod;
}

// The module skips auto-init at load time when NODE_ENV is "test" and also
// short-circuits client creation to an inert dummy. Load it under "test" so
// its singleton starts empty, then flip to "development" so recovery paths
// construct real (mocked) PrismaClient instances we can observe.
const mutableEnv = process.env as Record<string, string | undefined>;
function useRuntimeEnv(): void {
  mutableEnv.NODE_ENV = 'development';
}

const ENGINE_DEAD_MESSAGE = 'Engine is not yet connected';
function engineDeadError(): Error {
  return new Error(ENGINE_DEAD_MESSAGE);
}

function neverSettles(): Promise<void> {
  return new Promise<void>(() => {});
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function track<T>(promise: Promise<T>): { settled: boolean } {
  const status = { settled: false };
  promise.then(
    () => {
      status.settled = true;
    },
    () => {
      status.settled = true;
    }
  );
  return status;
}

function failOnHealthCheck(client: FakeClient): void {
  client.$queryRaw.mockImplementation((strings: TemplateStringsArray) =>
    strings.join('').includes('health_check')
      ? Promise.reject(engineDeadError())
      : Promise.resolve([{ ok: 1 }])
  );
}

const globalSlots = globalThis as unknown as { prisma?: unknown; prismaVersion?: unknown };

describe('db-unified self-heal: the dead client must be unpublished before it is disconnected', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConstructed.length = 0;
    mockOnConstruct.length = 0;
    delete globalSlots.prisma;
    delete globalSlots.prismaVersion;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mutableEnv.NODE_ENV = 'test';
    delete globalSlots.prisma;
    delete globalSlots.prismaVersion;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('withRetry()', () => {
    it("recovers on a fresh client when the dead client's $disconnect never settles", async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      const operation = jest
        .fn<Promise<string>, []>()
        .mockImplementationOnce(async () => {
          mockConstructed[0].$disconnect.mockReturnValue(neverSettles());
          throw engineDeadError();
        })
        .mockResolvedValueOnce('recovered');

      const result = db.withRetry(operation, 3, 'self-heal hang');
      const status = track(result);

      // Attempt 1 backs off 1000 ms + up to 500 ms jitter before attempt 2.
      await jest.advanceTimersByTimeAsync(2_000);

      expect(status.settled).toBe(true);
      await expect(result).resolves.toBe('recovered');
      expect(mockConstructed).toHaveLength(2);
      expect(mockConstructed[0].$disconnect).toHaveBeenCalledTimes(1);
      expect(mockConstructed[1].$disconnect).not.toHaveBeenCalled();
    });

    it("recovers on a fresh client when the dead client's $disconnect rejects", async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      const operation = jest
        .fn<Promise<string>, []>()
        .mockImplementationOnce(async () => {
          mockConstructed[0].$disconnect.mockRejectedValue(new Error('disconnect exploded'));
          throw engineDeadError();
        })
        .mockResolvedValueOnce('recovered');

      const result = db.withRetry(operation, 3, 'self-heal reject');
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(result).resolves.toBe('recovered');
      expect(mockConstructed).toHaveLength(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('lets concurrent failures share one replacement client instead of orphaning an in-flight init', async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      // The replacement client (#1) parks mid-$connect so the second failure
      // lands while its initialization is still in flight.
      const connectGate = deferred<void>();
      mockOnConstruct[1] = client => client.$connect.mockReturnValue(connectGate.promise);

      const secondFailure = deferred<void>();
      const first = jest
        .fn<Promise<string>, []>()
        .mockImplementationOnce(async () => {
          throw engineDeadError();
        })
        .mockResolvedValueOnce('one');
      const second = jest
        .fn<Promise<string>, []>()
        .mockImplementationOnce(async () => {
          await secondFailure.promise;
          throw engineDeadError();
        })
        .mockResolvedValueOnce('two');

      const p1 = db.withRetry(first, 3, 'concurrent-1');
      const p2 = db.withRetry(second, 3, 'concurrent-2');

      // op1 fails, backs off, and attempt 2 starts client #1 (parked on $connect).
      await jest.advanceTimersByTimeAsync(2_000);
      expect(mockConstructed).toHaveLength(2);

      // op2 now fails against the already-discarded client #0 and backs off.
      secondFailure.resolve();
      await jest.advanceTimersByTimeAsync(2_000);

      connectGate.resolve();
      await jest.advanceTimersByTimeAsync(50);

      await expect(p1).resolves.toBe('one');
      await expect(p2).resolves.toBe('two');
      expect(mockConstructed).toHaveLength(2);
      expect(mockConstructed[0].$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureConnection()', () => {
    it("recovers on a fresh client when the dead client's $disconnect never settles", async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      mockOnConstruct[0] = client => {
        failOnHealthCheck(client);
        client.$disconnect.mockReturnValue(neverSettles());
      };

      const result = db.ensureConnection(3);
      const status = track(result);

      // Attempt 1 sleeps 1000 ms before attempt 2.
      await jest.advanceTimersByTimeAsync(2_000);

      expect(status.settled).toBe(true);
      await expect(result).resolves.toBeUndefined();
      expect(mockConstructed).toHaveLength(2);
      expect(mockConstructed[0].$disconnect).toHaveBeenCalledTimes(1);
    });

    it("recovers on a fresh client when the dead client's $disconnect rejects", async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      mockOnConstruct[0] = client => {
        failOnHealthCheck(client);
        client.$disconnect.mockRejectedValue(new Error('disconnect exploded'));
      };

      const result = db.ensureConnection(3);
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(result).resolves.toBeUndefined();
      expect(mockConstructed).toHaveLength(2);
    });
  });

  describe('shutdown()', () => {
    it('unpublishes the client so later work gets a fresh one, even when $disconnect rejects', async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      mockOnConstruct[0] = client =>
        client.$disconnect.mockRejectedValue(new Error('disconnect exploded'));

      await expect(db.withRetry(async () => 'warm', 1, 'warm-up')).resolves.toBe('warm');
      expect(mockConstructed).toHaveLength(1);

      await expect(db.shutdown()).resolves.toBeUndefined();
      expect(mockConstructed[0].$disconnect).toHaveBeenCalledTimes(1);

      await expect(db.withRetry(async () => 'after', 1, 'after-shutdown')).resolves.toBe('after');
      expect(mockConstructed).toHaveLength(2);
    });
  });

  describe('forceResetConnection()', () => {
    it("publishes a fresh client even when the old client's $disconnect never settles", async () => {
      const db = loadRealDbUnified();
      useRuntimeEnv();

      await expect(db.withRetry(async () => 'warm', 1, 'warm-up')).resolves.toBe('warm');
      mockConstructed[0].$disconnect.mockReturnValue(neverSettles());

      const reset = db.forceResetConnection();
      const status = track(reset);

      // forceResetConnection waits 100 ms before creating the new client.
      await jest.advanceTimersByTimeAsync(500);

      expect(status.settled).toBe(true);
      await expect(reset).resolves.toBeUndefined();
      expect(mockConstructed).toHaveLength(2);

      await expect(db.withRetry(async () => 'after', 1, 'after-reset')).resolves.toBe('after');
      expect(mockConstructed).toHaveLength(2);
    });
  });

  describe('initialization with a stale global client', () => {
    it("does not block on the stale client's $disconnect before publishing the new one", async () => {
      const db = loadRealDbUnified();

      // A client left behind by a previous module instance (older version tag).
      const stale = mockBuildFakeClient();
      stale.$disconnect.mockReturnValue(neverSettles());
      globalSlots.prisma = stale;
      globalSlots.prismaVersion = 'previous-deploy';

      useRuntimeEnv();

      const result = db.withRetry(async () => 'fresh', 1, 'stale-global');
      const status = track(result);
      await jest.advanceTimersByTimeAsync(50);

      expect(status.settled).toBe(true);
      await expect(result).resolves.toBe('fresh');
      expect(stale.$disconnect).toHaveBeenCalledTimes(1);
      expect(mockConstructed).toHaveLength(1);
    });
  });
});
