// Base Money interface for Square API
export interface Money {
  amount?: bigint | number;
  currency?: string;
}

// Square Web Payments SDK types
export interface SquareCard {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<SquareTokenizationResult>;
  destroy: () => void;
}

export interface SquareTokenizationResult {
  status: 'OK' | 'INVALID_CARD';
  token?: string;
  details?: {
    card?: {
      brand: string;
      expMonth: number;
      expYear: number;
      last4: string;
    };
  };
  errors?: Array<{ 
    type: string;
    field: string;
    message: string; 
  }>;
}

export interface SquarePayments {
  card: () => Promise<SquareCard>;
  giftCard: () => Promise<SquareCard>;
  ach: () => Promise<SquareCard>;
  applePay: (request: ApplePayRequest) => Promise<SquareCard>;
  googlePay: (request: GooglePayRequest) => Promise<SquareCard>;
}

export interface ApplePayRequest {
  countryCode: string;
  currencyCode: string;
  total: {
    amount: string;
    label: string;
  };
}

export interface GooglePayRequest {
  countryCode: string;
  currencyCode: string;
  total: {
    amount: string;
    label: string;
  };
}

interface Window {
  Square?: {
    payments: (
      appId: string,
      locationId: string
    ) => SquarePayments;
  };
}

// Square API Enums
export enum CatalogObjectType {
  ITEM = 'ITEM',
  CATEGORY = 'CATEGORY',
  ITEM_VARIATION = 'ITEM_VARIATION',
  TAX = 'TAX',
  DISCOUNT = 'DISCOUNT',
  MODIFIER_LIST = 'MODIFIER_LIST',
  MODIFIER = 'MODIFIER',
  PRICING_RULE = 'PRICING_RULE',
  PRODUCT_SET = 'PRODUCT_SET',
  TIME_PERIOD = 'TIME_PERIOD',
  MEASUREMENT_UNIT = 'MEASUREMENT_UNIT',
  ITEM_OPTION = 'ITEM_OPTION',
  ITEM_OPTION_VAL = 'ITEM_OPTION_VAL',
  CUSTOM_ATTRIBUTE_DEFINITION = 'CUSTOM_ATTRIBUTE_DEFINITION',
  QUICK_AMOUNTS_SETTINGS = 'QUICK_AMOUNTS_SETTINGS'
}

export enum PaymentStatus {
  UNKNOWN = 'UNKNOWN',
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED'
}

export enum OrderState {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  DRAFT = 'DRAFT'
}

export enum FulfillmentType {
  PICKUP = 'PICKUP',
  SHIPMENT = 'SHIPMENT',
  DELIVERY = 'DELIVERY'
}

// Enhanced Catalog Object Types
export interface CatalogObject {
  type: CatalogObjectType;
  id: string;
  updated_at?: string;
  created_at?: string;
  version?: bigint;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: CatalogItem;
  item_variation_data?: CatalogItemVariation;
  category_data?: CatalogCategory;
  modifier_list_data?: CatalogModifierList;
  modifier_data?: CatalogModifier;
  custom_attribute_values?: Record<string, any>;
}

export interface CatalogItem {
  name?: string;
  description?: string;
  abbreviation?: string;
  label_color?: string;
  available_online?: boolean;
  available_for_pickup?: boolean;
  available_electronically?: boolean;
  category_id?: string;
  tax_ids?: string[];
  modifier_list_info?: CatalogItemModifierListInfo[];
  variations?: CatalogObject[];
  product_type?: 'REGULAR' | 'GIFT_CARD' | 'APPOINTMENTS_SERVICE';
  skip_modifier_screen?: boolean;
  item_options?: CatalogItemOptionForItem[];
  image_ids?: string[];
  sort_name?: string;
  description_html?: string;
  description_plaintext?: string;
}

export interface CatalogItemVariation {
  item_id?: string;
  name?: string;
  sku?: string;
  upc?: string;
  ordinal?: number;
  pricing_type?: 'FIXED_PRICING' | 'VARIABLE_PRICING';
  price_money?: Money;
  location_overrides?: CatalogItemVariationLocationOverrides[];
  track_inventory?: boolean;
  inventory_alert_type?: 'NONE' | 'LOW_QUANTITY';
  inventory_alert_threshold?: bigint;
  user_data?: string;
  service_duration?: bigint;
  available_for_booking?: boolean;
  item_option_values?: CatalogItemOptionValueForItemVariation[];
  measurement_unit_id?: string;
  sellable?: boolean;
  stockable?: boolean;
  image_ids?: string[];
  team_member_ids?: string[];
  stockable_conversion?: CatalogStockConversion;
}

