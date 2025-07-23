interface Window {
  Square?: {
    payments: (
      appId: string,
      locationId: string
    ) => {
      card: () => Promise<{
        attach: (selector: string) => Promise<void>;
        tokenize: () => Promise<{
          status: string;
          token?: string;
          errors?: Array<{ message: string }>;
        }>;
        destroy: () => void;
      }>;
    };
  };
}

// Square API Types
export interface SquareCatalogApiResponse {
  result: {
    objects?: any[];
    related_objects?: any[];
    cursor?: string;
    object?: any;
  };
}

export interface SquareCatalogApi {
  searchCatalogObjects: (requestBody: any) => Promise<SquareCatalogApiResponse>;
  retrieveCatalogObject: (objectId: string) => Promise<SquareCatalogApiResponse>;
  listCatalog?: (cursor?: string, objectTypes?: string) => Promise<SquareCatalogApiResponse>;
  testConnection?: () => Promise<{
    success: boolean;
    environment: string;
    apiHost: string;
    error?: string;
  }>;
}

export interface SquareLocationsApiResponse {
  result: {
    locations?: any[];
  };
}

export interface SquareLocationsApi {
  listLocations: () => Promise<SquareLocationsApiResponse>;
}

export interface SquareClient {
  catalogApi?: SquareCatalogApi;
  locationsApi?: SquareLocationsApi;
  ordersApi?: any;
  paymentsApi?: any;
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
