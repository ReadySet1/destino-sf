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
import { env } from '@/env';
import { EmailHeader } from '../shared/EmailHeader';
import { EmailFooter } from '../shared/EmailFooter';
import {
  emailColors,
  emailFonts,
  emailSpacing,
  emailFontSizes,
  emailBorderRadius,
  emailLineHeights,
  baseBodyStyle,
  baseContainerStyle,
  primaryButtonStyle,
  linkStyle,
} from '../shared/email-styles';

interface OrderStatusChangeAlertProps extends OrderStatusChangeAlertData {
  isCustomer: boolean;
}

// Status colors using brand palette
const statusColors: Record<string, { backgroundColor: string; color: string }> = {
  PENDING: { backgroundColor: emailColors.primaryLight, color: emailColors.warningDark },
  PROCESSING: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark },
  READY: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
  COMPLETED: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
  CANCELLED: { backgroundColor: emailColors.errorLight, color: emailColors.errorDark },
  FULFILLMENT_UPDATED: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark },
  SHIPPING: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark },
  DELIVERED: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
};

const statusMessages: Record<string, string> = {
  PENDING: "We've received your order and are preparing it for you.",
  PROCESSING: 'Your order is being processed and will be ready soon.',
  READY: 'Great news! Your order is ready for pickup.',
  COMPLETED: 'Your order has been completed. Thank you for choosing Destino SF!',
  CANCELLED: 'Your order has been cancelled. If you have any questions, please contact us.',
  FULFILLMENT_UPDATED: 'The fulfillment details for your order have been updated.',
  SHIPPING: "Your order is on its way! You'll receive tracking information soon.",
  DELIVERED: 'Your order has been delivered. We hope you enjoy your Argentine treats!',
};

const statusIcons: Record<string, string> = {
  PENDING: '⏳',
  PROCESSING: '🔄',
  READY: '✅',
  COMPLETED: '🎉',
  CANCELLED: '❌',
  FULFILLMENT_UPDATED: '📦',
  SHIPPING: '🚚',
  DELIVERED: '📦',
};

// Styles using design tokens
const styles = {
  statusSection: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  statusTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  statusSubtitle: {
    fontSize: emailFontSizes.md,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  statusCard: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
    textAlign: 'center' as const,
  },
  statusFlowTitle: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.lg} 0`,
    fontFamily: emailFonts.primary,
  },
  statusBadge: {
    display: 'inline-block',
    padding: `${emailSpacing.sm} ${emailSpacing.lg}`,
    borderRadius: emailBorderRadius.full,
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    margin: `0 ${emailSpacing.xs}`,
    fontFamily: emailFonts.primary,
  },
  oldStatusBadge: {
    backgroundColor: emailColors.backgroundAlt,
    color: emailColors.textMuted,
    border: `1px solid ${emailColors.border}`,
  },
  arrow: {
    fontSize: emailFontSizes.xl,
    color: emailColors.textMuted,
    margin: `0 ${emailSpacing.sm}`,
    fontFamily: emailFonts.primary,
  },
  messageSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  customerGreeting: {
    fontSize: emailFontSizes.md,
    fontWeight: '600',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  customerMessage: {
    fontSize: emailFontSizes.base,
    color: emailColors.secondaryLight,
    lineHeight: emailLineHeights.relaxed,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  adminMessage: {
    fontSize: emailFontSizes.base,
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  customerInfo: {
    fontSize: emailFontSizes.sm,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  orderDetails: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  detailsTitle: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.md} 0`,
    borderBottom: `2px solid ${emailColors.primary}`,
    paddingBottom: emailSpacing.sm,
    fontFamily: emailFonts.primary,
  },
  detailItem: {
    fontSize: emailFontSizes.sm,
    color: emailColors.secondaryLight,
    margin: `${emailSpacing.xs} 0`,
    lineHeight: emailLineHeights.relaxed,
    fontFamily: emailFonts.primary,
  },
  actionSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.primaryLight,
    border: `1px solid ${emailColors.primary}`,
    borderRadius: emailBorderRadius.md,
    textAlign: 'center' as const,
    margin: `${emailSpacing.lg} 0`,
  },
  actionText: {
    fontSize: emailFontSizes.base,
    color: emailColors.warningDark,
    margin: '0',
    fontWeight: '500',
    fontFamily: emailFonts.primary,
  },
  adminActionSection: {
    padding: emailSpacing.xl,
    textAlign: 'center' as const,
  },
  contactSection: {
    padding: emailSpacing.xl,
    textAlign: 'center' as const,
    backgroundColor: emailColors.backgroundAlt,
    borderRadius: emailBorderRadius.md,
  },
  contactText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
};

