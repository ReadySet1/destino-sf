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
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header Section */}
          <Section style={styles.header}>
            <Heading as="h1" style={styles.headerTitle}>
              🍽️ New Catering Order!
            </Heading>
            <Text style={styles.headerSubtitle}>
              Order #{orderId} - ${totalAmount.toFixed(2)}
            </Text>
          </Section>

          <Section style={styles.content}>
            {/* Customer Information */}
            <Section style={styles.customerSection}>
              <Heading as="h2" style={styles.sectionTitle}>
                👤 Customer Information
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
                    <Link href={`mailto:${customerEmail}`} style={styles.link}>
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
                    <Link href={`tel:${customerPhone}`} style={styles.link}>
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
                  <Text style={styles.label}>People:</Text>
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
                  🚚 Delivery Information
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
                🍽️ Order Items
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
                📋 Next Steps
              </Heading>
              <Text style={styles.actionItem}>• Review order details and confirm availability</Text>
              <Text style={styles.actionItem}>• Contact customer to confirm event details</Text>
              <Text style={styles.actionItem}>• Update order status in admin panel</Text>
              <Text style={styles.actionItem}>• Schedule preparation and delivery/pickup</Text>
            </Section>
          </Section>

          <Hr style={styles.hr} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              This is an automated notification from your Destino SF catering system.
            </Text>
            <Text style={styles.footerText}>
              Received at {new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}{' '}
              PST
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles matching the regular order email template with yellow/amber accents
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
    backgroundColor: '#d97706', // amber-600
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
    color: '#fef3c7', // amber-100
    fontSize: '14px',
    margin: '0',
  },
  content: {
    padding: '24px',
  },
  customerSection: {
    marginBottom: '24px',
  },
  deliverySection: {
    marginBottom: '24px',
    backgroundColor: '#fef3c7', // amber-100
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #f59e0b', // amber-500
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #f59e0b', // amber-500
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
  link: {
    color: '#d97706', // amber-600
    textDecoration: 'none',
  },
  itemsSection: {
    marginBottom: '24px',
  },
  itemsTable: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#fef3c7', // amber-100
    padding: '12px 0',
  },
  tableHeaderText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#92400e', // amber-800
    margin: '0',
    textAlign: 'center' as const,
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    padding: '8px 0',
  },
  itemColumn: {
    width: '40%',
    padding: '0 8px',
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
    fontSize: '14px',
    color: '#1f2937',
    margin: '8px 0',
  },
  itemValue: {
    fontSize: '14px',
    color: '#1f2937',
    margin: '8px 0',
    textAlign: 'center' as const,
  },
  summarySection: {
    backgroundColor: '#fefce8', // yellow-50
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #facc15', // yellow-400
    marginBottom: '24px',
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
    color: '#713f12', // yellow-800
    margin: '4px 0',
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#713f12', // yellow-800
    margin: '4px 0',
  },
  summaryDivider: {
    borderColor: '#facc15', // yellow-400
    margin: '8px 0',
  },
  summaryTotalLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#713f12', // yellow-800
    margin: '4px 0',
  },
  summaryTotalValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#d97706', // amber-600
    margin: '4px 0',
  },
  actionSection: {
    backgroundColor: '#fff3cd', // yellow-100
    border: '1px solid #fbbf24', // yellow-400
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '24px',
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#92400e', // amber-800
    margin: '0 0 12px 0',
  },
  actionItem: {
    fontSize: '14px',
    color: '#92400e', // amber-800
    margin: '4px 0',
    lineHeight: '20px',
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

export default CateringOrderNotification;
