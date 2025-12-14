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
} from '../shared/email-styles';

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

// Severity color mapping using brand colors
const severityStyles: Record<string, { backgroundColor: string; color: string; borderColor: string }> = {
  LOW: { backgroundColor: emailColors.primaryLight, color: emailColors.warningDark, borderColor: emailColors.primary },
  MEDIUM: { backgroundColor: emailColors.accentLight, color: emailColors.accentDark, borderColor: emailColors.accent },
  HIGH: { backgroundColor: emailColors.errorLight, color: emailColors.errorDark, borderColor: emailColors.error },
  CRITICAL: { backgroundColor: emailColors.errorLight, color: emailColors.errorDark, borderColor: emailColors.error },
};

// Styles using design tokens
const styles = {
  errorHeader: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  errorTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  errorSubtitle: {
    fontSize: emailFontSizes.md,
    margin: '0',
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  severityBadge: {
    display: 'inline-block',
    padding: `${emailSpacing.xs} ${emailSpacing.md}`,
    borderRadius: emailBorderRadius.sm,
    fontSize: emailFontSizes.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    fontFamily: emailFonts.primary,
  },
  sectionTitle: {
    fontSize: emailFontSizes.lg,
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.lg} 0`,
    borderBottom: `2px solid ${emailColors.primary}`,
    paddingBottom: emailSpacing.sm,
    fontFamily: emailFonts.primary,
  },
  detailSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  detailRow: {
    marginBottom: emailSpacing.md,
  },
  detailLabel: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
  detailValue: {
    fontSize: emailFontSizes.sm,
    color: emailColors.secondary,
    margin: `${emailSpacing.xs} 0 0 0`,
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  errorMessage: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    margin: `${emailSpacing.xs} 0 0 0`,
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  codeBlock: {
    display: 'block',
    padding: emailSpacing.lg,
    backgroundColor: emailColors.secondary,
    borderRadius: emailBorderRadius.md,
    border: `1px solid ${emailColors.border}`,
    color: emailColors.background,
    fontSize: emailFontSizes.xs,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    lineHeight: '1.4',
    textAlign: 'left' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    margin: `${emailSpacing.md} 0`,
    overflow: 'auto',
  },
  contextSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  footerNote: {
    fontSize: emailFontSizes.xs,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  criticalNote: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    fontWeight: 'bold',
    fontFamily: emailFonts.primary,
  },
  testBadge: {
    display: 'inline-block',
    padding: `${emailSpacing.xs} ${emailSpacing.md}`,
    backgroundColor: emailColors.accentLight,
    color: emailColors.accentDark,
    borderRadius: emailBorderRadius.sm,
    fontSize: emailFontSizes.xs,
    fontWeight: 'bold',
    fontFamily: emailFonts.primary,
    marginBottom: emailSpacing.md,
  },
};

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

  const severityStyle = severityStyles[severity] || severityStyles.MEDIUM;

  const previewText = `${isManualTrigger ? 'TEST: ' : ''}${severity} error in ${context.component || 'System'}: ${error.message.slice(0, 50)}...`;

  const formattedTimestamp = timestamp.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName={shopName} variant="admin" tagline="System Alert" />

          {/* Error Header */}
          <Section style={{
            ...styles.errorHeader,
            backgroundColor: severityStyle.backgroundColor,
            border: `2px solid ${severityStyle.borderColor}`,
          }}>
            {isManualTrigger && (
              <div style={styles.testBadge}>TEST ALERT</div>
            )}
            <Text style={{ ...styles.errorTitle, color: severityStyle.color }}>
              {isManualTrigger ? 'Test Alert' : 'System Error Alert'}
            </Text>
            <div style={{ marginBottom: emailSpacing.md }}>
              <span style={{
                ...styles.severityBadge,
                backgroundColor: severityStyle.color,
                color: emailColors.white,
              }}>
                {severity} SEVERITY
              </span>
            </div>
            <Text style={{ ...styles.errorSubtitle, color: severityStyle.color }}>
              A {severity.toLowerCase()} error has been detected in your {shopName} system
              {isManualTrigger && ' (this is a test alert)'}.
            </Text>
          </Section>

          {/* Error Details */}
          <Section style={styles.detailSection}>
            <Heading as="h2" style={styles.sectionTitle}>Error Details</Heading>

            <Row style={styles.detailRow}>
              <Column>
                <Text style={styles.detailLabel}>Error Type:</Text>
                <Text style={styles.detailValue}>{error.name}</Text>
              </Column>
            </Row>

            <Row style={styles.detailRow}>
              <Column>
                <Text style={styles.detailLabel}>Message:</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </Column>
            </Row>

            <Row style={styles.detailRow}>
              <Column>
                <Text style={styles.detailLabel}>Timestamp:</Text>
                <Text style={styles.detailValue}>{formattedTimestamp}</Text>
              </Column>
            </Row>
          </Section>

          {/* Context Information */}
          {(context.component || context.action || context.orderId || context.paymentId) && (
            <Section style={styles.contextSection}>
              <Heading as="h2" style={styles.sectionTitle}>Context Information</Heading>

              {context.component && (
                <Row style={styles.detailRow}>
                  <Column>
                    <Text style={styles.detailLabel}>Component:</Text>
                    <Text style={styles.detailValue}>{context.component}</Text>
                  </Column>
                </Row>
              )}

              {context.action && (
                <Row style={styles.detailRow}>
                  <Column>
                    <Text style={styles.detailLabel}>Action:</Text>
                    <Text style={styles.detailValue}>{context.action}</Text>
                  </Column>
                </Row>
              )}

              {context.orderId && (
                <Row style={styles.detailRow}>
                  <Column>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>{context.orderId}</Text>
                  </Column>
                </Row>
              )}

              {context.paymentId && (
                <Row style={styles.detailRow}>
                  <Column>
                    <Text style={styles.detailLabel}>Payment ID:</Text>
                    <Text style={styles.detailValue}>{context.paymentId}</Text>
                  </Column>
                </Row>
              )}
            </Section>
          )}

          {/* Stack Trace */}
          {error.stack && (
            <Section style={styles.detailSection}>
              <Heading as="h2" style={styles.sectionTitle}>Stack Trace</Heading>
              <div style={styles.codeBlock}>{error.stack}</div>
            </Section>
          )}

          {/* Additional Data */}
          {context.additionalData && Object.keys(context.additionalData).length > 0 && (
            <Section style={styles.detailSection}>
              <Heading as="h2" style={styles.sectionTitle}>Additional Data</Heading>
              <div style={styles.codeBlock}>{JSON.stringify(context.additionalData, null, 2)}</div>
            </Section>
          )}

          <Hr style={{ borderColor: emailColors.border, margin: `${emailSpacing.xl} 0` }} />

          {/* Footer Note */}
          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={styles.footerNote}>
              {isManualTrigger ? (
                <>This is a test alert triggered manually. No immediate action is required.</>
              ) : (
                <>
                  This alert was automatically generated when an error was detected in your system.
                  {severity === 'CRITICAL' && (
                    <span style={styles.criticalNote}>
                      {' '}This is a critical error that requires immediate attention.
                    </span>
                  )}
                </>
              )}
            </Text>

            <Text style={{ ...styles.footerNote, marginTop: emailSpacing.md }}>
              For more details, check your application logs or contact your development team.
            </Text>
          </Section>

          <EmailFooter shopName={shopName} variant="admin" />
        </Container>
      </Body>
    </Html>
  );
};

export default SystemErrorAlert;