export interface CatalogItemVariationLocationOverrides {
  location_id?: string;
  price_money?: Money;
  pricing_type?: 'FIXED_PRICING' | 'VARIABLE_PRICING';
  track_inventory?: boolean;
  inventory_alert_type?: 'NONE' | 'LOW_QUANTITY';
  inventory_alert_threshold?: bigint;
  sold_out?: boolean;
  sold_out_valid_until?: string;
}

export interface CatalogCategory {
  name?: string;
  image_ids?: string[];
  category_type?: 'REGULAR_CATEGORY' | 'OTHER_CATEGORY';
  parent_category?: CatalogObjectCategory;
  is_top_level?: boolean;
  channels?: string[];
  availability_period_ids?: string[];
  online_visibility?: boolean;
  root_category?: string;
  ecom_seo_data?: CatalogEcomSeoData;
  ecom_image_uris?: string[];
  ordinal?: number;
}

// Square API Response Types
export interface SquareCatalogApiResponse {
  result: {
    objects?: CatalogObject[];
    related_objects?: CatalogObject[];
    cursor?: string;
    object?: CatalogObject;
  };
  errors?: SquareError[];
}

export interface SquareError {
  category: string;
  code: string;
  detail?: string;
  field?: string;
}

export interface SquareCatalogApi {
  searchCatalogObjects: (requestBody: SearchCatalogObjectsRequest) => Promise<SquareCatalogApiResponse>;
  retrieveCatalogObject: (objectId: string, includeRelatedObjects?: boolean) => Promise<SquareCatalogApiResponse>;
  listCatalog?: (cursor?: string, types?: string, catalogVersion?: bigint) => Promise<SquareCatalogApiResponse>;
  testConnection?: () => Promise<{
    success: boolean;
    environment: string;
    apiHost: string;
    error?: string;
  }>;
}

export interface SearchCatalogObjectsRequest {
  cursor?: string;
  object_types?: CatalogObjectType[];
  include_deleted_objects?: boolean;
  include_related_objects?: boolean;
  begin_time?: string;
  query?: CatalogQuery;
  limit?: number;
}

export interface CatalogQuery {
  sorted_attribute_query?: CatalogQuerySortedAttribute;
  exact_query?: CatalogQueryExact;
  set_query?: CatalogQuerySet;
  prefix_query?: CatalogQueryPrefix;
  range_query?: CatalogQueryRange;
  text_query?: CatalogQueryText;
  items_for_tax_query?: CatalogQueryItemsForTax;
  items_for_modifier_list_query?: CatalogQueryItemsForModifierList;
  items_for_item_options_query?: CatalogQueryItemsForItemOptions;
  item_variations_for_item_option_values_query?: CatalogQueryItemVariationsForItemOptionValues;
}

export interface CatalogQuerySortedAttribute {
  attribute_name: string;
  initial_attribute_value?: string;
  sort_order?: string;
}

export interface CatalogQueryExact {
  attribute_name: string;
  attribute_value: string;
}

export interface CatalogQuerySet {
  attribute_name: string;
  attribute_values: string[];
}

export interface CatalogQueryPrefix {
  attribute_name: string;
  attribute_prefix: string;
}

export interface CatalogQueryRange {
  attribute_name: string;
  attribute_min_value?: bigint;
  attribute_max_value?: bigint;
}

export interface CatalogQueryText {
  keywords: string[];
}

export interface CatalogQueryItemsForTax {
  tax_ids: string[];
}

export interface CatalogQueryItemsForModifierList {
  modifier_list_ids: string[];
}

export interface CatalogQueryItemsForItemOptions {
  item_option_ids?: string[];
}

export interface CatalogQueryItemVariationsForItemOptionValues {
  item_option_value_ids?: string[];
}

// Missing interface definitions
export interface CatalogItemModifierListInfo {
  modifier_list_id?: string;
  modifier_overrides?: CatalogModifierOverride[];
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  enabled?: boolean;
  ordinal?: number;
  allow_quantities?: boolean;
  is_conversational?: boolean;
  hidden_from_customer_override?: boolean;
  hidden_from_customer?: boolean;
}

