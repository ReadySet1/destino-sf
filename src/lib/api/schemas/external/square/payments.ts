/**
 * Square Payments API External Contracts
 *
 * Zod schemas for validating Square Payments API responses at runtime.
 * These schemas mirror the TypeScript types in src/types/square.d.ts
 * and provide runtime validation to catch breaking changes from Square's API.
 *
 * Includes enhanced 2025 gift card error types.
 *
 * @see https://developer.squareup.com/reference/square/payments-api
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { MoneySchema, SquareErrorSchema } from './catalog';

extendZodWithOpenApi(z);

// ============================================================
// Base Types
// ============================================================

/**
 * Address used in payment requests
 */
export const AddressSchema = z.object({
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  address_line_3: z.string().optional(),
  locality: z.string().optional(),
  sublocality: z.string().optional(),
  sublocality_2: z.string().optional(),
  sublocality_3: z.string().optional(),
  administrative_district_level_1: z.string().optional(),
  administrative_district_level_2: z.string().optional(),
  administrative_district_level_3: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  organization: z.string().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

/**
 * Coordinates for location-based data
 */
export const CoordinatesSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type Coordinates = z.infer<typeof CoordinatesSchema>;

/**
 * Device details for payment processing
 */
export const DeviceDetailsSchema = z.object({
  device_id: z.string().optional(),
  device_installation_id: z.string().optional(),
  device_name: z.string().optional(),
});

export type DeviceDetails = z.infer<typeof DeviceDetailsSchema>;

/**
 * Application details for payment tracking
 */
export const ApplicationDetailsSchema = z.object({
  square_product: z.string().optional(),
  application_id: z.string().optional(),
});

export type ApplicationDetails = z.infer<typeof ApplicationDetailsSchema>;

/**
 * Risk evaluation for fraud detection
 */
export const RiskEvaluationSchema = z.object({
  created_at: z.string().optional(),
  risk_level: z.string().optional(),
});

export type RiskEvaluation = z.infer<typeof RiskEvaluationSchema>;

// ============================================================
// Payment Enums
// ============================================================

export const PaymentStatusSchema = z.enum([
  'APPROVED',
  'PENDING',
  'COMPLETED',
  'CANCELED',
  'FAILED',
]);

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

// ============================================================
// Payment Structures
// ============================================================

/**
 * Processing fee charged by Square
 */
export const ProcessingFeeSchema = z.object({
  effective_at: z.string().optional(),
  type: z.string().optional(),
  amount_money: MoneySchema.optional(),
});

export type ProcessingFee = z.infer<typeof ProcessingFeeSchema>;

/**
 * Card information
 */
export const CardSchema = z.object({
  id: z.string().optional(),
  card_brand: z.string().optional(),
  last_4: z.string().optional(),
  exp_month: z.union([z.number(), z.bigint()]).optional(),
  exp_year: z.union([z.number(), z.bigint()]).optional(),
  cardholder_name: z.string().optional(),
  billing_address: AddressSchema.optional(),
  fingerprint: z.string().optional(),
  customer_id: z.string().optional(),
  merchant_id: z.string().optional(),
  reference_id: z.string().optional(),
  enabled: z.boolean().optional(),
  card_type: z.string().optional(),
  prepaid_type: z.string().optional(),
  bin: z.string().optional(),
});

export type Card = z.infer<typeof CardSchema>;

/**
 * Card payment details including verification
 */
export const CardPaymentDetailsSchema = z.object({
  status: z.string().optional(),
  card: CardSchema.optional(),
  entry_method: z.string().optional(),
  cvv_status: z.string().optional(),
  avs_status: z.string().optional(),
  auth_result_code: z.string().optional(),
  application_identifier: z.string().optional(),
  application_name: z.string().optional(),
  application_cryptogram: z.string().optional(),
  verification_method: z.string().optional(),
  verification_results: z.string().optional(),
  statement_description: z.string().optional(),
  device_details: DeviceDetailsSchema.optional(),
  refund_requires_card_presence: z.boolean().optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CardPaymentDetails = z.infer<typeof CardPaymentDetailsSchema>;

/**
 * Cash payment details
 */
export const CashPaymentDetailsSchema = z.object({
  buyer_supplied_money: MoneySchema,
  change_back_money: MoneySchema.optional(),
});

export type CashPaymentDetails = z.infer<typeof CashPaymentDetailsSchema>;

/**
 * External payment details (e.g., Venmo, PayPal)
 */
export const ExternalPaymentDetailsSchema = z.object({
  type: z.string(),
  source: z.string(),
  source_id: z.string().optional(),
  source_fee_money: MoneySchema.optional(),
});

export type ExternalPaymentDetails = z.infer<typeof ExternalPaymentDetailsSchema>;

/**
 * Enhanced Gift Card Error Types for 2025
 */
export const GiftCardErrorSchema = z.object({
  code: z.enum(['GIFT_CARD_AVAILABLE_AMOUNT', 'INSUFFICIENT_FUNDS']),
  detail: z.string().optional(),
  field: z.string().optional(),
  available_amount: MoneySchema.optional(), // Always returned with insufficient funds errors
});

export type GiftCardError = z.infer<typeof GiftCardErrorSchema>;

/**
 * Payment object
 */
export const PaymentSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  amount_money: MoneySchema.optional(),
  tip_money: MoneySchema.optional(),
  total_money: MoneySchema.optional(),
  app_fee_money: MoneySchema.optional(),
  approved_money: MoneySchema.optional(),
  processing_fee: z.array(ProcessingFeeSchema).optional(),
  refunded_money: MoneySchema.optional(),
  status: PaymentStatusSchema.optional(),
  delay_duration: z.string().optional(),
  delay_action: z.string().optional(),
  delayed_until: z.string().optional(),
  source_type: z.string().optional(),
  card_details: CardPaymentDetailsSchema.optional(),
  location_id: z.string().optional(),
  order_id: z.string().optional(),
  reference_id: z.string().optional(),
  customer_id: z.string().optional(),
  employee_id: z.string().optional(),
  team_member_id: z.string().optional(),
  refund_ids: z.array(z.string()).optional(),
  risk_evaluation: RiskEvaluationSchema.optional(),
  buyer_email_address: z.string().optional(),
  billing_address: AddressSchema.optional(),
  shipping_address: AddressSchema.optional(),
  note: z.string().optional(),
  statement_description_identifier: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  receipt_number: z.string().optional(),
  receipt_url: z.string().optional(),
  device_details: DeviceDetailsSchema.optional(),
  application_details: ApplicationDetailsSchema.optional(),
  version_token: z.string().optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================
// API Request Schemas
// ============================================================

/**
 * Create Payment Request
 */
export const CreatePaymentRequestSchema = z.object({
  source_id: z.string(),
  idempotency_key: z.string(),
  amount_money: MoneySchema,
  tip_money: MoneySchema.optional(),
  app_fee_money: MoneySchema.optional(),
  delay_duration: z.string().optional(),
  delay_action: z.string().optional(),
  autocomplete: z.boolean().optional(),
  order_id: z.string().optional(),
  customer_id: z.string().optional(),
  location_id: z.string().optional(),
  reference_id: z.string().optional(),
  verification_token: z.string().optional(),
  accept_partial_authorization: z.boolean().optional(),
  buyer_email_address: z.string().optional(),
  billing_address: AddressSchema.optional(),
  shipping_address: AddressSchema.optional(),
  note: z.string().optional(),
  statement_description_identifier: z.string().optional(),
  cash_details: CashPaymentDetailsSchema.optional(),
  external_details: ExternalPaymentDetailsSchema.optional(),
});

export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

/**
 * Update Payment Request
 */
export const UpdatePaymentRequestSchema = z.object({
  payment: PaymentSchema.optional(),
  idempotency_key: z.string(),
});

export type UpdatePaymentRequest = z.infer<typeof UpdatePaymentRequestSchema>;

/**
 * Complete Payment Request
 */
export const CompletePaymentRequestSchema = z.object({
  idempotency_key: z.string().optional(),
});

export type CompletePaymentRequest = z.infer<typeof CompletePaymentRequestSchema>;

/**
 * Cancel Payment By Idempotency Key Request
 */
export const CancelPaymentByIdempotencyKeyRequestSchema = z.object({
  idempotency_key: z.string(),
});

export type CancelPaymentByIdempotencyKeyRequest = z.infer<
  typeof CancelPaymentByIdempotencyKeyRequestSchema
>;

/**
 * List Payments Request
 */
export const ListPaymentsRequestSchema = z.object({
  begin_time: z.string().optional(),
  end_time: z.string().optional(),
  sort_order: z.string().optional(),
  cursor: z.string().optional(),
  location_id: z.string().optional(),
  total: z.bigint().optional(),
  last_4: z.string().optional(),
  card_brand: z.string().optional(),
  limit: z.number().int().positive().max(200).optional(),
});

export type ListPaymentsRequest = z.infer<typeof ListPaymentsRequestSchema>;

// ============================================================
// API Response Schemas
// ============================================================

/**
 * Create Payment Response
 */
export const CreatePaymentResponseSchema = z.object({
  payment: PaymentSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>;

/**
 * Cancel Payment Response
 */
export const CancelPaymentResponseSchema = z.object({
  payment: PaymentSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CancelPaymentResponse = z.infer<typeof CancelPaymentResponseSchema>;

/**
 * Cancel Payment By Idempotency Key Response
 */
export const CancelPaymentByIdempotencyKeyResponseSchema = z.object({
  errors: z.array(SquareErrorSchema).optional(),
});

export type CancelPaymentByIdempotencyKeyResponse = z.infer<
  typeof CancelPaymentByIdempotencyKeyResponseSchema
>;

/**
 * Get Payment Response
 */
export const GetPaymentResponseSchema = z.object({
  payment: PaymentSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type GetPaymentResponse = z.infer<typeof GetPaymentResponseSchema>;

/**
 * Update Payment Response
 */
export const UpdatePaymentResponseSchema = z.object({
  payment: PaymentSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type UpdatePaymentResponse = z.infer<typeof UpdatePaymentResponseSchema>;

/**
 * Complete Payment Response
 */
export const CompletePaymentResponseSchema = z.object({
  payment: PaymentSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CompletePaymentResponse = z.infer<typeof CompletePaymentResponseSchema>;

/**
 * List Payments Response
 */
export const ListPaymentsResponseSchema = z.object({
  payments: z.array(PaymentSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type ListPaymentsResponse = z.infer<typeof ListPaymentsResponseSchema>;
