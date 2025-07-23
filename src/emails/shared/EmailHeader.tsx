import { Section, Text, Hr, Img } from '@react-email/components';
import * as React from 'react';

interface EmailHeaderProps {
  shopName?: string;
  logoUrl?: string;
  backgroundColor?: string;
  textColor?: string;
}

const headerSection = {
  padding: '24px 20px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
  borderBottom: '1px solid #e2e8f0',
};

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1a202c',
  margin: '0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const tagline = {
  fontSize: '14px',
  color: '#718096',
  margin: '8px 0 0 0',
  fontStyle: 'italic' as const,
};

export const EmailHeader: React.FC<EmailHeaderProps> = ({
  shopName = 'Destino SF',
  logoUrl,
  backgroundColor = '#f8fafc',
  textColor = '#1a202c',
}) => {
  return (
    <Section style={{ ...headerSection, backgroundColor }}>
      {logoUrl ? (
        <Img
          src={logoUrl}
          alt={shopName}
          style={{
            maxWidth: '200px',
            height: 'auto',
            margin: '0 auto',
            display: 'block',
          }}
        />
      ) : (
        <>
          <Text style={{ ...logoText, color: textColor }}>{shopName}</Text>
          <Text style={tagline}>Authentic Mexican Cuisine in San Francisco</Text>
        </>
      )}
    </Section>
  );
};

export default EmailHeader;
