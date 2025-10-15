# Square Payment Verification System

## Overview

The Square Payment Verification system allows administrators to manually verify payment status directly with Square's API when webhooks fail to sync properly. This resolves issues where payments show as "PENDING" in the admin dashboard but appear as "PAID" in Square.

## How It Works

### The Problem

Sometimes Square webhooks fail to deliver payment status updates, causing a mismatch between:

- **Local Database**: Shows payment as `PENDING`
- **Square Dashboard**: Shows payment as `PAID`

### The Solution

Two new verification options in the admin order details:

1. **"Verificar con Square"** - Checks payment status with Square API without making changes
2. **"Sincronizar Automático"** - Checks with Square and automatically syncs if there's a mismatch

## Technical Implementation

### API Endpoints

#### `POST /api/admin/orders/[orderId]/verify-square-payment`

Verifies payment status directly with Square and optionally syncs the status.

**Request Body:**

```json
{
  "autoSync": false // Set to true for automatic sync
}
```

**Response:**

```json
{
  "success": true,
  "verification": {
    "orderId": "uuid",
    "squareOrderId": "square_order_id",
    "localStatus": "PENDING",
    "squareStatus": "PAID",
    "statusMismatch": true,
    "paymentId": "payment_id",
    "amount": 6462,
    "currency": "USD",
    "details": {
      "orderState": "COMPLETED",
      "tenderType": "CARD",
      "tenderStatus": "CAPTURED",
      "tenderCount": 1
    }
  },
  "sync": {
    "performed": true,
    "newStatus": "PAID",
    "newOrderStatus": "PROCESSING"
  },
  "message": "Payment status synced: PENDING → PAID"
}
```

### Core Functions

#### `verifySquarePaymentStatus(squareOrderId: string)`

Located in `/src/lib/square/payment-verification.ts`

This function:

1. Retrieves order details from Square API
2. Examines payment tenders (payments) for the order
3. Maps Square payment status to our internal status
4. Returns detailed verification results

**Status Mapping:**

- `CAPTURED` or `COMPLETED` → `PAID`
- `FAILED` or `CANCELED` → `FAILED`
- No tenders or other statuses → `PENDING`

### Frontend Integration

The `PaymentSyncButton` component (`/src/app/(dashboard)/admin/orders/[orderId]/components/PaymentSyncButton.tsx`) provides the UI for manual verification.

**Features:**

- Shows warning when payment status is PENDING or FAILED
- "Verificar con Square" button - Checks status and shows results in toast
- "Sincronizar Automático" button - Checks and auto-syncs if needed
- Toast notifications with detailed status information
- Automatic page refresh after successful sync

## Usage Instructions

### For Administrators

1. **Identify Problem Orders**
   - Look for orders with `PENDING` payment status
   - Check if Square dashboard shows the payment as completed

2. **Verify Payment Status**
   - Click "Verificar con Square" to check current status
   - Review the toast notification for status details

3. **Sync if Needed**
   - If there's a mismatch, click "Sincronizar Automático"
   - Or use the "Sincronizar Ahora" button that appears in mismatch notifications

4. **Confirm Results**
   - Page will refresh automatically after sync
   - Verify that payment and order status are updated correctly

### Toast Notification Types

- **✅ Success**: Payment status verified and matches
- **⚠️ Warning**: Status mismatch detected with sync option
- **❌ Error**: API errors or verification failures

## Error Handling

The system includes comprehensive error handling for:

- **Network Issues**: Retry logic and clear error messages
- **Authentication Failures**: Token validation and helpful error messages
- **API Rate Limits**: Proper error responses with retry suggestions
- **Missing Orders**: Clear messaging when orders aren't found in Square
- **Invalid Tokens**: Configuration validation and error reporting

## Security

- **Admin-Only Access**: All endpoints require admin authentication
- **Token Validation**: Square API tokens are validated before use
- **Audit Trail**: All manual sync actions are logged with admin user ID
- **Order Notes**: Sync actions are recorded in order notes

## Environment Configuration

Required environment variables:

```bash
# For sandbox/development
USE_SQUARE_SANDBOX=true
SQUARE_SANDBOX_TOKEN=your_sandbox_token

# For production
SQUARE_PRODUCTION_TOKEN=your_production_token
# OR
SQUARE_ACCESS_TOKEN=your_access_token
```

## Testing

Run the payment verification tests:

```bash
npm test src/__tests__/square/payment-verification.test.ts
```

The test suite covers:

- Successful payment verification
- Pending payment handling
- API error scenarios
- Network error handling
- Environment configuration validation

## Troubleshooting

### Common Issues

1. **"Square access token not configured"**
   - Check environment variables are set correctly
   - Verify token format (alphanumeric with underscores/hyphens only)

2. **"Order not found in Square"**
   - Verify the order has a valid `squareOrderId`
   - Check if the order was created in the correct Square environment

3. **Slow API responses**
   - Check network connectivity to Square's servers
   - Verify Square service status

4. **Status still not syncing**
   - Check order notes for sync history
   - Verify webhook configuration in Square dashboard
   - Check server logs for detailed error information

## Future Enhancements

- Bulk payment verification for multiple orders
- Automated reconciliation reports
- Integration with Square's batch payment APIs
- Enhanced status history tracking
