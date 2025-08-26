import { Order as PrismaOrder } from '@prisma/client';
import { Resend } from 'resend';
import { getRecipientEmail } from './email-routing';
import { db } from './db';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Define payment method type to match Prisma's PaymentMethod enum
type PaymentMethodType = 'SQUARE' | 'CASH';

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
      <div style="margin-top: 20px; padding: 15px; background-color: ${paymentMethod === 'CASH' ? '#4CAF5020' : '#f5f5f5'}; border-radius: 5px;">
        <h3 style="margin-top: 0; color: ${paymentMethod === 'CASH' ? '#4CAF50' : '#666'};">Payment Instructions</h3>
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
    case 'CASH':
      return `Please bring exact change for your order. Your order total is <strong>$${order.total}</strong>. Cash payment will be collected at pickup.`;
    default:
      return '';
  }
}

/**
 * Sends admin notification email for new catering orders
 */
export async function sendCateringOrderNotification(orderId: string): Promise<void> {
  try {
    // Fetch the order with items
    const order = await db.cateringOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error(`Catering order ${orderId} not found`);
    }

    // Get the admin email based on alert type
    const adminEmail = getRecipientEmail('CATERING_INQUIRY_RECEIVED' as any);
    
    // Parse delivery address if it exists
    const deliveryAddress = order.deliveryAddressJson 
      ? (typeof order.deliveryAddressJson === 'string' 
          ? JSON.parse(order.deliveryAddressJson)
          : order.deliveryAddressJson)
      : null;

    const shopName = process.env.SHOP_NAME || 'Destino SF';
    const fromEmail = process.env.FROM_EMAIL || 'orders@destino-sf.com';

    // Send email to admin - using HTML template instead of React component for now
    const { data, error } = await resend.emails.send({
      from: `${shopName} <${fromEmail}>`,
      to: adminEmail,
      subject: `New Catering Order #${order.id} - $${order.totalAmount.toFixed(2)}`,
      html: createCateringAdminEmailHtml({
        orderId: order.id,
        customerName: order.name,
        customerEmail: order.email,
        customerPhone: order.phone,
        eventDate: order.eventDate.toISOString(),
        totalAmount: Number(order.totalAmount),
        numberOfPeople: order.numberOfPeople,
        items: order.items.map(item => ({
          name: item.itemName,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
        })),
        deliveryAddress,
        paymentMethod: order.paymentMethod,
        specialRequests: order.specialRequests || undefined,
        deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : 0,
      }),
    });

    if (error) {
      console.error('Error sending catering notification email:', error);
      throw new Error(error.message);
    }

    console.log('Catering notification email sent successfully:', data?.id);
    
    // Also send confirmation to customer
    await sendCateringConfirmationToCustomer(order);
  } catch (error) {
    console.error('Failed to send catering notification email:', error);
    // Don't throw to avoid breaking the order flow
  }
}

/**
 * Sends order confirmation email to customer for catering orders
 */
