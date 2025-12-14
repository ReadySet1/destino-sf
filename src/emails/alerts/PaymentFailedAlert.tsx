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
  Row,
  Column,
} from '@react-email/components';
import { PaymentFailedAlertData } from '@/types/alerts';
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
  linkStyle,
} from '../shared/email-styles';

interface PaymentFailedAlertProps extends PaymentFailedAlertData {}

// Styles using design tokens
const styles = {
  alertSection: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    backgroundColor: emailColors.errorLight,
    border: `2px solid ${emailColors.error}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  alertTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    color: emailColors.errorDark,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  alertSubtitle: {
    fontSize: emailFontSizes.md,
    color: emailColors.errorDark,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  urgentBox: {
    padding: emailSpacing.lg,
    backgroundColor: emailColors.errorLight,
    border: `2px solid ${emailColors.error}`,
    borderRadius: emailBorderRadius.md,
    textAlign: 'center' as const,
    margin: `${emailSpacing.lg} 0`,
  },
  urgentTitle: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.errorDark,
    margin: `0 0 ${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  urgentText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    margin: '0',
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  errorSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  sectionTitle: {
    fontSize: emailFontSizes.lg,
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.lg} 0`,
    borderBottom: `2px solid ${emailColors.error}`,
    paddingBottom: emailSpacing.sm,
    fontFamily: emailFonts.primary,
  },
  errorBox: {
    padding: emailSpacing.lg,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.md,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  },
  errorText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    margin: '0',
    lineHeight: emailLineHeights.relaxed,
  },
  orderSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  labelColumn: {
    width: '35%',
    verticalAlign: 'top' as const,
  },
  label: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.textMuted,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  value: {
    fontSize: emailFontSizes.sm,
    color: emailColors.secondary,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  totalValue: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.errorDark,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  statusValue: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.errorDark,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  itemsSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  orderItem: {
    borderBottom: `1px solid ${emailColors.border}`,
    paddingBottom: emailSpacing.md,
    marginBottom: emailSpacing.md,
  },
  quantityColumn: {
    width: '15%',
  },
  quantity: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  itemNameColumn: {
    width: '60%',
  },
  itemName: {
    fontSize: emailFontSizes.sm,
    fontWeight: '500',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  variantName: {
    fontSize: emailFontSizes.xs,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  priceColumn: {
    width: '25%',
    textAlign: 'right' as const,
  },
  itemPrice: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.secondary,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  actionsSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.primaryLight,
    border: `1px solid ${emailColors.primary}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  actionItem: {
    fontSize: emailFontSizes.sm,
    color: emailColors.warningDark,
    margin: `${emailSpacing.sm} 0`,
    lineHeight: emailLineHeights.relaxed,
    fontFamily: emailFonts.primary,
  },
  buttonSection: {
    padding: emailSpacing.xl,
    textAlign: 'center' as const,
  },
  primaryButton: {
    display: 'inline-block',
    backgroundColor: emailColors.error,
    color: emailColors.white,
    padding: `${emailSpacing.md} ${emailSpacing.xl}`,
    borderRadius: emailBorderRadius.md,
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: emailFontSizes.sm,
    margin: `${emailSpacing.xs} ${emailSpacing.sm}`,
    fontFamily: emailFonts.primary,
  },
  secondaryButton: {
    display: 'inline-block',
    backgroundColor: emailColors.secondary,
    color: emailColors.white,
    padding: `${emailSpacing.md} ${emailSpacing.xl}`,
    borderRadius: emailBorderRadius.md,
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: emailFontSizes.sm,
    margin: `${emailSpacing.xs} ${emailSpacing.sm}`,
    fontFamily: emailFonts.primary,
  },
  priorityNote: {
    padding: emailSpacing.lg,
    backgroundColor: emailColors.errorLight,
    border: `1px solid ${emailColors.error}`,
    borderRadius: emailBorderRadius.md,
    textAlign: 'center' as const,
    margin: `${emailSpacing.lg} 0`,
  },
  priorityText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    margin: '0',
    fontFamily: emailFonts.primary,
    fontWeight: 'bold',
  },
};

