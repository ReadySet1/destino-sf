import { Section, Text, Row, Column, Hr } from '@react-email/components';
import * as React from 'react';
import { formatOrderNotes } from '@/lib/email-utils';
import {
  emailColors,
  emailFonts,
  emailSpacing,
  emailFontSizes,
  emailBorderRadius,
  emailLineHeights,
  preorderBadgeStyle,
} from './email-styles';

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

interface OrderSummaryProps {
  orderId: string;
  items: OrderItem[];
  total: number;
  tax?: number;
  subtotal?: number;
  shippingCost?: number;
  deliveryFee?: number;
  serviceFee?: number;
  gratuityAmount?: number;
  fulfillmentType?: string;
  pickupTime?: Date | null;
  deliveryDate?: string | null;
  deliveryTime?: string | null;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  trackingNumber?: string | null;
  notes?: string | null;
  showPricing?: boolean;
}

const summarySection = {
  padding: emailSpacing['2xl'],
  backgroundColor: emailColors.backgroundAlt,
  border: `1px solid ${emailColors.border}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.lg} 0`,
};

const summaryTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
  borderBottom: `2px solid ${emailColors.primary}`,
  paddingBottom: emailSpacing.sm,
};

const itemRow = {
  padding: `${emailSpacing.sm} 0`,
  borderBottom: `1px solid ${emailColors.border}`,
};

const itemName = {
  fontSize: emailFontSizes.base,
  fontWeight: '600',
  color: emailColors.secondary,
  margin: '0',
  fontFamily: emailFonts.primary,
  lineHeight: emailLineHeights.normal,
};

const itemDetails = {
  fontSize: emailFontSizes.sm,
  color: emailColors.textMuted,
  margin: `${emailSpacing.xs} 0 0 0`,
  fontFamily: emailFonts.primary,
};

const priceText = {
  fontSize: emailFontSizes.base,
  fontWeight: '600',
  color: emailColors.secondary,
  textAlign: 'right' as const,
  margin: '0',
  fontFamily: emailFonts.primary,
};

const totalRow = {
  padding: `${emailSpacing.md} 0`,
  borderTop: `2px solid ${emailColors.secondary}`,
  marginTop: emailSpacing.sm,
};

const totalText = {
  fontSize: emailFontSizes.md,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: '0',
  fontFamily: emailFonts.primary,
};

const fulfillmentSection = {
  marginTop: emailSpacing.lg,
  padding: emailSpacing.lg,
  backgroundColor: emailColors.white,
  border: `1px solid ${emailColors.border}`,
  borderRadius: emailBorderRadius.md,
};

