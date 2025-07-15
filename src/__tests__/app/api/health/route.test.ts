import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';

// Mock the database health check
jest.mock('@/lib/db-utils', () => ({
  checkDatabaseHealth: jest.fn(),
}));

import { checkDatabaseHealth } from '@/lib/db-utils';
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when database is connected', async () => {
    mockCheckDatabaseHealth.mockResolvedValue({
      connected: true,
      responseTime: 150,
      diagnostics: {
        database_version: 'PostgreSQL 15.1',
        database_name: 'destino_sf',
        current_time: '2024-01-15T12:00:00Z',
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.database.connected).toBe(true);
    expect(data.database.responseTime).toBe('150ms');
    expect(data.timestamp).toBeDefined();
  });

  it('should return unhealthy status when database is not connected', async () => {
    mockCheckDatabaseHealth.mockResolvedValue({
      connected: false,
      responseTime: 5000,
      error: 'Connection timeout',
      diagnostics: {
        environment: 'test',
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.database.connected).toBe(false);
    expect(data.database.error).toBe('Connection timeout');
    expect(data.timestamp).toBeDefined();
  });

  it('should handle database health check errors', async () => {
    const testError = new Error('Database connection failed');
    testError.name = 'ConnectionError';
    mockCheckDatabaseHealth.mockRejectedValue(testError);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('error');
    expect(data.database.connected).toBe(false);
    expect(data.database.error).toBe('Database connection failed');
    expect(data.timestamp).toBeDefined();
  });

  it('should include production-relevant information', async () => {
    mockCheckDatabaseHealth.mockResolvedValue({
      connected: true,
      responseTime: 100,
      diagnostics: {
        database_version: 'PostgreSQL 15.1',
        database_name: 'destino_sf',
        current_time: '2024-01-15T12:00:00Z',
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(data.database.environment).toBe('test');
    expect(data.database.poolConfig).toBeDefined();
    expect(data.database.optimizations).toBeDefined();
    expect(Array.isArray(data.database.optimizations)).toBe(true);
  });
}); 