export const OrderStatusChangeAlert: React.FC<OrderStatusChangeAlertProps> = ({
  order,
  previousStatus,
  newStatus,
  timestamp,
  isCustomer,
}) => {
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

  const currentStatusColors = statusColors[newStatus] || { backgroundColor: emailColors.backgroundAlt, color: emailColors.text };
  const statusIcon = statusIcons[newStatus] || '📦';
  const customerMessage = statusMessages[newStatus] || `Your order status has been updated to ${newStatus}.`;

  const previewText = `Order #${order.id} status updated: ${newStatus}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader
            shopName="Destino SF"
            variant={isCustomer ? 'default' : 'admin'}
            tagline={isCustomer ? 'Order Update' : 'Status Alert'}
          />

          {/* Status Update Section */}
          <Section style={{ ...styles.statusSection, backgroundColor: currentStatusColors.backgroundColor }}>
            <Text style={{ ...styles.statusTitle, color: currentStatusColors.color }}>
              {statusIcon} Order Status Update
            </Text>
            <Text style={{ ...styles.statusSubtitle, color: currentStatusColors.color }}>
              Order #{order.id} - {formattedTimestamp}
            </Text>
          </Section>

          {/* Status Change Card */}
          <Section style={styles.statusCard}>
            <Text style={styles.statusFlowTitle}>Status Changed</Text>
            <div style={{ textAlign: 'center' }}>
              <span style={{ ...styles.statusBadge, ...styles.oldStatusBadge }}>
                {previousStatus}
              </span>
              <span style={styles.arrow}>→</span>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: currentStatusColors.backgroundColor,
                color: currentStatusColors.color,
                border: `1px solid ${currentStatusColors.color}`,
              }}>
                {newStatus}
              </span>
            </div>
          </Section>

          {/* Message Section */}
          <Section style={styles.messageSection}>
            {isCustomer ? (
              <>
                <Text style={styles.customerGreeting}>Hi {order.customerName},</Text>
                <Text style={styles.customerMessage}>{customerMessage}</Text>
              </>
            ) : (
              <>
                <Text style={styles.adminMessage}>
                  <strong>Admin Alert:</strong> Order #{order.id} status changed from {previousStatus} to {newStatus}
                </Text>
                <Text style={styles.customerInfo}>
                  Customer: {order.customerName} ({order.email})
                </Text>
              </>
            )}
          </Section>

          {/* Order Details */}
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

          {/* Customer-specific action sections */}
          {isCustomer && newStatus === 'READY' && (
            <Section style={styles.actionSection}>
              <Text style={styles.actionText}>
                Your order is ready! Please visit us at our location to pick up your delicious Argentine treats.
              </Text>
            </Section>
          )}

          {isCustomer && newStatus === 'SHIPPING' && (
            <Section style={styles.actionSection}>
              <Text style={styles.actionText}>
                Your order is on its way! Keep an eye out for tracking updates.
              </Text>
            </Section>
          )}

          {/* Admin Action Button */}
          {!isCustomer && (
            <Section style={styles.adminActionSection}>
              <Link href={`${cleanAppUrl}/admin/orders/${order.id}`} style={primaryButtonStyle}>
                View Order in Admin
              </Link>
            </Section>
          )}

          {/* Contact Section (Customer) */}
          {isCustomer && (
            <Section style={styles.contactSection}>
              <Text style={styles.contactText}>
                Questions about your order? Contact us at{' '}
                <Link href="mailto:hola@destinosf.com" style={linkStyle}>
                  hola@destinosf.com
                </Link>{' '}
                or{' '}
                <Link href="tel:+14158729372" style={linkStyle}>
                  (415) 872-9372
                </Link>
              </Text>
            </Section>
          )}

          <EmailFooter
            shopName="Destino SF"
            variant={isCustomer ? 'default' : 'admin'}
          />

          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={{ fontSize: emailFontSizes.xs, color: emailColors.textMuted, margin: '0', fontFamily: emailFonts.primary }}>
              Updated at {formattedTimestamp} PST
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderStatusChangeAlert;
