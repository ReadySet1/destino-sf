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
  Button,
} from '@react-email/components';
import * as React from 'react';
import { EmailHeader } from '../shared/EmailHeader';
import { EmailFooter } from '../shared/EmailFooter';
import { OrderSummary } from '../shared/OrderSummary';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    isPreorder?: boolean;
    preorderEndDate?: Date | string | null;
  };
  variant?: {
    name: string;
  } | null;
}

interface OrderConfirmationEmailProps {
  order: {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    total: number;
    taxAmount?: number;
    deliveryFee?: number;
    serviceFee?: number;
    gratuityAmount?: number;
    shippingCostCents?: number;
    fulfillmentType?: string;
    pickupTime?: Date | null;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    items: OrderItem[];
    notes?: string | null;
  };
  shopName: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  estimatedPreparationTime?: string;
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
};

const confirmationSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  margin: '20px 0',
};

const thankYouTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#0c4a6e',
  margin: '0 0 16px 0',
};

const confirmationText = {
  fontSize: '16px',
  color: '#0c4a6e',
  margin: '0 0 8px 0',
  lineHeight: '24px',
};

const orderIdText = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e40af',
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#ffffff',
  border: '2px solid #3b82f6',
  borderRadius: '6px',
  display: 'inline-block',
};

const infoSection = {
  padding: '24px',
  backgroundColor: '#fefce8',
  border: '1px solid #facc15',
  borderRadius: '8px',
  margin: '20px 0',
};

const infoTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#713f12',
  margin: '0 0 12px 0',
};

const infoText = {
  fontSize: '14px',
  color: '#713f12',
  margin: '8px 0',
  lineHeight: '20px',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '20px 0',
};

const primaryButton = {
  backgroundColor: '#059669',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '2px solid #059669',
  color: '#059669',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 22px',
  margin: '8px',
};

const formatFulfillmentType = (type: string) => {
  const typeMap: Record<string, string> = {
    pickup: 'Pickup',
    local_delivery: 'Local Delivery',
    nationwide_shipping: 'Shipping',
  };
  return typeMap[type] || type;
};

const formatDateTime = (date: Date | string | null, time?: string | null) => {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  let formatted = dateObj.toLocaleDateString('en-US', options);

  if (time) {
    formatted += ` at ${time}`;
  } else if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) {
    formatted += ` at ${dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  return formatted;
};

export const OrderConfirmationEmail = ({
  order,
  shopName = 'Destino SF',
  supportEmail = 'support@destinosf.com',
  supportPhone = '(415) 555-0123',
  websiteUrl = 'https://destinosf.com',
  estimatedPreparationTime = '30-45 minutes',
}: OrderConfirmationEmailProps) => {
  const previewText = `Order confirmation #${order.id} - ${formatFulfillmentType(order.fulfillmentType || 'pickup')} order placed successfully`;

  // Calculate subtotal from items
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Convert shipping cost from cents to dollars if provided
  const shippingCost = order.shippingCostCents ? order.shippingCostCents / 100 : undefined;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader shopName={shopName} />

          {/* Order Confirmation Section */}
          <Section style={confirmationSection}>
            <Text style={thankYouTitle}>🎉 Order Confirmed!</Text>
            <Text style={confirmationText}>
              Thank you, {order.customerName}! Your order has been received and is being prepared.
            </Text>
            <div style={orderIdText}>Order #{order.id}</div>
          </Section>

          {/* Order Summary */}
          <OrderSummary
            orderId={order.id}
            items={order.items}
            total={Number(order.total)}
            subtotal={subtotal}
            tax={order.taxAmount}
            shippingCost={shippingCost}
            deliveryFee={order.deliveryFee}
            serviceFee={order.serviceFee}
            gratuityAmount={order.gratuityAmount}
            fulfillmentType={order.fulfillmentType}
            pickupTime={order.pickupTime}
            deliveryDate={order.deliveryDate}
            deliveryTime={order.deliveryTime}
            notes={order.notes}
          />

          {/* Fulfillment Information */}
          <Section style={infoSection}>
            <Text style={infoTitle}>📋 Order Details</Text>

            {order.fulfillmentType === 'pickup' && (
              <>
                <Text style={infoText}>
                  <strong>Fulfillment:</strong> Pickup
                </Text>
                {order.pickupTime && (
                  <Text style={infoText}>
                    <strong>Pickup Time:</strong> {formatDateTime(order.pickupTime)}
                  </Text>
                )}
                <Text style={infoText}>
                  <strong>Estimated preparation time:</strong> {estimatedPreparationTime}
                </Text>
              </>
            )}

            {order.fulfillmentType === 'local_delivery' && (
              <>
                <Text style={infoText}>
                  <strong>Fulfillment:</strong> Local Delivery
                </Text>
                {order.deliveryDate && order.deliveryTime && (
                  <Text style={infoText}>
                    <strong>Delivery:</strong>{' '}
                    {formatDateTime(order.deliveryDate, order.deliveryTime)}
                  </Text>
                )}
                <Text style={infoText}>
                  <strong>Estimated preparation time:</strong> {estimatedPreparationTime}
                </Text>
              </>
            )}

            {order.fulfillmentType === 'nationwide_shipping' && (
              <>
                <Text style={infoText}>
                  <strong>Fulfillment:</strong> Nationwide Shipping
                </Text>
                <Text style={infoText}>
                  <strong>Processing time:</strong> 1-2 business days
                </Text>
                <Text style={infoText}>
                  We&apos;ll send you tracking information once your order ships!
                </Text>
              </>
            )}
          </Section>

          {/* Call to Action */}
          <Section style={ctaSection}>
            <Row>
              <Column>
                <Button href={`${websiteUrl}/orders/${order.id}`} style={primaryButton}>
                  Track Your Order
                </Button>
                <Button href={websiteUrl} style={secondaryButton}>
                  Order Again
                </Button>
              </Column>
            </Row>
          </Section>

          {/* Contact Information */}
          <Section style={{ padding: '20px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              Questions about your order?
            </Text>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              Call us at{' '}
              <Link href={`tel:${supportPhone}`} style={{ color: '#059669' }}>
                {supportPhone}
              </Link>{' '}
              or email{' '}
              <Link href={`mailto:${supportEmail}`} style={{ color: '#059669' }}>
                {supportEmail}
              </Link>
            </Text>
          </Section>

          <EmailFooter
            shopName={shopName}
            unsubscribeUrl={`${websiteUrl}/unsubscribe?email=${encodeURIComponent(order.email)}`}
          />
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;