export interface CatalogItemOptionForItem {
  item_option_id?: string;
}

export interface CatalogItemOptionValueForItemVariation {
  item_option_id?: string;
  item_option_value_id?: string;
}

export interface CatalogStockConversion {
  stockable_item_variation_id: string;
  stockable_quantity: string;
  nonstockable_modifier: string;
}

export interface CatalogObjectCategory {
  id?: string;
  ordinal?: number;
}

export interface CatalogEcomSeoData {
  page_title?: string;
  page_description?: string;
  permalink?: string;
}

export interface BusinessHours {
  periods?: BusinessHoursPeriod[];
}

export interface BusinessHoursPeriod {
  day_of_week?: string;
  start_local_time?: string;
  end_local_time?: string;
}

export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

export interface TaxIds {
  eu_vat?: string;
  fr_siret?: string;
  fr_naf?: string;
  es_nif?: string;
  jp_qii?: string;
}

export interface RiskEvaluation {
  created_at?: string;
  risk_level?: string;
}

export interface DeviceDetails {
  device_id?: string;
  device_installation_id?: string;
  device_name?: string;
}

export interface ApplicationDetails {
  square_product?: string;
  application_id?: string;
}

export interface OrderSource {
  name?: string;
}

export interface OrderLineItemTax {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  type?: string;
  percentage?: string;
  metadata?: Record<string, string>;
  applied_money?: Money;
  scope?: string;
}

export interface OrderLineItemDiscount {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  type?: string;
  percentage?: string;
  amount_money?: Money;
  applied_money?: Money;
  metadata?: Record<string, string>;
  scope?: string;
  reward_ids?: string[];
  pricing_rule_id?: string;
}

export interface OrderServiceCharge {
  uid?: string;
  name?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  percentage?: string;
  amount_money?: Money;
  applied_money?: Money;
  total_money?: Money;
  total_tax_money?: Money;
  calculation_phase?: string;
  taxable?: boolean;
  applied_taxes?: OrderLineItemAppliedTax[];
  metadata?: Record<string, string>;
  type?: string;
  treatment_type?: string;
  scope?: string;
}

export interface OrderFulfillment {
  uid?: string;
  type: FulfillmentType;
  state?: string;
  line_item_application?: string;
  entries?: OrderFulfillmentFulfillmentEntry[];
  metadata?: Record<string, string>;
  pickup_details?: OrderFulfillmentPickupDetails;
  shipment_details?: OrderFulfillmentShipmentDetails;
  delivery_details?: OrderFulfillmentDeliveryDetails;
}

export interface OrderFulfillmentFulfillmentEntry {
  uid?: string;
  line_item_uid: string;
  quantity: string;
  metadata?: Record<string, string>;
}

export interface OrderFulfillmentPickupDetails {
  recipient?: OrderFulfillmentRecipient;
  expires_at?: string;
  auto_complete_duration?: string;
  schedule_type?: string;
  pickup_at?: string;
  pickup_window_duration?: string;
  prep_time_duration?: string;
  note?: string;
  placed_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  ready_at?: string;
  expired_at?: string;
  picked_up_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  is_curbside_pickup?: boolean;
  curbside_pickup_details?: OrderFulfillmentPickupDetailsCurbsidePickupDetails;
}

export interface OrderFulfillmentRecipient {
  customer_id?: string;
  display_name?: string;
  email_address?: string;
  phone_number?: string;
  address?: Address;
}

export interface OrderFulfillmentPickupDetailsCurbsidePickupDetails {
  curbside_details?: string;
  buyer_arrived_at?: string;
}

export interface OrderFulfillmentShipmentDetails {
  recipient?: OrderFulfillmentRecipient;
  carrier?: string;
  shipping_note?: string;
  shipping_type?: string;
  tracking_number?: string;
  tracking_url?: string;
  placed_at?: string;
  in_progress_at?: string;
  packaged_at?: string;
  expected_shipped_at?: string;
  shipped_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  failed_at?: string;
  failure_reason?: string;
}

