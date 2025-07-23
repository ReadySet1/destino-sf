import { Section, Text, Hr, Link, Row, Column } from '@react-email/components';
import * as React from 'react';

interface EmailFooterProps {
  shopName?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  unsubscribeUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    yelp?: string;
  };
}

const footerSection = {
  padding: '32px 20px',
  backgroundColor: '#f7fafc',
  borderTop: '1px solid #e2e8f0',
};

const footerText = {
  fontSize: '12px',
  color: '#718096',
  lineHeight: '18px',
  margin: '0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#3182ce',
  textDecoration: 'none',
};

const socialLinksStyle = {
  textAlign: 'center' as const,
  margin: '16px 0',
};

const socialLink = {
  display: 'inline-block',
  margin: '0 8px',
  color: '#3182ce',
  textDecoration: 'none',
  fontSize: '12px',
};

export const EmailFooter: React.FC<EmailFooterProps> = ({
  shopName = 'Destino SF',
  address = '123 Main St, San Francisco, CA 94102',
  phone = '(415) 555-0123',
  email = 'hello@destinosf.com',
  websiteUrl = 'https://destinosf.com',
  unsubscribeUrl,
  socialLinks = {},
}) => {
  return (
    <Section style={footerSection}>
      <Hr style={{ borderColor: '#e2e8f0', margin: '0 0 24px 0' }} />

      {/* Contact Information */}
      <Row>
        <Column>
          <Text style={footerText}>
            <strong>{shopName}</strong>
          </Text>
          <Text style={footerText}>{address}</Text>
          <Text style={footerText}>
            Phone:{' '}
            <Link href={`tel:${phone}`} style={footerLink}>
              {phone}
            </Link>{' '}
            | Email:{' '}
            <Link href={`mailto:${email}`} style={footerLink}>
              {email}
            </Link>
          </Text>
          <Text style={footerText}>
            <Link href={websiteUrl} style={footerLink}>
              Visit our website
            </Link>
          </Text>
        </Column>
      </Row>

      {/* Social Links */}
      {(socialLinks.instagram || socialLinks.facebook || socialLinks.yelp) && (
        <div style={socialLinksStyle}>
          {socialLinks.instagram && (
            <Link href={socialLinks.instagram} style={socialLink}>
              Instagram
            </Link>
          )}
          {socialLinks.facebook && (
            <Link href={socialLinks.facebook} style={socialLink}>
              Facebook
            </Link>
          )}
          {socialLinks.yelp && (
            <Link href={socialLinks.yelp} style={socialLink}>
              Yelp
            </Link>
          )}
        </div>
      )}

      {/* Legal/Unsubscribe */}
      <Text style={{ ...footerText, marginTop: '16px' }}>
        You&apos;re receiving this email because you placed an order with {shopName}.
      </Text>

      {unsubscribeUrl && (
        <Text style={footerText}>
          <Link href={unsubscribeUrl} style={footerLink}>
            Update email preferences
          </Link>
        </Text>
      )}

      <Text style={{ ...footerText, marginTop: '16px' }}>
        © {new Date().getFullYear()} {shopName}. All rights reserved.
      </Text>
    </Section>
  );
};

export default EmailFooter;
