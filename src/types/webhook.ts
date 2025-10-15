/**
 * TypeScript types and schemas for Square webhook validation and processing
 *
 * This file defines all types needed for webhook signature validation,
 * payment sync fallback, and webhook monitoring.
 */

import { z } from 'zod';

// Branded types for type safety
export type WebhookId = string & { readonly __brand: 'WebhookId' };
export type PaymentId = string & { readonly __brand: 'PaymentId' };
export type MerchantId = string & { readonly __brand: 'MerchantId' };
export type EventId = string & { readonly __brand: 'EventId' };

// Environment types
export type SquareEnvironment = 'sandbox' | 'production';
export type SignatureAlgorithm = 'sha256' | 'sha1';
export type SyncType = 'manual' | 'scheduled' | 'webhook_fallback';

// Webhook validation schemas
export const SquareWebhookPayloadSchema = z.object({
  merchant_id: z.string(),
  type: z.string(),
  event_id: z.string(),
  created_at: z.string(),
  data: z.object({
    type: z.string(),
    id: z.string(),
    object: z.record(z.unknown()),
  }),
});

export type SquareWebhookPayload = z.infer<typeof SquareWebhookPayloadSchema>;

// Webhook headers schema for validation
export const WebhookHeadersSchema = z.object({
  'x-square-hmacsha256-signature': z.string().optional(),
  'x-square-hmacsha1-signature': z.string().optional(),
  'square-environment': z.enum(['Sandbox', 'Production']).optional(),
  'content-type': z.string().optional(),
  'user-agent': z.string().optional(),
});

export type WebhookHeaders = z.infer<typeof WebhookHeadersSchema>;

// Webhook validation result
export interface WebhookValidationResult {
  valid: boolean;
  environment: SquareEnvironment;
  error?: WebhookValidationError;
  metadata?: {
    signature: string;
    algorithm: SignatureAlgorithm;
    secretUsed: SquareEnvironment;
    processingTimeMs: number;
    webhookId: WebhookId;
  };
}

// Error types with discriminated unions for better type safety
export type WebhookValidationError =
  | { type: 'MISSING_SIGNATURE'; headers: string[] }
  | { type: 'MISSING_SECRET'; environment: string }
  | { type: 'INVALID_SIGNATURE'; expected: string; received: string }
  | { type: 'MALFORMED_BODY'; error: string }
  | { type: 'ENVIRONMENT_MISMATCH'; expected: string; actual: string }
  | { type: 'INVALID_PAYLOAD'; zodError: z.ZodError }
  | { type: 'DUPLICATE_EVENT'; eventId: string; existingId: string }
  | { type: 'EVENT_TOO_OLD'; eventTime: string; maxAge: number }
  | { type: 'RATE_LIMIT_EXCEEDED'; clientIp: string; limit: number };

// Payment sync types
export interface PaymentSyncRequest {
  lookbackMinutes: number;
  merchantId?: MerchantId;
  forceSync?: boolean;
  syncType?: SyncType;
  batchSize?: number;
}

export interface PaymentSyncResult {
  success: boolean;
  syncId: string;
  paymentsFound: number;
  paymentsProcessed: number;
  paymentsFailed: number;
  errors: Array<{ paymentId: string; error: string }>;
  duration: number;
  startTime: Date;
  endTime: Date;
  metadata?: {
    merchantId?: string;
    environment: SquareEnvironment;
    syncType: SyncType;
  };
}

// Webhook queue processing types
export interface WebhookQueueItem {
  id: string;
  eventId: EventId;
  eventType: string;
  payload: SquareWebhookPayload;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRY';
  attempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  processedAt?: Date;
}

// Webhook processing result
export interface WebhookProcessingResult {
  success: boolean;
  eventId: EventId;
  processingTimeMs: number;
  actions: Array<{
    type: 'ORDER_UPDATE' | 'PAYMENT_UPDATE' | 'NOTIFICATION_SENT' | 'DATABASE_UPDATE';
    success: boolean;
    details?: Record<string, unknown>;
    error?: string;
  }>;
  shouldRetry: boolean;
  retryAfter?: number;
}

// Result type for better error handling across the webhook system
export type Result<T, E = WebhookValidationError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Webhook monitoring and metrics types
export interface WebhookMetrics {
  totalWebhooks: number;
  successfulWebhooks: number;
  failedWebhooks: number;
  successRate: number;
  averageProcessingTime: number;
  failuresByType: Record<string, number>;
  environmentBreakdown: {
    sandbox: { total: number; successful: number };
    production: { total: number; successful: number };
  };
  hourlyVolume: Array<{ hour: string; count: number }>;
}

