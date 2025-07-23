# Email Routing Configuration

This document explains how email alerts are routed to different recipients based on their type.

## Overview

The email system now routes different types of alerts to different email addresses:

- **Error alerts** go to the main admin email (`ADMIN_EMAIL`)
- **Order and general store emails** go to James's email (`JAMES_EMAIL`) if configured, otherwise fallback to admin email

## Environment Variables

### Required
- `ADMIN_EMAIL`: The main admin email address (receives error alerts)
- `JAMES_EMAIL`: James's email address (receives order and general store emails)

### Example Configuration
```env
ADMIN_EMAIL=ealanis@readysetllc.com
JAMES_EMAIL=james@destinosf.com
```

## Email Routing Logic

### Error Alerts (go to ADMIN_EMAIL)
- System errors
- Payment failures
- Payment gateway alerts
- Website performance alerts

### Order & General Store Emails (go to JAMES_EMAIL if configured)
- New order notifications
- Order status changes
- Daily summaries
- Contact form submissions
- Catering inquiries
- Inventory low stock alerts
- Sales trend alerts
- Revenue milestones
- Order volume alerts

### Fallback Behavior
If `JAMES_EMAIL` is not configured, all emails will go to `ADMIN_EMAIL`.

## Implementation Details

The routing logic is implemented in the `getRecipientEmail()` function in:
- `src/lib/alerts.ts` - Main alert service
- `src/app/api/alerts/route.ts` - Manual alert API

## Testing

You can test the routing by:

1. Setting both environment variables
2. Triggering different types of alerts
3. Verifying emails are sent to the correct addresses

## Migration Notes

- Existing alerts will continue to work with the current `ADMIN_EMAIL`
- To enable James's email routing, simply add the `JAMES_EMAIL` environment variable
- The system gracefully falls back to `ADMIN_EMAIL` if `JAMES_EMAIL` is not set 