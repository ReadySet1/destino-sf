import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Row,
  Column,
  Hr,
  Link,
  Preview,
} from '@react-email/components';
import * as React from 'react';
import { formatOrderNotes } from '@/lib/email-utils';
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

interface OrderItem {
  id: string;
  quantity: number;
  price: number | { toNumber: () => number };
  product: {
    name: string;
  };
  variant?: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  total: number | { toNumber: () => number };
  taxAmount?: number | { toNumber: () => number } | null;
  deliveryFee?: number | { toNumber: () => number } | null;
  serviceFee?: number | { toNumber: () => number } | null;
  gratuityAmount?: number | { toNumber: () => number } | null;
  shippingCostCents?: number | null;
  fulfillmentType?: string | null;
  pickupTime?: Date | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COMPLETED';
  paymentMethod: 'SQUARE' | 'CASH' | 'VENMO';
  items: OrderItem[];
}

interface NewOrderAlertData {
  order: Order;
  timestamp: Date;
  totalOrdersToday: number;
}

interface AdminNewOrderAlertProps extends NewOrderAlertData {}

// Styles using design tokens
const styles = {
  alertSection: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    backgroundColor: emailColors.successLight,
    border: `2px solid ${emailColors.success}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  alertTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    color: emailColors.successDark,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  alertSubtitle: {
    fontSize: emailFontSizes.lg,
    color: emailColors.successDark,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  customerSection: {
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
    borderBottom: `2px solid ${emailColors.primary}`,
    paddingBottom: emailSpacing.sm,
    fontFamily: emailFonts.primary,
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
    color: emailColors.successDark,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  itemsSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
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
  summarySection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.primaryLight,
    border: `2px solid ${emailColors.primary}`,
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
    margin: `${emailSpacing.md} 0`,
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
    color: emailColors.secondary,
    margin: `${emailSpacing.xs} 0`,
    fontFamily: emailFonts.primary,
  },
  statsSection: {
    padding: emailSpacing.lg,
    backgroundColor: emailColors.accentLight,
    border: `1px solid ${emailColors.accent}`,
    borderRadius: emailBorderRadius.md,
    textAlign: 'center' as const,
    margin: `${emailSpacing.lg} 0`,
  },
  statsText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.accentDark,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  actionSection: {
    padding: emailSpacing.xl,
    textAlign: 'center' as const,
  },
};

export const AdminNewOrderAlert: React.FC<AdminNewOrderAlertProps> = ({
  order,
  timestamp,
  totalOrdersToday,
}) => {
  const cleanAppUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const formattedTimestamp = timestamp.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedNotes = formatOrderNotes(order.notes || null);

  const subtotal = order.items.reduce((sum, item) => {
    const itemPrice = typeof item.price === 'number' ? item.price : item.price.toNumber();
    return sum + itemPrice * item.quantity;
  }, 0);

  const toNumber = (value: number | { toNumber: () => number } | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    return typeof value === 'number' ? value : value.toNumber();
  };

  const taxAmount = toNumber(order.taxAmount);
  const deliveryFee = toNumber(order.deliveryFee);
  const serviceFee = toNumber(order.serviceFee);
  const gratuityAmount = toNumber(order.gratuityAmount);
  const shippingCost = order.shippingCostCents ? order.shippingCostCents / 100 : 0;

  const formatPaymentStatus = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending Payment';
      case 'PAID':
        return 'Paid';
      case 'FAILED':
        return 'Payment Failed';
      case 'REFUNDED':
        return 'Refunded';
      case 'COMPLETED':
        return 'Payment Completed';
      default:
        return status;
    }
  };

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

  const getPaymentStatusStyle = (status: string) => {
    const baseStyle = {
      fontSize: emailFontSizes.sm,
      fontWeight: '600',
      margin: `${emailSpacing.sm} 0`,
      padding: `${emailSpacing.xs} ${emailSpacing.sm}`,
      borderRadius: emailBorderRadius.sm,
      display: 'inline-block',
      fontFamily: emailFonts.primary,
    };

    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return { ...baseStyle, backgroundColor: emailColors.successLight, color: emailColors.successDark };
      case 'PENDING':
        return { ...baseStyle, backgroundColor: emailColors.primaryLight, color: emailColors.warningDark };
      case 'FAILED':
        return { ...baseStyle, backgroundColor: emailColors.errorLight, color: emailColors.errorDark };
      case 'REFUNDED':
        return { ...baseStyle, backgroundColor: emailColors.backgroundAlt, color: emailColors.textMuted };
      default:
        return { ...baseStyle, backgroundColor: emailColors.backgroundAlt, color: emailColors.textMuted };
    }
  };

  const formatFulfillmentType = (type: string | null | undefined) => {
    if (!type) return 'Not specified';
    const typeMap: Record<string, string> = {
      pickup: 'Pickup',
      local_delivery: 'Local Delivery',
      nationwide_shipping: 'Nationwide Shipping',
    };
    return typeMap[type] || type;
  };

  const previewText = `New Order #${order.id} - $${toNumber(order.total).toFixed(2)} from ${order.customerName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName="Destino SF" variant="admin" tagline="Admin Alert" />

          {/* New Order Alert Section */}
          <Section style={styles.alertSection}>
            <Text style={styles.alertTitle}>New Order Received!</Text>
            <Text style={styles.alertSubtitle}>
              Order #{order.id} - ${toNumber(order.total).toFixed(2)}
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
                <Text style={styles.label}>Total:</Text>
              </Column>
              <Column>
                <Text style={styles.totalValue}>${toNumber(order.total).toFixed(2)}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Payment Status:</Text>
              </Column>
              <Column>
                <Text style={getPaymentStatusStyle(order.paymentStatus)}>
                  {formatPaymentStatus(order.paymentStatus)}
                </Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Payment Method:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{formatPaymentMethod(order.paymentMethod)}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Fulfillment:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{formatFulfillmentType(order.fulfillmentType)}</Text>
              </Column>
            </Row>

            {order.pickupTime && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Pickup Time:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {new Date(order.pickupTime).toLocaleString('en-US', {
                      timeZone: 'America/Los_Angeles',
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Column>
              </Row>
            )}

            {formattedNotes.hasShippingAddress && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Shipping Address:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>
                    {formattedNotes.shippingAddress?.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < formattedNotes.shippingAddress!.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </Text>
                </Column>
              </Row>
            )}

            {formattedNotes.otherNotes && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Special Requests:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>{formattedNotes.otherNotes}</Text>
                </Column>
              </Row>
            )}
          </Section>

          {/* Order Items */}
          <Section style={styles.itemsSection}>
            <Heading as="h2" style={styles.sectionTitle}>
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
                    <Text style={styles.itemPrice}>
                      ${(typeof item.price === 'number' ? item.price : item.price.toNumber()).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          {/* Order Summary */}
          <Section style={styles.summarySection}>
            <Heading as="h2" style={styles.sectionTitle}>
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

            {taxAmount > 0 && (
              <Row>
                <Column style={styles.summaryLabelColumn}>
                  <Text style={styles.summaryLabel}>Tax:</Text>
                </Column>
                <Column style={styles.summaryValueColumn}>
                  <Text style={styles.summaryValue}>${taxAmount.toFixed(2)}</Text>
                </Column>
              </Row>
            )}

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

            {shippingCost > 0 && (
              <Row>
                <Column style={styles.summaryLabelColumn}>
                  <Text style={styles.summaryLabel}>Shipping:</Text>
                </Column>
                <Column style={styles.summaryValueColumn}>
                  <Text style={styles.summaryValue}>${shippingCost.toFixed(2)}</Text>
                </Column>
              </Row>
            )}

            {serviceFee > 0 && (
              <Row>
                <Column style={styles.summaryLabelColumn}>
                  <Text style={styles.summaryLabel}>Service Fee:</Text>
                </Column>
                <Column style={styles.summaryValueColumn}>
                  <Text style={styles.summaryValue}>${serviceFee.toFixed(2)}</Text>
                </Column>
              </Row>
            )}

            {gratuityAmount > 0 && (
              <Row>
                <Column style={styles.summaryLabelColumn}>
                  <Text style={styles.summaryLabel}>Gratuity:</Text>
                </Column>
                <Column style={styles.summaryValueColumn}>
                  <Text style={styles.summaryValue}>${gratuityAmount.toFixed(2)}</Text>
                </Column>
              </Row>
            )}

            <Hr style={styles.summaryDivider} />

            <Row>
              <Column style={styles.summaryLabelColumn}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
              </Column>
              <Column style={styles.summaryValueColumn}>
                <Text style={styles.summaryTotalValue}>${toNumber(order.total).toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Stats */}
          <Section style={styles.statsSection}>
            <Text style={styles.statsText}>This is order #{totalOrdersToday} today</Text>
          </Section>

          {/* Action Button */}
          <Section style={styles.actionSection}>
            <Link href={`${cleanAppUrl}/admin/orders/${order.id}`} style={primaryButtonStyle}>
              View Order in Admin
            </Link>
          </Section>

          <EmailFooter
            shopName="Destino SF"
            variant="admin"
          />

          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={{ fontSize: emailFontSizes.xs, color: emailColors.textMuted, margin: '0', fontFamily: emailFonts.primary }}>
              Received at {formattedTimestamp} PST
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AdminNewOrderAlert;
