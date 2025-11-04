/**
 * External API Validation Integration Examples
 *
 * This file demonstrates how to integrate runtime validation for external APIs.
 * These examples show the recommended patterns for validating Square and Shippo API responses.
 *
 * @see src/lib/api/validation/external-api-validator.ts for the validation utilities
 */

import { validateExternalApiResponse, validateExternalApiCall } from './external-api-validator';
import { logger } from '@/utils/logger';

// Square schemas
import {
  SquareCatalogApiResponseSchema,
  CatalogObjectSchema,
} from '@/lib/api/schemas/external/square/catalog';
import {
  CreatePaymentResponseSchema,
  GetPaymentResponseSchema,
} from '@/lib/api/schemas/external/square/payments';
import {
  CreateOrderResponseSchema,
  SearchOrdersResponseSchema,
} from '@/lib/api/schemas/external/square/orders';

// Shippo schemas
import {
  ShippoShipmentResponseSchema,
  ShippoTransactionResponseSchema,
  ShippoTrackSchema,
} from '@/lib/api/schemas/external/shippo';

// ============================================================
// Square Catalog API Integration
// ============================================================

/**
 * Example: Validate Square Catalog list response
 */
export async function exampleSquareCatalogList(squareClient: any) {
  try {
    const response = await squareClient.catalogApi.listCatalog();

    // Validate the response
    const validation = validateExternalApiResponse(
      response.result,
      SquareCatalogApiResponseSchema,
      {
        apiName: 'Square Catalog API',
        operation: 'listCatalog',
        requestId: response.headers?.['square-request-id'],
        context: {
          itemCount: response.result?.objects?.length || 0,
        },
      }
    );

    if (!validation.success) {
      // Validation failed, but we can still use the data
      // The failure has been logged for monitoring
      logger.warn('Square Catalog response validation failed, proceeding with unvalidated data');
    }

    // Return the data regardless of validation result (non-blocking)
    return response.result;
  } catch (error) {
    throw error;
  }
}

/**
 * Example: Validate individual catalog object
 */
export function exampleValidateCatalogObject(catalogObject: unknown) {
  const validation = validateExternalApiResponse(catalogObject, CatalogObjectSchema, {
    apiName: 'Square Catalog API',
    operation: 'validateCatalogObject',
    context: {
      objectId: (catalogObject as any)?.id,
      objectType: (catalogObject as any)?.type,
    },
  });

  return validation.data || catalogObject;
}

// ============================================================
// Square Payments API Integration
// ============================================================

/**
 * Example: Validate Square payment creation response
 */
export async function exampleSquareCreatePayment(squareClient: any, paymentRequest: any) {
  const validation = await validateExternalApiCall(
    async () => {
      const response = await squareClient.paymentsApi.createPayment(paymentRequest);
      return response.result;
    },
    CreatePaymentResponseSchema,
    {
      apiName: 'Square Payments API',
      operation: 'createPayment',
      context: {
        amount: paymentRequest.amountMoney?.amount,
        currency: paymentRequest.amountMoney?.currency,
        idempotencyKey: paymentRequest.idempotencyKey,
      },
    }
  );

  if (!validation.success) {
    logger.warn('Payment creation response validation failed');
  }

  return validation.data;
}

/**
 * Example: Validate Square payment retrieval
 */
export async function exampleSquareGetPayment(squareClient: any, paymentId: string) {
  try {
    const response = await squareClient.paymentsApi.getPayment(paymentId);

    const validation = validateExternalApiResponse(response.result, GetPaymentResponseSchema, {
      apiName: 'Square Payments API',
      operation: 'getPayment',
      context: {
        paymentId,
      },
    });

    return validation.data || response.result;
  } catch (error) {
    throw error;
  }
}

// ============================================================
// Square Orders API Integration
// ============================================================

/**
 * Example: Validate Square order creation
 */
export async function exampleSquareCreateOrder(squareClient: any, orderRequest: any) {
  const validation = await validateExternalApiCall(
    async () => {
      const response = await squareClient.ordersApi.createOrder(orderRequest);
      return response.result;
    },
    CreateOrderResponseSchema,
    {
      apiName: 'Square Orders API',
      operation: 'createOrder',
      context: {
        locationId: orderRequest.order?.locationId,
        idempotencyKey: orderRequest.idempotencyKey,
        lineItemCount: orderRequest.order?.lineItems?.length || 0,
      },
    }
  );

  return validation.data;
}

/**
 * Example: Validate Square orders search
 */
export async function exampleSquareSearchOrders(squareClient: any, searchRequest: any) {
  try {
    const response = await squareClient.ordersApi.searchOrders(searchRequest);

    const validation = validateExternalApiResponse(response.result, SearchOrdersResponseSchema, {
      apiName: 'Square Orders API',
      operation: 'searchOrders',
      context: {
        locationIds: searchRequest.locationIds,
        orderCount: response.result?.orders?.length || 0,
      },
    });

    if (!validation.success) {
      logger.warn('Orders search validation failed, proceeding with unvalidated data');
    }

    return response.result;
  } catch (error) {
    throw error;
  }
}

// ============================================================
// Shippo Shipments API Integration
// ============================================================

/**
 * Example: Validate Shippo shipment creation
 */
export async function exampleShippoCreateShipment(shippoClient: any, shipmentRequest: any) {
  const validation = await validateExternalApiCall(
    async () => {
      const response = await shippoClient.shipment.create(shipmentRequest);
      return response;
    },
    ShippoShipmentResponseSchema,
    {
      apiName: 'Shippo Shipments API',
      operation: 'createShipment',
      context: {
        addressFrom: shipmentRequest.address_from,
        addressTo: shipmentRequest.address_to,
        parcelCount: shipmentRequest.parcels?.length || 0,
      },
    }
  );

  if (!validation.success) {
    logger.warn('Shipment creation validation failed');
  }

  return validation.data;
}

