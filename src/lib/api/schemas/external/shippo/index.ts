/**
 * Shippo API External Contracts
 *
 * Zod schemas for validating Shippo API responses at runtime.
 * These schemas mirror the TypeScript types in src/types/shippo.ts
 * and provide runtime validation to catch breaking changes from Shippo's API.
 *
 * Covers: Shipments, Transactions, Addresses, Tracking, Customs
 *
 * @see https://docs.goshippo.com/docs/
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ============================================================
// Base Enums
// ============================================================

export const ShippoObjectStateSchema = z.enum(['VALID', 'INVALID', 'INCOMPLETE']);
export const ShippoObjectPurposeSchema = z.enum(['QUOTE', 'PURCHASE']);
export const ShippoTransactionStateSchema = z.enum(['VALID', 'INVALID', 'QUEUED', 'SUCCESS', 'ERROR']);
export const ShippoTransactionStatusSchema = z.enum(['QUEUED', 'SUCCESS', 'ERROR', 'UNKNOWN']);
export const ShippoDistanceUnitSchema = z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']);
export const ShippoMassUnitSchema = z.enum(['g', 'oz', 'lb', 'kg']);
export const ShippoTrackingStatusSchema = z.enum(['UNKNOWN', 'DELIVERED', 'TRANSIT', 'FAILURE', 'RETURNED']);
export const ShippoValidationMessageTypeSchema = z.enum(['ERROR', 'WARNING', 'INFO']);
export const ShippoLabelFileTypeSchema = z.enum(['PNG', 'PDF', 'PDF_4x6', 'PDF_A4', 'PDF_A6', 'ZPLII']);
export const ShippoDeliveryTimeTypeSchema = z.enum(['GUARANTEED', 'ESTIMATED']);
export const ShippoContentsTypeSchema = z.enum([
  'DOCUMENTS',
  'GIFT',
  'SAMPLE',
  'MERCHANDISE',
  'HUMANITARIAN_DONATION',
  'RETURN_MERCHANDISE',
  'OTHER',
]);
export const ShippoNonDeliveryOptionSchema = z.enum(['ABANDON', 'RETURN']);
export const ShippoSubmissionTypeSchema = z.enum(['PICKUP', 'DROPOFF']);

// ============================================================
// Validation & Messages
// ============================================================

export const ShippoValidationMessageSchema = z.object({
  source: z.string().optional(),
  code: z.string().optional(),
  text: z.string().optional(),
  type: ShippoValidationMessageTypeSchema.optional(),
});

export type ShippoValidationMessage = z.infer<typeof ShippoValidationMessageSchema>;

export const ShippoAddressValidationSchema = z.object({
  is_valid: z.boolean(),
  messages: z.array(ShippoValidationMessageSchema).optional(),
});

export type ShippoAddressValidation = z.infer<typeof ShippoAddressValidationSchema>;

// ============================================================
// Address Types
// ============================================================

export const ShippoAddressSchema = z.object({
  object_id: z.string().optional(),
  object_state: ShippoObjectStateSchema.optional(),
  object_purpose: ShippoObjectPurposeSchema.optional(),
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  street3: z.string().optional(),
  street_no: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_residential: z.boolean().optional(),
  metadata: z.string().optional(),
  test: z.boolean().optional(),
  validation_results: ShippoAddressValidationSchema.optional(),
});

export type ShippoAddress = z.infer<typeof ShippoAddressSchema>;

export const ShippoAddressValidationRequestSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_residential: z.boolean().optional(),
  validate: z.boolean().optional(),
});

export type ShippoAddressValidationRequest = z.infer<typeof ShippoAddressValidationRequestSchema>;

export const ShippoAddressValidationResponseSchema = z.object({
  object_id: z.string(),
  object_state: ShippoObjectStateSchema,
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  street_no: z.string().optional(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_residential: z.boolean().optional(),
  validation_results: ShippoAddressValidationSchema,
  was_test: z.boolean(),
  object_created: z.string().optional(),
  object_updated: z.string().optional(),
  metadata: z.string().optional(),
});

export type ShippoAddressValidationResponse = z.infer<typeof ShippoAddressValidationResponseSchema>;

// ============================================================
// Parcel Types
// ============================================================

export const ShippoParcelSchema = z.object({
  object_id: z.string().optional(),
  object_owner: z.string().optional(),
  template: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  distance_unit: ShippoDistanceUnitSchema.optional(),
  weight: z.string().optional(),
  mass_unit: ShippoMassUnitSchema.optional(),
  value_amount: z.string().optional(),
  value_currency: z.string().optional(),
  metadata: z.string().optional(),
  test: z.boolean().optional(),
});

export type ShippoParcel = z.infer<typeof ShippoParcelSchema>;

// ============================================================
// Rate Types
// ============================================================

export const ShippoServiceLevelSchema = z.object({
  name: z.string().optional(),
  token: z.string().optional(),
  terms: z.string().optional(),
  extended_token: z.string().optional(),
});

export type ShippoServiceLevel = z.infer<typeof ShippoServiceLevelSchema>;

export const ShippoRateSchema = z.object({
  object_id: z.string().optional(),
  object_owner: z.string().optional(),
  shipment: z.string().optional(),
  attributes: z.array(z.string()).optional(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  amount_local: z.string().optional(),
  currency_local: z.string().optional(),
  provider: z.string().optional(),
  provider_image_75: z.string().optional(),
  provider_image_200: z.string().optional(),
  servicelevel: ShippoServiceLevelSchema.optional(),
  days: z.number().int().optional(),
  arrives_by: z.string().optional(),
  duration_terms: z.string().optional(),
  trackable: z.boolean().optional(),
  insurance_amount: z.string().optional(),
  insurance_currency: z.string().optional(),
  delivery_time: z
    .object({
      type: ShippoDeliveryTimeTypeSchema,
      datetime: z.string().optional(),
    })
    .optional(),
  estimated_days: z.number().int().optional(),
  test: z.boolean().optional(),
  zone: z.string().optional(),
  messages: z.array(ShippoValidationMessageSchema).optional(),
  carrier_account: z.string().optional(),
  included_insurance_price: z.string().optional(),
});

export type ShippoRate = z.infer<typeof ShippoRateSchema>;

// ============================================================
// Shipment Types
// ============================================================

export const ShippoShipmentExtraSchema = z.object({
  signature_confirmation: z.string().optional(),
  insurance: z
    .object({
      amount: z.string(),
      currency: z.string(),
      provider: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
  reference_1: z.string().optional(),
  reference_2: z.string().optional(),
  delivery_confirmation: z.string().optional(),
  saturday_delivery: z.boolean().optional(),
  bypass_address_validation: z.boolean().optional(),
  request_retail_rates: z.boolean().optional(),
  lasership_attrs: z
    .object({
      lasership_declared_value: z.string().optional(),
    })
    .optional(),
  ups_attrs: z
    .object({
      ups_billing_option: z.string().optional(),
      ups_duty_payment: z.string().optional(),
    })
    .optional(),
  fedex_attrs: z
    .object({
      fedex_freight_billing: z.string().optional(),
      fedex_transit_time: z.string().optional(),
    })
    .optional(),
  usps_attrs: z
    .object({
      usps_sort_type: z.string().optional(),
      usps_package_efficiency: z.string().optional(),
    })
    .optional(),
});

export type ShippoShipmentExtra = z.infer<typeof ShippoShipmentExtraSchema>;

export const ShippoShipmentRequestSchema = z.object({
  address_from: z.union([ShippoAddressSchema, z.string()]),
  address_to: z.union([ShippoAddressSchema, z.string()]),
  address_return: z.union([ShippoAddressSchema, z.string()]).optional(),
  parcels: z.array(z.union([ShippoParcelSchema, z.string()])),
  shipment_date: z.string().optional(),
  extra: ShippoShipmentExtraSchema.optional(),
  customs_declaration: z.string().optional(),
  carrier_accounts: z.array(z.string()).optional(),
  async: z.boolean().optional(),
  metadata: z.string().optional(),
});

export type ShippoShipmentRequest = z.infer<typeof ShippoShipmentRequestSchema>;

export const ShippoShipmentResponseSchema = z.object({
  object_id: z.string(),
  object_state: z.enum(['VALID', 'INVALID']),
  object_owner: z.string().optional(),
  object_created: z.string().optional(),
  object_updated: z.string().optional(),
  was_test: z.boolean(),
  address_from: ShippoAddressSchema,
  address_to: ShippoAddressSchema,
  address_return: ShippoAddressSchema.optional(),
  parcels: z.array(ShippoParcelSchema),
  shipment_date: z.string().optional(),
  extra: ShippoShipmentExtraSchema.optional(),
  customs_declaration: z.record(z.string(), z.unknown()).optional(),
  rates: z.array(ShippoRateSchema),
  carrier_accounts: z.array(z.record(z.string(), z.unknown())).optional(),
  messages: z.array(ShippoValidationMessageSchema).optional(),
  metadata: z.string().optional(),
});

export type ShippoShipmentResponse = z.infer<typeof ShippoShipmentResponseSchema>;

// ============================================================
// Transaction Types (Label Creation)
// ============================================================

export const ShippoTransactionRequestSchema = z.object({
  rate: z.union([z.string(), ShippoRateSchema]),
  label_file_type: ShippoLabelFileTypeSchema.optional(),
  async: z.boolean().optional(),
  metadata: z.string().optional(),
  submission_type: ShippoSubmissionTypeSchema.optional(),
});

export type ShippoTransactionRequest = z.infer<typeof ShippoTransactionRequestSchema>;

export const ShippoTransactionResponseSchema = z.object({
  object_id: z.string(),
  object_state: ShippoTransactionStateSchema,
  object_status: ShippoTransactionStatusSchema,
  object_owner: z.string().optional(),
  object_created: z.string().optional(),
  object_updated: z.string().optional(),
  was_test: z.boolean(),
  rate: ShippoRateSchema.optional(),
  tracking_number: z.string().optional(),
  tracking_status: z.string().optional(),
  tracking_url_provider: z.string().optional(),
  eta: z.string().optional(),
  label_url: z.string().optional(),
  commercial_invoice_url: z.string().optional(),
  qr_code_url: z.string().optional(),
  messages: z.array(ShippoValidationMessageSchema).optional(),
  order: z.string().optional(),
  customs_note: z.string().optional(),
  submission_note: z.string().optional(),
  metadata: z.string().optional(),
  test: z.boolean().optional(),
});

export type ShippoTransactionResponse = z.infer<typeof ShippoTransactionResponseSchema>;

// ============================================================
// Tracking Types
// ============================================================

export const ShippoLocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export type ShippoLocation = z.infer<typeof ShippoLocationSchema>;

export const ShippoTrackingSubstatusSchema = z.object({
  code: z.string().optional(),
  text: z.string().optional(),
  action_required: z.boolean().optional(),
});

export type ShippoTrackingSubstatus = z.infer<typeof ShippoTrackingSubstatusSchema>;

export const ShippoTrackingStatusDetailSchema = z.object({
  object_created: z.string().optional(),
  object_updated: z.string().optional(),
  object_id: z.string().optional(),
  status: ShippoTrackingStatusSchema.optional(),
  status_details: z.string().optional(),
  status_date: z.string().optional(),
  substatus: ShippoTrackingSubstatusSchema.optional(),
  location: ShippoLocationSchema.optional(),
});

export type ShippoTrackingStatusDetail = z.infer<typeof ShippoTrackingStatusDetailSchema>;

export const ShippoTrackingUpdateSchema = z.object({
  object_created: z.string().optional(),
  object_updated: z.string().optional(),
  object_id: z.string().optional(),
  status: z.string().optional(),
  status_details: z.string().optional(),
  status_date: z.string().optional(),
  location: ShippoLocationSchema.optional(),
});

export type ShippoTrackingUpdate = z.infer<typeof ShippoTrackingUpdateSchema>;

export const ShippoTrackSchema = z.object({
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  address_from: ShippoAddressSchema.optional(),
  address_to: ShippoAddressSchema.optional(),
  eta: z.string().optional(),
  servicelevel: ShippoServiceLevelSchema.optional(),
  tracking_status: ShippoTrackingStatusDetailSchema.optional(),
  tracking_history: z.array(ShippoTrackingUpdateSchema).optional(),
  transaction: z.string().optional(),
  test: z.boolean().optional(),
});

export type ShippoTrack = z.infer<typeof ShippoTrackSchema>;

// ============================================================
// Customs Types
// ============================================================

export const ShippoCustomsItemSchema = z.object({
  object_id: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().optional(),
  net_weight: z.string().optional(),
  mass_unit: ShippoMassUnitSchema.optional(),
  value_amount: z.string().optional(),
  value_currency: z.string().optional(),
  origin_country: z.string().optional(),
  tariff_number: z.string().optional(),
  sku: z.string().optional(),
  hs_code: z.string().optional(),
  metadata: z.string().optional(),
  test: z.boolean().optional(),
});

export type ShippoCustomsItem = z.infer<typeof ShippoCustomsItemSchema>;

export const ShippoCustomsDeclarationSchema = z.object({
  object_id: z.string().optional(),
  contents_type: ShippoContentsTypeSchema.optional(),
  contents_explanation: z.string().optional(),
  non_delivery_option: ShippoNonDeliveryOptionSchema.optional(),
  certify: z.boolean().optional(),
  certify_signer: z.string().optional(),
  items: z.array(ShippoCustomsItemSchema).optional(),
  invoice: z.string().optional(),
  license: z.string().optional(),
  certificate: z.string().optional(),
  notes: z.string().optional(),
  eel_pfc: z.string().optional(),
  aes_itn: z.string().optional(),
  incoterm: z.string().optional(),
  metadata: z.string().optional(),
  test: z.boolean().optional(),
});

export type ShippoCustomsDeclaration = z.infer<typeof ShippoCustomsDeclarationSchema>;

// ============================================================
// API Response Types
// ============================================================

export const ShippoApiResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    results: z.array(itemSchema).optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
    count: z.number().int().optional(),
  });

export const ShippoRateResponseSchema = ShippoApiResponseSchema(ShippoRateSchema).extend({
  shipment: z.record(z.string(), z.unknown()).optional(),
});

export type ShippoRateResponse = z.infer<typeof ShippoRateResponseSchema>;

export const ShippingLabelResponseSchema = z.object({
  success: z.boolean(),
  labelUrl: z.string().optional(),
  trackingNumber: z.string().optional(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  retryAttempt: z.number().int().optional(),
});

export type ShippingLabelResponse = z.infer<typeof ShippingLabelResponseSchema>;

// ============================================================
// Error Types
// ============================================================

export const ShippoErrorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('RATE_EXPIRED'),
    rateId: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('API_INITIALIZATION'),
    message: z.string(),
  }),
  z.object({
    type: z.literal('TRANSACTION_FAILED'),
    details: z.string(),
    messages: z.array(z.object({ text: z.string(), type: z.string() })).optional(),
  }),
  z.object({
    type: z.literal('NETWORK_ERROR'),
    message: z.string(),
    statusCode: z.number().int().optional(),
  }),
  z.object({
    type: z.literal('VALIDATION_ERROR'),
    field: z.string(),
    message: z.string(),
  }),
  z.object({
    type: z.literal('RETRY_EXHAUSTED'),
    attempts: z.number().int(),
    lastError: z.string(),
  }),
]);

export type ShippoError = z.infer<typeof ShippoErrorSchema>;
