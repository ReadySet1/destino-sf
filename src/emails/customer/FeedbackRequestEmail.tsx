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

interface FeedbackRequestEmailProps {
  order: {
    id: string;
    customerName: string;
    email: string;
    total: number;
    completedAt?: Date | null;
    fulfillmentType?: string;
  };
  shopName: string;
  supportEmail?: string;
  websiteUrl?: string;
  reviewPlatforms?: {
    google?: string;
    yelp?: string;
    facebook?: string;
  };
  incentive?: {
    description: string;
    details: string;
  };
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

const feedbackSection = {
  padding: '32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#fef7ff',
  border: '1px solid #d946ef',
  borderRadius: '8px',
  margin: '20px 0',
};

const feedbackTitle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#86198f',
  margin: '0 0 16px 0',
};

const feedbackText = {
  fontSize: '16px',
  color: '#86198f',
  margin: '0 0 8px 0',
  lineHeight: '24px',
};

const ratingSection = {
  padding: '24px',
  backgroundColor: '#fefce8',
  border: '1px solid #facc15',
  borderRadius: '8px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const ratingTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#713f12',
  margin: '0 0 16px 0',
};

const starButton = {
  display: 'inline-block',
  fontSize: '32px',
  margin: '4px 2px',
  textDecoration: 'none',
  borderRadius: '4px',
  padding: '8px 12px',
  transition: 'all 0.2s ease',
};

const reviewPlatformSection = {
  padding: '20px',
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  margin: '20px 0',
};

const reviewTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0c4a6e',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const platformButton = {
  backgroundColor: '#0ea5e9',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
  margin: '8px 8px',
  minWidth: '120px',
};

const incentiveSection = {
  padding: '20px',
  backgroundColor: '#ecfdf5',
  border: '1px solid #10b981',
  borderRadius: '8px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const incentiveTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#065f46',
  margin: '0 0 12px 0',
};

const incentiveText = {
  fontSize: '14px',
  color: '#065f46',
  margin: '8px 0',
  lineHeight: '20px',
};

const feedbackFormSection = {
  padding: '20px',
  backgroundColor: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  margin: '20px 0',
};

const formTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#334155',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const formText = {
  fontSize: '14px',
  color: '#475569',
  margin: '8px 0',
  lineHeight: '20px',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  margin: '8px',
};

