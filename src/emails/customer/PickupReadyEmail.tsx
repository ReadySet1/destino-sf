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
  secondaryButtonStyle,
  infoBoxStyle,
  linkStyle,
} from '../shared/email-styles';

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

const readySection = {
  padding: emailSpacing['3xl'],
  textAlign: 'center' as const,
  backgroundColor: emailColors.successLight,
  border: `2px solid ${emailColors.success}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const readyTitle = {
  fontSize: emailFontSizes['2xl'],
  fontWeight: 'bold',
  color: emailColors.successDark,
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
};

const readyText = {
  fontSize: emailFontSizes.lg,
  color: emailColors.successDark,
  margin: `0 0 ${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const orderIdBadge = {
  fontSize: emailFontSizes.xl,
  fontWeight: 'bold',
  color: emailColors.successDark,
  margin: `${emailSpacing.lg} 0`,
  padding: emailSpacing.md,
  backgroundColor: emailColors.white,
  border: `2px solid ${emailColors.success}`,
  borderRadius: emailBorderRadius.md,
  display: 'inline-block',
  fontFamily: emailFonts.primary,
};

const pickupInfoSection = {
  ...infoBoxStyle,
};

const infoTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.warningDark,
  margin: `0 0 ${emailSpacing.md} 0`,
  fontFamily: emailFonts.primary,
};

const infoText = {
  fontSize: emailFontSizes.base,
  color: emailColors.warningDark,
  margin: `${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const instructionsSection = {
  padding: emailSpacing.xl,
  backgroundColor: emailColors.accentLight,
  border: `1px solid ${emailColors.accent}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const instructionsTitle = {
  fontSize: emailFontSizes.md,
  fontWeight: 'bold',
  color: emailColors.accentDark,
  margin: `0 0 ${emailSpacing.md} 0`,
  fontFamily: emailFonts.primary,
};

const instructionsText = {
  fontSize: emailFontSizes.base,
  color: emailColors.accentDark,
  margin: `${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const ctaSection = {
  textAlign: 'center' as const,
  padding: `${emailSpacing.xl} 0`,
};

const mapSection = {
  textAlign: 'center' as const,
  padding: emailSpacing.lg,
  backgroundColor: emailColors.backgroundAlt,
  borderRadius: emailBorderRadius.md,
  margin: `${emailSpacing.lg} 0`,
};

const contactSection = {
  padding: emailSpacing.xl,
  textAlign: 'center' as const,
};

const contactText = {
  fontSize: emailFontSizes.base,
  color: emailColors.secondaryLight,
  margin: `${emailSpacing.sm} 0`,
  fontFamily: emailFonts.primary,
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
  shopAddress = '2351 Mission St, San Francisco, CA 94110',
  shopPhone = '(415) 872-9372',
  supportEmail = 'hola@destinosf.com',
  websiteUrl = 'https://destinosf.com',
  pickupInstructions = 'Please come to the front counter and provide your name and order number.',
  parkingInfo = 'Street parking is available on Mission Street. Please check local signs for restrictions.',
  preparationTime = '30-45 minutes',
}: PickupReadyEmailProps) => {
  const previewText = `Order #${order.id} is ready for pickup at ${shopName}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName={shopName} />

          {/* Ready for Pickup Section */}
          <Section style={readySection}>
            <Text style={readyTitle}>Your Order is Ready!</Text>
            <Text style={readyText}>
              Hi {order.customerName}, your delicious order is ready for pickup!
            </Text>
            <div style={orderIdBadge}>Order #{order.id}</div>
            <Text style={{ ...readyText, fontSize: emailFontSizes.md, marginTop: emailSpacing.lg }}>
              Please come by when convenient to pick up your fresh, hot meal.
            </Text>
          </Section>

          {/* Pickup Information */}
          <Section style={pickupInfoSection}>
            <Text style={infoTitle}>Pickup Information</Text>
            <Text style={infoText}>
              <strong>Location:</strong> {shopAddress}
            </Text>
            <Text style={infoText}>
              <strong>Phone:</strong>{' '}
              <Link href={`tel:${shopPhone.replace(/[^\d+]/g, '')}`} style={{ color: emailColors.warningDark }}>
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
            <Text style={instructionsTitle}>Pickup Instructions</Text>
            <Text style={instructionsText}>{pickupInstructions}</Text>
            {parkingInfo && (
              <>
                <Text style={{ ...instructionsTitle, marginTop: emailSpacing.lg }}>Parking Information</Text>
                <Text style={instructionsText}>{parkingInfo}</Text>
              </>
            )}
            <Text style={{ ...instructionsTitle, marginTop: emailSpacing.lg }}>Keep in Mind</Text>
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
                <Button href={`tel:${shopPhone.replace(/[^\d+]/g, '')}`} style={primaryButtonStyle}>
                  Call if Questions
                </Button>
                <Button
                  href={`https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`}
                  style={secondaryButtonStyle}
                >
                  Get Directions
                </Button>
              </Column>
            </Row>
          </Section>

          {/* Map/Directions Section */}
          <Section style={mapSection}>
            <Text
              style={{
                fontSize: emailFontSizes.base,
                color: emailColors.secondaryLight,
                margin: `0 0 ${emailSpacing.sm} 0`,
                fontWeight: 'bold',
                fontFamily: emailFonts.primary,
              }}
            >
              Need directions?
            </Text>
            <Text style={{ fontSize: emailFontSizes.sm, color: emailColors.textMuted, margin: '0', fontFamily: emailFonts.primary }}>
              <Link
                href={`https://maps.google.com/?q=${encodeURIComponent(shopAddress)}`}
                style={linkStyle}
              >
                Open in Google Maps
              </Link>
              {' | '}
              <Link
                href={`https://maps.apple.com/?q=${encodeURIComponent(shopAddress)}`}
                style={linkStyle}
              >
                Open in Apple Maps
              </Link>
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={contactSection}>
            <Text style={contactText}>Unable to pick up right now or have questions?</Text>
            <Text style={contactText}>
              Call us at{' '}
              <Link href={`tel:${shopPhone.replace(/[^\d+]/g, '')}`} style={linkStyle}>
                {shopPhone}
              </Link>{' '}
              or email{' '}
              <Link href={`mailto:${supportEmail}`} style={linkStyle}>
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
