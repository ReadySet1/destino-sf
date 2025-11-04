/**
 * Square Orders API External Contracts
 *
 * Zod schemas for validating Square Orders API responses at runtime.
 * These schemas mirror the TypeScript types in src/types/square.d.ts
 * and provide runtime validation to catch breaking changes from Square's API.
 *
 * @see https://developer.squareup.com/reference/square/orders-api
 */

import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { MoneySchema, SquareErrorSchema, CatalogItemVariationSchema } from './catalog';
import { AddressSchema } from './payments';

extendZodWithOpenApi(z);

// ============================================================
// Order Enums
// ============================================================

export const OrderStateSchema = z.enum(['OPEN', 'COMPLETED', 'CANCELED', 'DRAFT']);

export type OrderState = z.infer<typeof OrderStateSchema>;

export const FulfillmentTypeSchema = z.enum(['PICKUP', 'SHIPMENT', 'DELIVERY']);

export type FulfillmentType = z.infer<typeof FulfillmentTypeSchema>;

// ============================================================
// Order Supporting Types
// ============================================================

/**
 * Order source information
 */
export const OrderSourceSchema = z.object({
  name: z.string().optional(),
});

export type OrderSource = z.infer<typeof OrderSourceSchema>;

/**
 * Order line item modifier
 */
export const OrderLineItemModifierSchema = z.object({
  uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  quantity: z.string().optional(),
  base_price_money: MoneySchema.optional(),
  total_price_money: MoneySchema.optional(),
  metadata: z.record(z.string()).optional(),
});

export type OrderLineItemModifier = z.infer<typeof OrderLineItemModifierSchema>;

/**
 * Order line item tax
 */
export const OrderLineItemTaxSchema = z.object({
  uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  percentage: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  applied_money: MoneySchema.optional(),
  scope: z.string().optional(),
});

export type OrderLineItemTax = z.infer<typeof OrderLineItemTaxSchema>;

/**
 * Order line item discount
 */
export const OrderLineItemDiscountSchema = z.object({
  uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  percentage: z.string().optional(),
  amount_money: MoneySchema.optional(),
  applied_money: MoneySchema.optional(),
  metadata: z.record(z.string()).optional(),
  scope: z.string().optional(),
  reward_ids: z.array(z.string()).optional(),
  pricing_rule_id: z.string().optional(),
});

export type OrderLineItemDiscount = z.infer<typeof OrderLineItemDiscountSchema>;

/**
 * Applied tax to line item
 */
export const OrderLineItemAppliedTaxSchema = z.object({
  uid: z.string().optional(),
  tax_uid: z.string(),
  applied_money: MoneySchema.optional(),
});

export type OrderLineItemAppliedTax = z.infer<typeof OrderLineItemAppliedTaxSchema>;

/**
 * Applied discount to line item
 */
export const OrderLineItemAppliedDiscountSchema = z.object({
  uid: z.string().optional(),
  discount_uid: z.string(),
  applied_money: MoneySchema.optional(),
});

export type OrderLineItemAppliedDiscount = z.infer<typeof OrderLineItemAppliedDiscountSchema>;

/**
 * Applied service charge to line item
 */
export const OrderLineItemAppliedServiceChargeSchema = z.object({
  uid: z.string().optional(),
  service_charge_uid: z.string(),
  applied_money: MoneySchema.optional(),
});

export type OrderLineItemAppliedServiceCharge = z.infer<
  typeof OrderLineItemAppliedServiceChargeSchema
>;

/**
 * Order quantity unit
 */
export const OrderQuantityUnitSchema = z.object({
  measurement_unit: z.record(z.string(), z.unknown()).optional(),
  precision: z.number().int().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
});

export type OrderQuantityUnit = z.infer<typeof OrderQuantityUnitSchema>;

/**
 * Order line item
 */