const formatDateTime = (date: Date | string | null) => {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatFulfillmentType = (type: string) => {
  const typeMap: Record<string, string> = {
    pickup: 'pickup',
    local_delivery: 'delivery',
    nationwide_shipping: 'shipping',
  };
  return typeMap[type] || type;
};

export const FeedbackRequestEmail = ({
  order,
  shopName = 'Destino SF',
  supportEmail = 'support@destinosf.com',
  websiteUrl = 'https://destinosf.com',
  reviewPlatforms = {},
  incentive,
}: FeedbackRequestEmailProps) => {
  const previewText = `How was your ${formatFulfillmentType(order.fulfillmentType || 'pickup')} experience with ${shopName}?`;
  const feedbackUrl = `${websiteUrl}/feedback?order=${order.id}&email=${encodeURIComponent(order.email)}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader shopName={shopName} />

          {/* Feedback Request Section */}
          <Section style={feedbackSection}>
            <Text style={feedbackTitle}>
              💜 How was your experience?
            </Text>
            <Text style={feedbackText}>
              Hi {order.customerName}! We hope you enjoyed your recent order from {shopName}.
            </Text>
            <Text style={feedbackText}>
              Your feedback helps us continue serving the best authentic Mexican cuisine in San Francisco.
            </Text>
          </Section>

          {/* Quick Rating */}
          <Section style={ratingSection}>
            <Text style={ratingTitle}>
              ⭐ Quick Rating
            </Text>
            <Text style={{ fontSize: '14px', color: '#713f12', margin: '0 0 16px 0' }}>
              How would you rate your overall experience?
            </Text>
            <div style={{ textAlign: 'center' }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Link
                  key={rating}
                  href={`${feedbackUrl}&rating=${rating}`}
                  style={{
                    ...starButton,
                    backgroundColor: rating <= 3 ? '#fef3c7' : '#dcfce7',
                    color: rating <= 3 ? '#92400e' : '#166534',
                  }}
                >
                  {'⭐'.repeat(rating)}
                </Link>
              ))}
            </div>
            <Text style={{ fontSize: '12px', color: '#713f12', margin: '16px 0 0 0' }}>
              Click the stars above to leave a quick rating
            </Text>
          </Section>

          {/* Detailed Feedback Form */}
          <Section style={feedbackFormSection}>
            <Text style={formTitle}>
              📝 Share More Details
            </Text>
            <Text style={formText}>
              We&apos;d love to hear more about your experience! Your detailed feedback helps us improve.
            </Text>
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <Button href={feedbackUrl} style={primaryButton}>
                Leave Detailed Feedback
              </Button>
            </div>
          </Section>

          {/* Review Platforms */}
          {(reviewPlatforms.google || reviewPlatforms.yelp || reviewPlatforms.facebook) && (
            <Section style={reviewPlatformSection}>
              <Text style={reviewTitle}>
                🌟 Love what you tried? Share it with others!
              </Text>
              <div style={{ textAlign: 'center' }}>
                {reviewPlatforms.google && (
                  <Button href={reviewPlatforms.google} style={platformButton}>
                    📱 Google Review
                  </Button>
                )}
                {reviewPlatforms.yelp && (
                  <Button href={reviewPlatforms.yelp} style={platformButton}>
                    🍽️ Yelp Review
                  </Button>
                )}
                {reviewPlatforms.facebook && (
                  <Button href={reviewPlatforms.facebook} style={platformButton}>
                    👥 Facebook Review
                  </Button>
                )}
              </div>
              <Text style={{ fontSize: '12px', color: '#0c4a6e', textAlign: 'center', margin: '12px 0 0 0' }}>
                Reviews help other food lovers discover our authentic Mexican cuisine
              </Text>
            </Section>
          )}

          {/* Incentive Offer */}
          {incentive && (
            <Section style={incentiveSection}>
              <Text style={incentiveTitle}>
                🎁 {incentive.description}
              </Text>
              <Text style={incentiveText}>
                {incentive.details}
              </Text>
            </Section>
          )}

          {/* Order Details */}
          <Section style={{ padding: '16px', backgroundColor: '#f1f5f9', borderRadius: '6px', margin: '16px 0' }}>
            <Text style={{ fontSize: '14px', color: '#475569', margin: '0 0 8px 0', fontWeight: 'bold', textAlign: 'center' as const }}>
              Order Details
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b', margin: '4px 0', textAlign: 'center' as const }}>
              Order #{order.id}
            </Text>
            {order.completedAt && (
              <Text style={{ fontSize: '12px', color: '#64748b', margin: '4px 0', textAlign: 'center' as const }}>
                Completed on {formatDateTime(order.completedAt)}
              </Text>
            )}
            <Text style={{ fontSize: '12px', color: '#64748b', margin: '4px 0', textAlign: 'center' as const }}>
              {formatFulfillmentType(order.fulfillmentType || 'pickup')} order
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={{ padding: '20px', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              Questions or concerns about your order?
            </Text>
            <Text style={{ fontSize: '14px', color: '#4a5568', margin: '8px 0' }}>
              We&apos;re here to help! Email us at{' '}
              <Link href={`mailto:${supportEmail}`} style={{ color: '#dc2626' }}>
                {supportEmail}
              </Link>
            </Text>
          </Section>

          {/* Thank You */}
          <Section style={{ padding: '20px', textAlign: 'center' as const, backgroundColor: '#fef7ff', borderRadius: '6px' }}>
            <Text style={{ fontSize: '16px', color: '#86198f', margin: '0', fontWeight: 'bold' }}>
              🙏 Thank you for choosing {shopName}!
            </Text>
            <Text style={{ fontSize: '14px', color: '#86198f', margin: '8px 0 0 0' }}>
              We appreciate your business and look forward to serving you again soon.
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

export default FeedbackRequestEmail; 