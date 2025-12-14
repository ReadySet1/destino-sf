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
  accentButtonStyle,
  linkStyle,
  cardStyle,
} from '../shared/email-styles';

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

const feedbackSection = {
  padding: emailSpacing['3xl'],
  textAlign: 'center' as const,
  backgroundColor: emailColors.primaryLight,
  border: `2px solid ${emailColors.primary}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const feedbackTitle = {
  fontSize: emailFontSizes['2xl'],
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
};

const feedbackText = {
  fontSize: emailFontSizes.md,
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const ratingSection = {
  padding: emailSpacing['2xl'],
  backgroundColor: emailColors.background,
  border: `1px solid ${emailColors.border}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
  textAlign: 'center' as const,
};

const ratingTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.lg} 0`,
  fontFamily: emailFonts.primary,
};

const starButton = {
  display: 'inline-block',
  fontSize: '28px',
  margin: `${emailSpacing.xs} ${emailSpacing.xs}`,
  textDecoration: 'none',
  borderRadius: emailBorderRadius.md,
  padding: `${emailSpacing.sm} ${emailSpacing.md}`,
};

const reviewPlatformSection = {
  padding: emailSpacing.xl,
  backgroundColor: emailColors.accentLight,
  border: `1px solid ${emailColors.accent}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
};

const reviewTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.accentDark,
  margin: `0 0 ${emailSpacing.lg} 0`,
  textAlign: 'center' as const,
  fontFamily: emailFonts.primary,
};

const platformButton = {
  ...accentButtonStyle,
  margin: emailSpacing.sm,
  minWidth: '120px',
};

const incentiveSection = {
  padding: emailSpacing.xl,
  backgroundColor: emailColors.successLight,
  border: `1px solid ${emailColors.success}`,
  borderRadius: emailBorderRadius.lg,
  margin: `${emailSpacing.xl} 0`,
  textAlign: 'center' as const,
};

const incentiveTitle = {
  fontSize: emailFontSizes.lg,
  fontWeight: 'bold',
  color: emailColors.successDark,
  margin: `0 0 ${emailSpacing.md} 0`,
  fontFamily: emailFonts.primary,
};

const incentiveText = {
  fontSize: emailFontSizes.base,
  color: emailColors.successDark,
  margin: `${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const feedbackFormSection = {
  ...cardStyle,
  textAlign: 'center' as const,
};

const formTitle = {
  fontSize: emailFontSizes.md,
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.md} 0`,
  fontFamily: emailFonts.primary,
};

const formText = {
  fontSize: emailFontSizes.base,
  color: emailColors.secondaryLight,
  margin: `${emailSpacing.sm} 0`,
  lineHeight: emailLineHeights.relaxed,
  fontFamily: emailFonts.primary,
};

