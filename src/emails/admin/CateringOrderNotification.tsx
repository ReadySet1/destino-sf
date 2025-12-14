import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Row,
  Column,
  Hr,
} from '@react-email/components';
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

export interface CateringOrderNotificationProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  eventDate: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    pricePerUnit: number;
  }>;
  deliveryAddress?: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    deliveryDate?: string;
    deliveryTime?: string;
  };
  paymentMethod: string;
  specialRequests?: string;
  numberOfPeople: number;
  deliveryFee?: number;
}

// Styles using design tokens - orange accent for catering
const styles = {
  orderHeader: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    backgroundColor: emailColors.accentLight,
    border: `2px solid ${emailColors.accent}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  orderTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    color: emailColors.accentDark,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  orderSubtitle: {
    fontSize: emailFontSizes.md,
    color: emailColors.accentDark,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  sectionTitle: {
    fontSize: emailFontSizes.lg,
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.lg} 0`,
    borderBottom: `2px solid ${emailColors.accent}`,
    paddingBottom: emailSpacing.sm,
    fontFamily: emailFonts.primary,
  },
  customerSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  deliverySection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.accentLight,
    border: `1px solid ${emailColors.accent}`,
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
    lineHeight: emailLineHeights.relaxed,
  },
  itemsSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  itemsTable: {
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: emailColors.primaryLight,
    padding: `${emailSpacing.md} 0`,
  },
  tableHeaderText: {
    fontSize: emailFontSizes.sm,
    fontWeight: 'bold',
    color: emailColors.warningDark,
    margin: '0',
    textAlign: 'center' as const,
    fontFamily: emailFonts.primary,
  },
  tableRow: {
    borderBottom: `1px solid ${emailColors.border}`,
    padding: `${emailSpacing.sm} 0`,
  },
  itemColumn: {
    width: '40%',
    padding: `0 ${emailSpacing.sm}`,
  },
  qtyColumn: {
    width: '15%',
    textAlign: 'center' as const,
  },
  priceColumn: {
    width: '22.5%',
    textAlign: 'center' as const,
  },
  totalColumn: {
    width: '22.5%',
    textAlign: 'center' as const,
  },
  itemName: {
    fontSize: emailFontSizes.sm,
    fontWeight: '500',
    color: emailColors.secondary,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  itemValue: {
    fontSize: emailFontSizes.sm,
    color: emailColors.secondary,
    margin: `${emailSpacing.sm} 0`,
    textAlign: 'center' as const,
    fontFamily: emailFonts.primary,
  },
  summarySection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.primaryLight,
    border: `1px solid ${emailColors.primary}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  summaryLabelColumn: {
    width: '70%',
  },
  summaryValueColumn: {
    width: '30%',
    textAlign: 'right' as const,
  },
  summaryLabel: {
    fontSize: emailFontSizes.sm,
    color: emailColors.warningDark,
    margin: `${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  summaryValue: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.warningDark,
    margin: `${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  summaryDivider: {
    borderColor: emailColors.primary,
    margin: `${emailSpacing.sm} 0`,
  },
  summaryTotalLabel: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.warningDark,
    margin: `${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  summaryTotalValue: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.accent,
    margin: `${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  actionSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.accentLight,
    border: `1px solid ${emailColors.accent}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  actionTitle: {
    fontSize: emailFontSizes.md,
    fontWeight: 'bold',
    color: emailColors.accentDark,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  actionItem: {
    fontSize: emailFontSizes.sm,
    color: emailColors.accentDark,
    margin: `${emailSpacing.xs} 0`,
    lineHeight: emailLineHeights.relaxed,
    fontFamily: emailFonts.primary,
  },
  footerNote: {
    fontSize: emailFontSizes.xs,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
};

export const CateringOrderNotification: React.FC<CateringOrderNotificationProps> = ({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  eventDate,
  totalAmount,
  items,
  deliveryAddress,
  paymentMethod,
  specialRequests,
  numberOfPeople,
  deliveryFee = 0,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
  const formattedEventDate = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const previewText = `New catering order #${orderId} - $${totalAmount.toFixed(2)} from ${customerName}`;

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'SQUARE':
        return 'Credit Card (Square)';
      case 'CASH':
        return 'Cash';
      case 'VENMO':
        return 'Venmo';
      default:
        return method;
    }
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName="Destino SF" variant="catering" tagline="New Catering Order" />

          {/* Order Header */}
          <Section style={styles.orderHeader}>
            <Text style={styles.orderTitle}>New Catering Order!</Text>
            <Text style={styles.orderSubtitle}>
              Order #{orderId} - ${totalAmount.toFixed(2)}
            </Text>
          </Section>

          {/* Customer Information */}
          <Section style={styles.customerSection}>
            <Heading as="h2" style={styles.sectionTitle}>
              Customer Information
            </Heading>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Customer:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{customerName}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Email:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>
                  <Link href={`mailto:${customerEmail}`} style={linkStyle}>
                    {customerEmail}
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
                  <Link href={`tel:${customerPhone}`} style={linkStyle}>
                    {customerPhone}
                  </Link>
                </Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Event Date:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{formattedEventDate}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Number of People:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{numberOfPeople}</Text>
              </Column>
            </Row>

            {specialRequests && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Special Requests:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>{specialRequests}</Text>
                </Column>
              </Row>
            )}

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Payment Method:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{formatPaymentMethod(paymentMethod)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Delivery Information */}
          {deliveryAddress && (
            <Section style={styles.deliverySection}>
              <Heading as="h2" style={styles.sectionTitle}>
                Delivery Information
              </Heading>

              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Address:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {deliveryAddress.street}
                    {deliveryAddress.street2 && (
                      <>
                        <br />
                        {deliveryAddress.street2}
                      </>
                    )}
                    <br />
                    {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}
                  </Text>
                </Column>
              </Row>

              {deliveryAddress.deliveryDate && deliveryAddress.deliveryTime && (
                <Row>
                  <Column style={styles.labelColumn}>
                    <Text style={styles.label}>Delivery:</Text>
                  </Column>
                  <Column>
                    <Text style={styles.value}>
                      {deliveryAddress.deliveryDate} at {deliveryAddress.deliveryTime}
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>
          )}

          {/* Order Items */}
          <Section style={styles.itemsSection}>
            <Heading as="h2" style={styles.sectionTitle}>
              Order Items
            </Heading>

            <Section style={styles.itemsTable}>
              {/* Table Header */}
              <Row style={styles.tableHeader}>
                <Column style={styles.itemColumn}>
                  <Text style={styles.tableHeaderText}>Item</Text>
                </Column>
                <Column style={styles.qtyColumn}>
                  <Text style={styles.tableHeaderText}>Qty</Text>
                </Column>
                <Column style={styles.priceColumn}>
                  <Text style={styles.tableHeaderText}>Price</Text>
                </Column>
                <Column style={styles.totalColumn}>
                  <Text style={styles.tableHeaderText}>Total</Text>
                </Column>
              </Row>

              {/* Table Items */}
              {items.map((item, index) => (
                <Row key={index} style={styles.tableRow}>
                  <Column style={styles.itemColumn}>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </Column>
                  <Column style={styles.qtyColumn}>
                    <Text style={styles.itemValue}>{item.quantity}</Text>
                  </Column>
                  <Column style={styles.priceColumn}>
                    <Text style={styles.itemValue}>${item.pricePerUnit.toFixed(2)}</Text>
                  </Column>
                  <Column style={styles.totalColumn}>
                    <Text style={styles.itemValue}>
                      ${(item.quantity * item.pricePerUnit).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>

          {/* Order Summary */}
          <Section style={styles.summarySection}>
            <Heading as="h2" style={{ ...styles.sectionTitle, borderBottomColor: emailColors.primary }}>
              Order Summary
            </Heading>

            <Row>
              <Column style={styles.summaryLabelColumn}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
              </Column>
              <Column style={styles.summaryValueColumn}>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </Column>
            </Row>

            {deliveryFee > 0 && (
              <Row>
                <Column style={styles.summaryLabelColumn}>
                  <Text style={styles.summaryLabel}>Delivery Fee:</Text>
                </Column>
                <Column style={styles.summaryValueColumn}>
                  <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
                </Column>
              </Row>
            )}

            <Hr style={styles.summaryDivider} />

            <Row>
              <Column style={styles.summaryLabelColumn}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
              </Column>
              <Column style={styles.summaryValueColumn}>
                <Text style={styles.summaryTotalValue}>${totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Action Items */}
          <Section style={styles.actionSection}>
            <Heading as="h3" style={styles.actionTitle}>
              Next Steps
            </Heading>
            <Text style={styles.actionItem}>1. Review order details and confirm availability</Text>
            <Text style={styles.actionItem}>2. Contact customer to confirm event details</Text>
            <Text style={styles.actionItem}>3. Update order status in admin panel</Text>
            <Text style={styles.actionItem}>4. Schedule preparation and delivery/pickup</Text>
          </Section>

          <Hr style={{ borderColor: emailColors.border, margin: `${emailSpacing.xl} 0` }} />

          {/* Footer Note */}
          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={styles.footerNote}>
              This is an automated notification from your Destino SF catering system.
            </Text>
            <Text style={{ ...styles.footerNote, marginTop: emailSpacing.sm }}>
              Received at {new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST
            </Text>
          </Section>

          <EmailFooter shopName="Destino SF" variant="admin" />
        </Container>
      </Body>
    </Html>
  );
};

export default CateringOrderNotification;
