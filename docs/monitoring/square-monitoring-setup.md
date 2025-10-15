# 🔍 Square Integration Monitoring System

## Overview

The Square Integration Monitoring System provides comprehensive monitoring, alerting, and health checking for the Square payment and order processing system. It was created to prevent and quickly resolve issues like orders getting stuck in DRAFT state.

## 🚀 Quick Start

### 1. Check Current Status

```bash
# Quick health check
curl http://localhost:3000/api/health/square

# Full monitoring dashboard
curl http://localhost:3000/api/admin/monitoring/dashboard
```

### 2. Run Manual Monitoring Check

```bash
# Check for stuck orders and system health
curl -X POST http://localhost:3000/api/admin/monitoring/square
```

### 3. Fix Stuck Orders (if any found)

```bash
# Dry run first to see what would be fixed
pnpm tsx scripts/fix-stuck-square-orders.ts

# Apply fixes
pnpm tsx scripts/fix-stuck-square-orders.ts --execute
```

## 📊 Components

### 1. Core Monitoring (`square-monitor.ts`)

- **Order Health Checks**: Detects stuck orders, payment failures
- **Square API Health**: Tests all Square API endpoints
- **Alert Generation**: Creates alerts for critical issues
- **Recommendations**: Provides actionable next steps

### 2. Alert System (`alert-system.ts`)

- **Multiple Channels**: Console, Database, Slack, Discord, Email
- **Severity Filtering**: Only sends HIGH and CRITICAL alerts
- **Smart Formatting**: Platform-specific message formatting
- **Rate Limiting**: Prevents alert spam

### 3. Health Check Endpoint (`/api/health/square`)

- **Quick Status**: Fast health check for monitoring services
- **Database Test**: Verifies Prisma connection
- **Square API Test**: Tests Square service connectivity
- **Uptime Monitoring**: Suitable for external monitoring tools

### 4. Monitoring Dashboard (`/api/admin/monitoring/dashboard`)

- **Comprehensive View**: Full system status and metrics
- **Quick Actions**: Direct links to fix common issues
- **Troubleshooting**: Context-aware troubleshooting tips
- **System Info**: Environment, version, performance metrics

### 5. Cleanup Script (`fix-stuck-square-orders.ts`)

- **Safe Execution**: Dry-run mode by default
- **Batch Processing**: Handles multiple stuck orders
- **Square Integration**: Directly fixes orders in Square
- **Detailed Logging**: Complete audit trail

### 6. Scheduled Monitor (`monitor-square-integration.ts`)

- **Automated Monitoring**: Run as cron job
- **Configurable Alerts**: Environment-based settings
- **Escalation Logic**: Critical issue detection
- **Silent Mode**: Reduce log noise for scheduled runs

## ⚙️ Configuration

### Environment Variables

```bash
# Monitoring Control
MONITORING_ENABLED=true              # Enable/disable monitoring
STUCK_ORDER_THRESHOLD=3              # Alert when stuck orders > this number
API_RESPONSE_THRESHOLD=5000          # Alert when API response > this time (ms)
FAILURE_RATE_THRESHOLD=0.1           # Alert when failure rate > this percentage

# Alert Channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ALERT_EMAIL_TO=admin@yourcompany.com
ALERT_EMAIL_FROM=noreply@yourcompany.com

# SMTP Settings (for email alerts)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### Slack Integration Setup

1. Go to your Slack workspace
2. Create a new app or use existing one
3. Add Incoming Webhooks feature
4. Create a webhook for your desired channel
5. Add the webhook URL to `SLACK_WEBHOOK_URL`

### Discord Integration Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL to `DISCORD_WEBHOOK_URL`

## 🔄 Automated Monitoring

### Setting Up Cron Jobs

```bash
# Edit crontab
crontab -e

# Add monitoring jobs
# Every 15 minutes - critical monitoring
*/15 * * * * cd /path/to/your/project && pnpm tsx scripts/monitor-square-integration.ts --silent >> /var/log/square-monitor.log 2>&1

# Every 2 hours - comprehensive check with alerts
0 */2 * * * cd /path/to/your/project && pnpm tsx scripts/monitor-square-integration.ts >> /var/log/square-monitor.log 2>&1

# Daily cleanup check
0 6 * * * cd /path/to/your/project && pnpm tsx scripts/fix-stuck-square-orders.ts >> /var/log/square-cleanup.log 2>&1
```

### Docker/Container Setup

```dockerfile
# Add to your Dockerfile for scheduled monitoring
RUN apt-get update && apt-get install -y cron

