import { z } from 'zod';

// Connection pool configuration types
export interface DatabaseConfig {
  connectionString: string;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    statementTimeout: number;
  };
  retryPolicy: RetryPolicy;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Connection health monitoring
export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  errors: ConnectionError[];
  lastChecked: Date;
}

export type ConnectionError = 
  | { type: 'PREPARED_STATEMENT_NOT_EXISTS'; code: '26000'; details: string }
  | { type: 'PREPARED_STATEMENT_EXISTS'; code: '42P05'; details: string }
  | { type: 'CONNECTION_TIMEOUT'; timeoutMs: number }
  | { type: 'POOL_EXHAUSTED'; waitTime: number };

// Result type for database operations
export type DatabaseResult<T> = 
  | { success: true; data: T; metrics?: QueryMetrics }
  | { success: false; error: ConnectionError; shouldRetry: boolean };

export interface QueryMetrics {
  queryTime: number;
  connectionAcquisitionTime: number;
  totalTime: number;
  preparedStatementCached: boolean;
}

// Pool statistics interface
export interface PoolStats {
  active: number;
  idle: number;
  waiting: number;
}
