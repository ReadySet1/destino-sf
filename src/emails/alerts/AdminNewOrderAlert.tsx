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
  Column
} from '@react-email/components';
import { NewOrderAlertData } from '@/types/alerts';

interface AdminNewOrderAlertProps extends NewOrderAlertData {}

export const AdminNewOrderAlert: React.FC<AdminNewOrderAlertProps> = ({
  order,
  timestamp,
  totalOrdersToday,
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
      <Preview>New order #{order.id} for ${formattedTotal} from {order.customerName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Heading style={styles.title}>🎉 New Order Alert</Heading>
            <Text style={styles.subtitle}>
              Order #{order.id} • {formattedTimestamp}
            </Text>
          </Section>
          
          <Section style={styles.orderSummary}>
            <Heading as="h2" style={styles.sectionTitle}>Order Summary</Heading>
            
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
                <Text style={styles.totalValue}>${formattedTotal}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={styles.labelColumn}>
                <Text style={styles.label}>Payment:</Text>
              </Column>
              <Column>
                <Text style={styles.value}>{order.paymentMethod}</Text>
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

            {order.notes && (
              <Row>
                <Column style={styles.labelColumn}>
                  <Text style={styles.label}>Notes:</Text>
                </Column>
                <Column>
                  <Text style={styles.value}>{order.notes}</Text>
                </Column>
              </Row>
            )}
          </Section>

          <Section style={styles.itemsSection}>
            <Heading as="h2" style={styles.sectionTitle}>Order Items</Heading>
            {order.items.map((item, index) => (
              <Section key={index} style={styles.orderItem}>
                <Row>
                  <Column style={styles.quantityColumn}>
                    <Text style={styles.quantity}>{item.quantity}x</Text>
                  </Column>
                  <Column style={styles.itemNameColumn}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    {item.variant && (
                      <Text style={styles.variantName}>{item.variant.name}</Text>
                    )}
                  </Column>
                  <Column style={styles.priceColumn}>
                    <Text style={styles.itemPrice}>
                      ${Number(item.price).toFixed(2)}
                    </Text>
                  </Column>
                </Row>
              </Section>
            ))}
          </Section>

          <Section style={styles.statsSection}>
            <Text style={styles.statsText}>
              📊 This is order #{totalOrdersToday} today
            </Text>
          </Section>

          <Section style={styles.actionSection}>
            <Link 
              href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.id}`}
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
            <Text style={styles.footerText}>
              Received at {formattedTimestamp} PST
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
    backgroundColor: '#2563eb',
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
    color: '#dbeafe',
    fontSize: '14px',
    margin: '0',
  },
  orderSummary: {
    padding: '24px',
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