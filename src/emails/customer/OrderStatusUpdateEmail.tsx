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

interface OrderStatusUpdateEmailProps {
  order: {
    id: string;
    customerName: string;
    email: string;
    total: number;
    taxAmount?: number;
    deliveryFee?: number;
    serviceFee?: number;
    gratuityAmount?: number;
    shippingCostCents?: number;
    status: string;
    fulfillmentType?: string;
    pickupTime?: Date | null;
    deliveryDate?: string | null;
    deliveryTime?: string | null;
    trackingNumber?: string | null;
    items: OrderItem[];
    notes?: string;
  };
  previousStatus: string;
  shopName: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  statusMessage?: string;
  nextSteps?: string;
}

const statusSection = {
  padding: emailSpacing['3xl'],
  textAlign: 'center' as const,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const statusTitle = {
  fontSize: emailFontSizes['2xl'],
  fontWeight: 'bold',
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
};

const statusText = {
  fontSize: emailFontSizes.md,
  margin: `0 0 ${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const progressSection = {
  padding: emailSpacing['2xl'],
  backgroundColor: emailColors.backgroundAlt,
  border: `1px solid ${emailColors.border}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const progressTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.lg} 0`,
  textAlign: 'center' as const,
  fontFamily: emailFonts.primary,
};

const progressStep = {
  display: 'flex',
  alignItems: 'center',
  margin: `${emailSpacing.md} 0`,
  padding: emailSpacing.sm,
  borderRadius: emailBorderRadius.md,
};

const stepIcon = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: emailSpacing.md,
  fontSize: emailFontSizes.sm,
  fontWeight: 'bold',
};

const stepText = {
  fontSize: emailFontSizes.base,
  margin: '0',
  fontFamily: emailFonts.primary,
};

const trackingSection = {
  padding: emailSpacing.lg,
  backgroundColor: emailColors.primaryLight,
  borderRadius: emailBorderRadius.md,
  margin: `${emailSpacing.lg} 0`,
  border: `1px solid ${emailColors.primary}`,
};

const nextStepsSection = {
  ...infoBoxStyle,
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

const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: 'Order Received',
    PROCESSING: 'Being Prepared',
    READY: 'Ready for Pickup',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    FULFILLMENT_UPDATED: 'Fulfillment Updated',
    SHIPPING: 'Shipped',
    DELIVERED: 'Delivered',
  };
  return statusMap[status] || status;
};

const getStatusColor = (status: string): { backgroundColor: string; color: string } => {
  const colorMap: Record<string, { backgroundColor: string; color: string }> = {
    PENDING: { backgroundColor: emailColors.primaryLight, color: emailColors.warningDark },
    PROCESSING: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark },
    READY: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
    COMPLETED: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
    CANCELLED: { backgroundColor: emailColors.errorLight, color: emailColors.errorDark },
    SHIPPING: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark },
    DELIVERED: { backgroundColor: emailColors.successLight, color: emailColors.successDark },
  };
  return colorMap[status] || { backgroundColor: emailColors.backgroundAlt, color: emailColors.text };
};

const getStatusIcon = (status: string): string => {
  const iconMap: Record<string, string> = {
    PENDING: '1',
    PROCESSING: '2',
    READY: '3',
    COMPLETED: '4',
    CANCELLED: 'X',
    SHIPPING: '3',
    DELIVERED: '4',
  };
  return iconMap[status] || '?';
};

const getOrderSteps = (fulfillmentType: string, currentStatus: string) => {
  const steps = {
    pickup: [
      { status: 'PENDING', label: 'Order Received' },
      { status: 'PROCESSING', label: 'Being Prepared' },
      { status: 'READY', label: 'Ready for Pickup' },
      { status: 'COMPLETED', label: 'Picked Up' },
    ],
    local_delivery: [
      { status: 'PENDING', label: 'Order Received' },
      { status: 'PROCESSING', label: 'Being Prepared' },
      { status: 'SHIPPING', label: 'Out for Delivery' },
      { status: 'DELIVERED', label: 'Delivered' },
    ],
    nationwide_shipping: [
      { status: 'PENDING', label: 'Order Received' },
      { status: 'PROCESSING', label: 'Being Prepared' },
      { status: 'SHIPPING', label: 'Shipped' },
      { status: 'DELIVERED', label: 'Delivered' },
    ],
  };

  return steps[fulfillmentType as keyof typeof steps] || steps.pickup;
};

const getStatusMessage = (status: string, fulfillmentType: string): string => {
  const messages: Record<string, Record<string, string>> = {
    PROCESSING: {
      pickup:
        "Our chefs are preparing your delicious order! We'll notify you when it's ready for pickup.",
      local_delivery:
        "Our chefs are preparing your order! We'll notify you when it's out for delivery.",
      nationwide_shipping: 'Your order is being prepared and will be packaged for shipping.',
    },
    READY: {
      pickup: 'Great news! Your order is ready for pickup. Please come by at your convenience.',
      local_delivery: 'Your order is ready and will be delivered soon!',
      nationwide_shipping: 'Your order is ready for shipping.',
    },
    SHIPPING: {
      pickup: 'Your order status has been updated.',
      local_delivery: 'Your order is out for delivery! Our driver is on the way.',
      nationwide_shipping:
        'Your order has been shipped! You should receive it within 3-5 business days.',
    },
    DELIVERED: {
      pickup: 'Thank you for choosing us! We hope you enjoyed your meal.',
      local_delivery: 'Your order has been delivered! We hope you enjoy your meal.',
      nationwide_shipping: 'Your order has been delivered! We hope you enjoy your meal.',
    },
    COMPLETED: {
      pickup: 'Thank you for choosing us! We hope you enjoyed your meal.',
      local_delivery: 'Thank you for choosing us! We hope you enjoyed your meal.',
      nationwide_shipping: 'Thank you for choosing us! We hope you enjoyed your meal.',
    },
  };

  return messages[status]?.[fulfillmentType] || 'Your order status has been updated.';
};

export const OrderStatusUpdateEmail = ({
  order,
  previousStatus,
  shopName = 'Destino SF',
  supportEmail = 'hola@destinosf.com',
  supportPhone = '(415) 872-9372',
  websiteUrl = 'https://destinosf.com',
  statusMessage,
  nextSteps,
}: OrderStatusUpdateEmailProps) => {
  const statusColors = getStatusColor(order.status);
  const defaultMessage = getStatusMessage(order.status, order.fulfillmentType || 'pickup');
  const orderSteps = getOrderSteps(order.fulfillmentType || 'pickup', order.status);

  const previewText = `Order #${order.id} status update: ${formatStatus(order.status)}`;

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

          {/* Status Update Section */}
          <Section style={{ ...statusSection, backgroundColor: statusColors.backgroundColor }}>
            <Text style={{ ...statusTitle, color: statusColors.color }}>
              Order Update
            </Text>
            <Text style={{ ...statusText, color: statusColors.color }}>
              Hi {order.customerName}, your order status has been updated to:
            </Text>
            <Text
              style={{
                ...statusTitle,
                color: statusColors.color,
                fontSize: emailFontSizes.xl,
                margin: `${emailSpacing.lg} 0`,
              }}
            >
              {formatStatus(order.status)}
            </Text>
            <Text style={{ ...statusText, color: statusColors.color }}>
              {statusMessage || defaultMessage}
            </Text>
          </Section>

          {/* Progress Tracker */}
          <Section style={progressSection}>
            <Text style={progressTitle}>Order Progress</Text>
            {orderSteps.map((step, index) => {
              const isCompleted = orderSteps.findIndex(s => s.status === order.status) >= index;
              const isCurrent = step.status === order.status;

              return (
                <div
                  key={step.status}
                  style={{
                    ...progressStep,
                    backgroundColor: isCurrent ? statusColors.backgroundColor : 'transparent',
                  }}
                >
                  <div
                    style={{
                      ...stepIcon,
                      backgroundColor: isCompleted ? emailColors.primary : emailColors.border,
                      color: isCompleted ? emailColors.secondary : emailColors.textMuted,
                    }}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <Text
                    style={{
                      ...stepText,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isCurrent ? statusColors.color : isCompleted ? emailColors.secondary : emailColors.textMuted,
                    }}
                  >
                    {step.label}
                  </Text>
                </div>
              );
            })}
          </Section>

          {/* Tracking Information */}
          {order.trackingNumber && (
            <Section style={trackingSection}>
              <Text
                style={{
                  fontSize: emailFontSizes.base,
                  color: emailColors.warningDark,
                  margin: `0 0 ${emailSpacing.sm} 0`,
                  fontWeight: 'bold',
                  fontFamily: emailFonts.primary,
                }}
              >
                Tracking Information
              </Text>
              <Text style={{ fontSize: emailFontSizes.base, color: emailColors.warningDark, margin: '0', fontFamily: emailFonts.primary }}>
                Tracking Number: <strong>{order.trackingNumber}</strong>
              </Text>
            </Section>
          )}

          {/* Next Steps */}
          {nextSteps && (
            <Section style={nextStepsSection}>
              <Text style={{ fontSize: emailFontSizes.base, color: emailColors.warningDark, margin: '0', fontWeight: 'bold', fontFamily: emailFonts.primary }}>
                Next Steps:
              </Text>
              <Text style={{ fontSize: emailFontSizes.base, color: emailColors.warningDark, margin: `${emailSpacing.sm} 0 0 0`, fontFamily: emailFonts.primary }}>
                {nextSteps}
              </Text>
            </Section>
          )}

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
            trackingNumber={order.trackingNumber}
            notes={order.notes}
            showPricing={true}
          />

          {/* Call to Action */}
          <Section style={ctaSection}>
            <Button href={`${websiteUrl}/orders/${order.id}`} style={primaryButtonStyle}>
              View Order Details
            </Button>
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

export default OrderStatusUpdateEmail;