async function sendCateringConfirmationToCustomer(order: any): Promise<void> {
  try {
    const shopName = process.env.SHOP_NAME || 'Destino SF';
    const fromEmail = process.env.FROM_EMAIL || 'orders@destino-sf.com';
    
    const formattedEventDate = new Date(order.eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const { data, error } = await resend.emails.send({
      from: `${shopName} <${fromEmail}>`,
      to: order.email,
      subject: `Catering Order Confirmation #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Catering Order Confirmation - ${shopName}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background-color: #d97706; padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">
                  🍽️ Order Confirmed!
                </h1>
                <p style="color: #fef3c7; font-size: 14px; margin: 0;">
                  Catering Order #${order.id}
                </p>
              </div>

              <!-- Content -->
              <div style="padding: 24px;">
                
                <!-- Thank You Section -->
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                  <h2 style="margin: 0 0 16px 0; color: #92400e; font-size: 20px;">Thank you for your catering order!</h2>
                  <p style="margin: 0; color: #92400e; font-size: 16px;">
                    Thank you, ${order.name}! We've received your catering order and will review it shortly.
                  </p>
                </div>

                <!-- Order Details -->
                <div style="background-color: #fefce8; border: 1px solid #facc15; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #713f12; font-size: 18px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">📋 Order Details</h3>
                  
                  <div style="margin: 8px 0;">
                    <span style="font-weight: 600; color: #713f12;">Event Date:</span>
                    <span style="color: #713f12; margin-left: 8px;">${formattedEventDate}</span>
                  </div>
                  
                  <div style="margin: 8px 0;">
                    <span style="font-weight: 600; color: #713f12;">Number of People:</span>
                    <span style="color: #713f12; margin-left: 8px;">${order.numberOfPeople}</span>
                  </div>
                  
                  <div style="margin: 8px 0;">
                    <span style="font-weight: 600; color: #713f12;">Total Amount:</span>
                    <span style="color: #d97706; font-weight: bold; margin-left: 8px;">$${order.totalAmount.toFixed(2)}</span>
                  </div>
                  
                  <div style="margin: 8px 0;">
                    <span style="font-weight: 600; color: #713f12;">Payment Method:</span>
                    <span style="color: #713f12; margin-left: 8px;">${order.paymentMethod === 'SQUARE' ? 'Credit Card' : order.paymentMethod}</span>
                  </div>
                  
                  ${order.specialRequests ? `
                  <div style="margin: 8px 0;">
                    <span style="font-weight: 600; color: #713f12;">Special Requests:</span>
                    <span style="color: #713f12; margin-left: 8px;">${order.specialRequests}</span>
                  </div>
                  ` : ''}
                </div>

                <!-- Order Items -->
                ${order.items && order.items.length > 0 ? `
                <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 16px 0; color: #495057; font-size: 18px; border-bottom: 2px solid #6c757d; padding-bottom: 8px;">🍽️ Order Items</h3>
                  <div style="background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e9ecef;">
                    
                    <!-- Table Header -->
                    <div style="background-color: #e9ecef; padding: 12px; border-bottom: 1px solid #dee2e6;">
                      <div style="display: table; width: 100%; table-layout: fixed;">
                        <div style="display: table-cell; width: 50%; font-weight: bold; color: #495057; font-size: 14px;">Item</div>
                        <div style="display: table-cell; width: 25%; text-align: center; font-weight: bold; color: #495057; font-size: 14px;">Qty</div>
                        <div style="display: table-cell; width: 25%; text-align: right; font-weight: bold; color: #495057; font-size: 14px;">Total</div>
                      </div>
                    </div>
                    
                    <!-- Table Items -->
                    ${order.items.map((item: any) => `
                      <div style="padding: 12px; border-bottom: 1px solid #f1f3f4; last-child:border-bottom: none;">
                        <div style="display: table; width: 100%; table-layout: fixed;">
                          <div style="display: table-cell; width: 50%; color: #495057; font-size: 14px; vertical-align: middle;">${item.itemName || item.name || 'Unknown Item'}</div>
                          <div style="display: table-cell; width: 25%; text-align: center; color: #6c757d; font-size: 14px; vertical-align: middle;">${item.quantity}</div>
                          <div style="display: table-cell; width: 25%; text-align: right; color: #495057; font-size: 14px; font-weight: 500; vertical-align: middle;">$${((item.totalPrice || (item.pricePerUnit * item.quantity)) || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    `).join('')}
                    
                  </div>
                </div>
                ` : ''}

                <!-- Next Steps -->
                <div style="background-color: #fff3cd; border: 1px solid #fbbf24; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">📞 What's Next?</h3>
                  <p style="margin: 0; color: #92400e; line-height: 1.5;">
                    Our team will contact you within 24 hours to confirm the details and discuss any special arrangements for your event.
                  </p>
                </div>

                <!-- Contact Info -->
                <div style="text-align: center; padding: 20px 0;">
                  <p style="font-size: 14px; color: #6b7280; margin: 8px 0;">
                    Questions about your order?
                  </p>
                  <p style="font-size: 14px; color: #6b7280; margin: 8px 0;">
                    Call us at <a href="tel:+14155551234" style="color: #d97706; text-decoration: none;">(415) 555-1234</a>
                    or email <a href="mailto:catering@destino-sf.com" style="color: #d97706; text-decoration: none;">catering@destino-sf.com</a>
                  </p>
                </div>

              </div>

              <!-- Footer -->
              <div style="padding: 20px 24px; background-color: #f9fafb; text-align: center;">
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">
                  This is an automated message, please do not reply directly to this email.
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">
                  &copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.
                </p>
                <p style="font-size: 12px; margin: 4px 0;">
                  <a href="https://destino-sf.com" style="color: #d97706; text-decoration: none;">Visit our website</a>
                </p>
              </div>

            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Error sending customer catering confirmation:', error);
    } else {
      console.log('Customer catering confirmation sent successfully:', data?.id);
    }
  } catch (error) {
    console.error('Failed to send customer catering confirmation:', error);
  }
}

/**
 * Creates HTML email for catering admin notification
 */
function createCateringAdminEmailHtml(data: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventDate: string;
  totalAmount: number;
  numberOfPeople: number;
  items: Array<{
    name: string;
    quantity: number;
    pricePerUnit: number;
  }>;
  deliveryAddress?: any;
  paymentMethod: string;
  specialRequests?: string;
  deliveryFee: number;
}): string {
  const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
  const formattedEventDate = new Date(data.eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'SQUARE': return 'Credit Card (Square)';
      case 'CASH': return 'Cash';
      case 'VENMO': return 'Venmo';
      default: return method;
    }
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>New Catering Order - Destino SF</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background-color: #d97706; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 8px 0;">
              🍽️ New Catering Order!
            </h1>
            <p style="color: #fef3c7; font-size: 14px; margin: 0;">
              Order #${data.orderId} - $${data.totalAmount.toFixed(2)}
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 24px;">
            
            <!-- Customer Information -->
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0 0 16px 0; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                👤 Customer Information
              </h2>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Customer:</span>
                <span style="color: #1f2937;">${data.customerName}</span>
              </div>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Email:</span>
                <a href="mailto:${data.customerEmail}" style="color: #d97706; text-decoration: none;">${data.customerEmail}</a>
              </div>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Phone:</span>
                <a href="tel:${data.customerPhone}" style="color: #d97706; text-decoration: none;">${data.customerPhone}</a>
              </div>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Event Date:</span>
                <span style="color: #1f2937;">${formattedEventDate}</span>
              </div>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">People:</span>
                <span style="color: #1f2937;">${data.numberOfPeople}</span>
              </div>
              
              ${data.specialRequests ? `
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Special Requests:</span>
                <span style="color: #1f2937;">${data.specialRequests}</span>
              </div>
              ` : ''}
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #6b7280; width: 30%; display: inline-block;">Payment:</span>
                <span style="color: #1f2937;">${formatPaymentMethod(data.paymentMethod)}</span>
              </div>
            </div>

            ${data.deliveryAddress ? `
            <!-- Delivery Information -->
            <div style="margin-bottom: 24px; background-color: #fef3c7; padding: 16px; border-radius: 6px; border: 1px solid #f59e0b;">
              <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0 0 16px 0; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                🚚 Delivery Information
              </h2>
              
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #92400e; width: 30%; display: inline-block;">Address:</span>
                <span style="color: #92400e;">
                  ${data.deliveryAddress.street}
                  ${data.deliveryAddress.street2 ? `<br/>${data.deliveryAddress.street2}` : ''}
                  <br/>
                  ${data.deliveryAddress.city}, ${data.deliveryAddress.state} ${data.deliveryAddress.postalCode}
                </span>
              </div>
              
              ${data.deliveryAddress.deliveryDate && data.deliveryAddress.deliveryTime ? `
              <div style="margin: 8px 0;">
                <span style="font-weight: 600; color: #92400e; width: 30%; display: inline-block;">Delivery:</span>
                <span style="color: #92400e;">${data.deliveryAddress.deliveryDate} at ${data.deliveryAddress.deliveryTime}</span>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Order Items -->
            <div style="margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: bold; color: #1f2937; margin: 0 0 16px 0; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                🍽️ Order Items
              </h2>
              
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <!-- Table Header -->
                <div style="background-color: #fef3c7; padding: 12px; display: flex;">
                  <div style="width: 40%; font-weight: bold; color: #92400e;">Item</div>
                  <div style="width: 15%; font-weight: bold; color: #92400e; text-align: center;">Qty</div>
                  <div style="width: 22.5%; font-weight: bold; color: #92400e; text-align: center;">Price</div>
                  <div style="width: 22.5%; font-weight: bold; color: #92400e; text-align: center;">Total</div>
                </div>

                <!-- Table Items -->
                ${data.items.map(item => `
                  <div style="border-bottom: 1px solid #f3f4f6; padding: 8px 12px; display: flex;">
                    <div style="width: 40%; color: #1f2937;">${item.name}</div>
                    <div style="width: 15%; color: #1f2937; text-align: center;">${item.quantity}</div>
                    <div style="width: 22.5%; color: #1f2937; text-align: center;">$${item.pricePerUnit.toFixed(2)}</div>
                    <div style="width: 22.5%; color: #1f2937; text-align: center;">$${(item.quantity * item.pricePerUnit).toFixed(2)}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Order Summary -->
            <div style="background-color: #fefce8; border: 1px solid #facc15; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: #713f12;">Subtotal:</span>
                <span style="color: #713f12; font-weight: 600;">$${subtotal.toFixed(2)}</span>
              </div>
              
              ${data.deliveryFee > 0 ? `
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="color: #713f12;">Delivery Fee:</span>
                <span style="color: #713f12; font-weight: 600;">$${data.deliveryFee.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <hr style="border-color: #facc15; margin: 8px 0;" />
              
              <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                <span style="font-weight: bold; color: #713f12;">Total:</span>
                <span style="font-weight: bold; color: #d97706;">$${data.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <!-- Action Items -->
            <div style="background-color: #fff3cd; border: 1px solid #fbbf24; padding: 16px; border-radius: 6px;">
              <h3 style="font-size: 16px; font-weight: bold; color: #92400e; margin: 0 0 12px 0;">📋 Next Steps</h3>
              <div style="font-size: 14px; color: #92400e; line-height: 20px;">
                • Review order details and confirm availability<br/>
                • Contact customer to confirm event details<br/>
                • Update order status in admin panel<br/>
                • Schedule preparation and delivery/pickup
              </div>
            </div>

          </div>

          <!-- Footer -->
          <div style="padding: 20px 24px; background-color: #f9fafb; text-align: center;">
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">
              This is an automated notification from your Destino SF catering system.
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 4px 0;">
              Received at ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST
            </p>
          </div>

        </div>
      </body>
    </html>
  `;
}
