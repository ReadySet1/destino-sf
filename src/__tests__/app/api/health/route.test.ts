import { GET } from '@/app/api/health/route';
import { quickHealthCheck, getConnectionDiagnostics } from '@/lib/db-unified';

// Mock the db-unified module
jest.mock('@/lib/db-unified', () => ({
  quickHealthCheck: jest.fn(),
  getConnectionDiagnostics: jest.fn(),
}));

const mockQuickHealthCheck = quickHealthCheck as jest.MockedFunction<typeof quickHealthCheck>;
const mockGetConnectionDiagnostics = getConnectionDiagnostics as jest.MockedFunction<typeof getConnectionDiagnostics>;

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for diagnostics
    mockGetConnectionDiagnostics.mockReturnValue({
      lastSuccessfulConnection: Date.now(),
      timeSinceLastSuccess: 0,
      consecutiveFailures: 0,
      isStale: false,
      circuitBreakerState: 'CLOSED',
    });
  });

  describe('Healthy Database', () => {
    it('should return healthy status when database is connected', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 15,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.environment).toBeDefined();
      expect(data.latencyMs).toBe(15);
    });

    it('should include latency in healthy response', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 42,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.latencyMs).toBe(42);
    });

    it('should include environment information', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(data.version).toBeDefined();
    });
  });

  describe('Unhealthy Database', () => {
    it('should return unhealthy status when database is not connected', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Connection timeout',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Connection timeout');
      expect(data.timestamp).toBeDefined();
    });

    it('should handle socket timeout errors', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Socket timeout (the database failed to respond to a query)',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toContain('Socket timeout');
    });

    it('should include diagnostics in unhealthy response', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Database connection failed',
      });
      mockGetConnectionDiagnostics.mockReturnValue({
        lastSuccessfulConnection: Date.now() - 60000,
        timeSinceLastSuccess: 60000,
        consecutiveFailures: 3,
        isStale: true,
        circuitBreakerState: 'HALF_OPEN',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.diagnostics).toBeDefined();
      expect(data.diagnostics.circuitBreakerState).toBe('HALF_OPEN');
      expect(data.diagnostics.consecutiveFailures).toBe(3);
      expect(data.diagnostics.isStale).toBe(true);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should return unhealthy when circuit breaker is open', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 1,
        error: 'Circuit breaker open - database temporarily unavailable',
      });
      mockGetConnectionDiagnostics.mockReturnValue({
        lastSuccessfulConnection: Date.now() - 30000,
        timeSinceLastSuccess: 30000,
        consecutiveFailures: 5,
        isStale: false,
        circuitBreakerState: 'OPEN',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.diagnostics.circuitBreakerState).toBe('OPEN');
      expect(data.error).toContain('Circuit breaker');
    });
  });

  describe('Timeout Behavior', () => {
    it('should call quickHealthCheck with 5 second timeout', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: true,
        latencyMs: 10,
      });

      await GET();

      expect(mockQuickHealthCheck).toHaveBeenCalledWith(5000);
    });

    it('should handle health check timeout gracefully', async () => {
      mockQuickHealthCheck.mockResolvedValue({
        healthy: false,
        latencyMs: 5000,
        error: 'Health check timeout after 5000ms',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toContain('timeout');
    });
  });
});