export interface WebhookAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
  environment?: SquareEnvironment;
  webhookId?: WebhookId;
}

// Security types
export interface WebhookSecurityValidation {
  rateLimitOk: boolean;
  ipValidationOk: boolean;
  duplicateCheckOk: boolean;
  timestampValidationOk: boolean;
  errors: string[];
}

// Admin dashboard types
export interface WebhookStatus {
  isHealthy: boolean;
  lastWebhookTime: Date | null;
  successRate: number;
  averageLatency: number;
  recentWebhooks: Array<{
    id: string;
    eventType: string;
    environment: SquareEnvironment;
    success: boolean;
    processingTime: number;
    timestamp: Date;
  }>;
  alerts: WebhookAlert[];
}

// Configuration types
export interface WebhookConfig {
  environment: SquareEnvironment;
  webhookSecret: string;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  enableRateLimiting: boolean;
  enableIpValidation: boolean;
  enableReplayProtection: boolean;
  maxEventAge: number;
}

// Database log entry types (matching Prisma models)
export interface WebhookLogEntry {
  id: string;
  webhookId: string;
  eventType: string;
  merchantId?: string;
  environment?: SquareEnvironment;
  signatureValid: boolean;
  validationError?: WebhookValidationError;
  payload: SquareWebhookPayload;
  headers: Record<string, string>;
  processingTimeMs?: number;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentSyncStatusEntry {
  id: string;
  syncId: string;
  syncType: SyncType;
  merchantId?: string;
  startTime: Date;
  endTime?: Date;
  paymentsFound: number;
  paymentsProcessed: number;
  paymentsFailed: number;
  errorDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Constants for webhook validation
export const WEBHOOK_CONSTANTS = {
  MAX_EVENT_AGE_MS: 5 * 60 * 1000, // 5 minutes
  MAX_BODY_SIZE: 1024 * 1024, // 1MB
  SIGNATURE_HEADER_SHA256: 'x-square-hmacsha256-signature',
  SIGNATURE_HEADER_SHA1: 'x-square-hmacsha1-signature',
  ENVIRONMENT_HEADER: 'square-environment',
  SUPPORTED_ALGORITHMS: ['sha256', 'sha1'] as const,
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100, // per IP
  },
} as const;

// Webhook event types that we handle
export const SUPPORTED_WEBHOOK_EVENTS = [
  'payment.created',
  'payment.updated',
  'order.created',
  'order.updated',
  'order.fulfillment.updated',
  'refund.created',
  'refund.updated',
] as const;

export type SupportedWebhookEvent = (typeof SUPPORTED_WEBHOOK_EVENTS)[number];

// Utility type for webhook handler functions
export type WebhookHandler<T extends SupportedWebhookEvent> = (
  payload: SquareWebhookPayload & { type: T },
  context: {
    environment: SquareEnvironment;
    webhookId: WebhookId;
    validationResult: WebhookValidationResult;
  }
) => Promise<WebhookProcessingResult>;

// Type guards for webhook events
export function isPaymentWebhook(
  payload: SquareWebhookPayload
): payload is SquareWebhookPayload & { type: 'payment.created' | 'payment.updated' } {
  return payload.type.startsWith('payment.');
}

export function isOrderWebhook(
  payload: SquareWebhookPayload
): payload is SquareWebhookPayload & {
  type: 'order.created' | 'order.updated' | 'order.fulfillment.updated';
} {
  return payload.type.startsWith('order.');
}

export function isRefundWebhook(
  payload: SquareWebhookPayload
): payload is SquareWebhookPayload & { type: 'refund.created' | 'refund.updated' } {
  return payload.type.startsWith('refund.');
}

// Environment variable validation schema
export const WebhookEnvironmentSchema = z.object({
  SQUARE_WEBHOOK_SECRET: z.string().min(1, 'Production webhook secret is required'),
  SQUARE_WEBHOOK_SECRET_SANDBOX: z.string().min(1, 'Sandbox webhook secret is required'),
  SQUARE_APPLICATION_ID: z.string().min(1),
  SQUARE_APPLICATION_ID_SANDBOX: z.string().min(1),
  SQUARE_ACCESS_TOKEN: z.string().min(1),
  SQUARE_ACCESS_TOKEN_SANDBOX: z.string().min(1),
});

export type WebhookEnvironmentVariables = z.infer<typeof WebhookEnvironmentSchema>;
