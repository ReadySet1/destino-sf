import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface SystemErrorAlertProps {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    component?: string;
    action?: string;
    orderId?: string;
    paymentId?: string;
    severity?: string;
    timestamp?: Date;
    additionalData?: Record<string, any>;
    manualTrigger?: boolean;
    subject?: string;
  };
  shopName: string;
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
};

const logo = {
  margin: '0 auto',
};

const section = {
  padding: '24px',
  border: 'solid 1px #dedede',
  borderRadius: '5px',
  textAlign: 'center' as const,
  backgroundColor: '#f9f9f9',
};

const errorSection = {
  padding: '24px',
  border: 'solid 2px #dc2626',
  borderRadius: '5px',
  backgroundColor: '#fef2f2',
  margin: '20px 0',
};

const severityStyles = {
  LOW: { color: '#d97706', backgroundColor: '#fef3c7' },
  MEDIUM: { color: '#ea580c', backgroundColor: '#fed7aa' },
  HIGH: { color: '#dc2626', backgroundColor: '#fecaca' },
  CRITICAL: { color: '#991b1b', backgroundColor: '#fee2e2' },
};

const text = {
  fontSize: '14px',
  lineHeight: '26px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '30px 0',
  padding: '0',
  lineHeight: '42px',
};

const h2 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 10px',
};

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontSize: '12px',
  fontFamily: 'monospace',
  lineHeight: '1.4',
  textAlign: 'left' as const,
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-all' as const,
};

const severityBadge = (severity: string) => ({
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  ...severityStyles[severity as keyof typeof severityStyles] || severityStyles.MEDIUM,
});

export const SystemErrorAlert = ({
  error = {
    name: 'UnknownError',
    message: 'An unknown error occurred',
    stack: 'No stack trace available',
  },
  context = {},
  shopName = 'Destino SF',
}: SystemErrorAlertProps) => {
  const severity = context.severity || 'MEDIUM';
  const isManualTrigger = context.manualTrigger || false;
  const timestamp = context.timestamp || new Date();

  const previewText = `${isManualTrigger ? '🧪 TEST: ' : '🚨 '}${severity} error in ${context.component || 'System'}: ${error.message.slice(0, 50)}...`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={logo}>
              <strong>{shopName}</strong>
            </Text>
          </Section>

          <Section style={errorSection}>
            <Heading style={h1}>
              {isManualTrigger ? '🧪 Test Alert' : '🚨 System Error Alert'}
            </Heading>
            
            <Row>
              <Column>
                <div style={severityBadge(severity)}>
                  {severity} SEVERITY
                </div>
              </Column>
            </Row>

            <Text style={{ ...text, marginTop: '20px' }}>
              A {severity.toLowerCase()} error has been detected in your {shopName} system
              {isManualTrigger && ' (this is a test alert)'}.
            </Text>
          </Section>

          <Section>
            <Heading style={h2}>Error Details</Heading>
            
            <Row>
              <Column style={{ paddingRight: '8px' }}>
                <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Error Type:</Text>
              </Column>
              <Column>
                <Text style={{ ...text, margin: '0' }}>{error.name}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={{ paddingRight: '8px' }}>
                <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Message:</Text>
              </Column>
              <Column>
                <Text style={{ ...text, margin: '0', color: '#dc2626' }}>{error.message}</Text>
              </Column>
            </Row>

            <Row>
              <Column style={{ paddingRight: '8px' }}>
                <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Timestamp:</Text>
              </Column>
              <Column>
                <Text style={{ ...text, margin: '0' }}>
                  {timestamp.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short',
                  })}
                </Text>
              </Column>
            </Row>
          </Section>

          {(context.component || context.action) && (
            <Section>
              <Heading style={h2}>Context Information</Heading>
              
              {context.component && (
                <Row>
                  <Column style={{ paddingRight: '8px' }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Component:</Text>
                  </Column>
                  <Column>
                    <Text style={{ ...text, margin: '0' }}>{context.component}</Text>
                  </Column>
                </Row>
              )}

              {context.action && (
                <Row>
                  <Column style={{ paddingRight: '8px' }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Action:</Text>
                  </Column>
                  <Column>
                    <Text style={{ ...text, margin: '0' }}>{context.action}</Text>
                  </Column>
                </Row>
              )}

              {context.orderId && (
                <Row>
                  <Column style={{ paddingRight: '8px' }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Order ID:</Text>
                  </Column>
                  <Column>
                    <Text style={{ ...text, margin: '0' }}>{context.orderId}</Text>
                  </Column>
                </Row>
              )}

              {context.paymentId && (
                <Row>
                  <Column style={{ paddingRight: '8px' }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '0' }}>Payment ID:</Text>
                  </Column>
                  <Column>
                    <Text style={{ ...text, margin: '0' }}>{context.paymentId}</Text>
                  </Column>
                </Row>
              )}
            </Section>
          )}

          {error.stack && (
            <Section>
              <Heading style={h2}>Stack Trace</Heading>
              <div style={code}>
                {error.stack}
              </div>
            </Section>
          )}

          {context.additionalData && Object.keys(context.additionalData).length > 0 && (
            <Section>
              <Heading style={h2}>Additional Data</Heading>
              <div style={code}>
                {JSON.stringify(context.additionalData, null, 2)}
              </div>
            </Section>
          )}

          <Hr />

          <Section>
            <Text style={{ ...text, fontSize: '12px', color: '#666' }}>
              {isManualTrigger ? (
                <>
                  This is a test alert triggered manually. No immediate action is required.
                </>
              ) : (
                <>
                  This alert was automatically generated when an error was detected in your system.
                  {severity === 'CRITICAL' && (
                    <strong style={{ color: '#dc2626' }}>
                      {' '}This is a critical error that requires immediate attention.
                    </strong>
                  )}
                </>
              )}
            </Text>
            
            <Text style={{ ...text, fontSize: '12px', color: '#666', marginTop: '10px' }}>
              For more details, check your application logs or contact your development team.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SystemErrorAlert; 