export const PaymentFailedAlert: React.FC<PaymentFailedAlertProps> = ({
  order,
  error,
  timestamp,
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

  const previewText = `Payment Failed: Order #${order.id} - Immediate action required`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName="Destino SF" variant="admin" tagline="Payment Alert" />

          {/* Alert Section */}
          <Section style={styles.alertSection}>
            <Text style={styles.alertTitle}>Payment Failed</Text>
            <Text style={styles.alertSubtitle}>
              Order #{order.id} - {formattedTimestamp}
            </Text>
          </Section>

          {/* Urgent Action Box */}
          <Section style={styles.urgentBox}>
            <Text style={styles.urgentTitle}>IMMEDIATE ACTION REQUIRED</Text>
            <Text style={styles.urgentText}>
              A payment failure has occurred and requires your attention.
            </Text>
          </Section>

          {/* Error Details */}
          <Section style={styles.errorSection}>
            <Heading as="h2" style={styles.sectionTitle}>
              Error Details
            </Heading>
            <Section style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Section>
          </Section>

          {/* Order Information */}
          <Section style={styles.orderSection}>
            <Heading as="h2" style={{ ...styles.sectionTitle, borderBottomColor: emailColors.primary }}>
              Order Information
            </Heading>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Customer:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{order.customerName}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Email:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>
                  <Link href={`mailto:${order.email}`} style={linkStyle}>
                    {order.email}
                  </Link>
                </Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Phone:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>
                  <Link href={`tel:${order.phone}`} style={linkStyle}>
                    {order.phone}
                  </Link>
                </Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Order Total:</Text>
              </Column>
              <Column>
                <Text style={styles.totalValue}>${formattedTotal}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Payment Method:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{order.paymentMethod}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Current Status:</Text>
              </Column>
              <Column>
                <Text style={styles.statusValue}>{order.status}</Text>
              </Column>
            </Row>

            {order.squareOrderId && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Square Order ID:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>{order.squareOrderId}</Text>
                </Column>
              </Row>
            )}
          </Section>

          {/* Order Items */}
          <Section style={styles.itemsSection}>
            <Heading as="h2" style={{ ...styles.sectionTitle, borderBottomColor: emailColors.primary }}>
              Order Items
            </Heading>
            {order.items.map((item, index) => (
              <Section key={index} style={styles.orderItem}>
                <Row>
                  <Column style={styles.quantityColumn}>
                    <Text style={styles.quantity}>{item.quantity}x</Text>
                  </Column>
                  <Column style={styles.itemNameColumn}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    {item.variant && <Text style={styles.variantName}>{item.variant.name}</Text>}
                  </Column>
                  <Column style={styles.priceColumn}>
                    <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          {/* Recommended Actions */}
          <Section style={styles.actionsSection}>
            <Heading as="h2" style={{ ...styles.sectionTitle, borderBottomColor: emailColors.primary }}>
              Recommended Actions
            </Heading>
            <Text style={styles.actionItem}>
              1. Review the error details above and check Square Dashboard for more information
            </Text>
            <Text style={styles.actionItem}>
              2. Contact the customer to inform them of the payment issue
            </Text>
            <Text style={styles.actionItem}>
              3. Help the customer retry the payment or use an alternative payment method
            </Text>
            <Text style={styles.actionItem}>
              4. Update the order status appropriately based on resolution
            </Text>
          </Section>

          {/* Action Buttons */}
          <Section style={styles.buttonSection}>
            <Link href={`${cleanAppUrl}/admin/orders/${order.id}`} style={styles.primaryButton}>
              View Order in Admin
            </Link>
            <Link
              href={`mailto:${order.email}?subject=Payment Issue - Order #${order.id}&body=Hi ${order.customerName},%0D%0A%0D%0AWe encountered an issue processing your payment for order #${order.id}. Please contact us to resolve this.%0D%0A%0D%0AThank you!`}
              style={styles.secondaryButton}
            >
              Email Customer
            </Link>
          </Section>

          {/* Priority Note */}
          <Section style={styles.priorityNote}>
            <Text style={styles.priorityText}>Priority: High - Immediate attention required</Text>
          </Section>

          <EmailFooter shopName="Destino SF" variant="admin" />

          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={{ fontSize: emailFontSizes.xs, color: emailColors.textMuted, margin: '0', fontFamily: emailFonts.primary }}>
              Payment failed at {formattedTimestamp} PST
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default PaymentFailedAlert;
