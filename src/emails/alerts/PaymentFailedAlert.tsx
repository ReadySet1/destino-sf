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

interface PaymentFailedAlertProps extends PaymentFailedAlertData {}

export const PaymentFailedAlert: React.FC<PaymentFailedAlertProps> = ({
  order,
  error,
  timestamp,
}) => {
  const formattedTotal = Number(order.total).toFixed(2);
  const formattedTimestamp = timestamp.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Html>
      <Head />
      <Preview>🚨 Payment Failed: Order #{order.id} - Immediate action required</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.title}>🚨 Payment Failed Alert</Heading>
            <Text style={styles.subtitle}>
              Order #{order.id} • {formattedTimestamp}
            </Text>
          </Section>

          <Section style={styles.alertSection}>
            <Section style={styles.alertBox}>
              <Text style={styles.alertTitle}>⚠️ IMMEDIATE ACTION REQUIRED</Text>
              <Text style={styles.alertMessage}>
                A payment failure has occurred and requires your attention.
              </Text>
            </Section>
          </Section>

          <Section style={styles.errorSection}>
            <Heading as="h2" style={styles.sectionTitle}>
              Error Details
            </Heading>
            <Section style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </Section>
          </Section>

          <Section style={styles.orderSummary}>
            <Heading as="h2" style={styles.sectionTitle}>
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
                    <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          <Section style={styles.actionsSection}>
            <Heading as="h2" style={styles.sectionTitle}>
              Recommended Actions
            </Heading>
            <Section style={styles.actionsList}>
              <Text style={styles.actionItem}>
                1. 🔍 Review the error details above and check Square Dashboard for more information
              </Text>
              <Text style={styles.actionItem}>
                2. 📞 Contact the customer to inform them of the payment issue
              </Text>
              <Text style={styles.actionItem}>
                3. 💳 Help the customer retry the payment or use an alternative payment method
              </Text>
              <Text style={styles.actionItem}>
                4. 📋 Update the order status appropriately based on resolution
              </Text>
            </Section>
          </Section>

          <Section style={styles.quickActions}>
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.id}`}
              style={styles.primaryButton}
            >
              View Order in Admin
            </Link>
            <Link
              href={`mailto:${order.email}?subject=Payment Issue - Order #${order.id}&body=Hi ${order.customerName},%0D%0A%0D%0AWe encountered an issue processing your payment for order #${order.id}. Please contact us to resolve this.%0D%0A%0D%0AThank you!`}
              style={styles.secondaryButton}
            >
              Email Customer
            </Link>
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              This is a critical alert from your Destino SF order management system.
            </Text>
            <Text style={styles.footerText}>Payment failed at {formattedTimestamp} PST</Text>
            <Text style={styles.footerText}>
              <strong>Priority:</strong> High - Immediate attention required
            </Text>
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
    backgroundColor: '#dc2626',
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
    color: '#fecaca',
    fontSize: '14px',
    margin: '0',
  },
  alertSection: {
    padding: '24px',
  },
  alertBox: {
    backgroundColor: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#dc2626',
    margin: '0 0 8px 0',
  },
  alertMessage: {
    fontSize: '14px',
    color: '#991b1b',
    margin: '0',
  },
  errorSection: {
    padding: '0 24px 24px 24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '8px',
  },
  errorBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '16px',
  },
  errorText: {
    fontSize: '14px',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    color: '#374151',
    margin: '0',
    lineHeight: '1.5',
  },
  orderSummary: {
    padding: '0 24px 24px 24px',
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
    color: '#dc2626',
    margin: '8px 0',
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#dc2626',
    margin: '8px 0',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  itemsSection: {
    padding: '0 24px 24px 24px',
    backgroundColor: '#f9fafb',
  },
  orderItem: {
    borderBottom: '1px solid #e5e7eb',
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
  actionsSection: {
    padding: '0 24px 24px 24px',
  },
  actionsList: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fed7aa',
    borderRadius: '6px',
    padding: '16px',
  },
  actionItem: {
    fontSize: '14px',
    color: '#92400e',
    margin: '8px 0',
    lineHeight: '1.5',
  },
  quickActions: {
    padding: '24px',
    textAlign: 'center' as const,
    backgroundColor: '#f9fafb',
  },
  primaryButton: {
    display: 'inline-block',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    margin: '0 8px 8px 8px',
  },
  secondaryButton: {
    display: 'inline-block',
    backgroundColor: '#6b7280',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    margin: '0 8px 8px 8px',
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

export default PaymentFailedAlert;