export const OrderLineItemSchema = z.object({
  uid: z.string().optional(),
  name: z.string().optional(),
  quantity: z.string(),
  item_type: z.string().optional(),
  base_price_money: MoneySchema.optional(),
  variation_total_price_money: MoneySchema.optional(),
  gross_sales_money: MoneySchema.optional(),
  total_tax_money: MoneySchema.optional(),
  total_discount_money: MoneySchema.optional(),
  total_money: MoneySchema.optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  variation_name: z.string().optional(),
  item_variation_data: CatalogItemVariationSchema.optional(),
  modifiers: z.array(OrderLineItemModifierSchema).optional(),
  taxes: z.array(OrderLineItemAppliedTaxSchema).optional(),
  discounts: z.array(OrderLineItemAppliedDiscountSchema).optional(),
  applied_service_charges: z.array(OrderLineItemAppliedServiceChargeSchema).optional(),
  metadata: z.record(z.string()).optional(),
});

export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

/**
 * Order service charge
 */
export const OrderServiceChargeSchema = z.object({
  uid: z.string().optional(),
  name: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  percentage: z.string().optional(),
  amount_money: MoneySchema.optional(),
  applied_money: MoneySchema.optional(),
  total_money: MoneySchema.optional(),
  total_tax_money: MoneySchema.optional(),
  calculation_phase: z.string().optional(),
  taxable: z.boolean().optional(),
  applied_taxes: z.array(OrderLineItemAppliedTaxSchema).optional(),
  metadata: z.record(z.string()).optional(),
  type: z.string().optional(),
  treatment_type: z.string().optional(),
  scope: z.string().optional(),
});

export type OrderServiceCharge = z.infer<typeof OrderServiceChargeSchema>;

/**
 * Order fulfillment recipient
 */
export const OrderFulfillmentRecipientSchema = z.object({
  customer_id: z.string().optional(),
  display_name: z.string().optional(),
  email_address: z.string().optional(),
  phone_number: z.string().optional(),
  address: AddressSchema.optional(),
});

export type OrderFulfillmentRecipient = z.infer<typeof OrderFulfillmentRecipientSchema>;

/**
 * Fulfillment entry
 */
export const OrderFulfillmentFulfillmentEntrySchema = z.object({
  uid: z.string().optional(),
  line_item_uid: z.string(),
  quantity: z.string(),
  metadata: z.record(z.string()).optional(),
});

export type OrderFulfillmentFulfillmentEntry = z.infer<
  typeof OrderFulfillmentFulfillmentEntrySchema
>;

/**
 * Pickup details
 */
export const OrderFulfillmentPickupDetailsSchema = z.object({
  recipient: OrderFulfillmentRecipientSchema.optional(),
  expires_at: z.string().optional(),
  auto_complete_duration: z.string().optional(),
  schedule_type: z.string().optional(),
  pickup_at: z.string().optional(),
  pickup_window_duration: z.string().optional(),
  prep_time_duration: z.string().optional(),
  note: z.string().optional(),
  placed_at: z.string().optional(),
  accepted_at: z.string().optional(),
  rejected_at: z.string().optional(),
  ready_at: z.string().optional(),
  expired_at: z.string().optional(),
  picked_up_at: z.string().optional(),
  canceled_at: z.string().optional(),
  cancel_reason: z.string().optional(),
  is_curbside_pickup: z.boolean().optional(),
  curbside_pickup_details: z
    .object({
      curbside_details: z.string().optional(),
      buyer_arrived_at: z.string().optional(),
    })
    .optional(),
});

export type OrderFulfillmentPickupDetails = z.infer<typeof OrderFulfillmentPickupDetailsSchema>;

/**
 * Shipment details
 */
