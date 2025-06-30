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

const summarySection = {
  padding: '24px',
  border: 'solid 1px #e5e7eb',
  borderRadius: '5px',
  backgroundColor: '#f8fafc',
  margin: '20px 0',
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

const h3 = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '16px 0 8px',
};

const metricBox = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const bigNumber = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#059669',
  margin: '0',
  lineHeight: '1',
};

const metricLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '8px 0 0 0',
};

const changeIndicator = (change: number) => ({
  fontSize: '12px',
  color: change > 0 ? '#059669' : change < 0 ? '#dc2626' : '#6b7280',
  fontWeight: 'bold',
});

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
  const previewText = `📊 Daily Summary for ${formatDate(summary.date)}: ${summary.totalOrders} orders, ${formatCurrency(summary.totalRevenue)} revenue`;

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

          <Section style={summarySection}>
            <Heading style={h1}>
              📊 Daily Sales Summary
            </Heading>
            
            <Text style={{ ...text, textAlign: 'center' as const, fontSize: '16px', color: '#6b7280' }}>
              {formatDate(summary.date)}
            </Text>
          </Section>

          {/* Key Metrics */}
          <Section>
            <Heading style={h2}>📈 Key Metrics</Heading>
            
            <Row>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <div style={metricBox}>
                  <Text style={bigNumber}>{summary.totalOrders}</Text>
                  <Text style={metricLabel}>Total Orders</Text>
                  {previousDayComparison && (
                    <Text style={changeIndicator(previousDayComparison.ordersChange)}>
                      {previousDayComparison.ordersChange > 0 ? '+' : ''}{previousDayComparison.ordersChange}%
                    </Text>
                  )}
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <div style={metricBox}>
                  <Text style={bigNumber}>{formatCurrency(summary.totalRevenue)}</Text>
                  <Text style={metricLabel}>Total Revenue</Text>
                  {previousDayComparison && (
                    <Text style={changeIndicator(previousDayComparison.revenueChange)}>
                      {previousDayComparison.revenueChange > 0 ? '+' : ''}{previousDayComparison.revenueChange}%
                    </Text>
                  )}
                </div>
              </Column>
            </Row>

            <Row>
              <Column style={{ width: '50%', paddingRight: '8px' }}>
                <div style={metricBox}>
                  <Text style={bigNumber}>{formatCurrency(summary.averageOrderValue)}</Text>
                  <Text style={metricLabel}>Average Order Value</Text>
                </div>
              </Column>
              <Column style={{ width: '50%', paddingLeft: '8px' }}>
                <div style={metricBox}>
                  <Text style={bigNumber}>{summary.pendingOrders}</Text>
                  <Text style={metricLabel}>Pending Orders</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Fulfillment Breakdown */}
          <Section>
            <Heading style={h2}>🚚 Fulfillment Breakdown</Heading>
            
            <Row>
              <Column style={{ width: '33.33%', paddingRight: '4px' }}>
                <div style={metricBox}>
                  <Text style={{ ...bigNumber, fontSize: '24px' }}>{summary.ordersByFulfillment.pickup}</Text>
                  <Text style={metricLabel}>Pickup Orders</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', padding: '0 4px' }}>
                <div style={metricBox}>
                  <Text style={{ ...bigNumber, fontSize: '24px' }}>{summary.ordersByFulfillment.local_delivery}</Text>
                  <Text style={metricLabel}>Local Delivery</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', paddingLeft: '4px' }}>
                <div style={metricBox}>
                  <Text style={{ ...bigNumber, fontSize: '24px' }}>{summary.ordersByFulfillment.nationwide_shipping}</Text>
                  <Text style={metricLabel}>Shipping Orders</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Top Products */}
          {summary.topProducts.length > 0 && (
            <Section>
              <Heading style={h2}>🔥 Top Products</Heading>
              
              {summary.topProducts.slice(0, 5).map((product, index) => (
                <Row key={index}>
                  <Column style={{ width: '50%' }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '8px 0' }}>
                      {index + 1}. {product.name}
                    </Text>
                  </Column>
                  <Column style={{ width: '25%', textAlign: 'center' as const }}>
                    <Text style={{ ...text, margin: '8px 0' }}>
                      {product.quantity} sold
                    </Text>
                  </Column>
                  <Column style={{ width: '25%', textAlign: 'right' as const }}>
                    <Text style={{ ...text, fontWeight: 'bold', margin: '8px 0' }}>
                      {formatCurrency(product.revenue)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* System Health */}
          <Section>
            <Heading style={h2}>🔧 System Health</Heading>
            
            <Row>
              <Column style={{ width: '33.33%', paddingRight: '4px' }}>
                <div style={{
                  ...metricBox,
                  borderColor: summary.failedOrders > 0 ? '#dc2626' : '#10b981',
                  backgroundColor: summary.failedOrders > 0 ? '#fef2f2' : '#f0fdf4',
                }}>
                  <Text style={{
                    ...bigNumber,
                    fontSize: '24px',
                    color: summary.failedOrders > 0 ? '#dc2626' : '#059669',
                  }}>
                    {summary.failedOrders}
                  </Text>
                  <Text style={metricLabel}>Failed Orders</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', padding: '0 4px' }}>
                <div style={{
                  ...metricBox,
                  borderColor: summary.systemErrors > 0 ? '#f59e0b' : '#10b981',
                  backgroundColor: summary.systemErrors > 0 ? '#fffbeb' : '#f0fdf4',
                }}>
                  <Text style={{
                    ...bigNumber,
                    fontSize: '24px',
                    color: summary.systemErrors > 0 ? '#f59e0b' : '#059669',
                  }}>
                    {summary.systemErrors}
                  </Text>
                  <Text style={metricLabel}>System Errors</Text>
                </div>
              </Column>
              <Column style={{ width: '33.33%', paddingLeft: '4px' }}>
                <div style={metricBox}>
                  <Text style={{ ...bigNumber, fontSize: '24px', color: '#6366f1' }}>
                    {summary.alertsSent}
                  </Text>
                  <Text style={metricLabel}>Alerts Sent</Text>
                </div>
              </Column>
            </Row>
          </Section>

          <Hr />

          <Section>
            <Text style={{ ...text, fontSize: '12px', color: '#666' }}>
              This daily summary was automatically generated at{' '}
              {new Date().toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}.
            </Text>
            
            {(summary.failedOrders > 0 || summary.systemErrors > 0) && (
              <Text style={{ ...text, fontSize: '12px', color: '#dc2626', marginTop: '10px' }}>
                <strong>Action Required:</strong> There were{' '}
                {summary.failedOrders > 0 && `${summary.failedOrders} failed orders`}
                {summary.failedOrders > 0 && summary.systemErrors > 0 && ' and '}
                {summary.systemErrors > 0 && `${summary.systemErrors} system errors`}{' '}
                that need your attention.
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default DailySummaryAlert; 