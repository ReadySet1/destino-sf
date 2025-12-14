import { Section, Text, Hr, Link, Row, Column } from '@react-email/components';
import * as React from 'react';
import {
  emailColors,
  emailFonts,
  emailSpacing,
  emailFontSizes,
  emailLineHeights,
} from './email-styles';

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
  variant?: 'default' | 'admin' | 'minimal';
}

const footerSectionStyle = {
  padding: `${emailSpacing['3xl']} ${emailSpacing.xl}`,
  backgroundColor: emailColors.background,
};

const accentBarStyle = {
  height: '3px',
  background: `linear-gradient(90deg, ${emailColors.primary} 0%, ${emailColors.accent} 100%)`,
  margin: '0',
};

const footerTextStyle = {
  fontSize: emailFontSizes.sm,
  color: emailColors.textMuted,
  lineHeight: emailLineHeights.relaxed,
  margin: '0',
  textAlign: 'center' as const,
  fontFamily: emailFonts.primary,
};

const shopNameStyle = {
  fontSize: emailFontSizes.base,
  fontWeight: '700',
  color: emailColors.secondary,
  margin: `0 0 ${emailSpacing.sm} 0`,
  textAlign: 'center' as const,
  fontFamily: emailFonts.primary,
};

const footerLinkStyle = {
  color: emailColors.accent,
  textDecoration: 'none',
  fontWeight: '500',
};

const socialLinksContainerStyle = {
  textAlign: 'center' as const,
  margin: `${emailSpacing.lg} 0`,
};

const socialLinkStyle = {
  display: 'inline-block',
  margin: `0 ${emailSpacing.md}`,
  color: emailColors.accent,
  textDecoration: 'none',
  fontSize: emailFontSizes.sm,
  fontWeight: '500',
  fontFamily: emailFonts.primary,
};

const dividerStyle = {
  borderColor: emailColors.border,
  borderWidth: '1px',
  borderStyle: 'solid',
  margin: `0 0 ${emailSpacing.xl} 0`,
};

const copyrightStyle = {
  fontSize: emailFontSizes.xs,
  color: emailColors.textLight,
  margin: `${emailSpacing.lg} 0 0 0`,
  textAlign: 'center' as const,
  fontFamily: emailFonts.primary,
};

export const EmailFooter: React.FC<EmailFooterProps> = ({
  shopName = 'Destino SF',
  address = '2351 Mission St, San Francisco, CA 94110',
  phone = '(415) 872-9372',
  email = 'hola@destinosf.com',
  websiteUrl = 'https://destinosf.com',
  unsubscribeUrl,
  socialLinks = {
    instagram: 'https://instagram.com/destinosf',
  },
  variant = 'default',
}) => {
  // Minimal footer for admin emails
  if (variant === 'minimal') {
    return (
      <Section style={{ ...footerSectionStyle, padding: `${emailSpacing.xl} ${emailSpacing.xl}` }}>
        <Text style={copyrightStyle}>
          This is an automated message from {shopName} Order Management System
        </Text>
      </Section>
    );
  }

  // Admin footer
  if (variant === 'admin') {
    return (
      <>
        <div style={accentBarStyle} />
        <Section style={footerSectionStyle}>
          <Text style={{ ...footerTextStyle, marginBottom: emailSpacing.sm }}>
            This is an automated alert from your {shopName} order management system.
          </Text>
          <Text style={copyrightStyle}>
            &copy; {new Date().getFullYear()} {shopName}. All rights reserved.
          </Text>
        </Section>
      </>
    );
  }

  // Default customer footer
  return (
    <>
      <div style={accentBarStyle} />
      <Section style={footerSectionStyle}>
        <Hr style={dividerStyle} />

        {/* Shop Name */}
        <Text style={shopNameStyle}>{shopName}</Text>

        {/* Contact Information */}
        <Row>
          <Column>
            <Text style={footerTextStyle}>{address}</Text>
            <Text style={{ ...footerTextStyle, marginTop: emailSpacing.sm }}>
              <Link href={`tel:${phone.replace(/[^\d+]/g, '')}`} style={footerLinkStyle}>
                {phone}
              </Link>
              {' | '}
              <Link href={`mailto:${email}`} style={footerLinkStyle}>
                {email}
              </Link>
            </Text>
            <Text style={{ ...footerTextStyle, marginTop: emailSpacing.sm }}>
              <Link href={websiteUrl} style={footerLinkStyle}>
                Visit our website
              </Link>
            </Text>
          </Column>
        </Row>

        {/* Social Links */}
        {(socialLinks.instagram || socialLinks.facebook || socialLinks.yelp) && (
          <div style={socialLinksContainerStyle}>
            {socialLinks.instagram && (
              <Link href={socialLinks.instagram} style={socialLinkStyle}>
                Instagram
              </Link>
            )}
            {socialLinks.facebook && (
              <Link href={socialLinks.facebook} style={socialLinkStyle}>
                Facebook
              </Link>
            )}
            {socialLinks.yelp && (
              <Link href={socialLinks.yelp} style={socialLinkStyle}>
                Yelp
              </Link>
            )}
          </div>
        )}

        {/* Legal/Unsubscribe */}
        <Text style={{ ...footerTextStyle, marginTop: emailSpacing.lg }}>
          You&apos;re receiving this email because you placed an order with {shopName}.
        </Text>

        {unsubscribeUrl && (
          <Text style={{ ...footerTextStyle, marginTop: emailSpacing.sm }}>
            <Link href={unsubscribeUrl} style={footerLinkStyle}>
              Update email preferences
            </Link>
          </Text>
        )}

        {/* Copyright */}
        <Text style={copyrightStyle}>
          &copy; {new Date().getFullYear()} {shopName}. All rights reserved.
        </Text>
      </Section>
    </>
  );
};

export default EmailFooter;