export const OrderFulfillmentShipmentDetailsSchema = z.object({
  recipient: OrderFulfillmentRecipientSchema.optional(),
  carrier: z.string().optional(),
  shipping_note: z.string().optional(),
  shipping_type: z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url: z.string().optional(),
  placed_at: z.string().optional(),
  in_progress_at: z.string().optional(),
  packaged_at: z.string().optional(),
  expected_shipped_at: z.string().optional(),
  shipped_at: z.string().optional(),
  canceled_at: z.string().optional(),
  cancel_reason: z.string().optional(),
  failed_at: z.string().optional(),
  failure_reason: z.string().optional(),
});

export type OrderFulfillmentShipmentDetails = z.infer<
  typeof OrderFulfillmentShipmentDetailsSchema
>;

/**
 * Delivery details
 */
export const OrderFulfillmentDeliveryDetailsSchema = z.object({
  recipient: OrderFulfillmentRecipientSchema.optional(),
  schedule_type: z.string().optional(),
  placed_at: z.string().optional(),
  deliver_at: z.string().optional(),
  prep_time_duration: z.string().optional(),
  delivery_window_duration: z.string().optional(),
  note: z.string().optional(),
  completed_at: z.string().optional(),
  in_progress_at: z.string().optional(),
  rejected_at: z.string().optional(),
  ready_at: z.string().optional(),
  delivered_at: z.string().optional(),
  canceled_at: z.string().optional(),
  cancel_reason: z.string().optional(),
  courier_pickup_at: z.string().optional(),
  courier_pickup_window_duration: z.string().optional(),
  is_no_contact_delivery: z.boolean().optional(),
  dropoff_notes: z.string().optional(),
  courier_provider_name: z.string().optional(),
  courier_support_phone_number: z.string().optional(),
  square_delivery_id: z.string().optional(),
  external_delivery_id: z.string().optional(),
  managed_delivery: z.boolean().optional(),
});

export type OrderFulfillmentDeliveryDetails = z.infer<
  typeof OrderFulfillmentDeliveryDetailsSchema
>;

/**
 * Order fulfillment
 */
export const OrderFulfillmentSchema = z.object({
  uid: z.string().optional(),
  type: FulfillmentTypeSchema,
  state: z.string().optional(),
  line_item_application: z.string().optional(),
  entries: z.array(OrderFulfillmentFulfillmentEntrySchema).optional(),
  metadata: z.record(z.string()).optional(),
  pickup_details: OrderFulfillmentPickupDetailsSchema.optional(),
  shipment_details: OrderFulfillmentShipmentDetailsSchema.optional(),
  delivery_details: OrderFulfillmentDeliveryDetailsSchema.optional(),
});

export type OrderFulfillment = z.infer<typeof OrderFulfillmentSchema>;

/**
 * Order money amounts aggregates
 */
export const OrderMoneyAmountsSchema = z.object({
  total_money: MoneySchema.optional(),
  tax_money: MoneySchema.optional(),
  discount_money: MoneySchema.optional(),
  tip_money: MoneySchema.optional(),
  service_charge_money: MoneySchema.optional(),
});

export type OrderMoneyAmounts = z.infer<typeof OrderMoneyAmountsSchema>;

/**
 * Order rounding adjustment
 */
export const OrderRoundingAdjustmentSchema = z.object({
  uid: z.string().optional(),
  name: z.string().optional(),
  amount_money: MoneySchema.optional(),
});

export type OrderRoundingAdjustment = z.infer<typeof OrderRoundingAdjustmentSchema>;

/**
 * Order pricing options
 */
export const OrderPricingOptionsSchema = z.object({
  auto_apply_discounts: z.boolean().optional(),
  auto_apply_taxes: z.boolean().optional(),
});

export type OrderPricingOptions = z.infer<typeof OrderPricingOptionsSchema>;

/**
 * Order reward
 */
export const OrderRewardSchema = z.object({
  id: z.string(),
  reward_tier_id: z.string(),
});

export type OrderReward = z.infer<typeof OrderRewardSchema>;

/**
 * Tender (payment at POS)
 */
