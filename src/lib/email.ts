import { Order as PrismaOrder } from '@prisma/client';
import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Define payment method type to match Prisma's PaymentMethod enum
type PaymentMethodType = 'SQUARE' | 'VENMO' | 'CASH';

// Extend the Prisma Order type to include paymentMethod
interface OrderWithPaymentMethod extends Omit<PrismaOrder, 'paymentMethod'> {
  paymentMethod: PaymentMethodType;
}

/**
 * Sends an order confirmation email to the customer
 * 
 * @param order The order to send confirmation for
 * @returns Promise that resolves when the email is sent
 */
export async function sendOrderConfirmationEmail(order: OrderWithPaymentMethod): Promise<void> {
  try {
    const paymentInstructions = getPaymentInstructions(order);
    const shopName = process.env.SHOP_NAME || 'Destino SF';
    const fromEmail = process.env.FROM_EMAIL || 'orders@destino-sf.com';
    
    // Create HTML email template
    const emailHtml = createEmailTemplate({
      orderId: order.id,
      customerName: order.customerName,
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      status: order.status,
      shopName: shopName,
      paymentInstructions: paymentInstructions,
    });

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${shopName} <${fromEmail}>`,
      to: order.email,
      subject: `Order Confirmation #${order.id}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending email with Resend:', error);
      throw new Error(error.message);
    }

    console.log('Email sent successfully with Resend ID:', data?.id);
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw the error, just log it to avoid breaking the checkout flow
  }
}

interface EmailTemplateProps {
  orderId: string;
  customerName: string;
  total: number;
  paymentMethod: PaymentMethodType;
  status: string;
  shopName: string;
  paymentInstructions?: string;
}

/**
 * Creates an HTML email template
 */
function createEmailTemplate({
  orderId,
  customerName,
  total,
  paymentMethod,
  status,
  shopName,
  paymentInstructions,
}: EmailTemplateProps): string {
  const formattedTotal = total.toFixed(2);
  const currentYear = new Date().getFullYear();
  
  // Define the payment instructions section
  const paymentInstructionsHtml = paymentInstructions 
    ? `
      <div style="margin-top: 20px; padding: 15px; background-color: ${paymentMethod === 'VENMO' ? '#3D95CE20' : '#4CAF5020'}; border-radius: 5px;">
        <h3 style="margin-top: 0; color: ${paymentMethod === 'VENMO' ? '#3D95CE' : '#4CAF50'};">Payment Instructions</h3>
        <p style="font-size: 16px; line-height: 24px; color: #4a5568;">${paymentInstructions}</p>
      </div>
    ` 
    : '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Order Confirmation - ${shopName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f6f9fc; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2b6cb0; font-size: 28px; margin: 0;">${shopName}</h1>
            <h2 style="font-size: 22px; font-weight: normal; margin: 5px 0 20px;">Order Confirmation</h2>
          </div>
          
          <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 20px;">Order #${orderId}</h2>
            <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 16px;">
              Hi ${customerName},
            </p>
            <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 16px;">
              Thank you for your order! We're processing it now and will keep you updated on its status.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-size: 16px; line-height: 24px;">
                <strong>Order Status:</strong> ${status}
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 24px;">
                <strong>Order Total:</strong> $${formattedTotal}
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 24px;">
                <strong>Payment Method:</strong> ${paymentMethod}
              </p>
            </div>
            
            ${paymentInstructionsHtml}
            
            <p style="font-size: 16px; line-height: 24px; color: #4a5568; margin-bottom: 16px;">
              Please check your account for the most up-to-date information about your order.
              If you have any questions, please contact our customer service.
            </p>
          </div>
          
          <hr style="border-color: #e2e8f0; margin: 20px 0;" />
          
          <div style="text-align: center; color: #a0aec0; font-size: 14px;">
            <p style="margin: 5px 0;">
              This is an automated message, please do not reply directly to this email.
            </p>
            <p style="margin: 5px 0;">
              &copy; ${currentYear} ${shopName}. All rights reserved.
            </p>
            <p style="margin: 5px 0;">
              <a href="https://destino-sf.com" style="color: #3182ce; text-decoration: none;">Visit our website</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Returns payment instructions based on the payment method
 */
function getPaymentInstructions(order: OrderWithPaymentMethod): string {
  const paymentMethod = order.paymentMethod;
  
  switch (paymentMethod) {
    case 'VENMO':
      return `Please complete your payment via Venmo to <strong>@destino-sf</strong> and include your order number <strong>#${order.id}</strong> in the payment note. Your order will be processed once payment is received and verified.`;
    case 'CASH':
      return `Please bring exact cash amount of <strong>$${order.total.toFixed(2)}</strong> when you pick up your order. Your order will be ready according to the selected pickup time.`;
    default:
      return '';
  }
} 