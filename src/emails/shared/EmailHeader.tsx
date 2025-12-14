import { Section, Text, Img } from '@react-email/components';
import * as React from 'react';
import {
  emailColors,
  emailFonts,
  emailSpacing,
  emailBorderRadius,
  getLogoUrl,
} from './email-styles';

interface EmailHeaderProps {
  shopName?: string;
  logoUrl?: string;
  tagline?: string;
  variant?: 'default' | 'admin' | 'catering';
}

const getHeaderStyle = (variant: string) => {
  const baseStyle = {
    padding: `${emailSpacing['2xl']} ${emailSpacing.xl}`,
    textAlign: 'center' as const,
  };

  switch (variant) {
    case 'admin':
      return {
        ...baseStyle,
        backgroundColor: emailColors.secondary,
      };
    case 'catering':
      return {
        ...baseStyle,
        backgroundColor: emailColors.accent,
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: emailColors.primary,
      };
  }
};

const logoContainerStyle = {
  margin: '0 auto',
  textAlign: 'center' as const,
};

const logoImageStyle = {
  maxWidth: '180px',
  width: '100%',
  height: 'auto',
  margin: '0 auto',
  display: 'block',
};

const logoTextStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: emailColors.secondary,
  margin: '0',
  fontFamily: emailFonts.primary,
  letterSpacing: '-0.5px',
};

const adminLogoTextStyle = {
  ...logoTextStyle,
  color: emailColors.white,
};

const cateringLogoTextStyle = {
  ...logoTextStyle,
  color: emailColors.white,
};

const taglineStyle = {
  fontSize: '13px',
  color: emailColors.secondary,
  margin: `${emailSpacing.sm} 0 0 0`,
  fontFamily: emailFonts.primary,
  opacity: '0.85',
};

const adminTaglineStyle = {
  ...taglineStyle,
  color: emailColors.primaryLight,
};

const cateringTaglineStyle = {
  ...taglineStyle,
  color: emailColors.white,
  opacity: '0.9',
};

const accentBarStyle = {
  height: '4px',
  backgroundColor: emailColors.accent,
  margin: '0',
  borderRadius: `0 0 ${emailBorderRadius.sm} ${emailBorderRadius.sm}`,
};

const adminAccentBarStyle = {
  ...accentBarStyle,
  backgroundColor: emailColors.primary,
};

export const EmailHeader: React.FC<EmailHeaderProps> = ({
  shopName = 'Destino SF',
  logoUrl,
  tagline = 'Authentic Argentine Cuisine',
  variant = 'default',
}) => {
  const headerStyle = getHeaderStyle(variant);
  const textStyle =
    variant === 'admin' ? adminLogoTextStyle : variant === 'catering' ? cateringLogoTextStyle : logoTextStyle;
  const subtitleStyle =
    variant === 'admin' ? adminTaglineStyle : variant === 'catering' ? cateringTaglineStyle : taglineStyle;
  const barStyle = variant === 'admin' ? adminAccentBarStyle : accentBarStyle;

  // Use provided logoUrl or default to the brand logo
  const finalLogoUrl = logoUrl || getLogoUrl();

  return (
    <>
      <Section style={headerStyle}>
        <div style={logoContainerStyle}>
          {finalLogoUrl ? (
            <Img
              src={finalLogoUrl}
              alt={shopName}
              style={logoImageStyle}
            />
          ) : (
            <Text style={textStyle}>{shopName}</Text>
          )}
          {tagline && <Text style={subtitleStyle}>{tagline}</Text>}
        </div>
      </Section>
      {variant !== 'catering' && <div style={barStyle} />}
    </>
  );
};

export default EmailHeader;
