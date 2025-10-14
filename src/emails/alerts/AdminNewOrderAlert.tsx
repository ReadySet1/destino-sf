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
} from '@react-email/components';
import * as React from 'react';
import { formatOrderNotes } from '@/lib/email-utils';
import { env } from '@/env'; // Import the validated environment configuration

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

export const AdminNewOrderAlert: React.FC<AdminNewOrderAlertProps> = ({
  order,
  timestamp,
  totalOrdersToday,
}) => {
  // Clean app URL to prevent double slashes
  const cleanAppUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const formattedTimestamp = timestamp.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Format notes to extract shipping address and other information
  const formattedNotes = formatOrderNotes(order.notes || null);

  // Calculate subtotal from items
  const subtotal = order.items.reduce((sum, item) => {
    const itemPrice = typeof item.price === 'number' ? item.price : item.price.toNumber();
    return sum + (itemPrice * item.quantity);
  }, 0);

  // Helper function to convert Decimal to number
  const toNumber = (value: number | { toNumber: () => number } | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    return typeof value === 'number' ? value : value.toNumber();
  };

  const taxAmount = toNumber(order.taxAmount);
  const deliveryFee = toNumber(order.deliveryFee);
  const serviceFee = toNumber(order.serviceFee);
  const gratuityAmount = toNumber(order.gratuityAmount);
  const shippingCost = order.shippingCostCents ? order.shippingCostCents / 100 : 0;

  // Format payment status for display
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

  // Get payment status styling
  const getPaymentStatusStyle = (status: string) => {
    const baseStyle = {
      fontSize: '14px',
      fontWeight: '600',
      margin: '8px 0',
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
    };

    switch (status) {
      case 'PAID':
      case 'COMPLETED':
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534' };
      case 'PENDING':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#92400e' };
      case 'FAILED':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' };
      case 'REFUNDED':
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#374151' };
      default:
        return { ...baseStyle, backgroundColor: '#f9fafb', color: '#6b7280' };
    }
  };

  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading as="h1" style={styles.headerTitle}>
              🎉 New Order Received!
            </Heading>
            <Text style={styles.headerSubtitle}>
              Order #{order.id} - $
              {(typeof order.total === 'number' ? order.total : order.total.toNumber()).toFixed(2)}
            </Text>
          </Section>

          <Section style={styles.content}>
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
                    <Link href={`mailto:${order.email}`} style={styles.link}>
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
                    <Link href={`tel:${order.phone}`} style={styles.link}>
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
                  <Text style={styles.totalValue}>
                    $
                    {(typeof order.total === 'number'
                      ? order.total
                      : order.total.toNumber()
                    ).toFixed(2)}
                  </Text>
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
                  <Text style={styles.value}>{order.fulfillmentType || 'Not specified'}</Text>
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

              {/* Shipping Address Section */}
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

              {/* Special Notes Section */}
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
          </Section>

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
                      $
                      {(typeof item.price === 'number'
                        ? item.price
                        : item.price.toNumber()
                      ).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          {/* Order Summary / Cost Breakdown */}
          <Section style={styles.summarySection}>
            <Heading as="h2" style={styles.sectionTitle}>
              💰 Order Summary
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
                <Text style={styles.summaryTotalValue}>
                  ${toNumber(order.total).toFixed(2)}
                </Text>
              </Column>
            </Row>
          </Section>

          <Section style={styles.statsSection}>
            <Text style={styles.statsText}>📊 This is order #{totalOrdersToday} today</Text>
          </Section>

          <Section style={styles.actionSection}>
            <Link
              href={`${cleanAppUrl}/admin/orders/${order.id}`}
              style={styles.actionButton}
            >
              View Order in Admin
            </Link>
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              This is an automated alert from your Destino SF order management system.
            </Text>
            <Text style={styles.footerText}>Received at {formattedTimestamp} PST</Text>
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
    backgroundColor: '#2563eb',
    padding: '20px',
    textAlign: 'center' as const,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  headerSubtitle: {
    color: '#dbeafe',
    fontSize: '14px',
    margin: '0',
  },
  content: {
    padding: '24px',
  },
  customerSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  },
  labelColumn: {
    width: '30%',
    verticalAlign: 'top',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    margin: '8px 0',
  },
  value: {
    fontSize: '14px',
    color: '#1f2937',
    margin: '8px 0',
  },
  totalValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#059669',
    margin: '8px 0',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  itemsSection: {
    padding: '0 24px 24px 24px',
  },
  orderItem: {
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '12px',
    marginBottom: '12px',
  },
  quantityColumn: {
    width: '15%',
  },
  quantity: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    margin: '0',
  },
  itemNameColumn: {
    width: '65%',
  },
  itemName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  variantName: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
  priceColumn: {
    width: '20%',
    textAlign: 'right' as const,
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0',
  },
  summarySection: {
    backgroundColor: '#fefce8',
    padding: '16px 24px',
    marginBottom: '16px',
    border: '1px solid #facc15',
    borderRadius: '6px',
  },
  summaryLabelColumn: {
    width: '70%',
  },
  summaryValueColumn: {
    width: '30%',
    textAlign: 'right' as const,
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#713f12',
    margin: '4px 0',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#713f12',
    margin: '4px 0',
  },
  summaryDivider: {
    borderColor: '#facc15',
    margin: '8px 0',
  },
  summaryTotalLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#713f12',
    margin: '4px 0',
  },
  summaryTotalValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2563eb',
    margin: '4px 0',
  },
  statsSection: {
    padding: '0 24px 24px 24px',
    backgroundColor: '#f9fafb',
    textAlign: 'center' as const,
  },
  statsText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '16px 0',
  },
  actionSection: {
    padding: '24px',
    textAlign: 'center' as const,
  },
  actionButton: {
    display: 'inline-block',
    backgroundColor: '#2563eb',
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
};

export default AdminNewOrderAlert;
