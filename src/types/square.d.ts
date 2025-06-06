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
