import { AlertType } from '@prisma/client';
import { env } from '@/env';

/**
 * Helper function to determine the appropriate recipient email based on alert type
 * Orders and general store emails go to James, error alerts go to admin
 */
export function getRecipientEmail(alertType: AlertType): string {
  // Error-related alerts go to admin email
  const errorAlertTypes = [
    'SYSTEM_ERROR',
    'PAYMENT_FAILED',
    'PAYMENT_GATEWAY_ALERT',
    'WEBSITE_PERFORMANCE_ALERT',
  ];

  if (errorAlertTypes.includes(alertType)) {
    return env.ADMIN_EMAIL;
  }

  // Order and general store emails go to James if configured, otherwise fallback to admin
  const orderAndStoreAlertTypes = [
    'NEW_ORDER',
    'ORDER_STATUS_CHANGE',
    'DAILY_SUMMARY',
    'CONTACT_FORM_RECEIVED',
    'CATERING_INQUIRY_RECEIVED',
    'INVENTORY_LOW_STOCK',
    'SALES_TREND_ALERT',
    'REVENUE_MILESTONE',
    'ORDER_VOLUME_ALERT',
  ];

  if (orderAndStoreAlertTypes.includes(alertType)) {
    return env.JAMES_EMAIL || env.ADMIN_EMAIL;
  }

  // Default to admin email for any other types
  return env.ADMIN_EMAIL;
}
