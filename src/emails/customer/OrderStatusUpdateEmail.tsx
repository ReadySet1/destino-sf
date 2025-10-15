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

const statusSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  borderRadius: '8px',
  margin: '20px 0',
};

const statusTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const statusText = {
  fontSize: '16px',
  margin: '0 0 8px 0',
  lineHeight: '24px',
};

const progressSection = {
  padding: '24px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '20px 0',
};

const progressTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#2d3748',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const progressStep = {
  display: 'flex',
  alignItems: 'center',
  margin: '12px 0',
  padding: '8px',
  borderRadius: '6px',
};

const stepIcon = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  fontSize: '12px',
  fontWeight: 'bold',
};

const stepText = {
  fontSize: '14px',
  margin: '0',
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
    PENDING: { backgroundColor: '#fef3c7', color: '#92400e' },
    PROCESSING: { backgroundColor: '#dbeafe', color: '#1e40af' },
    READY: { backgroundColor: '#d1fae5', color: '#065f46' },
    COMPLETED: { backgroundColor: '#d1fae5', color: '#065f46' },
    CANCELLED: { backgroundColor: '#fee2e2', color: '#991b1b' },
    SHIPPING: { backgroundColor: '#e0e7ff', color: '#3730a3' },
    DELIVERED: { backgroundColor: '#d1fae5', color: '#065f46' },
  };
  return colorMap[status] || { backgroundColor: '#f3f4f6', color: '#374151' };
};

const getStatusIcon = (status: string): string => {
  const iconMap: Record<string, string> = {
    PENDING: '📝',
    PROCESSING: '👨‍🍳',
    READY: '✅',
    COMPLETED: '🎉',
    CANCELLED: '❌',
    SHIPPING: '🚚',
    DELIVERED: '📦',
  };
  return iconMap[status] || '📋';
};

const getOrderSteps = (fulfillmentType: string, currentStatus: string) => {
  const steps = {
    pickup: [
      { status: 'PENDING', label: 'Order Received', icon: '📝' },
      { status: 'PROCESSING', label: 'Being Prepared', icon: '👨‍🍳' },
      { status: 'READY', label: 'Ready for Pickup', icon: '✅' },
      { status: 'COMPLETED', label: 'Picked Up', icon: '🎉' },
    ],
    local_delivery: [
      { status: 'PENDING', label: 'Order Received', icon: '📝' },
      { status: 'PROCESSING', label: 'Being Prepared', icon: '👨‍🍳' },
      { status: 'SHIPPING', label: 'Out for Delivery', icon: '🚚' },
      { status: 'DELIVERED', label: 'Delivered', icon: '📦' },
    ],
    nationwide_shipping: [
      { status: 'PENDING', label: 'Order Received', icon: '📝' },
      { status: 'PROCESSING', label: 'Being Prepared', icon: '👨‍🍳' },
      { status: 'SHIPPING', label: 'Shipped', icon: '🚚' },
      { status: 'DELIVERED', label: 'Delivered', icon: '📦' },
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
  supportEmail = 'support@destinosf.com',
  supportPhone = '(415) 555-0123',
  websiteUrl = 'https://destinosf.com',
  statusMessage,
  nextSteps,
}: OrderStatusUpdateEmailProps) => {
  const statusColors = getStatusColor(order.status);
  const statusIcon = getStatusIcon(order.status);
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
      <Body style={main}>
        <Container style={container}>
          <EmailHeader shopName={shopName} />

          {/* Status Update Section */}
          <Section style={{ ...statusSection, backgroundColor: statusColors.backgroundColor }}>
            <Text style={{ ...statusTitle, color: statusColors.color }}>
              {statusIcon} Order Update
            </Text>
            <Text style={{ ...statusText, color: statusColors.color }}>
              Hi {order.customerName}, your order status has been updated to:
            </Text>
            <Text
              style={{
                ...statusTitle,
                color: statusColors.color,
                fontSize: '20px',
                margin: '16px 0',
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
                      backgroundColor: isCompleted ? '#059669' : '#e2e8f0',
                      color: isCompleted ? '#ffffff' : '#9ca3af',
                    }}
                  >
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <Text
                    style={{
                      ...stepText,
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isCurrent ? statusColors.color : isCompleted ? '#059669' : '#9ca3af',
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
            <Section
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                margin: '16px 0',
              }}
            >
              <Text
                style={{
                  fontSize: '14px',
                  color: '#0c4a6e',
                  margin: '0 0 8px 0',
                  fontWeight: 'bold',
                }}
              >
                📦 Tracking Information
              </Text>
              <Text style={{ fontSize: '14px', color: '#0c4a6e', margin: '0' }}>
                Tracking Number: <strong>{order.trackingNumber}</strong>
              </Text>
            </Section>
          )}

          {/* Next Steps */}
          {nextSteps && (
            <Section
              style={{
                padding: '16px',
                backgroundColor: '#fefce8',
                borderRadius: '6px',
                margin: '16px 0',
              }}
            >
              <Text style={{ fontSize: '14px', color: '#713f12', margin: '0', fontWeight: 'bold' }}>
                Next Steps:
              </Text>
              <Text style={{ fontSize: '14px', color: '#713f12', margin: '8px 0 0 0' }}>
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
            <Button href={`${websiteUrl}/orders/${order.id}`} style={primaryButton}>
              View Order Details
            </Button>
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

export default OrderStatusUpdateEmail;
