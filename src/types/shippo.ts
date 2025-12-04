/**
 * TypeScript interfaces and types for Shippo API integration
 */

// Base Shippo Configuration
export interface ShippoClientConfig {
  apiKeyHeader: string;
  serverURL?: string;
}

// Core Shippo Address Types
export interface ShippoAddress {
  object_id?: string;
  object_state?: 'VALID' | 'INVALID' | 'INCOMPLETE';
  object_purpose?: 'QUOTE' | 'PURCHASE';
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  street3?: string;
  street_no?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  is_residential?: boolean;
  metadata?: string;
  test?: boolean;
  validation_results?: ShippoAddressValidation;
}

export interface ShippoAddressValidation {
  is_valid: boolean;
  messages?: ShippoValidationMessage[];
}

export interface ShippoValidationMessage {
  source?: string;
  code?: string;
  text?: string;
  type?: 'ERROR' | 'WARNING' | 'INFO';
}

// Shippo Parcel Types
export interface ShippoParcel {
  object_id?: string;
  object_owner?: string;
  template?: string;
  length?: string;
  width?: string;
  height?: string;
  distance_unit?: 'cm' | 'in' | 'ft' | 'mm' | 'm' | 'yd';
  weight?: string;
  mass_unit?: 'g' | 'oz' | 'lb' | 'kg';
  value_amount?: string;
  value_currency?: string;
  metadata?: string;
  test?: boolean;
}

// Shippo Shipment Types
export interface ShippoShipment {
  object_id?: string;
  object_owner?: string;
  object_state?: 'VALID' | 'INVALID';
  address_from: ShippoAddress | string;
  address_to: ShippoAddress | string;
  address_return?: ShippoAddress | string;
  parcels: (ShippoParcel | string)[];
  shipment_date?: string;
  extra?: ShippoShipmentExtra;
  customs_declaration?: string;
  rates?: ShippoRate[];
  carrier_accounts?: string[];
  messages?: ShippoValidationMessage[];
  metadata?: string;
  test?: boolean;
}

export interface ShippoShipmentExtra {
  signature_confirmation?: string;
  insurance?: {
    amount: string;
    currency: string;
    provider?: string;
    content?: string;
  };
  reference_1?: string;
  reference_2?: string;
  delivery_confirmation?: string;
  saturday_delivery?: boolean;
  bypass_address_validation?: boolean;
  request_retail_rates?: boolean;
  lasership_attrs?: {
    lasership_declared_value?: string;
  };
  ups_attrs?: {
    ups_billing_option?: string;
    ups_duty_payment?: string;
  };
  fedex_attrs?: {
    fedex_freight_billing?: string;
    fedex_transit_time?: string;
  };
  usps_attrs?: {
    usps_sort_type?: string;
    usps_package_efficiency?: string;
  };
}

// Shippo Rate Types
export interface ShippoRate {
  object_id?: string;
  object_owner?: string;
  shipment?: string;
  attributes?: string[];
  amount?: string;
  currency?: string;
  amount_local?: string;
  currency_local?: string;
  provider?: string;
  provider_image_75?: string;
  provider_image_200?: string;
  servicelevel?: ShippoServiceLevel;
  days?: number;
  arrives_by?: string;
  duration_terms?: string;
  trackable?: boolean;
  insurance_amount?: string;
  insurance_currency?: string;
  delivery_time?: {
    type: 'GUARANTEED' | 'ESTIMATED';
    datetime?: string;
  };
  estimated_days?: number;
  test?: boolean;
  zone?: string;
  messages?: ShippoValidationMessage[];
  carrier_account?: string;
  included_insurance_price?: string;
}

export interface ShippoServiceLevel {
  name?: string;
  token?: string;
  terms?: string;
  extended_token?: string;
}

// Shippo Transaction Types (for label creation)
export interface ShippoTransaction {
  object_id?: string;
  object_state?: 'VALID' | 'INVALID' | 'QUEUED' | 'SUCCESS' | 'ERROR';
  object_status?: 'QUEUED' | 'SUCCESS' | 'ERROR' | 'UNKNOWN';
  object_owner?: string;
  rate?: ShippoRate | string;
  tracking_number?: string;
  tracking_status?: string;
  tracking_url_provider?: string;
  eta?: string;
  label_url?: string;
  commercial_invoice_url?: string;
  qr_code_url?: string;
  messages?: ShippoValidationMessage[];
  order?: string;
  customs_note?: string;
  submission_note?: string;
  metadata?: string;
  test?: boolean;
}

// Carrier Account Types
export interface ShippoCarrierAccount {
  object_id?: string;
  carrier?: string;
  account_id?: string;
  parameters?: Record<string, any>;
  test?: boolean;
  active?: boolean;
  credentials?: Record<string, any>;
}