export interface OrderFulfillmentDeliveryDetails {
  recipient?: OrderFulfillmentRecipient;
  schedule_type?: string;
  placed_at?: string;
  deliver_at?: string;
  prep_time_duration?: string;
  delivery_window_duration?: string;
  note?: string;
  completed_at?: string;
  in_progress_at?: string;
  rejected_at?: string;
  ready_at?: string;
  delivered_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  courier_pickup_at?: string;
  courier_pickup_window_duration?: string;
  is_no_contact_delivery?: boolean;
  dropoff_notes?: string;
  courier_provider_name?: string;
  courier_support_phone_number?: string;
  square_delivery_id?: string;
  external_delivery_id?: string;
  managed_delivery?: boolean;
}

export interface OrderReturn {
  uid?: string;
  source_order_uid?: string;
  return_line_items?: OrderReturnLineItem[];
  return_service_charges?: OrderReturnServiceCharge[];
  return_taxes?: OrderReturnTax[];
  return_discounts?: OrderReturnDiscount[];
  rounding_adjustment?: OrderRoundingAdjustment;
  return_amounts?: OrderMoneyAmounts;
}

export interface OrderReturnLineItem {
  uid?: string;
  source_line_item_uid?: string;
  name?: string;
  quantity: string;
  quantity_unit?: OrderQuantityUnit;
  note?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  variation_name?: string;
  item_type?: string;
  return_modifiers?: OrderReturnLineItemModifier[];
  applied_taxes?: OrderLineItemAppliedTax[];
  applied_discounts?: OrderLineItemAppliedDiscount[];
  base_price_money?: Money;
  variation_total_price_money?: Money;
  gross_return_money?: Money;
  total_tax_money?: Money;
  total_discount_money?: Money;
  total_money?: Money;
}

export interface OrderReturnLineItemModifier {
  uid?: string;
  source_modifier_uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  base_price_money?: Money;
  total_price_money?: Money;
  quantity?: string;
}

export interface OrderReturnServiceCharge {
  uid?: string;
  source_service_charge_uid?: string;
  name?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  percentage?: string;
  amount_money?: Money;
  applied_money?: Money;
  total_money?: Money;
  total_tax_money?: Money;
  calculation_phase?: string;
  taxable?: boolean;
  applied_taxes?: OrderLineItemAppliedTax[];
}

export interface OrderReturnTax {
  uid?: string;
  source_tax_uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  type?: string;
  percentage?: string;
  applied_money?: Money;
  scope?: string;
}

export interface OrderReturnDiscount {
  uid?: string;
  source_discount_uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  type?: string;
  percentage?: string;
  amount_money?: Money;
  applied_money?: Money;
  scope?: string;
}

export interface OrderMoneyAmounts {
  total_money?: Money;
  tax_money?: Money;
  discount_money?: Money;
  tip_money?: Money;
  service_charge_money?: Money;
}

export interface OrderRoundingAdjustment {
  uid?: string;
  name?: string;
  amount_money?: Money;
}

export interface OrderPricingOptions {
  auto_apply_discounts?: boolean;
  auto_apply_taxes?: boolean;
}

export interface OrderReward {
  id: string;
  reward_tier_id: string;
}

export interface OrderLineItemModifier {
  uid?: string;
  catalog_object_id?: string;
  catalog_version?: bigint;
  name?: string;
  quantity?: string;
  base_price_money?: Money;
  total_price_money?: Money;
  metadata?: Record<string, string>;
}

export interface OrderLineItemAppliedTax {
  uid?: string;
  tax_uid: string;
  applied_money?: Money;
}

export interface OrderLineItemAppliedDiscount {
  uid?: string;
  discount_uid: string;
  applied_money?: Money;
}

export interface OrderLineItemAppliedServiceCharge {
  uid?: string;
  service_charge_uid: string;
  applied_money?: Money;
}

export interface OrderQuantityUnit {
  measurement_unit?: MeasurementUnit;
  precision?: number;
  catalog_object_id?: string;
  catalog_version?: bigint;
}

export interface MeasurementUnit {
  custom_unit?: MeasurementUnitCustom;
  area_unit?: string;
  length_unit?: string;
  volume_unit?: string;
  weight_unit?: string;
  generic_unit?: string;
  time_unit?: string;
  type?: string;
}

export interface MeasurementUnitCustom {
  name: string;
  abbreviation: string;
}

export interface Tender {
  id?: string;
  location_id?: string;
  transaction_id?: string;
  created_at?: string;
  note?: string;
  amount_money?: Money;
  tip_money?: Money;
  processing_fee_money?: Money;
  customer_id?: string;
  type: string;
  card_details?: TenderCardDetails;
  cash_details?: TenderCashDetails;
  additional_recipients?: AdditionalRecipient[];
  payment_id?: string;
}

