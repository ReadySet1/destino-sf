import { SquareClient, SquareError } from 'square';

// Initialize Square client
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: process.env.NODE_ENV === 'development' ? 'sandbox' : 'production',
});

export async function getOrderDetails(orderId: string) {
  try {
    const response = await client.orders.get({
      orderId: orderId,
    });

    if (!response.order) {
      throw new Error('Order not found');
    }

    return response.order;
  } catch (error) {
    const squareError = error as SquareError;
    console.error('Error retrieving order:', {
      code: squareError.statusCode,
      message: squareError.message,
      body: squareError.body,
    });
    throw error;
  }
}

export default client;