// Tracking Types
export interface ShippoTrack {
  carrier?: string;
  tracking_number?: string;
  address_from?: ShippoAddress;
  address_to?: ShippoAddress;
  eta?: string;
  servicelevel?: ShippoServiceLevel;
  tracking_status?: ShippoTrackingStatus;
  tracking_history?: ShippoTrackingUpdate[];
  transaction?: string;
  test?: boolean;
}

export interface ShippoTrackingStatus {
  object_created?: string;
  object_updated?: string;
  object_id?: string;
  status?: 'UNKNOWN' | 'DELIVERED' | 'TRANSIT' | 'FAILURE' | 'RETURNED';
  status_details?: string;
  status_date?: string;
  substatus?: ShippoTrackingSubstatus;
  location?: ShippoLocation;
}

export interface ShippoTrackingSubstatus {
  code?: string;
  text?: string;
  action_required?: boolean;
}

export interface ShippoTrackingUpdate {
  object_created?: string;
  object_updated?: string;
  object_id?: string;
  status?: string;
  status_details?: string;
  status_date?: string;
  location?: ShippoLocation;
}

export interface ShippoLocation {
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// Customs Declaration Types
export interface ShippoCustomsDeclaration {
  object_id?: string;
  contents_type?:
    | 'DOCUMENTS'
    | 'GIFT'
    | 'SAMPLE'
    | 'MERCHANDISE'
    | 'HUMANITARIAN_DONATION'
    | 'RETURN_MERCHANDISE'
    | 'OTHER';
  contents_explanation?: string;
  non_delivery_option?: 'ABANDON' | 'RETURN';
  certify?: boolean;
  certify_signer?: string;
  items?: ShippoCustomsItem[];
  invoice?: string;
  license?: string;
  certificate?: string;
  notes?: string;
  eel_pfc?: string;
  aes_itn?: string;
  incoterm?: string;
  metadata?: string;
  test?: boolean;
}

export interface ShippoCustomsItem {
  object_id?: string;
  description?: string;
  quantity?: number;
  net_weight?: string;
  mass_unit?: 'g' | 'oz' | 'lb' | 'kg';
  value_amount?: string;
  value_currency?: string;
  origin_country?: string;
  tariff_number?: string;
  sku?: string;
  hs_code?: string;
  metadata?: string;
  test?: boolean;
}

// API Response Types
export interface ShippoApiResponse<T> {
  results?: T[];
  next?: string;
  previous?: string;
  count?: number;
}

export interface ShippoRateResponse extends ShippoApiResponse<ShippoRate> {
  shipment?: ShippoShipment;
}

// Enhanced Transaction Request/Response Types
export interface ShippoTransactionRequest {
  rate: string | ShippoRate;
  label_file_type?: 'PNG' | 'PDF' | 'PDF_4x6' | 'PDF_A4' | 'PDF_A6' | 'ZPLII';
  async?: boolean;
  metadata?: string;
  submission_type?: 'PICKUP' | 'DROPOFF';
}

export interface ShippoTransactionResponse {
  object_id: string;
  object_state: 'VALID' | 'INVALID' | 'QUEUED' | 'SUCCESS' | 'ERROR';
  object_status: 'QUEUED' | 'SUCCESS' | 'ERROR' | 'UNKNOWN';
  object_owner?: string;
  object_created?: string;
  object_updated?: string;
  was_test: boolean;
  rate?: ShippoRate;
  tracking_number?: string;
  tracking_status?: string;
  tracking_url_provider?: string;
  eta?: string;
  label_url?: string;
  commercial_invoice_url?: string;
  qr_code_url?: string;
  messages?: ShippoValidationMessage[];
  order?: string;
  customs_note?: string;
  submission_note?: string;
  metadata?: string;
  test?: boolean;
}

// Address Validation Types
export interface ShippoAddressValidationRequest {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  is_residential?: boolean;
  validate?: boolean;
}

export interface ShippoAddressValidationResponse {
  object_id: string;
  object_state: 'VALID' | 'INVALID' | 'INCOMPLETE';
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  street_no?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
  is_residential?: boolean;
  validation_results: ShippoAddressValidation;
  was_test: boolean;
  object_created?: string;
  object_updated?: string;
  metadata?: string;
}

// Shipment Creation Types
export interface ShippoShipmentRequest {
  address_from: ShippoAddress | string;
  address_to: ShippoAddress | string;
  address_return?: ShippoAddress | string;
  parcels: (ShippoParcel | string)[];
  shipment_date?: string;
  extra?: ShippoShipmentExtra;
  customs_declaration?: string | ShippoCustomsDeclaration;
  carrier_accounts?: string[];
  async?: boolean;
  metadata?: string;
}

export interface ShippoShipmentResponse {
  object_id: string;
  object_state: 'VALID' | 'INVALID';
  object_owner?: string;
  object_created?: string;
  object_updated?: string;
  was_test: boolean;
  address_from: ShippoAddress;
  address_to: ShippoAddress;
  address_return?: ShippoAddress;
  parcels: ShippoParcel[];
  shipment_date?: string;
  extra?: ShippoShipmentExtra;
  customs_declaration?: ShippoCustomsDeclaration;
  rates: ShippoRate[];
  carrier_accounts?: ShippoCarrierAccount[];
  messages?: ShippoValidationMessage[];
  metadata?: string;
}

// Parcel Template Types
export interface ShippoParcelTemplate {
  name: string;
  token: string;
  length: string;
  width: string;
  height: string;
  distance_unit: 'cm' | 'in' | 'ft' | 'mm' | 'm' | 'yd';
}

// Client API Types
export interface ShippoClientAPI {
  shipments: {
    create: (request: ShippoShipmentRequest) => Promise<ShippoShipmentResponse>;
    retrieve: (shipment_id: string) => Promise<ShippoShipmentResponse>;
    rates: (shipment_id: string) => Promise<ShippoRateResponse>;
  };
  transactions: {
    create: (request: ShippoTransactionRequest) => Promise<ShippoTransactionResponse>;
    retrieve: (transaction_id: string) => Promise<ShippoTransactionResponse>;
    list: (params?: {
      results?: number;
      page?: number;
    }) => Promise<ShippoApiResponse<ShippoTransaction>>;
  };
  addresses: {
    create: (request: ShippoAddressValidationRequest) => Promise<ShippoAddressValidationResponse>;
    retrieve: (address_id: string) => Promise<ShippoAddressValidationResponse>;
    validate: (address_id: string) => Promise<ShippoAddressValidationResponse>;
  };
  parcels: {
    create: (request: ShippoParcel) => Promise<ShippoParcel>;
    retrieve: (parcel_id: string) => Promise<ShippoParcel>;
  };
  tracks: {
    create: (carrier: string, tracking_number: string) => Promise<ShippoTrack>;
    retrieve: (carrier: string, tracking_number: string) => Promise<ShippoTrack>;
  };
  customs: {
    declarations: {
      create: (request: ShippoCustomsDeclaration) => Promise<ShippoCustomsDeclaration>;
      retrieve: (declaration_id: string) => Promise<ShippoCustomsDeclaration>;
    };
    items: {
      create: (request: ShippoCustomsItem) => Promise<ShippoCustomsItem>;
      retrieve: (item_id: string) => Promise<ShippoCustomsItem>;
    };
  };
  carrierAccounts: {
    list: () => Promise<ShippoApiResponse<ShippoCarrierAccount>>;
    retrieve: (account_id: string) => Promise<ShippoCarrierAccount>;
  };
}

export interface ShippingLabelResponse {
  success: boolean;
  /** True when another concurrent process is handling label purchase (not a failure) */
  blockedByConcurrent?: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  error?: string;
  errorCode?: string;
  retryAttempt?: number;
}

/**
 * Discriminated union for different types of Shippo errors
 */
export type ShippoError =
  | { type: 'RATE_EXPIRED'; rateId: string; message: string }
  | { type: 'API_INITIALIZATION'; message: string }
  | {
      type: 'TRANSACTION_FAILED';
      details: string;
      messages?: Array<{ text: string; type: string }>;
    }
  | { type: 'NETWORK_ERROR'; message: string; statusCode?: number }
  | { type: 'VALIDATION_ERROR'; field: string; message: string }
  | { type: 'RETRY_EXHAUSTED'; attempts: number; lastError: string };

/**
 * Type guard to check if error indicates rate expiration
 */
export function isRateExpiredError(error: any): boolean {
  if (typeof error === 'string') {
    const lowerError = error.toLowerCase();
    return (
      lowerError.includes('rate') &&
      (lowerError.includes('expired') ||
        lowerError.includes('not found') ||
        lowerError.includes('invalid'))
    );
  }

  if (error && typeof error === 'object') {
    const message = error.message || error.details || '';
    if (typeof message === 'string') {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes('rate') &&
        (lowerMessage.includes('expired') ||
          lowerMessage.includes('not found') ||
          lowerMessage.includes('invalid'))
      );
    }
  }

  return false;
}

/**
 * Create a ShippoError from an unknown error
 */
export function createShippoError(error: unknown, context?: string): ShippoError {
  if (error instanceof Error) {
    const message = error.message;

    // Check for rate expiration
    if (isRateExpiredError(message)) {
      return {
        type: 'RATE_EXPIRED',
        rateId: '', // Will be filled in by calling code
        message: message,
      };
    }

    // Check for network errors
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('ECONNRESET')
    ) {
      return {
        type: 'NETWORK_ERROR',
        message: message,
      };
    }

    // Check for validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return {
        type: 'VALIDATION_ERROR',
        field: context || 'unknown',
        message: message,
      };
    }

    // Default to transaction failed
    return {
      type: 'TRANSACTION_FAILED',
      details: message,
    };
  }

  // Handle non-Error objects
  const errorMessage = typeof error === 'string' ? error : 'Unknown error occurred';
  return {
    type: 'TRANSACTION_FAILED',
    details: errorMessage,
  };
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};