/**
 * Example: Validate Shippo shipment retrieval
 */
export async function exampleShippoGetShipment(shippoClient: any, shipmentId: string) {
  try {
    const response = await shippoClient.shipment.retrieve(shipmentId);

    const validation = validateExternalApiResponse(response, ShippoShipmentResponseSchema, {
      apiName: 'Shippo Shipments API',
      operation: 'getShipment',
      context: {
        shipmentId,
        objectState: response.object_state,
        rateCount: response.rates?.length || 0,
      },
    });

    return validation.data || response;
  } catch (error) {
    throw error;
  }
}

// ============================================================
// Shippo Transactions API Integration
// ============================================================

/**
 * Example: Validate Shippo transaction (label purchase)
 */
export async function exampleShippoCreateTransaction(shippoClient: any, transactionRequest: any) {
  const validation = await validateExternalApiCall(
    async () => {
      const response = await shippoClient.transaction.create(transactionRequest);
      return response;
    },
    ShippoTransactionResponseSchema,
    {
      apiName: 'Shippo Transactions API',
      operation: 'createTransaction',
      context: {
        rateId: transactionRequest.rate,
        labelFileType: transactionRequest.label_file_type,
      },
    }
  );

  if (!validation.success) {
    logger.warn('Transaction creation validation failed');
  }

  return validation.data;
}

/**
 * Example: Validate Shippo transaction retrieval
 */
export async function exampleShippoGetTransaction(shippoClient: any, transactionId: string) {
  try {
    const response = await shippoClient.transaction.retrieve(transactionId);

    const validation = validateExternalApiResponse(response, ShippoTransactionResponseSchema, {
      apiName: 'Shippo Transactions API',
      operation: 'getTransaction',
      context: {
        transactionId,
        objectState: response.object_state,
        trackingNumber: response.tracking_number,
      },
    });

    return validation.data || response;
  } catch (error) {
    throw error;
  }
}

// ============================================================
// Shippo Tracking API Integration
// ============================================================

/**
 * Example: Validate Shippo tracking information
 */
export async function exampleShippoGetTracking(
  shippoClient: any,
  carrier: string,
  trackingNumber: string
) {
  try {
    const response = await shippoClient.track.get(carrier, trackingNumber);

    const validation = validateExternalApiResponse(response, ShippoTrackSchema, {
      apiName: 'Shippo Tracking API',
      operation: 'getTracking',
      context: {
        carrier,
        trackingNumber,
        trackingStatus: response.tracking_status?.status,
      },
    });

    if (!validation.success) {
      logger.warn('Tracking validation failed, proceeding with unvalidated data');
    }

    return response;
  } catch (error) {
    throw error;
  }
}

// ============================================================
// Pattern: Wrapper Function for Consistent Validation
// ============================================================

/**
 * Example: Create a wrapper for consistent Square API validation
 */
export function createSquareApiWrapper(squareClient: any) {
  return {
    catalog: {
      list: async () => {
        const response = await squareClient.catalogApi.listCatalog();
        const validation = validateExternalApiResponse(
          response.result,
          SquareCatalogApiResponseSchema,
          {
            apiName: 'Square Catalog API',
            operation: 'listCatalog',
          }
        );
        return validation.data || response.result;
      },
    },
    payments: {
      create: async (request: any) => {
        const validation = await validateExternalApiCall(
          async () => {
            const response = await squareClient.paymentsApi.createPayment(request);
            return response.result;
          },
          CreatePaymentResponseSchema,
          {
            apiName: 'Square Payments API',
            operation: 'createPayment',
          }
        );
        return validation.data;
      },
      get: async (paymentId: string) => {
        const response = await squareClient.paymentsApi.getPayment(paymentId);
        const validation = validateExternalApiResponse(
          response.result,
          GetPaymentResponseSchema,
          {
            apiName: 'Square Payments API',
            operation: 'getPayment',
          }
        );
        return validation.data || response.result;
      },
    },
  };
}

/**
 * Example: Create a wrapper for consistent Shippo API validation
 */
export function createShippoApiWrapper(shippoClient: any) {
  return {
    shipment: {
      create: async (request: any) => {
        const validation = await validateExternalApiCall(
          async () => shippoClient.shipment.create(request),
          ShippoShipmentResponseSchema,
          {
            apiName: 'Shippo Shipments API',
            operation: 'createShipment',
          }
        );
        return validation.data;
      },
      get: async (shipmentId: string) => {
        const response = await shippoClient.shipment.retrieve(shipmentId);
        const validation = validateExternalApiResponse(response, ShippoShipmentResponseSchema, {
          apiName: 'Shippo Shipments API',
          operation: 'getShipment',
        });
        return validation.data || response;
      },
    },
    transaction: {
      create: async (request: any) => {
        const validation = await validateExternalApiCall(
          async () => shippoClient.transaction.create(request),
          ShippoTransactionResponseSchema,
          {
            apiName: 'Shippo Transactions API',
            operation: 'createTransaction',
          }
        );
        return validation.data;
      },
    },
    track: {
      get: async (carrier: string, trackingNumber: string) => {
        const response = await shippoClient.track.get(carrier, trackingNumber);
        const validation = validateExternalApiResponse(response, ShippoTrackSchema, {
          apiName: 'Shippo Tracking API',
          operation: 'getTracking',
        });
        return validation.data || response;
      },
    },
  };
}
