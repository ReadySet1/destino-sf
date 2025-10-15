import * as React from 'react';
import {
  Html,
  Body,
  Head,
  Heading,
  Container,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import { OrderStatusChangeAlertData } from '@/types/alerts';
import { env } from '@/env'; // Import the validated environment configuration

interface OrderStatusChangeAlertProps extends OrderStatusChangeAlertData {
  isCustomer: boolean;
}

export const OrderStatusChangeAlert: React.FC<OrderStatusChangeAlertProps> = ({
  order,
  previousStatus,
  newStatus,
  timestamp,
  isCustomer,
}) => {
  // Clean app URL to prevent double slashes
  const cleanAppUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const formattedTotal = Number(order.total).toFixed(2);
  const formattedTimestamp = timestamp.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusMessages = {
    PENDING: "We've received your order and are preparing it for you.",
    PROCESSING: 'Your order is being processed and will be ready soon.',
    READY: 'Great news! Your order is ready for pickup.',
    COMPLETED: 'Your order has been completed. Thank you for choosing Destino SF!',
    CANCELLED: 'Your order has been cancelled. If you have any questions, please contact us.',
    FULFILLMENT_UPDATED: 'The fulfillment details for your order have been updated.',
    SHIPPING: "Your order is on its way! You'll receive tracking information soon.",
    DELIVERED: 'Your order has been delivered. We hope you enjoy your Argentine treats!',
  };

  const statusColors = {
    PENDING: '#f59e0b',
    PROCESSING: '#3b82f6',
    READY: '#10b981',
    COMPLETED: '#059669',
    CANCELLED: '#ef4444',
    FULFILLMENT_UPDATED: '#6366f1',
    SHIPPING: '#8b5cf6',
    DELIVERED: '#059669',
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      PENDING: '⏳',
      PROCESSING: '🔄',
      READY: '✅',
      COMPLETED: '🎉',
      CANCELLED: '❌',
      FULFILLMENT_UPDATED: '📦',
      SHIPPING: '🚚',
      DELIVERED: '📦✨',
    };
    return icons[status as keyof typeof icons] || '📦';
  };

  const customerMessage =
    statusMessages[newStatus as keyof typeof statusMessages] ||
    `Your order status has been updated to ${newStatus}.`;

  return (
    <Html>
      <Head />
      <Preview>
        Order #{order.id} status updated: {newStatus}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.title}>{getStatusIcon(newStatus)} Order Status Update</Heading>
            <Text style={styles.subtitle}>
              Order #{order.id} • {formattedTimestamp}
            </Text>
          </Section>

          <Section style={styles.statusSection}>
            <Section style={styles.statusCard}>
              <Text style={styles.statusTitle}>Status Changed</Text>
              <Section style={styles.statusFlow}>
                <Section style={styles.statusItem}>
                  <Text style={{ ...styles.statusText, ...styles.oldStatus }}>
                    {previousStatus}
                  </Text>
                </Section>
                <Text style={styles.arrow}>→</Text>
                <Section style={styles.statusItem}>
                  <Text
                    style={{
                      ...styles.statusText,
                      backgroundColor:
                        statusColors[newStatus as keyof typeof statusColors] || '#6b7280',
                      color: '#ffffff',
                    }}
                  >
                    {newStatus}
                  </Text>
                </Section>
              </Section>
            </Section>
          </Section>

          <Section style={styles.messageSection}>
            {isCustomer ? (
              <>
                <Text style={styles.customerGreeting}>Hi {order.customerName},</Text>
                <Text style={styles.customerMessage}>{customerMessage}</Text>
              </>
            ) : (
              <>
                <Text style={styles.adminMessage}>
                  <strong>Admin Alert:</strong> Order #{order.id} status changed from{' '}
                  {previousStatus} to {newStatus}
                </Text>
                <Text style={styles.customerInfo}>
                  Customer: {order.customerName} ({order.email})
                </Text>
              </>
            )}
          </Section>

          <Section style={styles.orderDetails}>
            <Heading as="h3" style={styles.detailsTitle}>
              Order Details
            </Heading>
            <Text style={styles.detailItem}>
              <strong>Order Total:</strong> ${formattedTotal}
            </Text>
            <Text style={styles.detailItem}>
              <strong>Payment Method:</strong> {order.paymentMethod}
            </Text>
            {order.fulfillmentType && (
              <Text style={styles.detailItem}>
                <strong>Fulfillment:</strong> {order.fulfillmentType}
              </Text>
            )}
            {order.pickupTime && (
              <Text style={styles.detailItem}>
                <strong>Pickup Time:</strong>{' '}
                {new Date(order.pickupTime).toLocaleString('en-US', {
                  timeZone: 'America/Los_Angeles',
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
            {order.trackingNumber && (
              <Text style={styles.detailItem}>
                <strong>Tracking Number:</strong> {order.trackingNumber}
              </Text>
            )}
          </Section>

          {isCustomer && newStatus === 'READY' && (
            <Section style={styles.actionSection}>
              <Text style={styles.actionText}>
                🏪 Your order is ready! Please visit us at our location to pick up your delicious
                Argentine treats.
              </Text>
            </Section>
          )}

          {isCustomer && newStatus === 'SHIPPING' && (
            <Section style={styles.actionSection}>
              <Text style={styles.actionText}>
                📦 Your order is on its way! Keep an eye out for tracking updates.
              </Text>
            </Section>
          )}

          {!isCustomer && (
            <Section style={styles.adminActionSection}>
              <Link href={`${cleanAppUrl}/admin/orders/${order.id}`} style={styles.adminButton}>
                View Order in Admin
              </Link>
            </Section>
          )}

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              {isCustomer ? (
                <>
                  Questions about your order? Contact us at{' '}
                  <Link href="mailto:orders@destinosf.com" style={styles.link}>
                    orders@destinosf.com
                  </Link>{' '}
                  or{' '}
                  <Link href="tel:415-525-4448" style={styles.link}>
                    (415) 525-4448
                  </Link>
                </>
              ) : (
                'Automated alert from Destino SF order management system'
              )}
            </Text>
            <Text style={styles.footerText}>Updated at {formattedTimestamp} PST</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles for the email
const styles = {
  body: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f6f9fc',
    margin: '0',
    padding: '20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  header: {
    backgroundColor: '#1f2937',
    padding: '20px',
    textAlign: 'center' as const,
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  subtitle: {
    color: '#d1d5db',
    fontSize: '14px',
    margin: '0',
  },
  statusSection: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  statusCard: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  statusFlow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  statusItem: {
    display: 'inline-block',
  },
  statusText: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
  },
  oldStatus: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  arrow: {
    fontSize: '20px',
    color: '#6b7280',
    margin: '0 8px',
  },
  messageSection: {
    padding: '0 24px 24px 24px',
  },
  customerGreeting: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  customerMessage: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: '0',
  },
  adminMessage: {
    fontSize: '15px',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  customerInfo: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0',
  },
  orderDetails: {
    padding: '0 24px 24px 24px',
    backgroundColor: '#f9fafb',
  },
  detailsTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  detailItem: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '6px 0',
  },
  actionSection: {
    padding: '20px 24px',
    backgroundColor: '#eff6ff',
    textAlign: 'center' as const,
  },
  actionText: {
    fontSize: '15px',
    color: '#1e40af',
    margin: '0',
    fontWeight: '500',
  },
  adminActionSection: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  adminButton: {
    display: 'inline-block',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  footer: {
    padding: '20px 24px',
    backgroundColor: '#f9fafb',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
};

export default OrderStatusChangeAlert;