const orderDetailsSection = {
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

const thankYouSection = {
  padding: emailSpacing.xl,
  textAlign: 'center' as const,
  backgroundColor: emailColors.primaryLight,
  borderRadius: emailBorderRadius.md,
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
  supportEmail = 'hola@destinosf.com',
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
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName={shopName} />

          {/* Feedback Request Section */}
          <Section style={feedbackSection}>
            <Text style={feedbackTitle}>How was your experience?</Text>
            <Text style={feedbackText}>
              Hi {order.customerName}! We hope you enjoyed your recent order from {shopName}.
            </Text>
            <Text style={feedbackText}>
              Your feedback helps us continue serving the best authentic Argentine cuisine in San
              Francisco.
            </Text>
          </Section>

          {/* Quick Rating */}
          <Section style={ratingSection}>
            <Text style={ratingTitle}>Quick Rating</Text>
            <Text style={{ fontSize: emailFontSizes.base, color: emailColors.secondaryLight, margin: `0 0 ${emailSpacing.lg} 0`, fontFamily: emailFonts.primary }}>
              How would you rate your overall experience?
            </Text>
            <div style={{ textAlign: 'center' }}>
              {[1, 2, 3, 4, 5].map(rating => (
                <Link
                  key={rating}
                  href={`${feedbackUrl}&rating=${rating}`}
                  style={{
                    ...starButton,
                    backgroundColor: rating <= 3 ? emailColors.primaryLight : emailColors.successLight,
                    color: rating <= 3 ? emailColors.warningDark : emailColors.successDark,
                  }}
                >
                  {'★'.repeat(rating)}
                </Link>
              ))}
            </div>
            <Text style={{ fontSize: emailFontSizes.sm, color: emailColors.textMuted, margin: `${emailSpacing.lg} 0 0 0`, fontFamily: emailFonts.primary }}>
              Click the stars above to leave a quick rating
            </Text>
          </Section>

          {/* Detailed Feedback Form */}
          <Section style={feedbackFormSection}>
            <Text style={formTitle}>Share More Details</Text>
            <Text style={formText}>
              We&apos;d love to hear more about your experience! Your detailed feedback helps us
              improve.
            </Text>
            <div style={{ textAlign: 'center', margin: `${emailSpacing.lg} 0` }}>
              <Button href={feedbackUrl} style={primaryButtonStyle}>
                Leave Detailed Feedback
              </Button>
            </div>
          </Section>

          {/* Review Platforms */}
          {(reviewPlatforms.google || reviewPlatforms.yelp || reviewPlatforms.facebook) && (
            <Section style={reviewPlatformSection}>
              <Text style={reviewTitle}>Love what you tried? Share it with others!</Text>
              <div style={{ textAlign: 'center' }}>
                {reviewPlatforms.google && (
                  <Button href={reviewPlatforms.google} style={platformButton}>
                    Google Review
                  </Button>
                )}
                {reviewPlatforms.yelp && (
                  <Button href={reviewPlatforms.yelp} style={platformButton}>
                    Yelp Review
                  </Button>
                )}
                {reviewPlatforms.facebook && (
                  <Button href={reviewPlatforms.facebook} style={platformButton}>
                    Facebook Review
                  </Button>
                )}
              </div>
              <Text
                style={{
                  fontSize: emailFontSizes.sm,
                  color: emailColors.accentDark,
                  textAlign: 'center',
                  margin: `${emailSpacing.md} 0 0 0`,
                  fontFamily: emailFonts.primary,
                }}
              >
                Reviews help other food lovers discover our authentic Argentine cuisine
              </Text>
            </Section>
          )}

          {/* Incentive Offer */}
          {incentive && (
            <Section style={incentiveSection}>
              <Text style={incentiveTitle}>{incentive.description}</Text>
              <Text style={incentiveText}>{incentive.details}</Text>
            </Section>
          )}

          {/* Order Details */}
          <Section style={orderDetailsSection}>
            <Text
              style={{
                fontSize: emailFontSizes.base,
                color: emailColors.secondaryLight,
                margin: `0 0 ${emailSpacing.sm} 0`,
                fontWeight: 'bold',
                textAlign: 'center' as const,
                fontFamily: emailFonts.primary,
              }}
            >
              Order Details
            </Text>
            <Text
              style={{
                fontSize: emailFontSizes.sm,
                color: emailColors.textMuted,
                margin: `${emailSpacing.xs} 0`,
                textAlign: 'center' as const,
                fontFamily: emailFonts.primary,
              }}
            >
              Order #{order.id}
            </Text>
            {order.completedAt && (
              <Text
                style={{
                  fontSize: emailFontSizes.sm,
                  color: emailColors.textMuted,
                  margin: `${emailSpacing.xs} 0`,
                  textAlign: 'center' as const,
                  fontFamily: emailFonts.primary,
                }}
              >
                Completed on {formatDateTime(order.completedAt)}
              </Text>
            )}
            <Text
              style={{
                fontSize: emailFontSizes.sm,
                color: emailColors.textMuted,
                margin: `${emailSpacing.xs} 0`,
                textAlign: 'center' as const,
                fontFamily: emailFonts.primary,
              }}
            >
              {formatFulfillmentType(order.fulfillmentType || 'pickup')} order
            </Text>
          </Section>

          {/* Contact Information */}
          <Section style={contactSection}>
            <Text style={contactText}>Questions or concerns about your order?</Text>
            <Text style={contactText}>
              We&apos;re here to help! Email us at{' '}
              <Link href={`mailto:${supportEmail}`} style={linkStyle}>
                {supportEmail}
              </Link>
            </Text>
          </Section>

          {/* Thank You */}
          <Section style={thankYouSection}>
            <Text style={{ fontSize: emailFontSizes.md, color: emailColors.secondary, margin: '0', fontWeight: 'bold', fontFamily: emailFonts.primary }}>
              Thank you for choosing {shopName}!
            </Text>
            <Text style={{ fontSize: emailFontSizes.base, color: emailColors.secondary, margin: `${emailSpacing.sm} 0 0 0`, fontFamily: emailFonts.primary }}>
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