export interface TenderCardDetails {
  status?: string;
  card?: Card;
  entry_method?: string;
}

export interface TenderCashDetails {
  buyer_tendered_money?: Money;
  change_back_money?: Money;
}

export interface AdditionalRecipient {
  location_id: string;
  description: string;
  amount_money: Money;
  receivable_id?: string;
}

export interface Refund {
  id: string;
  location_id: string;
  transaction_id?: string;
  tender_id: string;
  created_at?: string;
  reason: string;
  amount_money: Money;
  status: string;
  processing_fee_money?: Money;
  additional_recipients?: AdditionalRecipient[];
}

// API Request/Response Types
export interface CreateOrderRequest {
  order?: Order;
  idempotency_key?: string;
}

export interface CreateOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

export interface RetrieveOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

export interface UpdateOrderRequest {
  order?: Order;
  fields_to_clear?: string[];
  idempotency_key?: string;
}

export interface UpdateOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

export interface PayOrderRequest {
  idempotency_key: string;
  order_version?: number;
  payment_ids?: string[];
}

export interface PayOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

export interface SearchOrdersRequest {
  location_ids?: string[];
  cursor?: string;
  query?: SearchOrdersQuery;
  limit?: number;
  return_entries?: boolean;
}

export interface SearchOrdersResponse {
  order_entries?: OrderEntry[];
  orders?: Order[];
  cursor?: string;
  errors?: SquareError[];
}

export interface SearchOrdersQuery {
  filter?: SearchOrdersFilter;
  sort?: SearchOrdersSort;
}

export interface SearchOrdersFilter {
  state_filter?: SearchOrdersStateFilter;
  date_time_filter?: SearchOrdersDateTimeFilter;
  fulfillment_filter?: SearchOrdersFulfillmentFilter;
  source_filter?: SearchOrdersSourceFilter;
  customer_filter?: SearchOrdersCustomerFilter;
}

export interface SearchOrdersStateFilter {
  states: OrderState[];
}

export interface SearchOrdersDateTimeFilter {
  created_at?: TimeRange;
  updated_at?: TimeRange;
  closed_at?: TimeRange;
}

export interface TimeRange {
  start_at?: string;
  end_at?: string;
}

export interface SearchOrdersFulfillmentFilter {
  fulfillment_types?: FulfillmentType[];
  fulfillment_states?: string[];
}

export interface SearchOrdersSourceFilter {
  source_names?: string[];
}

export interface SearchOrdersCustomerFilter {
  customer_ids?: string[];
}

export interface SearchOrdersSort {
  sort_field: string;
  sort_order?: string;
}

export interface OrderEntry {
  order_id?: string;
  version?: number;
  location_id?: string;
}

export interface CalculateOrderRequest {
  order: Order;
  proposed_rewards?: OrderReward[];
}

export interface CalculateOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

export interface CloneOrderRequest {
  order_id: string;
  version?: number;
  idempotency_key: string;
}

export interface CloneOrderResponse {
  order?: Order;
  errors?: SquareError[];
}

// Payment API Request/Response Types
export interface CreatePaymentRequest {
  source_id: string;
  idempotency_key: string;
  amount_money: Money;
  tip_money?: Money;
  app_fee_money?: Money;
  delay_duration?: string;
  delay_action?: string;
  autocomplete?: boolean;
  order_id?: string;
  customer_id?: string;
  location_id?: string;
  reference_id?: string;
  verification_token?: string;
  accept_partial_authorization?: boolean;
  buyer_email_address?: string;
  billing_address?: Address;
  shipping_address?: Address;
  note?: string;
  statement_description_identifier?: string;
  cash_details?: CashPaymentDetails;
  external_details?: ExternalPaymentDetails;
}

export interface CashPaymentDetails {
  buyer_supplied_money: Money;
  change_back_money?: Money;
}

export interface ExternalPaymentDetails {
  type: string;
  source: string;
  source_id?: string;
  source_fee_money?: Money;
}

export interface CreatePaymentResponse {
  payment?: Payment;
  errors?: SquareError[];
}

export interface CancelPaymentResponse {
  payment?: Payment;
  errors?: SquareError[];
}

export interface CancelPaymentByIdempotencyKeyRequest {
  idempotency_key: string;
}

