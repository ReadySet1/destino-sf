# Production Square Order Fixes

Comprehensive guide for safely executing Square order fixes in production environment.

## 🚨 Critical Safety Information

**NEVER run fixes without proper verification:**

- Always run in **DRY RUN** mode first
- Verify stuck orders manually in Square dashboard
- Have backup plans ready
- Monitor results continuously

## 🔧 Available Fix Methods

### Method 1: Admin API Endpoint ⭐ **Recommended**

**Safest method - Web-based with built-in safety checks**

```bash
# 1. Access the admin panel
https://destinosf.com/admin/monitoring

# 2. Check stuck orders status
GET /api/admin/fix-production-orders

# 3. Run dry run first
POST /api/admin/fix-production-orders
{
  "action": "fix-stuck-orders",
  "dryRun": true
}

# 4. Execute actual fixes (after reviewing dry run)
POST /api/admin/fix-production-orders
{
  "action": "fix-stuck-orders",
  "dryRun": false
}
```

**Advantages:**

- Built-in admin authentication
- Automatic safety checks
- Web interface available
- Detailed logging
- Limited batch size (50 orders max)

### Method 2: Production Script via Vercel

**For advanced cases or batch processing**

```bash
# 1. Pull production environment variables
vercel env pull .env.production

# 2. Run the safe production script
./scripts/production-square-fix.sh

# 3. Alternative: Direct script execution
NODE_ENV=production npx tsx scripts/fix-stuck-square-orders.ts --dry-run
NODE_ENV=production npx tsx scripts/fix-stuck-square-orders.ts --execute
```

### Method 3: Remote Execution (Emergency)

**For critical situations when local access isn't available**

```bash
# 1. SSH into Vercel deployment (if available)
vercel login
vercel dev --prod

# 2. Or use Vercel Functions
vercel functions invoke fix-production-orders
```

## 📋 Pre-Fix Checklist

### ✅ Before Running ANY Fix:

1. **Verify Environment**

   ```bash
   # Check current environment
   echo $NODE_ENV
   echo $SQUARE_ENVIRONMENT
   ```

2. **Check Database Connection**

   ```bash
   # Test database connectivity
   npm run db:check
   ```

3. **Verify Square Connection**

   ```bash
   # Test Square API
   curl -X GET https://destinosf.com/api/health/square
   ```

4. **Backup Current State**

   ```bash
   # Create database backup
   npm run db:backup:production
   ```

5. **Review Stuck Orders Manually**
   - Login to Square Dashboard
   - Check Orders → Recent orders
   - Verify which orders appear stuck

## 🔍 Identifying Stuck Orders

### Common Symptoms:

- Order exists in database with `squareOrderId`
- Order status is `PENDING` for >1 hour
- Payment status is `COMPLETED` but order status is `PENDING`
- Order doesn't appear in Square dashboard

### Monitoring Query:

```sql
SELECT
  id,
  squareOrderId,
  status,
  paymentStatus,
  total,
  customerName,
  createdAt
FROM orders
WHERE
  squareOrderId IS NOT NULL
  AND createdAt >= NOW() - INTERVAL '24 hours'
  AND (
    (status = 'PENDING' AND createdAt < NOW() - INTERVAL '1 hour')
    OR (paymentStatus = 'COMPLETED' AND status IN ('PENDING', 'PROCESSING'))
  )
ORDER BY createdAt DESC;
```

## 🚀 Step-by-Step Fix Process

### Phase 1: Assessment (5-10 minutes)

1. **Check Monitoring Dashboard**

   ```bash
   # Visit admin monitoring
   https://destinosf.com/admin/monitoring/square
   ```

2. **Run Dry Run via API**

   ```bash
   curl -X POST https://destinosf.com/api/admin/fix-production-orders \
     -H "Content-Type: application/json" \
     -d '{"action": "fix-stuck-orders", "dryRun": true}' \
     -H "Cookie: your-auth-cookie"
   ```

3. **Review Results**
   - Number of stuck orders found
   - Order details and ages
   - Estimated fix complexity

### Phase 2: Verification (10-15 minutes)

1. **Manual Square Dashboard Check**
   - Login to Square Dashboard
   - Navigate to Orders
   - Search for order IDs from dry run
   - Confirm they're missing or in DRAFT state

2. **Customer Impact Assessment**
   - Check if customers received confirmation emails
   - Review payment completion status
   - Identify any customer service tickets

3. **Business Impact Analysis**
   - Revenue at risk
   - Customer satisfaction impact
   - Operational urgency