const fulfillmentTitle = {
  fontSize: emailFontSizes.base,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.sm} 0`,
  fontFamily: emailFonts.primary,
};

const fulfillmentText = {
  fontSize: emailFontSizes.sm,
  color: emailColors.secondaryLight,
  margin: `${emailSpacing.xs} 0`,
  fontFamily: emailFonts.primary,
  lineHeight: emailLineHeights.relaxed,
};

const specialNotesSection = {
  marginTop: emailSpacing.lg,
  padding: emailSpacing.lg,
  backgroundColor: emailColors.primaryLight,
  border: `1px solid ${emailColors.primary}`,
  borderRadius: emailBorderRadius.md,
};

const specialNotesTitle = {
  fontSize: emailFontSizes.base,
  fontWeight: 'bold',
  color: emailColors.warningDark,
  margin: `0 0 ${emailSpacing.sm} 0`,
  fontFamily: emailFonts.primary,
};

const specialNotesText = {
  fontSize: emailFontSizes.base,
  color: emailColors.warningDark,
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  fontFamily: emailFonts.primary,
  lineHeight: emailLineHeights.relaxed,
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
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

const formatEstimatedDelivery = (date: Date | string | null) => {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderId,
  items,
  total,
  tax,
  subtotal,
  shippingCost,
  deliveryFee,
  serviceFee,
  gratuityAmount,
  fulfillmentType,
  pickupTime,
  deliveryDate,
  deliveryTime,
  shippingAddress,
  trackingNumber,
  notes,
  showPricing = true,
}) => {
  // Format notes to extract shipping address and other information
  const formattedNotes = formatOrderNotes(notes || null);

  return (
    <Section style={summarySection}>
      <Text style={summaryTitle}>Order Summary</Text>

      {/* Order Items */}
      {items.map((item, index) => (
        <Row key={index} style={itemRow}>
          <Column style={{ width: '65%' }}>
            <Text style={itemName}>
              {item.quantity}x {item.product.name}
              {item.product.isPreorder && <span style={preorderBadgeStyle}>Pre-order</span>}
            </Text>
            {item.variant && <Text style={itemDetails}>{item.variant.name}</Text>}
            {item.product.isPreorder && item.product.preorderEndDate && (
              <Text style={itemDetails}>
                Estimated delivery: {formatEstimatedDelivery(item.product.preorderEndDate)}
              </Text>
            )}
          </Column>
          <Column style={{ width: '35%' }}>
            <Text style={priceText}>{formatCurrency(item.price * item.quantity)}</Text>
          </Column>
        </Row>
      ))}

      <Hr style={{ borderColor: emailColors.border, margin: `${emailSpacing.lg} 0` }} />

      {/* Pricing Information */}
      {showPricing && (
        <>
          {subtotal && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Subtotal:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(subtotal)}
                </Text>
              </Column>
            </Row>
          )}

          {tax && tax > 0 && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Tax:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(tax)}
                </Text>
              </Column>
            </Row>
          )}

          {shippingCost && shippingCost > 0 && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Shipping:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(shippingCost)}
                </Text>
              </Column>
            </Row>
          )}

          {deliveryFee && deliveryFee > 0 && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Delivery Fee:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(deliveryFee)}
                </Text>
              </Column>
            </Row>
          )}

          {serviceFee && serviceFee > 0 && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Service Fee:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(serviceFee)}
                </Text>
              </Column>
            </Row>
          )}

          {gratuityAmount && gratuityAmount > 0 && (
            <Row style={{ padding: `${emailSpacing.xs} 0` }}>
              <Column style={{ width: '65%' }}>
                <Text style={itemDetails}>Gratuity:</Text>
              </Column>
              <Column style={{ width: '35%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(gratuityAmount)}
                </Text>
              </Column>
            </Row>
          )}

          <Row style={totalRow}>
            <Column style={{ width: '65%' }}>
              <Text style={totalText}>Total:</Text>
            </Column>
            <Column style={{ width: '35%' }}>
              <Text style={{ ...totalText, textAlign: 'right' as const }}>
                {formatCurrency(Number(total))}
              </Text>
            </Column>
          </Row>
        </>
      )}

      {/* Fulfillment Information */}
      {fulfillmentType && (
        <Section style={fulfillmentSection}>
          <Text style={fulfillmentTitle}>{formatFulfillmentType(fulfillmentType)} Details</Text>

          {fulfillmentType === 'pickup' && pickupTime && (
            <Text style={fulfillmentText}>
              <strong>Pickup Time:</strong> {formatDateTime(pickupTime)}
            </Text>
          )}

          {fulfillmentType === 'local_delivery' && (
            <>
              {deliveryDate && (
                <Text style={fulfillmentText}>
                  <strong>Delivery:</strong> {formatDateTime(deliveryDate, deliveryTime)}
                </Text>
              )}
            </>
          )}

          {fulfillmentType === 'nationwide_shipping' && (
            <>
              {/* Use formatted shipping address from notes if available, otherwise fall back to props */}
              {(formattedNotes.hasShippingAddress || shippingAddress) && (
                <Text style={fulfillmentText}>
                  <strong>Shipping to:</strong>
                  <br />
                  {formattedNotes.hasShippingAddress ? (
                    formattedNotes.shippingAddress?.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < formattedNotes.shippingAddress!.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      {shippingAddress?.street}
                      <br />
                      {shippingAddress?.city}, {shippingAddress?.state}{' '}
                      {shippingAddress?.postalCode}
                    </>
                  )}
                </Text>
              )}

              {trackingNumber && (
                <Text style={fulfillmentText}>
                  <strong>Tracking Number:</strong> {trackingNumber}
                </Text>
              )}
            </>
          )}
        </Section>
      )}

      {/* Special Notes Section */}
      {formattedNotes.otherNotes && (
        <Section style={specialNotesSection}>
          <Text style={specialNotesTitle}>Special Requests:</Text>
          <Text style={specialNotesText}>{formattedNotes.otherNotes}</Text>
        </Section>
      )}
    </Section>
  );
};

export default OrderSummary;
