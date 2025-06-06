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
  testConnection?: () => Promise<{ success: boolean; environment: string; apiHost: string; error?: string }>;
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
