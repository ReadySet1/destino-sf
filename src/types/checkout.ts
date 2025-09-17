/**
 * Checkout related type definitions
 */

export interface CheckoutFormData {
  email: string;
  name: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentMethod: 'card' | 'gift_card';
  notes?: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  error?: string;
  payment?: any;
  errors?: PaymentError[];
}

export interface PaymentError {
  code: string;
  detail?: string;
  field?: string;
  available_amount?: {
    amount: number;
    currency: string;
  };
}

export interface CheckoutValidation {
  isValid: boolean;
  errorMessage: string | null;
}

export interface OrderSummary {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: CheckoutItem[];
}

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface PaymentRequest {
  sourceId: string;
  orderId: string;
  amountMoney: {
    amount: number;
    currency: string;
  };
  idempotencyKey?: string;
}