export const TenderSchema = z.object({
  id: z.string().optional(),
  location_id: z.string().optional(),
  transaction_id: z.string().optional(),
  created_at: z.string().optional(),
  note: z.string().optional(),
  amount_money: MoneySchema.optional(),
  tip_money: MoneySchema.optional(),
  processing_fee_money: MoneySchema.optional(),
  customer_id: z.string().optional(),
  type: z.string(),
  card_details: z.record(z.string(), z.unknown()).optional(),
  cash_details: z.record(z.string(), z.unknown()).optional(),
  additional_recipients: z.array(z.record(z.string(), z.unknown())).optional(),
  payment_id: z.string().optional(),
});

export type Tender = z.infer<typeof TenderSchema>;

/**
 * Refund
 */
export const RefundSchema = z.object({
  id: z.string(),
  location_id: z.string(),
  transaction_id: z.string().optional(),
  tender_id: z.string(),
  created_at: z.string().optional(),
  reason: z.string(),
  amount_money: MoneySchema,
  status: z.string(),
  processing_fee_money: MoneySchema.optional(),
  additional_recipients: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type Refund = z.infer<typeof RefundSchema>;

/**
 * Order return line item modifier
 */
export const OrderReturnLineItemModifierSchema = z.object({
  uid: z.string().optional(),
  source_modifier_uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  base_price_money: MoneySchema.optional(),
  total_price_money: MoneySchema.optional(),
  quantity: z.string().optional(),
});

export type OrderReturnLineItemModifier = z.infer<typeof OrderReturnLineItemModifierSchema>;

/**
 * Order return line item
 */
export const OrderReturnLineItemSchema = z.object({
  uid: z.string().optional(),
  source_line_item_uid: z.string().optional(),
  name: z.string().optional(),
  quantity: z.string(),
  quantity_unit: OrderQuantityUnitSchema.optional(),
  note: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  variation_name: z.string().optional(),
  item_type: z.string().optional(),
  return_modifiers: z.array(OrderReturnLineItemModifierSchema).optional(),
  applied_taxes: z.array(OrderLineItemAppliedTaxSchema).optional(),
  applied_discounts: z.array(OrderLineItemAppliedDiscountSchema).optional(),
  base_price_money: MoneySchema.optional(),
  variation_total_price_money: MoneySchema.optional(),
  gross_return_money: MoneySchema.optional(),
  total_tax_money: MoneySchema.optional(),
  total_discount_money: MoneySchema.optional(),
  total_money: MoneySchema.optional(),
});

export type OrderReturnLineItem = z.infer<typeof OrderReturnLineItemSchema>;

/**
 * Order return service charge
 */
export const OrderReturnServiceChargeSchema = z.object({
  uid: z.string().optional(),
  source_service_charge_uid: z.string().optional(),
  name: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  percentage: z.string().optional(),
  amount_money: MoneySchema.optional(),
  applied_money: MoneySchema.optional(),
  total_money: MoneySchema.optional(),
  total_tax_money: MoneySchema.optional(),
  calculation_phase: z.string().optional(),
  taxable: z.boolean().optional(),
  applied_taxes: z.array(OrderLineItemAppliedTaxSchema).optional(),
});

export type OrderReturnServiceCharge = z.infer<typeof OrderReturnServiceChargeSchema>;

/**
 * Order return tax
 */
export const OrderReturnTaxSchema = z.object({
  uid: z.string().optional(),
  source_tax_uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  percentage: z.string().optional(),
  applied_money: MoneySchema.optional(),
  scope: z.string().optional(),
});

export type OrderReturnTax = z.infer<typeof OrderReturnTaxSchema>;

/**
 * Order return discount
 */
export const OrderReturnDiscountSchema = z.object({
  uid: z.string().optional(),
  source_discount_uid: z.string().optional(),
  catalog_object_id: z.string().optional(),
  catalog_version: z.union([z.number(), z.bigint()]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  percentage: z.string().optional(),
  amount_money: MoneySchema.optional(),
  applied_money: MoneySchema.optional(),
  scope: z.string().optional(),
});

export type OrderReturnDiscount = z.infer<typeof OrderReturnDiscountSchema>;

/**
 * Order return
 */
export const OrderReturnSchema = z.object({
  uid: z.string().optional(),
  source_order_uid: z.string().optional(),
  return_line_items: z.array(OrderReturnLineItemSchema).optional(),
  return_service_charges: z.array(OrderReturnServiceChargeSchema).optional(),
  return_taxes: z.array(OrderReturnTaxSchema).optional(),
  return_discounts: z.array(OrderReturnDiscountSchema).optional(),
  rounding_adjustment: OrderRoundingAdjustmentSchema.optional(),
  return_amounts: OrderMoneyAmountsSchema.optional(),
});

export type OrderReturn = z.infer<typeof OrderReturnSchema>;

// ============================================================
// Order Object
// ============================================================

/**
 * Order main object
 */
export const OrderSchema = z.object({
  id: z.string().optional(),
  location_id: z.string(),
  order_number: z.string().optional(),
  reference_id: z.string().optional(),
  source: OrderSourceSchema.optional(),
  customer_id: z.string().optional(),
  line_items: z.array(OrderLineItemSchema).optional(),
  taxes: z.array(OrderLineItemTaxSchema).optional(),
  discounts: z.array(OrderLineItemDiscountSchema).optional(),
  service_charges: z.array(OrderServiceChargeSchema).optional(),
  fulfillments: z.array(OrderFulfillmentSchema).optional(),
  returns: z.array(OrderReturnSchema).optional(),
  return_amounts: OrderMoneyAmountsSchema.optional(),
  net_amounts: OrderMoneyAmountsSchema.optional(),
  rounding_adjustment: OrderRoundingAdjustmentSchema.optional(),
  tenders: z.array(TenderSchema).optional(),
  refunds: z.array(RefundSchema).optional(),
  metadata: z.record(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  closed_at: z.string().optional(),
  state: OrderStateSchema.optional(),
  version: z.number().int().optional(),
  total_money: MoneySchema.optional(),
  total_tax_money: MoneySchema.optional(),
  total_discount_money: MoneySchema.optional(),
  total_tip_money: MoneySchema.optional(),
  total_service_charge_money: MoneySchema.optional(),
  ticket_name: z.string().optional(),
  pricing_options: OrderPricingOptionsSchema.optional(),
  rewards: z.array(OrderRewardSchema).optional(),
});

export type Order = z.infer<typeof OrderSchema>;

// ============================================================
// Search Query Structures
// ============================================================

export const TimeRangeSchema = z.object({
  start_at: z.string().optional(),
  end_at: z.string().optional(),
});

export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const SearchOrdersStateFilterSchema = z.object({
  states: z.array(OrderStateSchema),
});

export type SearchOrdersStateFilter = z.infer<typeof SearchOrdersStateFilterSchema>;

export const SearchOrdersDateTimeFilterSchema = z.object({
  created_at: TimeRangeSchema.optional(),
  updated_at: TimeRangeSchema.optional(),
  closed_at: TimeRangeSchema.optional(),
});

export type SearchOrdersDateTimeFilter = z.infer<typeof SearchOrdersDateTimeFilterSchema>;

export const SearchOrdersFulfillmentFilterSchema = z.object({
  fulfillment_types: z.array(FulfillmentTypeSchema).optional(),
  fulfillment_states: z.array(z.string()).optional(),
});

export type SearchOrdersFulfillmentFilter = z.infer<typeof SearchOrdersFulfillmentFilterSchema>;

export const SearchOrdersSourceFilterSchema = z.object({
  source_names: z.array(z.string()).optional(),
});

export type SearchOrdersSourceFilter = z.infer<typeof SearchOrdersSourceFilterSchema>;

export const SearchOrdersCustomerFilterSchema = z.object({
  customer_ids: z.array(z.string()).optional(),
});

export type SearchOrdersCustomerFilter = z.infer<typeof SearchOrdersCustomerFilterSchema>;

export const SearchOrdersFilterSchema = z.object({
  state_filter: SearchOrdersStateFilterSchema.optional(),
  date_time_filter: SearchOrdersDateTimeFilterSchema.optional(),
  fulfillment_filter: SearchOrdersFulfillmentFilterSchema.optional(),
  source_filter: SearchOrdersSourceFilterSchema.optional(),
  customer_filter: SearchOrdersCustomerFilterSchema.optional(),
});

export type SearchOrdersFilter = z.infer<typeof SearchOrdersFilterSchema>;

export const SearchOrdersSortSchema = z.object({
  sort_field: z.string(),
  sort_order: z.string().optional(),
});

export type SearchOrdersSort = z.infer<typeof SearchOrdersSortSchema>;

export const SearchOrdersQuerySchema = z.object({
  filter: SearchOrdersFilterSchema.optional(),
  sort: SearchOrdersSortSchema.optional(),
});

export type SearchOrdersQuery = z.infer<typeof SearchOrdersQuerySchema>;

export const OrderEntrySchema = z.object({
  order_id: z.string().optional(),
  version: z.number().int().optional(),
  location_id: z.string().optional(),
});

export type OrderEntry = z.infer<typeof OrderEntrySchema>;

// ============================================================
// API Request Schemas
// ============================================================

export const CreateOrderRequestSchema = z.object({
  order: OrderSchema.optional(),
  idempotency_key: z.string().optional(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const UpdateOrderRequestSchema = z.object({
  order: OrderSchema.optional(),
  fields_to_clear: z.array(z.string()).optional(),
  idempotency_key: z.string().optional(),
});

export type UpdateOrderRequest = z.infer<typeof UpdateOrderRequestSchema>;

export const PayOrderRequestSchema = z.object({
  idempotency_key: z.string(),
  order_version: z.number().int().optional(),
  payment_ids: z.array(z.string()).optional(),
});

export type PayOrderRequest = z.infer<typeof PayOrderRequestSchema>;

export const SearchOrdersRequestSchema = z.object({
  location_ids: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  query: SearchOrdersQuerySchema.optional(),
  limit: z.number().int().positive().max(1000).optional(),
  return_entries: z.boolean().optional(),
});

export type SearchOrdersRequest = z.infer<typeof SearchOrdersRequestSchema>;

export const CalculateOrderRequestSchema = z.object({
  order: OrderSchema,
  proposed_rewards: z.array(OrderRewardSchema).optional(),
});

export type CalculateOrderRequest = z.infer<typeof CalculateOrderRequestSchema>;

export const CloneOrderRequestSchema = z.object({
  order_id: z.string(),
  version: z.number().int().optional(),
  idempotency_key: z.string(),
});

export type CloneOrderRequest = z.infer<typeof CloneOrderRequestSchema>;

// ============================================================
// API Response Schemas
// ============================================================

export const CreateOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

export const RetrieveOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type RetrieveOrderResponse = z.infer<typeof RetrieveOrderResponseSchema>;

export const UpdateOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type UpdateOrderResponse = z.infer<typeof UpdateOrderResponseSchema>;

export const PayOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type PayOrderResponse = z.infer<typeof PayOrderResponseSchema>;

export const SearchOrdersResponseSchema = z.object({
  order_entries: z.array(OrderEntrySchema).optional(),
  orders: z.array(OrderSchema).optional(),
  cursor: z.string().optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type SearchOrdersResponse = z.infer<typeof SearchOrdersResponseSchema>;

export const CalculateOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CalculateOrderResponse = z.infer<typeof CalculateOrderResponseSchema>;

export const CloneOrderResponseSchema = z.object({
  order: OrderSchema.optional(),
  errors: z.array(SquareErrorSchema).optional(),
});

export type CloneOrderResponse = z.infer<typeof CloneOrderResponseSchema>;