export interface CancelPaymentByIdempotencyKeyResponse {
  errors?: SquareError[];
}

export interface GetPaymentResponse {
  payment?: Payment;
  errors?: SquareError[];
}

export interface UpdatePaymentRequest {
  payment?: Payment;
  idempotency_key: string;
}

export interface UpdatePaymentResponse {
  payment?: Payment;
  errors?: SquareError[];
}

export interface CompletePaymentRequest {
  idempotency_key?: string;
}

export interface CompletePaymentResponse {
  payment?: Payment;
  errors?: SquareError[];
}

export interface ListPaymentsRequest {
  begin_time?: string;
  end_time?: string;
  sort_order?: string;
  cursor?: string;
  location_id?: string;
  total?: bigint;
  last_4?: string;
  card_brand?: string;
  limit?: number;
}

export interface ListPaymentsResponse {
  payments?: Payment[];
  cursor?: string;
  errors?: SquareError[];
}

// Payment and Order Types
export interface Payment {
  id?: string;
  created_at?: string;
  updated_at?: string;
  amount_money?: Money;
  tip_money?: Money;
  total_money?: Money;
  app_fee_money?: Money;
  approved_money?: Money;
  processing_fee?: ProcessingFee[];
  refunded_money?: Money;
  status?: PaymentStatus;
  delay_duration?: string;
  delay_action?: string;
  delayed_until?: string;
  source_type?: string;
  card_details?: CardPaymentDetails;
  location_id?: string;
  order_id?: string;
  reference_id?: string;
  customer_id?: string;
  employee_id?: string;
  team_member_id?: string;
  refund_ids?: string[];
  risk_evaluation?: RiskEvaluation;
  buyer_email_address?: string;
  billing_address?: Address;
  shipping_address?: Address;
  note?: string;
  statement_description_identifier?: string;
  capabilities?: string[];
  receipt_number?: string;
  receipt_url?: string;
  device_details?: DeviceDetails;
  application_details?: ApplicationDetails;
  version_token?: string;
}

export interface ProcessingFee {
  effective_at?: string;
  type?: string;
  amount_money?: Money;
}

export interface CardPaymentDetails {
  status?: string;
  card?: Card;
  entry_method?: string;
  cvv_status?: string;
  avs_status?: string;
  auth_result_code?: string;
  application_identifier?: string;
  application_name?: string;
  application_cryptogram?: string;
  verification_method?: string;
  verification_results?: string;
  statement_description?: string;
  device_details?: DeviceDetails;
  refund_requires_card_presence?: boolean;
  errors?: SquareError[];
}

export interface Card {
  id?: string;
  card_brand?: string;
  last_4?: string;
  exp_month?: bigint;
  exp_year?: bigint;
  cardholder_name?: string;
  billing_address?: Address;
  fingerprint?: string;
  customer_id?: string;
  merchant_id?: string;
  reference_id?: string;
  enabled?: boolean;
  card_type?: string;
  prepaid_type?: string;
  bin?: string;
}

export interface Address {
  address_line_1?: string;
  address_line_2?: string;
  address_line_3?: string;
  locality?: string;
  sublocality?: string;
  sublocality_2?: string;
  sublocality_3?: string;
  administrative_district_level_1?: string;
  administrative_district_level_2?: string;
  administrative_district_level_3?: string;
  postal_code?: string;
  country?: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
}

export interface Order {
  id?: string;
  location_id: string;
  order_number?: string;
  reference_id?: string;
  source?: OrderSource;
  customer_id?: string;
  line_items?: OrderLineItem[];
  taxes?: OrderLineItemTax[];
  discounts?: OrderLineItemDiscount[];
  service_charges?: OrderServiceCharge[];
  fulfillments?: OrderFulfillment[];
  returns?: OrderReturn[];
  return_amounts?: OrderMoneyAmounts;
  net_amounts?: OrderMoneyAmounts;
  rounding_adjustment?: OrderRoundingAdjustment;
  tenders?: Tender[];
  refunds?: Refund[];
  metadata?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  state?: OrderState;
  version?: number;
  total_money?: Money;
  total_tax_money?: Money;
  total_discount_money?: Money;
  total_tip_money?: Money;
  total_service_charge_money?: Money;
  ticket_name?: string;
  pricing_options?: OrderPricingOptions;
  rewards?: OrderReward[];
}

