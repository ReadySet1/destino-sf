/**
 * Square Webhooks External Contracts
 *
 * Zod schemas for validating Square Webhook payloads at runtime.
 * These schemas provide runtime validation for webhook events
 * and catch breaking changes from Square's webhook structure.
 *
 * @see https://developer.squareup.com/docs/webhooks/overview
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// Webhook Enums
// ============================================================

export const SquareEnvironmentSchema = z.enum(['sandbox', 'production']);

export type SquareEnvironment = z.infer<typeof SquareEnvironmentSchema>;

export const SignatureAlgorithmSchema = z.enum(['sha256', 'sha1']);

export type SignatureAlgorithm = z.infer<typeof SignatureAlgorithmSchema>;

/**
 * Supported webhook event types
 */
export const SupportedWebhookEventSchema = z.enum([
  'payment.created',
  'payment.updated',
  'order.created',
  'order.updated',
  'order.fulfillment.updated',
  'refund.created',
  'refund.updated',
]);

export type SupportedWebhookEvent = z.infer<typeof SupportedWebhookEventSchema>;

// ============================================================
// Webhook Payload Structures
// ============================================================

/**
 * Square webhook payload structure
 * This is the core structure for all webhook events from Square
 */
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

/**
 * Webhook headers for signature validation
 */
export const WebhookHeadersSchema = z.object({
  'x-square-hmacsha256-signature': z.string().optional(),
  'x-square-hmacsha1-signature': z.string().optional(),
  'square-environment': z.enum(['Sandbox', 'Production']).optional(),
  'content-type': z.string().optional(),
  'user-agent': z.string().optional(),
});

export type WebhookHeaders = z.infer<typeof WebhookHeadersSchema>;

// ============================================================
// Webhook Validation
// ============================================================

/**
 * Webhook validation metadata
 */
export const WebhookValidationMetadataSchema = z.object({
  signature: z.string(),
  algorithm: SignatureAlgorithmSchema,
  secretUsed: SquareEnvironmentSchema,
  processingTimeMs: z.number(),
  webhookId: z.string(),
});

export type WebhookValidationMetadata = z.infer<typeof WebhookValidationMetadataSchema>;

/**
 * Webhook validation error types
 */
export const WebhookValidationErrorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('MISSING_SIGNATURE'),
    headers: z.array(z.string()),
  }),
  z.object({
    type: z.literal('MISSING_SECRET'),
    environment: z.string(),
  }),
  z.object({
    type: z.literal('INVALID_SIGNATURE'),
    expected: z.string(),
    received: z.string(),
  }),
  z.object({
    type: z.literal('MALFORMED_BODY'),
    error: z.string(),
  }),
  z.object({
    type: z.literal('ENVIRONMENT_MISMATCH'),
    expected: z.string(),
    actual: z.string(),
  }),
  z.object({
    type: z.literal('INVALID_PAYLOAD'),
    zodError: z.any(),
  }),
  z.object({
    type: z.literal('DUPLICATE_EVENT'),
    eventId: z.string(),
    existingId: z.string(),
  }),
  z.object({
    type: z.literal('EVENT_TOO_OLD'),
    eventTime: z.string(),
    maxAge: z.number(),
  }),
  z.object({
    type: z.literal('RATE_LIMIT_EXCEEDED'),
    clientIp: z.string(),
    limit: z.number(),
  }),
]);

export type WebhookValidationError = z.infer<typeof WebhookValidationErrorSchema>;

/**
 * Webhook validation result
 */
export const WebhookValidationResultSchema = z.object({
  valid: z.boolean(),
  environment: SquareEnvironmentSchema,
  error: WebhookValidationErrorSchema.optional(),
  metadata: WebhookValidationMetadataSchema.optional(),
});

export type WebhookValidationResult = z.infer<typeof WebhookValidationResultSchema>;

// ============================================================
// Webhook Processing
// ============================================================

/**
 * Webhook processing action
 */
export const WebhookProcessingActionSchema = z.object({
  type: z.enum(['ORDER_UPDATE', 'PAYMENT_UPDATE', 'NOTIFICATION_SENT', 'DATABASE_UPDATE']),
  success: z.boolean(),
  details: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

export type WebhookProcessingAction = z.infer<typeof WebhookProcessingActionSchema>;

/**
 * Webhook processing result
 */
export const WebhookProcessingResultSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  processingTimeMs: z.number(),
  actions: z.array(WebhookProcessingActionSchema),
  shouldRetry: z.boolean(),
  retryAfter: z.number().optional(),
});

export type WebhookProcessingResult = z.infer<typeof WebhookProcessingResultSchema>;

/**
 * Webhook queue item status
 */
export const WebhookQueueStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'RETRY',
]);

export type WebhookQueueStatus = z.infer<typeof WebhookQueueStatusSchema>;

/**
 * Webhook queue item
 */
export const WebhookQueueItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  payload: SquareWebhookPayloadSchema,
  status: WebhookQueueStatusSchema,
  attempts: z.number().int(),
  lastAttemptAt: z.date().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  processedAt: z.date().optional(),
});

export type WebhookQueueItem = z.infer<typeof WebhookQueueItemSchema>;

// ============================================================
// Webhook Monitoring
// ============================================================

