/**
 * Type guards for common union type patterns
 * This helps with discriminated unions and API response handling
 */

// Common API response types
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Type guard for success responses
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

// Type guard for error responses
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

// Payment response types
export interface PaymentSuccessResponse {
  success: true;
  payment?: any;
  errors?: Array<{
    code: string;
    detail?: string;
    field?: string;
    available_amount?: {
      amount: number;
      currency: string;
    };
  }>;
}

export interface PaymentErrorResponse {
  success: false;
  error?: string;
  errorType?: string;
  errors?: Array<{
    code: string;
    detail?: string;
    field?: string;
    available_amount?: {
      amount: number;
      currency: string;
    };
  }>;
}

export type PaymentResponse = PaymentSuccessResponse | PaymentErrorResponse;

// Payment type guards
export function isPaymentSuccess(
  response: PaymentResponse
): response is PaymentSuccessResponse {
  return response.success === true;
}

export function isPaymentError(
  response: PaymentResponse
): response is PaymentErrorResponse {
  return response.success === false;
}

// Order response types
export interface OrderSuccessResponse {
  success: true;
  orderId: string;
  data?: {
    orderId: string;
    checkoutUrl?: string;
  };
}

export interface OrderErrorResponse {
  success: false;
  error: string;
  orderId?: undefined;
}

export type OrderResponse = OrderSuccessResponse | OrderErrorResponse;

// Order type guards
export function isOrderSuccess(
  response: OrderResponse
): response is OrderSuccessResponse {
  return response.success === true;
}

export function isOrderError(
  response: OrderResponse
): response is OrderErrorResponse {
  return response.success === false;
}

// Profile response types
export interface ProfileSuccessResponse {
  success: true;
  data: {
    profileId: string;
  };
}

export interface ProfileErrorResponse {
  success: false;
  error: string;
}

export type ProfileResponse = ProfileSuccessResponse | ProfileErrorResponse;

// Profile type guards
export function isProfileSuccess(
  response: ProfileResponse
): response is ProfileSuccessResponse {
  return response.success === true;
}

export function isProfileError(
  response: ProfileResponse
): response is ProfileErrorResponse {
  return response.success === false;
}

// Shipping response types
export interface ShippingRate {
  id: string;
  name: string;
  amount: number;
  carrier: string;
  serviceLevelToken: string;
  estimatedDays: number;
  currency: string;
}

export interface AddressValidation {
  isValid: boolean;
  messages: string[];
}

export interface ShippingSuccessResponse {
  success: true;
  rates: ShippingRate[];
  addressValidation?: AddressValidation;
  requiresCustomsDeclaration?: boolean;
}

export interface ShippingErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  errorType?: string;
}

export type ShippingRateResponse = ShippingSuccessResponse | ShippingErrorResponse;

// Shipping type guards
export function isShippingSuccess(
  response: ShippingRateResponse
): response is ShippingSuccessResponse {
  return response.success === true;
}

export function isShippingError(
  response: ShippingRateResponse
): response is ShippingErrorResponse {
  return response.success === false;
}

// Generic utility to assert success response
export function assertSuccessResponse<T>(
  response: ApiResponse<T>
): asserts response is SuccessResponse<T> {
  if (!isSuccessResponse(response)) {
    throw new Error(`Expected success response, got error: ${response.error}`);
  }
}

// Generic utility to assert error response
export function assertErrorResponse<T>(
  response: ApiResponse<T>
): asserts response is ErrorResponse {
  if (!isErrorResponse(response)) {
    throw new Error('Expected error response, got success response');
  }
}

// Helper function to safely access data from response
export function getResponseData<T>(
  response: ApiResponse<T>
): T | null {
  return isSuccessResponse(response) ? response.data : null;
}

// Helper function to safely access error from response
export function getResponseError<T>(
  response: ApiResponse<T>
): string | null {
  return isErrorResponse(response) ? response.error : null;
}

// Validation response types
export interface ValidationSuccessResponse {
  isValid: true;
  currentAmount: number;
  minimumRequired: number;
}

export interface ValidationErrorResponse {
  isValid: false;
  errorMessage: string;
  currentAmount?: number;
  minimumRequired?: number;
}

export type ValidationResponse = ValidationSuccessResponse | ValidationErrorResponse;

// Validation type guards
export function isValidationSuccess(
  response: ValidationResponse
): response is ValidationSuccessResponse {
  return response.isValid === true;
}

export function isValidationError(
  response: ValidationResponse
): response is ValidationErrorResponse {
  return response.isValid === false;
} 