export interface OrderLineItem {
  uid?: string;
  name?: string;
  quantity: string;
  item_type?: string;
  base_price_money?: Money;
  variation_total_price_money?: Money;
  gross_sales_money?: Money;
  total_tax_money?: Money;
  total_discount_money?: Money;
  total_money?: Money;
  catalog_object_id?: string;
  catalog_version?: bigint;
  variation_name?: string;
  item_variation_data?: CatalogItemVariation;
  modifiers?: OrderLineItemModifier[];
  taxes?: OrderLineItemAppliedTax[];
  discounts?: OrderLineItemAppliedDiscount[];
  applied_service_charges?: OrderLineItemAppliedServiceCharge[];
  metadata?: Record<string, string>;
}

export interface SquareLocationsApiResponse {
  result: {
    locations?: Location[];
  };
  errors?: SquareError[];
}

export interface Location {
  id?: string;
  name?: string;
  address?: Address;
  timezone?: string;
  capabilities?: string[];
  status?: string;
  created_at?: string;
  merchant_id?: string;
  country?: string;
  language_code?: string;
  currency?: string;
  phone_number?: string;
  business_name?: string;
  type?: string;
  website_url?: string;
  business_hours?: BusinessHours;
  business_email?: string;
  description?: string;
  twitter_username?: string;
  instagram_username?: string;
  facebook_url?: string;
  coordinates?: Coordinates;
  logo_url?: string;
  pos_background_url?: string;
  mcc?: string;
  full_format_logo_url?: string;
  tax_ids?: TaxIds;
}

export interface SquareLocationsApi {
  listLocations: () => Promise<SquareLocationsApiResponse>;
}

export interface SquareOrdersApi {
  createOrder: (request: CreateOrderRequest) => Promise<CreateOrderResponse>;
  retrieveOrder: (orderId: string) => Promise<RetrieveOrderResponse>;
  updateOrder: (orderId: string, request: UpdateOrderRequest) => Promise<UpdateOrderResponse>;
  payOrder: (orderId: string, request: PayOrderRequest) => Promise<PayOrderResponse>;
  searchOrders: (request: SearchOrdersRequest) => Promise<SearchOrdersResponse>;
  calculateOrder: (request: CalculateOrderRequest) => Promise<CalculateOrderResponse>;
  cloneOrder: (request: CloneOrderRequest) => Promise<CloneOrderResponse>;
}

export interface SquarePaymentsApi {
  createPayment: (request: CreatePaymentRequest) => Promise<CreatePaymentResponse>;
  cancelPayment: (paymentId: string) => Promise<CancelPaymentResponse>;
  cancelPaymentByIdempotencyKey: (request: CancelPaymentByIdempotencyKeyRequest) => Promise<CancelPaymentByIdempotencyKeyResponse>;
  getPayment: (paymentId: string) => Promise<GetPaymentResponse>;
  updatePayment: (paymentId: string, request: UpdatePaymentRequest) => Promise<UpdatePaymentResponse>;
  completePayment: (paymentId: string, request: CompletePaymentRequest) => Promise<CompletePaymentResponse>;
  listPayments: (request?: ListPaymentsRequest) => Promise<ListPaymentsResponse>;
}

export interface SquareClient {
  catalogApi?: SquareCatalogApi;
  locationsApi?: SquareLocationsApi;
  ordersApi?: SquareOrdersApi;
  paymentsApi?: SquarePaymentsApi;
  customersApi?: any;
  inventoryApi?: any;
  laborApi?: any;
  loyaltyApi?: any;
  giftCardsApi?: any;
  bookingsApi?: any;
  merchantsApi?: any;
  [key: string]: any;
}

// Extend global type for the proxy-based square client
declare global {
  interface ProxySquareClient {
    catalogApi?: SquareCatalogApi;
    locationsApi?: SquareLocationsApi;
    ordersApi?: any;
    paymentsApi?: any;
    [key: string]: any;
  }
}

// Square Tip Settings Interface
export interface SquareTipSettings {
  /** Whether to allow tipping */
  allow_tipping: boolean;
  /** Whether to show tips on a separate screen */
  separate_tip_screen: boolean;
  /** Whether to show a custom tip input field */
  custom_tip_field: boolean;
  /** Array of tip percentages (0-100, max 3 values) */
  tip_percentages: number[];
  /** Whether to use Square's smart tip amounts (overrides tip_percentages if true) */
  smart_tip_amounts: boolean;
}

