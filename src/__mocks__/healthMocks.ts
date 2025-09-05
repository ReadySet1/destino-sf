// Health check mocks for API routes
export const mockHealthResponse = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  database: {
    connected: true,
    responseTime: '150ms',
    environment: 'test',
    poolConfig: {
      max: 10,
      idle: 2,
    },
    optimizations: ['prepared_statements_disabled', 'connection_pooling'],
  },
  uptime: 123.45,
  version: '1.0.0',
};

export const mockUnhealthyResponse = {
  status: 'unhealthy',
  timestamp: new Date().toISOString(),
  database: {
    connected: false,
    error: 'Connection timeout',
  },
};

export const mockErrorResponse = {
  status: 'error',
  timestamp: new Date().toISOString(),
  database: {
    connected: false,
    error: 'Database connection failed',
  },
};