# Copy cron job
COPY monitoring.cron /etc/cron.d/square-monitoring
RUN chmod 0644 /etc/cron.d/square-monitoring
RUN crontab /etc/cron.d/square-monitoring
```

### Vercel/Serverless Setup

For serverless environments, use Vercel Cron or external services:

```typescript
// api/cron/monitor-square.ts
import { ScheduledMonitor } from '../../../scripts/monitor-square-integration';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const monitor = new ScheduledMonitor({
      silent: true,
      alertsEnabled: true,
      checkInterval: 15 * 60 * 1000,
      alertThresholds: {
        stuckOrderCount: 3,
        apiResponseTime: 5000,
        failureRate: 0.1,
      },
    });

    await monitor.run();
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

## 🚨 Alert Types

### STUCK_ORDER

- **Trigger**: Orders stuck in DRAFT state > 1 hour
- **Severity**: HIGH or CRITICAL (if > 5 orders)
- **Action**: Run cleanup script

### PAYMENT_FAILURE

- **Trigger**: High payment failure rate
- **Severity**: HIGH
- **Action**: Review payment processing logs

### API_ERROR

- **Trigger**: Square API endpoints unhealthy
- **Severity**: HIGH
- **Action**: Check credentials and connectivity

### HEALTH_CHECK_FAIL

- **Trigger**: Monitoring system failure
- **Severity**: CRITICAL
- **Action**: Check monitoring system logs

## 📋 Troubleshooting

### Common Issues

#### 1. Orders Stuck in DRAFT State

```bash
# Check for stuck orders
curl -X POST http://localhost:3000/api/admin/monitoring/square

# Fix them
pnpm tsx scripts/fix-stuck-square-orders.ts --execute
```

#### 2. Square API Connection Issues

```bash
# Test API health
curl http://localhost:3000/api/health/square

# Check environment variables
echo $SQUARE_ACCESS_TOKEN
echo $SQUARE_LOCATION_ID
```

#### 3. Monitoring Not Working

```bash
# Test monitoring manually
pnpm tsx scripts/monitor-square-integration.ts

# Check logs
tail -f /var/log/square-monitor.log
```

#### 4. Alerts Not Being Sent

```bash
# Verify webhook URLs
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test message"}'

# Check alert system
node -e "
const { getAlertSystem } = require('./src/lib/monitoring/alert-system.ts');
const system = getAlertSystem();
console.log('Alert channels configured');
"
```

### Log Analysis

```bash
# Monitor real-time logs
tail -f logs/application.log | grep -E "(STUCK|CRITICAL|ERROR)"

# Check Square API errors
grep "Square API Error" logs/application.log | tail -20

# Monitor payment processing
grep "payment" logs/application.log | grep -E "(FAILED|ERROR)" | tail -10
```

## 📈 Metrics and KPIs

### Key Metrics to Monitor

1. **Order Success Rate**: (Completed Orders / Total Orders) × 100
2. **Average Order Processing Time**: Time from creation to completion
3. **Stuck Order Count**: Orders in DRAFT state > 1 hour
4. **API Response Time**: Average Square API response time
5. **Payment Failure Rate**: Failed payments / Total payment attempts

### Dashboard Endpoints

```bash
# Real-time metrics
GET /api/admin/monitoring/dashboard

# Health status
GET /api/health/square

# Detailed monitoring
POST /api/admin/monitoring/square
```

## 🔐 Security Considerations

### API Access

- Monitor endpoints should be protected in production
- Use authentication middleware for admin endpoints
- Rate limit monitoring endpoints to prevent abuse

### Sensitive Data

- Alert webhooks may contain order IDs - ensure secure channels
- Don't log sensitive payment information
- Rotate webhook URLs periodically

### Example Security Middleware

```typescript
// middleware/auth.ts
export function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return handler(req, res);
  };
}
```

## 📞 Support and Escalation

### When to Escalate

1. **Critical Alerts**: More than 5 stuck orders
2. **API Outage**: All Square endpoints failing
3. **Payment Failures**: > 20% failure rate
4. **Data Integrity**: Order/payment mismatches

### Escalation Contacts

```bash
# Set up escalation environment variables
ESCALATION_WEBHOOK_URL=...     # For paging system
ONCALL_EMAIL=oncall@company.com
INCIDENT_MANAGEMENT_URL=...    # Incident management system
```

### Emergency Procedures

1. **Stop Order Processing**: Temporarily disable checkout
2. **Customer Communication**: Notify affected customers
3. **Incident Tracking**: Create incident in tracking system
4. **Status Page**: Update status page if public-facing

This monitoring system provides comprehensive coverage for Square integration issues and should prevent the stuck order problem from recurring. Regular monitoring and proactive alerts ensure quick resolution of any issues that do arise.
