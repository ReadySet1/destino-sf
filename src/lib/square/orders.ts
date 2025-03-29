import squareClient from './client';
import { randomUUID } from 'crypto';

export async function createOrder(orderData: {
  locationId: string;
  lineItems: Array<{
    quantity: string;
    catalogObjectId: string;
    modifiers?: Array<{ catalogObjectId: string }>;
  }>;
}) {
  try {
    const response = await squareClient.ordersApi.createOrder({
      order: {
        locationId: orderData.locationId,
        lineItems: orderData.lineItems,
        idempotencyKey: randomUUID()
      }
    });
    
    return response.result.order!;
  } catch (error) {
    console.error('Error creating Square order:', error);
    throw error;
  }
}

export async function createPayment(
  sourceId: string, 
  orderId: string, 
  amountCents: number
) {
  try {
    const response = await squareClient.paymentsApi.createPayment({
      sourceId,
      orderId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD'
      }
    });
    
    return response.result.payment!;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}
