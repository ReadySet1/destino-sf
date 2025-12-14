import {
  Body,
  Container,
  Head,
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

const confirmationSection = {
  padding: emailSpacing['3xl'],
  textAlign: 'center' as const,
  backgroundColor: emailColors.primaryLight,
  border: `2px solid ${emailColors.primary}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const thankYouTitle = {
  fontSize: emailFontSizes['2xl'],
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
};

const confirmationText = {
  fontSize: emailFontSizes.md,
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const orderIdBadge = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `${emailSpacing.lg} 0`,
  padding: emailSpacing.md,
  backgroundColor: emailColors.white,
  border: `2px solid ${emailColors.primary}`,
  borderRadius: emailBorderRadius.md,
  display: 'inline-block',
  fontFamily: emailFonts.primary,
};

const infoSectionStyle = {
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

const ctaSection = {
  textAlign: 'center' as const,
  padding: `${emailSpacing.xl} 0`,
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
  supportEmail = 'hola@destinosf.com',
  supportPhone = '(415) 872-9372',
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
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName={shopName} />

          {/* Order Confirmation Section */}
          <Section style={confirmationSection}>
            <Text style={thankYouTitle}>Order Confirmed!</Text>
            <Text style={confirmationText}>
              Thank you, {order.customerName}! Your order has been received and is being prepared.
            </Text>
            <div style={orderIdBadge}>Order #{order.id}</div>
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
          <Section style={infoSectionStyle}>
            <Text style={infoTitle}>Order Details</Text>

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
                <Button href={`${websiteUrl}/orders/${order.id}`} style={primaryButtonStyle}>
                  Track Your Order
                </Button>
                <Button href={websiteUrl} style={secondaryButtonStyle}>
                  Order Again
                </Button>
              </Column>
            </Row>
          </Section>

          {/* Contact Information */}
          <Section style={contactSection}>
            <Text style={contactText}>Questions about your order?</Text>
            <Text style={contactText}>
              Call us at{' '}
              <Link href={`tel:${supportPhone.replace(/[^\d+]/g, '')}`} style={linkStyle}>
                {supportPhone}
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

export default OrderConfirmationEmail;
