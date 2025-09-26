export interface OrderConfirmationEmailData {
  to: string;
  orderData: {
    id: string;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
}

export interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationEmailData): Promise<EmailResult> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: 'orders@destinosf.com',
      to: [data.to],
      subject: 'Order Confirmation - Destino SF',
      html: generateOrderConfirmationHtml(data.orderData),
    });

    return {
      success: true,
      emailId: result.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
}

function generateOrderConfirmationHtml(orderData: { id: string; total: number; items: any[] }): string {
  const itemsHtml = orderData.items.map(item => 
    `<li>${item.name} x ${item.quantity} - $${item.price.toFixed(2)}</li>`
  ).join('');

  return `
    <h1>Order Confirmation</h1>
    <p>Thank you for your order! Your order ID is: <strong>${orderData.id}</strong></p>
    <h3>Order Items:</h3>
    <ul>${itemsHtml}</ul>
    <p><strong>Total: $${orderData.total.toFixed(2)}</strong></p>
  `;
}
