// src/lib/square/orders.ts

import squareClient from './client';
import { randomUUID } from 'crypto';

export async function createOrder(orderData: {
  locationId: string;
  lineItems: Array<{
    quantity: string;
    catalogObjectId: string;
    modifiers?: Array<{ catalogObjectId: string; quantity?: string }>;
  }>;
}) {
  try {
    // MODIFIED based on TS error: Use squareClient.orders
    const response = await squareClient.orders.create({
      // <--- Changed based on error
      order: {
        locationId: orderData.locationId,
        lineItems: orderData.lineItems,
      },
      idempotencyKey: randomUUID(),
    });

    if (!response.order) {
      throw new Error('Failed to create order or order data is missing in the response.');
    }
    return response.order;
  } catch (error) {
    console.error('Error creating Square order:', error);
    if (error instanceof Error && 'body' in error) {
      console.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}

export async function createPayment(sourceId: string, orderId: string, amountCents: number) {
  try {
    // MODIFIED based on TS error: Use squareClient.payments
    const response = await squareClient.payments.create({
      // <--- Changed based on error
      sourceId: sourceId,
      orderId: orderId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
    });

    if (!response.payment) {
      throw new Error('Failed to create payment or payment data is missing in the response.');
    }
    return response.payment;
  } catch (error) {
    console.error('Error processing payment:', error);
    if (error instanceof Error && 'body' in error) {
      console.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}
