import * as React from 'react';
import { 
  Html, 
  Body, 
  Head, 
  Heading, 
  Container, 
  Preview, 
  Section, 
  Text, 
  Hr,
  Link,
} from '@react-email/components';

// Note: You would need to install these packages:
// npm install @react-email/components react-email

interface OrderConfirmationEmailProps {
  id: string;
  customerName: string;
  total: number;
  paymentMethod: 'SQUARE' | 'CASH';
  status: string;
  shopName: string;
  paymentInstructions?: string;
}

export const OrderConfirmationEmail: React.FC<OrderConfirmationEmailProps> = ({
  id,
  customerName,
  total,
  paymentMethod,
  status,
  shopName,
  paymentInstructions,
}) => {
  const formattedTotal = total.toFixed(2);
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Preview>Your order has been received - {shopName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.header}>{shopName}</Heading>
          <Heading as="h2" style={styles.subheader}>Order Confirmation</Heading>
          
          <Section style={styles.section}>
            <Heading as="h2" style={styles.orderNumber}>Order #{id}</Heading>
            <Text style={styles.paragraph}>
              Hi {customerName},
            </Text>
            <Text style={styles.paragraph}>
              Thank you for your order! We&apos;re processing it now and will keep you updated on its status.
            </Text>
            
            <Section style={styles.orderSummary}>
              <Text style={styles.summaryItem}>
                <strong>Order Status:</strong> {status}
              </Text>
              <Text style={styles.summaryItem}>
                <strong>Order Total:</strong> ${formattedTotal}
              </Text>
              <Text style={styles.summaryItem}>
                <strong>Payment Method:</strong> {paymentMethod}
              </Text>
            </Section>
            
            {paymentInstructions && (
              <Section style={
                paymentMethod === 'CASH'
                  ? {...styles.paymentInstructions, ...styles.cashInstructions}
                  : styles.paymentInstructions
              }>
                <Heading as="h3" style={styles.instructionsHeading}>
                  Payment Instructions
                </Heading>
                <Text style={styles.paragraph} dangerouslySetInnerHTML={{ __html: paymentInstructions }} />
              </Section>
            )}
            
            <Text style={styles.paragraph}>
              Please check your account for the most up-to-date information about your order.
              If you have any questions, please contact our customer service.
            </Text>
          </Section>
          
          <Hr style={styles.hr} />
          
          <Text style={styles.footer}>
            This is an automated message, please do not reply directly to this email.
          </Text>
          <Text style={styles.footer}>
            &copy; {currentYear} {shopName}. All rights reserved.
          </Text>
          
          <Text style={styles.footer}>
            <Link href="https://destino-sf.com">Visit our website</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles for the email
const styles = {
  body: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f6f9fc',
    margin: '0',
    padding: '0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#ffffff',
  },
  header: {
    color: '#2b6cb0',
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '0',
  },
  subheader: {
    fontSize: '22px',
    fontWeight: 'normal',
    textAlign: 'center' as const,
    margin: '5px 0 20px',
  },
  section: {
    padding: '20px',
    border: '1px solid #e2e8f0',
    borderRadius: '5px',
    marginBottom: '20px',
  },
  orderNumber: {
    marginTop: '0',
    fontSize: '20px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#4a5568',
    marginBottom: '16px',
  },
  orderSummary: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '5px',
    margin: '20px 0',
  },
  summaryItem: {
    margin: '0',
    fontSize: '16px',
    lineHeight: '24px',
  },
  paymentInstructions: {
    padding: '15px',
    borderRadius: '5px',
    margin: '20px 0',
  },
  cashInstructions: {
    backgroundColor: '#4CAF5020',
  },
  instructionsHeading: {
    marginTop: '0',
    fontSize: '18px',
  },
  hr: {
    borderColor: '#e2e8f0',
    margin: '20px 0',
  },
  footer: {
    textAlign: 'center' as const,
    color: '#a0aec0',
    fontSize: '14px',
    margin: '5px 0',
  },
};

export default OrderConfirmationEmail; 