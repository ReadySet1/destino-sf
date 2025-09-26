import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import type { PrismaClient } from '@prisma/client';

// Enhanced Decimal.js Types for consistent money/precision handling
export type DecimalInput = string | number | Decimal;

export interface MoneyValue {
  amount: Decimal;
  currency: string;
}

export interface DecimalOperations {
  add: (other: DecimalInput) => Decimal;
  subtract: (other: DecimalInput) => Decimal;
  multiply: (other: DecimalInput) => Decimal;
  divide: (other: DecimalInput) => Decimal;
  round: (decimalPlaces?: number) => Decimal;
  toNumber: () => number;
  toFixed: (decimalPlaces?: number) => string;
  equals: (other: DecimalInput) => boolean;
  lessThan: (other: DecimalInput) => boolean;
  greaterThan: (other: DecimalInput) => boolean;
}

// Utility types for Decimal.js conversion
export type SerializedDecimal = string;

export interface DecimalConversion {
  toDecimal: (value: DecimalInput) => Decimal;
  fromDecimal: (value: Decimal) => SerializedDecimal;
  validateDecimal: (value: unknown) => value is DecimalInput;
  parseDecimal: (value: string | number) => Decimal | null;
}

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

// Extended Prisma Types for better transaction handling
export type PrismaTransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

export type TransactionCallback<T> = (tx: PrismaTransactionClient) => Promise<T>;

export interface TransactionManager {
  execute: <T>(callback: TransactionCallback<T>, options?: TransactionOptions) => Promise<T>;
  executeWithRetry: <T>(
    callback: TransactionCallback<T>, 
    options?: TransactionOptions & { maxRetries?: number }
  ) => Promise<T>;
}

// Database operation result types with enhanced error handling
export type DatabaseOperationResult<T> = 
  | { success: true; data: T; metrics?: QueryMetrics; warnings?: string[] }
  | { success: false; error: DatabaseError; shouldRetry: boolean; context?: Record<string, any> };

export type DatabaseError = ConnectionError | TransactionError | ValidationError | ConstraintError;

export type TransactionError = 
  | { type: 'TRANSACTION_TIMEOUT'; timeoutMs: number; operation: string }
  | { type: 'TRANSACTION_ROLLBACK'; reason: string; operation: string }
  | { type: 'TRANSACTION_DEADLOCK'; conflictingQueries: string[] }
  | { type: 'TRANSACTION_SERIALIZATION_FAILURE'; retryable: boolean };

export type ValidationError = 
  | { type: 'INVALID_INPUT'; field: string; value: any; expected: string }
  | { type: 'MISSING_REQUIRED_FIELD'; field: string }
  | { type: 'TYPE_MISMATCH'; field: string; expected: string; received: string };

export type ConstraintError = 
  | { type: 'UNIQUE_CONSTRAINT_VIOLATION'; constraint: string; field: string; value: any }
  | { type: 'FOREIGN_KEY_CONSTRAINT_VIOLATION'; constraint: string; table: string; field: string }
  | { type: 'CHECK_CONSTRAINT_VIOLATION'; constraint: string; condition: string }
  | { type: 'NOT_NULL_CONSTRAINT_VIOLATION'; field: string };

// Enhanced query builder types
export interface QueryBuilder<T> {
  where: (conditions: Partial<T>) => QueryBuilder<T>;
  orderBy: (field: keyof T, direction?: 'asc' | 'desc') => QueryBuilder<T>;
  take: (limit: number) => QueryBuilder<T>;
  skip: (offset: number) => QueryBuilder<T>;
  include: (relations: Record<string, boolean | object>) => QueryBuilder<T>;
  select: (fields: Record<keyof T, boolean>) => QueryBuilder<T>;
  execute: () => Promise<T[]>;
  first: () => Promise<T | null>;
  count: () => Promise<number>;
}

// Database model interfaces with proper Decimal handling
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonetaryModel extends BaseModel {
  total: Decimal;
  subtotal?: Decimal;
  tax?: Decimal;
  discount?: Decimal;
}

// Batch operation types
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T | Partial<T>;
  where?: Partial<T>;
}

export interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ 
    operation: BatchOperation<T>; 
    error: DatabaseError; 
    index: number;
  }>;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
}

// Connection diagnostics
export interface ConnectionDiagnostics {
  isConnected: boolean;
  latencyMs: number;
  activeQueries: number;
  queuedOperations: number;
  lastSuccessfulQuery: Date | null;
  connectionErrors: ConnectionError[];
  performanceMetrics: {
    averageQueryTime: number;
    slowestQueries: Array<{
      query: string;
      duration: number;
      timestamp: Date;
    }>;
  };
}

// Schema validation types
export interface SchemaValidation {
  isValid: boolean;
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  typesMismatch: Array<{ 
    table: string; 
    column: string; 
    expected: string; 
    actual: string; 
  }>;
  suggestions: string[];
}