// Square Checkout Options Interface
export interface SquareCheckoutOptions {
  /** Whether to allow tipping */
  allow_tipping: boolean;
  /** URL to redirect to after successful payment */
  redirect_url: string;
  /** Merchant support email */
  merchant_support_email: string;
  /** Whether to ask for shipping address */
  ask_for_shipping_address: boolean;
  /** Accepted payment methods */
  accepted_payment_methods: {
    apple_pay: boolean;
    google_pay: boolean;
    cash_app_pay: boolean;
    afterpay_clearpay: boolean;
    venmo: boolean;
  };
  /** Custom tip settings */
  tip_settings?: SquareTipSettings;
}

/**
 * Enhanced Catalog API Types for 2025-05-21 Update
 * New modifier customization features and improved control
 */

// Enhanced CatalogModifier with new fields from 2025-05-21
export interface CatalogModifier {
  id?: string;
  name?: string;
  price_money?: Money;
  hidden_online?: boolean; // NEW: Hide modifier from online channels
  on_by_default?: boolean; // NEW: Modifier is selected by default
  ordinal?: number;
  modifier_list_id?: string;
}

// Enhanced CatalogModifierList with new quantity controls
export interface CatalogModifierList {
  id?: string;
  name?: string;
  modifiers?: CatalogModifier[];
  allow_quantities?: boolean; // NEW: Allow quantity input for modifiers
  min_selected_modifiers?: number; // NEW: Minimum required modifiers
  max_selected_modifiers?: number; // NEW: Maximum allowed modifiers
  hidden_from_customer?: boolean; // NEW: Hide entire list from customers
  // Deprecated fields (maintained for backward compatibility)
  selection_type?: 'SINGLE' | 'MULTIPLE';
  max_quantity?: number;
}

// Enhanced CatalogItemModifierListInfo with new controls
export interface CatalogItemModifierListInfo {
  modifier_list_id?: string;
  modifier_overrides?: CatalogModifierOverride[];
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  enabled?: boolean;
  ordinal?: number;
  allow_quantities?: boolean; // NEW: Override quantity settings
  is_conversational?: boolean; // NEW: Enable conversational ordering
  hidden_from_customer_override?: boolean; // NEW: Override visibility settings
  // Deprecated field (maintained for backward compatibility)
  hidden_from_customer?: boolean;
}

// Enhanced CatalogModifierOverride with new override options
export interface CatalogModifierOverride {
  modifier_id?: string;
  hidden_online_override?: boolean; // NEW: Override online visibility
  on_by_default_override?: boolean; // NEW: Override default selection
  // Deprecated fields (maintained for backward compatibility)
  hidden_online?: boolean;
  on_by_default?: boolean;
}

// New Labor API Types for Scheduling (Beta)
export interface ScheduledShift {
  id?: string;
  employee_id?: string;
  location_id?: string;
  start_at?: string;
  end_at?: string;
  wage?: Money;
  breaks?: ScheduledBreak[];
  version?: number;
  created_at?: string;
  updated_at?: string;
  team_member_id?: string;
}

export interface ScheduledBreak {
  id?: string;
  start_at?: string;
  end_at?: string;
  break_type_id?: string;
  name?: string;
  expected_duration?: string;
  is_paid?: boolean;
}

// New Timecard API replacing deprecated Shift API
export interface Timecard {
  id?: string;
  employee_id?: string;
  location_id?: string;
  clockin_time?: string;
  clockout_time?: string;
  clockin_location?: Coordinates;
  clockout_location?: Coordinates;
  breaks?: TimecardBreak[];
  version?: number;
  created_at?: string;
  updated_at?: string;
  team_member_id?: string;
}

export interface TimecardBreak {
  id?: string;
  start_at?: string;
  end_at?: string;
  break_type_id?: string;
  name?: string;
  expected_duration?: string;
  is_paid?: boolean;
}

export interface Coordinates {
  latitude?: number;
  longitude?: number;
}

// Enhanced Gift Card Error Types for Payments API
export interface GiftCardError {
  code: 'GIFT_CARD_AVAILABLE_AMOUNT' | 'INSUFFICIENT_FUNDS';
  detail?: string;
  field?: string;
  available_amount?: Money; // Always returned with insufficient funds errors
}
