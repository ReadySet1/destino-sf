import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/process-webhooks-fixed/route';
import { ensureConnection, shutdown } from '@/lib/db-unified';
import { processWebhookQueue } from '@/lib/webhook-queue-fix';

// The route runs inside a long-lived Node process on Dokploy. The shared
// db-unified Prisma client is used concurrently by every other request
// (pages, admin sync, webhooks). Disconnecting it from a cron handler
// wedged the engine in production on 2026-09-16 ("Engine is not yet
// connected" on every query until the container was restarted).
jest.mock('@/lib/db-unified', () => ({
  ensureConnection: jest.fn(() => Promise.resolve()),
  shutdown: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/webhook-queue-fix', () => ({
  processWebhookQueue: jest.fn(() => Promise.resolve({ processed: 0, failed: 0, skipped: 0 })),
}));

const mockedEnsureConnection = ensureConnection as jest.MockedFunction<typeof ensureConnection>;
const mockedShutdown = shutdown as jest.MockedFunction<typeof shutdown>;
const mockedProcessWebhookQueue = processWebhookQueue as jest.MockedFunction<
  typeof processWebhookQueue
>;

function buildRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret' },
  });
}

describe('GET /api/cron/process-webhooks-fixed', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    jest.restoreAllMocks();
  });

  it('processes the queue and reports stats', async () => {
    mockedProcessWebhookQueue.mockResolvedValueOnce({ processed: 2, failed: 0, skipped: 1 });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toEqual({ processed: 2, failed: 0, skipped: 1 });
    expect(mockedEnsureConnection).toHaveBeenCalledTimes(1);
    expect(mockedProcessWebhookQueue).toHaveBeenCalledWith({ maxItems: 50, timeout: 55000 });
  });

  it('never disconnects the shared database client on success', async () => {
    await GET(buildRequest());

    expect(mockedShutdown).not.toHaveBeenCalled();
  });

  it('never disconnects the shared database client on failure', async () => {
    mockedProcessWebhookQueue.mockRejectedValueOnce(new Error('queue exploded'));

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('queue exploded');
    expect(mockedShutdown).not.toHaveBeenCalled();
  });

  it('rejects requests without the cron secret', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mockedProcessWebhookQueue).not.toHaveBeenCalled();
    expect(mockedShutdown).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/process-webhooks-fixed - auth and connection edge cases', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    jest.restoreAllMocks();
  });

  it('rejects requests with a wrong cron secret', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
      method: 'GET',
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockedEnsureConnection).not.toHaveBeenCalled();
    expect(mockedProcessWebhookQueue).not.toHaveBeenCalled();
    expect(mockedShutdown).not.toHaveBeenCalled();
  });

  it('fails closed when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const request = new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
      method: 'GET',
      headers: { authorization: 'Bearer undefined' },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockedEnsureConnection).not.toHaveBeenCalled();
    expect(mockedProcessWebhookQueue).not.toHaveBeenCalled();
    expect(mockedShutdown).not.toHaveBeenCalled();
  });

  it('returns 500 with zeroed stats and never disconnects when ensureConnection fails', async () => {
    mockedEnsureConnection.mockRejectedValueOnce(new Error('db unreachable'));

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('db unreachable');
    expect(body.stats).toEqual({ processed: 0, failed: 0, skipped: 0 });
    expect(mockedProcessWebhookQueue).not.toHaveBeenCalled();
    expect(mockedShutdown).not.toHaveBeenCalled();
  });

  it('reports "Unknown error" when the queue rejects with a non-Error value', async () => {
    mockedProcessWebhookQueue.mockRejectedValueOnce('string failure');

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Unknown error');
    expect(mockedShutdown).not.toHaveBeenCalled();
  });
});

describe('POST /api/cron/process-webhooks-fixed', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
    jest.restoreAllMocks();
  });

  it('delegates the manual trigger to GET with the same auth and no disconnect', async () => {
    mockedProcessWebhookQueue.mockResolvedValueOnce({ processed: 3, failed: 1, skipped: 0 });
    const request = new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron-secret' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toEqual({ processed: 3, failed: 1, skipped: 0 });
    expect(mockedEnsureConnection).toHaveBeenCalledTimes(1);
    expect(mockedProcessWebhookQueue).toHaveBeenCalledWith({ maxItems: 50, timeout: 55000 });
    expect(mockedShutdown).not.toHaveBeenCalled();

    const unauthorized = new NextRequest('http://localhost:3000/api/cron/process-webhooks-fixed', {
      method: 'POST',
    });
    const rejected = await POST(unauthorized);
    expect(rejected.status).toBe(401);
  });
});