/**
 * Webhook environment breakdown
 */
export const WebhookEnvironmentBreakdownSchema = z.object({
  sandbox: z.object({
    total: z.number().int(),
    successful: z.number().int(),
  }),
  production: z.object({
    total: z.number().int(),
    successful: z.number().int(),
  }),
});

export type WebhookEnvironmentBreakdown = z.infer<typeof WebhookEnvironmentBreakdownSchema>;

/**
 * Webhook hourly volume
 */
export const WebhookHourlyVolumeSchema = z.object({
  hour: z.string(),
  count: z.number().int(),
});

export type WebhookHourlyVolume = z.infer<typeof WebhookHourlyVolumeSchema>;

/**
 * Webhook metrics
 */
export const WebhookMetricsSchema = z.object({
  totalWebhooks: z.number().int(),
  successfulWebhooks: z.number().int(),
  failedWebhooks: z.number().int(),
  successRate: z.number(),
  averageProcessingTime: z.number(),
  failuresByType: z.record(z.number().int()),
  environmentBreakdown: WebhookEnvironmentBreakdownSchema,
  hourlyVolume: z.array(WebhookHourlyVolumeSchema),
});

export type WebhookMetrics = z.infer<typeof WebhookMetricsSchema>;

/**
 * Webhook alert severity
 */
export const WebhookAlertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type WebhookAlertSeverity = z.infer<typeof WebhookAlertSeveritySchema>;

/**
 * Webhook alert
 */
export const WebhookAlertSchema = z.object({
  id: z.string(),
  severity: WebhookAlertSeveritySchema,
  title: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  resolvedAt: z.date().optional(),
  environment: SquareEnvironmentSchema.optional(),
  webhookId: z.string().optional(),
});

export type WebhookAlert = z.infer<typeof WebhookAlertSchema>;

/**
 * Recent webhook for status dashboard
 */
export const RecentWebhookSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  environment: SquareEnvironmentSchema,
  success: z.boolean(),
  processingTime: z.number(),
  timestamp: z.date(),
});

export type RecentWebhook = z.infer<typeof RecentWebhookSchema>;

/**
 * Webhook status for dashboard
 */
export const WebhookStatusSchema = z.object({
  isHealthy: z.boolean(),
  lastWebhookTime: z.date().nullable(),
  successRate: z.number(),
  averageLatency: z.number(),
  recentWebhooks: z.array(RecentWebhookSchema),
  alerts: z.array(WebhookAlertSchema),
});

export type WebhookStatus = z.infer<typeof WebhookStatusSchema>;

// ============================================================
// Webhook Security
// ============================================================

/**
 * Webhook security validation result
 */
export const WebhookSecurityValidationSchema = z.object({
  rateLimitOk: z.boolean(),
  ipValidationOk: z.boolean(),
  duplicateCheckOk: z.boolean(),
  timestampValidationOk: z.boolean(),
  errors: z.array(z.string()),
});

export type WebhookSecurityValidation = z.infer<typeof WebhookSecurityValidationSchema>;

// ============================================================
// Webhook Configuration
// ============================================================

/**
 * Webhook configuration
 */
export const WebhookConfigSchema = z.object({
  environment: SquareEnvironmentSchema,
  webhookSecret: z.string(),
  maxRetries: z.number().int().positive(),
  retryDelayMs: z.number().int().positive(),
  timeoutMs: z.number().int().positive(),
  enableRateLimiting: z.boolean(),
  enableIpValidation: z.boolean(),
  enableReplayProtection: z.boolean(),
  maxEventAge: z.number().int().positive(),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// ============================================================
// Webhook Database Logging
// ============================================================

/**
 * Webhook log entry
 */
export const WebhookLogEntrySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  eventType: z.string(),
  merchantId: z.string().optional(),
  environment: SquareEnvironmentSchema.optional(),
  signatureValid: z.boolean(),
  validationError: WebhookValidationErrorSchema.optional(),
  payload: SquareWebhookPayloadSchema,
  headers: z.record(z.string()),
  processingTimeMs: z.number().int().optional(),
  processedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WebhookLogEntry = z.infer<typeof WebhookLogEntrySchema>;

// ============================================================
// API Response Schemas
// ============================================================

/**
 * Webhook processing API response
 */
export const WebhookProcessingResponseSchema = z.object({
  success: z.boolean(),
  eventId: z.string(),
  message: z.string().optional(),
  processingResult: WebhookProcessingResultSchema.optional(),
  errors: z.array(z.string()).optional(),
});

export type WebhookProcessingResponse = z.infer<typeof WebhookProcessingResponseSchema>;

/**
 * Webhook metrics API response
 */
export const WebhookMetricsResponseSchema = z.object({
  success: z.boolean(),
  metrics: WebhookMetricsSchema.optional(),
  errors: z.array(z.string()).optional(),
});

export type WebhookMetricsResponse = z.infer<typeof WebhookMetricsResponseSchema>;

/**
 * Webhook status API response
 */
export const WebhookStatusResponseSchema = z.object({
  success: z.boolean(),
  status: WebhookStatusSchema.optional(),
  errors: z.array(z.string()).optional(),
});

export type WebhookStatusResponse = z.infer<typeof WebhookStatusResponseSchema>;
