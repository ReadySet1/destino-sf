export interface AdminNotificationData {
  type: 'new_order' | 'order_status_change' | 'low_inventory' | 'system_alert';
  data: {
    orderId?: string;
    customerEmail?: string;
    total?: number;
    [key: string]: any;
  };
}

export interface EmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendAdminNotificationEmail(notificationData: AdminNotificationData): Promise<EmailResult> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { subject, html } = generateNotificationContent(notificationData);

    const result = await resend.emails.send({
      from: 'alerts@destinosf.com',
      to: [process.env.ADMIN_EMAIL || 'admin@destinosf.com'],
      subject,
      html,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message
      };
    }

    return {
      success: true,
      emailId: result.data?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send admin notification'
    };
  }
}

function generateNotificationContent(data: AdminNotificationData): { subject: string; html: string } {
  switch (data.type) {
    case 'new_order':
      return {
        subject: `New Order Received - ${data.data.orderId}`,
        html: `
          <h1>New Order Received</h1>
          <p>Order ID: <strong>${data.data.orderId}</strong></p>
          <p>Customer: ${data.data.customerEmail}</p>
          <p>Total: $${data.data.total?.toFixed(2)}</p>
        `
      };
    default:
      return {
        subject: 'System Notification',
        html: '<p>System notification received</p>'
      };
  }
}
