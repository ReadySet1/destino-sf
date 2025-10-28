import { GET } from '@/app/api/health/route';
import { prismaMock } from '@/__tests__/setup/prisma';

describe.skip('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when database is connected', async () => {
    // Mock successful database query
    (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ health: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
    expect(data.environment).toBeDefined();
  });

  it('should return unhealthy status when database is not connected', async () => {
    // Mock database connection error
    (prismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Connection timeout');
    expect(data.timestamp).toBeDefined();
  });

  it('should handle database health check errors', async () => {
    const testError = new Error('Database connection failed');
    (prismaMock.$queryRaw as jest.Mock).mockRejectedValue(testError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Database connection failed');
    expect(data.timestamp).toBeDefined();
  });

  it('should include environment information', async () => {
    (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ health: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.environment).toBeDefined();
    expect(data.version).toBeDefined();
  });
});
