import { Section, Text, Row, Column, Hr } from '@react-email/components';
import * as React from 'react';
import { formatOrderNotes } from '@/lib/email-utils';

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

interface OrderSummaryProps {
  orderId: string;
  items: OrderItem[];
  total: number;
  tax?: number;
  subtotal?: number;
  shippingCost?: number;
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
  padding: '24px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '16px 0',
};

const summaryTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#2d3748',
  margin: '0 0 16px 0',
};

const itemRow = {
  padding: '8px 0',
  borderBottom: '1px solid #e2e8f0',
};

const itemName = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0',
};

const itemDetails = {
  fontSize: '12px',
  color: '#718096',
  margin: '2px 0 0 0',
};

const priceText = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#2d3748',
  textAlign: 'right' as const,
  margin: '0',
};

const totalRow = {
  padding: '12px 0',
  borderTop: '2px solid #2d3748',
  marginTop: '8px',
};

const totalText = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#2d3748',
  margin: '0',
};

const fulfillmentSection = {
  marginTop: '16px',
  padding: '16px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
};

const fulfillmentTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#2d3748',
  margin: '0 0 8px 0',
};

const fulfillmentText = {
  fontSize: '13px',
  color: '#4a5568',
  margin: '2px 0',
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

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderId,
  items,
  total,
  tax,
  subtotal,
  shippingCost,
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
      <Text style={summaryTitle}>
        Order Summary
      </Text>

      {/* Order Items */}
      {items.map((item, index) => (
        <Row key={index} style={itemRow}>
          <Column style={{ width: '60%' }}>
            <Text style={itemName}>
              {item.quantity}x {item.product.name}
            </Text>
            {item.variant && (
              <Text style={itemDetails}>
                {item.variant.name}
              </Text>
            )}
          </Column>
          <Column style={{ width: '40%' }}>
            <Text style={priceText}>
              {formatCurrency(item.price * item.quantity)}
            </Text>
          </Column>
        </Row>
      ))}

      <Hr style={{ borderColor: '#e2e8f0', margin: '16px 0' }} />

      {/* Pricing Information */}
      {showPricing && (
        <>
          {subtotal && (
            <Row style={{ padding: '4px 0' }}>
              <Column style={{ width: '60%' }}>
                <Text style={itemDetails}>Subtotal:</Text>
              </Column>
              <Column style={{ width: '40%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(subtotal)}
                </Text>
              </Column>
            </Row>
          )}

          {tax && tax > 0 && (
            <Row style={{ padding: '4px 0' }}>
              <Column style={{ width: '60%' }}>
                <Text style={itemDetails}>Tax:</Text>
              </Column>
              <Column style={{ width: '40%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(tax)}
                </Text>
              </Column>
            </Row>
          )}

          {shippingCost && shippingCost > 0 && (
            <Row style={{ padding: '4px 0' }}>
              <Column style={{ width: '60%' }}>
                <Text style={itemDetails}>Shipping:</Text>
              </Column>
              <Column style={{ width: '40%' }}>
                <Text style={{ ...itemDetails, textAlign: 'right' as const }}>
                  {formatCurrency(shippingCost)}
                </Text>
              </Column>
            </Row>
          )}

          <Row style={totalRow}>
            <Column style={{ width: '60%' }}>
              <Text style={totalText}>Total:</Text>
            </Column>
            <Column style={{ width: '40%' }}>
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
          <Text style={fulfillmentTitle}>
            {formatFulfillmentType(fulfillmentType)} Details
          </Text>
          
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
                  <strong>Shipping to:</strong><br />
                  {formattedNotes.hasShippingAddress ? (
                    formattedNotes.shippingAddress?.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < formattedNotes.shippingAddress!.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      {shippingAddress?.street}<br />
                      {shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postalCode}
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
        <Section style={{ 
          marginTop: '16px', 
          padding: '16px', 
          backgroundColor: '#fefce8', 
          border: '1px solid #f59e0b', 
          borderRadius: '6px' 
        }}>
          <Text style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#92400e', 
            margin: '0 0 8px 0' 
          }}>
            Special Requests:
          </Text>
          <Text style={{ 
            fontSize: '14px', 
            color: '#92400e', 
            margin: '0',
            whiteSpace: 'pre-wrap'
          }}>
            {formattedNotes.otherNotes}
          </Text>
        </Section>
      )}
    </Section>
  );
};

export default OrderSummary; 