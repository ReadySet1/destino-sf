import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Button,
  Row,
  Column,
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
  };
  variant?: {
    name: string;
  } | null;
}

interface PickupReadyEmailProps {
  order: {
    id: string;
    customerName: string;
    email: string;
    total: number;
    items: OrderItem[];
    pickupTime?: Date | null;
    notes?: string | null;
  };
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  supportEmail?: string;
  websiteUrl?: string;
  pickupInstructions?: string;
  parkingInfo?: string;
  preparationTime?: string;
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

const readySection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#dcfce7',
  border: '2px solid #16a34a',
  borderRadius: '8px',
  margin: '20px 0',
};

const readyTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0 0 16px 0',
};

const readyText = {
  fontSize: '18px',
  color: '#166534',
  margin: '0 0 8px 0',
  lineHeight: '24px',
};

const orderIdText = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '16px 0',
  padding: '12px',
  backgroundColor: '#ffffff',
  border: '2px solid #16a34a',
  borderRadius: '6px',
  display: 'inline-block',
};

const infoSection = {
  padding: '24px',
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  margin: '20px 0',
};

const infoTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0 0 12px 0',
};

const infoText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '8px 0',
  lineHeight: '20px',
};

const instructionsSection = {
  padding: '20px',
  backgroundColor: '#e0f2fe',
  border: '1px solid #0891b2',
  borderRadius: '8px',
  margin: '20px 0',
};

const instructionsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#164e63',
  margin: '0 0 12px 0',
};

const instructionsText = {
  fontSize: '14px',
  color: '#164e63',
  margin: '8px 0',
  lineHeight: '20px',
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: '20px 0',
};

const primaryButton = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  margin: '8px',
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '2px solid #16a34a',
  color: '#16a34a',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px',
};

const mapSection = {
  textAlign: 'center' as const,
  padding: '16px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  margin: '16px 0',
};

const formatDateTime = (date: Date | string | null) => {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return dateObj.toLocaleDateString('en-US', options);
};

export const PickupReadyEmail = ({
  order,
  shopName = 'Destino SF',
  shopAddress = '123 Main St, San Francisco, CA 94102',
  shopPhone = '(415) 555-0123',
  supportEmail = 'support@destinosf.com',
  websiteUrl = 'https://destinosf.com',
  pickupInstructions = 'Please come to the front counter and provide your name and order number.',
  parkingInfo = 'Free parking is available on the street. Limited 15-minute parking spots are available directly in front of our store.',
  preparationTime = '30-45 minutes',
}: PickupReadyEmailProps) => {
  const previewText = `🎉 Order #${order.id} is ready for pickup at ${shopName}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader shopName={shopName} />

          {/* Ready for Pickup Section */}
          <Section style={readySection}>
            <Text style={readyTitle}>🎉 Your Order is Ready!</Text>
            <Text style={readyText}>
              Hi {order.customerName}, your delicious order is ready for pickup!
            </Text>
            <div style={orderIdText}>Order #{order.id}</div>
            <Text style={{ ...readyText, fontSize: '16px', marginTop: '16px' }}>
              Please come by when convenient to pick up your fresh, hot meal.
            </Text>
          </Section>

          {/* Pickup Information */}
          <Section style={infoSection}>
            <Text style={infoTitle}>📍 Pickup Information</Text>
            <Text style={infoText}>
              <strong>Location:</strong> {shopAddress}
            </Text>
            <Text style={infoText}>
              <strong>Phone:</strong>{' '}
              <Link href={`tel:${shopPhone}`} style={{ color: '#92400e' }}>
                {shopPhone}
              </Link>
            </Text>
            {order.pickupTime && (
              <Text style={infoText}>
                <strong>Requested pickup time:</strong> {formatDateTime(order.pickupTime)}
              </Text>
            )}
            <Text style={infoText}>
              <strong>Order ready since:</strong>{' '}
              {new Date().toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </Section>

          {/* Pickup Instructions */}
          <Section style={instructionsSection}>
            <Text style={instructionsTitle}>📋 Pickup Instructions</Text>
            <Text style={instructionsText}>{pickupInstructions}</Text>
            {parkingInfo && (
              <>
                <Text style={instructionsTitle}>🅿️ Parking Information</Text>
                <Text style={instructionsText}>{parkingInfo}</Text>
              </>
            )}
            <Text style={instructionsTitle}>⏰ Keep in Mind</Text>
            <Text style={instructionsText}>
              For food safety and optimal taste, we recommend picking up your order within 30
              minutes of this notification.
            </Text>
          </Section>

          {/* Order Summary */}
          <OrderSummary
            orderId={order.id}
            items={order.items}
            total={Number(order.total)}
            fulfillmentType="pickup"
            pickupTime={order.pickupTime}
            notes={order.notes}
            showPricing={false}
          />

          {/* Call to Action */}
          <Section style={ctaSection}>
            <Row>
              <Column>
                <Button href={`tel:${shopPhone}`} style={primaryButton}>
                  📞 Call if Questions
                </Button>
                <Button
                  href={`https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`}
                  style={secondaryButton}
                >
                  📍 Get Directions
                </Button>
              </Column>
            </Row>
          </Section>

          {/* Map/Directions Section */}
          <Section style={mapSection}>
            <Text
              style={{
                fontSize: '14px',
                color: '#4a5568',
                margin: '0 0 8px 0',
                fontWeight: 'bold',
              }}
            >
              Need directions?
            </Text>
            <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
              <Link
                href={`https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`}
                style={{ color: '#0891b2' }}
              >
                Open in Google Maps
              </Link>
              {' | '}
              <Link
                href={`https://maps.apple.com/?q=${encodeURIComponent(shopAddress)}`}
                style={{ color: '#0891b2' }}
              >
                Open in Apple Maps
              </Link>
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={{ padding: '20px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              Unable to pick up right now or have questions?
            </Text>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              Call us at{' '}
              <Link href={`tel:${shopPhone}`} style={{ color: '#16a34a' }}>
                {shopPhone}
              </Link>{' '}
              or email{' '}
              <Link href={`mailto:${supportEmail}`} style={{ color: '#16a34a' }}>
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

export default PickupReadyEmail;
