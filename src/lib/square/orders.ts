// src/lib/square/orders.ts

import { client, ordersApi, paymentsApi } from './client';
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
    const response = await ordersApi.createOrder({
      order: {
        locationId: orderData.locationId,
        lineItems: orderData.lineItems,
      },
      idempotencyKey: randomUUID(),
    });

    if (!response.result?.order) {
      throw new Error('Failed to create order or order data is missing in the response.');
    }
    return response.result.order;
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
    const response = await paymentsApi.createPayment({
      sourceId: sourceId,
      orderId: orderId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
    });

    if (!response.result?.payment) {
      throw new Error('Failed to create payment or payment data is missing in the response.');
    }
    return response.result.payment;
  } catch (error) {
    console.error('Error processing payment:', error);
    if (error instanceof Error && 'body' in error) {
      console.error('Square API Error Body:', (error as { body: unknown }).body);
    }
    throw error;
  }
}