### Phase 3: Execution (5-20 minutes)

1. **Final Safety Check**

   ```bash
   # Verify we're hitting production
   curl https://destinosf.com/api/health/square
   ```

2. **Execute Fixes**

   ```bash
   # Via API (recommended)
   curl -X POST https://destinosf.com/api/admin/fix-production-orders \
     -H "Content-Type: application/json" \
     -d '{"action": "fix-stuck-orders", "dryRun": false}'

   # Or via script
   ./scripts/production-square-fix.sh
   ```

3. **Monitor Progress**
   - Watch logs in real-time
   - Check fix success rate
   - Monitor for errors

### Phase 4: Verification (10-15 minutes)

1. **Verify Fixes in Square**
   - Refresh Square Dashboard
   - Confirm orders now appear
   - Check order states (should be OPEN/COMPLETED)

2. **Database Verification**

   ```sql
   -- Check updated order statuses
   SELECT status, COUNT(*)
   FROM orders
   WHERE updatedAt >= NOW() - INTERVAL '30 minutes'
   GROUP BY status;
   ```

3. **Customer Communication**
   - Send confirmation emails if needed
   - Update customer service team
   - Monitor for customer inquiries

## 🛠️ Troubleshooting Common Issues

### Issue 1: "Order already finalized"

**Cause:** Square order exists but database status outdated
**Fix:** Update database status only

```typescript
// Handled automatically by the fix script
action: 'already_finalized';
```

### Issue 2: "Version conflict"

**Cause:** Square order was modified externally
**Fix:** Retry with latest version

```typescript
// Script automatically fetches latest version
const squareOrder = await squareService.getOrder(orderId);
updateRequest.order.version = squareOrder.version;
```

### Issue 3: "Location ID mismatch"

**Cause:** Order created with different location
**Fix:** Use correct location ID

```bash
# Verify location ID
echo $SQUARE_LOCATION_ID
```

### Issue 4: "Payment already captured"

**Cause:** Payment processed but order not finalized
**Fix:** Finalize order without payment changes

```typescript
// Only update order state, not payment
updateRequest.order.state = 'OPEN';
```

## 📊 Monitoring and Alerts

### Automated Monitoring

```bash
# Set up continuous monitoring
npm run monitor:square:production

# Or via cron job
0 */2 * * * cd /app && npm run monitor:square:production
```

### Key Metrics to Track:

- Number of stuck orders per hour
- Fix success rate
- Average time to resolution
- Customer impact (complaints, refunds)

### Alert Thresholds:

- **LOW**: 1-2 stuck orders
- **MEDIUM**: 3-5 stuck orders
- **HIGH**: 6-10 stuck orders
- **CRITICAL**: >10 stuck orders

## 🔐 Security and Access Control

### Authentication Requirements:

- Admin role in database
- Valid session authentication
- IP whitelist (if configured)
- Rate limiting applies

### Audit Trail:

- All fix attempts logged
- User email tracked
- Timestamps recorded
- Results stored

### Access Levels:

```typescript
// Required permissions
userProfile.role === 'ADMIN';
session.user.email in ADMIN_EMAILS;
```

## 📞 Emergency Contacts

### Escalation Path:

1. **Development Team**: Technical fixes
2. **Operations Team**: Customer communication
3. **Square Support**: Platform issues
4. **Management**: Business impact decisions

### Emergency Response:

- If >20 orders stuck: Immediate escalation
- If payment issues: Contact Square support
- If data corruption: Stop all fixes, backup data

## 🚨 Rollback Procedures

### If Fix Goes Wrong:

1. **Stop All Operations**

   ```bash
   # Kill any running scripts
   pkill -f "fix-stuck-square-orders"
   ```

2. **Assess Damage**

   ```sql
   -- Check recent order updates
   SELECT * FROM orders
   WHERE updatedAt >= NOW() - INTERVAL '1 hour'
   ORDER BY updatedAt DESC;
   ```

3. **Restore from Backup**

   ```bash
   # Restore database if needed
   npm run db:restore:latest
   ```

4. **Contact Square**
   - Report any order state issues
   - Request assistance with order recovery

---

## 🎯 Success Criteria

A successful fix operation should result in:

- ✅ All stuck orders visible in Square dashboard
- ✅ Order states updated to OPEN/COMPLETED
- ✅ Database statuses synchronized
- ✅ No customer payment issues
- ✅ Proper audit trail maintained
- ✅ Zero data corruption

---

_Always prioritize data integrity and customer experience over speed of resolution._
