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

interface DailySummaryData {
  date: Date;
  totalOrders: number;
  totalRevenue: number;
  ordersByFulfillment: {
    pickup: number;
    local_delivery: number;
    nationwide_shipping: number;
  };
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  averageOrderValue: number;
  failedOrders: number;
  pendingOrders: number;
  systemErrors: number;
  alertsSent: number;
}

interface DailySummaryAlertProps {
  summary: DailySummaryData;
  shopName: string;
  previousDayComparison?: {
    ordersChange: number;
    revenueChange: number;
  };
}

// Styles using design tokens
const styles = {
  summaryHeader: {
    padding: emailSpacing['3xl'],
    textAlign: 'center' as const,
    backgroundColor: emailColors.primaryLight,
    border: `2px solid ${emailColors.primary}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.xl} 0`,
  },
  summaryTitle: {
    fontSize: emailFontSizes['2xl'],
    fontWeight: 'bold',
    color: emailColors.secondary,
    margin: `0 0 ${emailSpacing.md} 0`,
    fontFamily: emailFonts.primary,
  },
  summaryDate: {
    fontSize: emailFontSizes.md,
    color: emailColors.warningDark,
    margin: '0',
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
  metricBox: {
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    padding: emailSpacing.lg,
    textAlign: 'center' as const,
    margin: `${emailSpacing.sm} 0`,
  },
  bigNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: emailColors.successDark,
    margin: '0',
    lineHeight: '1',
    fontFamily: emailFonts.primary,
  },
  metricLabel: {
    fontSize: emailFontSizes.sm,
    color: emailColors.textMuted,
    margin: `${emailSpacing.sm} 0 0 0`,
    fontFamily: emailFonts.primary,
  },
  changePositive: {
    fontSize: emailFontSizes.xs,
    color: emailColors.successDark,
    fontWeight: 'bold',
    fontFamily: emailFonts.primary,
  },
  changeNegative: {
    fontSize: emailFontSizes.xs,
    color: emailColors.errorDark,
    fontWeight: 'bold',
    fontFamily: emailFonts.primary,
  },
  changeNeutral: {
    fontSize: emailFontSizes.xs,
    color: emailColors.textMuted,
    fontWeight: 'bold',
    fontFamily: emailFonts.primary,
  },
  fulfillmentSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  topProductsSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.white,
    border: `1px solid ${emailColors.border}`,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  productRow: {
    padding: `${emailSpacing.sm} 0`,
    borderBottom: `1px solid ${emailColors.border}`,
  },
  productName: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.secondary,
    margin: `${emailSpacing.sm} 0`,
    fontFamily: emailFonts.primary,
  },
  productQuantity: {
    fontSize: emailFontSizes.sm,
    color: emailColors.textMuted,
    margin: `${emailSpacing.sm} 0`,
    textAlign: 'center' as const,
    fontFamily: emailFonts.primary,
  },
  productRevenue: {
    fontSize: emailFontSizes.sm,
    fontWeight: '600',
    color: emailColors.secondary,
    margin: `${emailSpacing.sm} 0`,
    textAlign: 'right' as const,
    fontFamily: emailFonts.primary,
  },
  healthSection: {
    padding: emailSpacing.xl,
    backgroundColor: emailColors.backgroundAlt,
    borderRadius: emailBorderRadius.lg,
    margin: `${emailSpacing.lg} 0`,
  },
  healthBoxSuccess: {
    backgroundColor: emailColors.successLight,
    border: `1px solid ${emailColors.success}`,
    borderRadius: emailBorderRadius.lg,
    padding: emailSpacing.lg,
    textAlign: 'center' as const,
    margin: `${emailSpacing.sm} 0`,
  },
  healthBoxError: {
    backgroundColor: emailColors.errorLight,
    border: `1px solid ${emailColors.error}`,
    borderRadius: emailBorderRadius.lg,
    padding: emailSpacing.lg,
    textAlign: 'center' as const,
    margin: `${emailSpacing.sm} 0`,
  },
  healthBoxWarning: {
    backgroundColor: emailColors.primaryLight,
    border: `1px solid ${emailColors.primary}`,
    borderRadius: emailBorderRadius.lg,
    padding: emailSpacing.lg,
    textAlign: 'center' as const,
    margin: `${emailSpacing.sm} 0`,
  },
  actionRequired: {
    padding: emailSpacing.lg,
    backgroundColor: emailColors.errorLight,
    border: `2px solid ${emailColors.error}`,
    borderRadius: emailBorderRadius.md,
    margin: `${emailSpacing.lg} 0`,
  },
  actionText: {
    fontSize: emailFontSizes.sm,
    color: emailColors.errorDark,
    margin: '0',
    fontFamily: emailFonts.primary,
    lineHeight: emailLineHeights.relaxed,
  },
  footerNote: {
    fontSize: emailFontSizes.xs,
    color: emailColors.textMuted,
    margin: '0',
    fontFamily: emailFonts.primary,
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const DailySummaryAlert = ({
  summary,
  shopName = 'Destino SF',
  previousDayComparison,
}: DailySummaryAlertProps) => {
  const previewText = `Daily Summary for ${formatDate(summary.date)}: ${summary.totalOrders} orders, ${formatCurrency(summary.totalRevenue)} revenue`;

  const getChangeStyle = (change: number) => {
    if (change > 0) return styles.changePositive;
    if (change < 0) return styles.changeNegative;
    return styles.changeNeutral;
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={baseBodyStyle}>
        <Container style={baseContainerStyle}>
          <EmailHeader shopName={shopName} variant="admin" tagline="Daily Report" />

          {/* Summary Header */}
          <Section style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Daily Sales Summary</Text>
            <Text style={styles.summaryDate}>{formatDate(summary.date)}</Text>
          </Section>

          {/* Key Metrics */}
          <Section>
            <Heading as="h2" style={styles.sectionTitle}>Key Metrics</Heading>

            <Row>
              <Column style={{ width: '50%', paddingRight: emailSpacing.sm }}>
                <div style={styles.metricBox}>
                  <Text style={styles.bigNumber}>{summary.totalOrders}</Text>
                  <Text style={styles.metricLabel}>Total Orders</Text>
                  {previousDayComparison && (
                    <Text style={getChangeStyle(previousDayComparison.ordersChange)}>
                      {previousDayComparison.ordersChange > 0 ? '+' : ''}
                      {previousDayComparison.ordersChange}%
                    </Text>
                  )}
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: emailSpacing.sm }}>
                <div style={styles.metricBox}>
                  <Text style={styles.bigNumber}>{formatCurrency(summary.totalRevenue)}</Text>
                  <Text style={styles.metricLabel}>Total Revenue</Text>
                  {previousDayComparison && (
                    <Text style={getChangeStyle(previousDayComparison.revenueChange)}>
                      {previousDayComparison.revenueChange > 0 ? '+' : ''}
                      {previousDayComparison.revenueChange}%
                    </Text>
                  )}
                </div>
              </Column>
            </Row>

            <Row>
              <Column style={{ width: '50%', paddingRight: emailSpacing.sm }}>
                <div style={styles.metricBox}>
                  <Text style={styles.bigNumber}>{formatCurrency(summary.averageOrderValue)}</Text>
                  <Text style={styles.metricLabel}>Average Order Value</Text>
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: emailSpacing.sm }}>
                <div style={styles.metricBox}>
                  <Text style={{ ...styles.bigNumber, color: emailColors.warningDark }}>{summary.pendingOrders}</Text>
                  <Text style={styles.metricLabel}>Pending Orders</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Fulfillment Breakdown */}
          <Section style={styles.fulfillmentSection}>
            <Heading as="h2" style={styles.sectionTitle}>Fulfillment Breakdown</Heading>

            <Row>
              <Column style={{ width: '33.33%', paddingRight: emailSpacing.xs }}>
                <div style={styles.metricBox}>
                  <Text style={{ ...styles.bigNumber, fontSize: '24px' }}>
                    {summary.ordersByFulfillment.pickup}
                  </Text>
                  <Text style={styles.metricLabel}>Pickup</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', padding: `0 ${emailSpacing.xs}` }}>
                <div style={styles.metricBox}>
                  <Text style={{ ...styles.bigNumber, fontSize: '24px' }}>
                    {summary.ordersByFulfillment.local_delivery}
                  </Text>
                  <Text style={styles.metricLabel}>Delivery</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', paddingLeft: emailSpacing.xs }}>
                <div style={styles.metricBox}>
                  <Text style={{ ...styles.bigNumber, fontSize: '24px' }}>
                    {summary.ordersByFulfillment.nationwide_shipping}
                  </Text>
                  <Text style={styles.metricLabel}>Shipping</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Top Products */}
          {summary.topProducts.length > 0 && (
            <Section style={styles.topProductsSection}>
              <Heading as="h2" style={styles.sectionTitle}>Top Products</Heading>

              {summary.topProducts.slice(0, 5).map((product, index) => (
                <Row key={index} style={styles.productRow}>
                  <Column style={{ width: '50%' }}>
                    <Text style={styles.productName}>
                      {index + 1}. {product.name}
                    </Text>
                  </Column>
                  <Column style={{ width: '25%' }}>
                    <Text style={styles.productQuantity}>{product.quantity} sold</Text>
                  </Column>
                  <Column style={{ width: '25%' }}>
                    <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* System Health */}
          <Section style={styles.healthSection}>
            <Heading as="h2" style={styles.sectionTitle}>System Health</Heading>

            <Row>
              <Column style={{ width: '33.33%', paddingRight: emailSpacing.xs }}>
                <div style={summary.failedOrders > 0 ? styles.healthBoxError : styles.healthBoxSuccess}>
                  <Text style={{
                    ...styles.bigNumber,
                    fontSize: '24px',
                    color: summary.failedOrders > 0 ? emailColors.errorDark : emailColors.successDark,
                  }}>
                    {summary.failedOrders}
                  </Text>
                  <Text style={styles.metricLabel}>Failed Orders</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', padding: `0 ${emailSpacing.xs}` }}>
                <div style={summary.systemErrors > 0 ? styles.healthBoxWarning : styles.healthBoxSuccess}>
                  <Text style={{
                    ...styles.bigNumber,
                    fontSize: '24px',
                    color: summary.systemErrors > 0 ? emailColors.warningDark : emailColors.successDark,
                  }}>
                    {summary.systemErrors}
                  </Text>
                  <Text style={styles.metricLabel}>System Errors</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', paddingLeft: emailSpacing.xs }}>
                <div style={styles.metricBox}>
                  <Text style={{ ...styles.bigNumber, fontSize: '24px', color: emailColors.accentDark }}>
                    {summary.alertsSent}
                  </Text>
                  <Text style={styles.metricLabel}>Alerts Sent</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Action Required Warning */}
          {(summary.failedOrders > 0 || summary.systemErrors > 0) && (
            <Section style={styles.actionRequired}>
              <Text style={styles.actionText}>
                <strong>Action Required:</strong> There were{' '}
                {summary.failedOrders > 0 && `${summary.failedOrders} failed orders`}
                {summary.failedOrders > 0 && summary.systemErrors > 0 && ' and '}
                {summary.systemErrors > 0 && `${summary.systemErrors} system errors`} that need your
                attention.
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: emailColors.border, margin: `${emailSpacing.xl} 0` }} />

          <Section style={{ padding: emailSpacing.md, textAlign: 'center' as const }}>
            <Text style={styles.footerNote}>
              This daily summary was automatically generated at{' '}
              {new Date().toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
              .
            </Text>
          </Section>

          <EmailFooter shopName={shopName} variant="admin" />
        </Container>
      </Body>
    </Html>
  );
};

export default DailySummaryAlert;
