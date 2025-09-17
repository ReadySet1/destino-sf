/**
 * Square payment processing utilities
 * Placeholder implementation for test compatibility
 */

export interface PaymentResult {
  success: boolean;
  payment?: any;
  error?: string;
  errorType?: string;
}

export async function processPayment(
  sourceId: string,
  orderId: string,
  amountMoney: { amount: number; currency: string }
): Promise<PaymentResult> {
  // Placeholder implementation
  return {
    success: true,
    payment: {
      id: 'payment-123',
      status: 'COMPLETED',
      amountMoney,
    },
  };
}
