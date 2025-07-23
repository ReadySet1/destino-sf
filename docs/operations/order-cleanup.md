# Order Cleanup Operations

This document describes how to safely clean testing orders from your database using the automated cleanup scripts.

## Overview

The order cleanup system provides a safe, controlled way to remove testing orders while preserving all legitimate customer data. It includes comprehensive safety features and backup/restore capabilities.

## Scripts

### 1. Safe Cleanup Workflow (`safe-cleanup-workflow.ts`) ⭐ **RECOMMENDED**

A master workflow script that orchestrates the complete safety process:

- Full database backup before any changes
- Order-specific backup for granular restore
- Testing order cleanup with all safety features
- Verification and rollback capabilities

### 2. Database Backup & Restore (`backup-database.ts`, `restore-database.ts`)

Full PostgreSQL database backup and restore scripts using pg_dump:

- Multiple formats (custom, SQL, directory)
- Compression and verification
- Metadata tracking and retention management

### 3. Clean Testing Orders (`clean-testing-orders.ts`)

The main cleanup script that identifies and removes testing orders based on configurable criteria.

### 4. Restore Orders from Backup (`restore-orders-from-backup.ts`)

A companion script to restore orders from backup files if needed.

## Quick Start

### **🛡️ RECOMMENDED: Safe Cleanup Workflow (Maximum Safety)**

The safest way to clean testing orders with full database backup:

```bash
# 1. Preview the complete workflow (always do this first!)
pnpm safe-cleanup:preview

# 2. Execute safe cleanup of test emails only (safest option)
pnpm safe-cleanup:test-emails

# 3. Execute full safe cleanup with all protections
pnpm safe-cleanup:execute
```

### **⚡ Alternative: Direct Order Cleanup**

For experienced users who want more control:

```bash
# Preview deletion with default criteria
pnpm clean-orders:preview

# Clean orders with confirmation and backup
pnpm clean-orders:execute

# Clean only test email orders
pnpm clean-orders:test-emails
```

### **💾 Database Backup (Standalone)**

Create full database backups independently:

```bash
# Create compressed custom format backup (recommended)
pnpm backup-db

# Create SQL backup for analysis
pnpm backup-db:sql

# Schema-only backup
pnpm backup-db:schema
```

## Safety Features

### 🛡️ Multiple Safety Layers

**Safe Cleanup Workflow (Recommended):**

1. **Full Database Backup**: Complete PostgreSQL dump before any changes
2. **Order Analysis**: Preview exactly what will be cleaned
3. **Order-Specific Backup**: JSON backup of orders to be deleted
4. **Transaction Safety**: All changes in database transactions with rollback
5. **Step-by-Step Confirmation**: Interactive approval for each major step
6. **Automatic Verification**: Backup integrity and result validation

**Individual Scripts:**

1. **Dry Run Mode (Default)**: Preview changes before execution
2. **Automatic Backup**: Creates JSON backup before deletion
3. **Transaction Rollback**: All changes roll back on error
4. **Confirmation Prompts**: Interactive confirmation for production
5. **Exclusion Lists**: Hardcoded protection for known production orders
6. **Referential Integrity**: Proper deletion order to maintain database consistency

### 💾 Database Backup Features

- **Multiple Formats**: Custom (recommended), SQL, or Directory formats
- **Compression**: Automatic compression to save space
- **Verification**: Backup integrity checking
- **Metadata Tracking**: Complete backup information and recovery instructions
- **Retention Management**: Automatic cleanup of old backups
- **Performance**: Parallel processing for large databases

### 🔍 Order Identification

The script identifies testing orders using multiple criteria:

- **Test Email Patterns**: `test@`, `demo@`, `example@`, `+test`, `.test`, etc.
- **Failed Orders**: Orders with `FAILED` payment status
- **Cancelled Orders**: Orders with `CANCELLED` status
- **Old Orders**: Failed/cancelled orders older than 90 days (optional)
- **Date Ranges**: Orders within specific date ranges
- **Custom Exclusions**: Specific order IDs to always preserve

### 🎯 What Gets Preserved

The script will **NEVER** delete:

- Orders with production customer emails
- High-value paid orders (>$100 with PAID status)
- Orders in the hardcoded exclusion list
- Orders outside specified date ranges

## Command Reference

### Clean Testing Orders Script

```bash
pnpm tsx src/scripts/clean-testing-orders.ts [OPTIONS]
```

#### Options

| Option                | Description                                    | Default      |
| --------------------- | ---------------------------------------------- | ------------ |
| `--dry-run`           | Preview what would be deleted                  | ✅ (default) |
| `--execute`           | Actually perform the deletion                  | ❌           |
| `--backup`            | Create backup before deletion                  | ✅ (default) |
| `--no-backup`         | Skip backup creation                           | ❌           |
| `--confirm`           | Ask for confirmation before deletion           | ✅ (default) |
| `--no-confirm`        | Skip confirmation prompts                      | ❌           |
| `--test-emails-only`  | Only delete orders with test email patterns    | ❌           |
| `--include-old`       | Include old failed/cancelled orders (>90 days) | ❌           |
| `--from="YYYY-MM-DD"` | Delete orders from this date                   | All dates    |
| `--to="YYYY-MM-DD"`   | Delete orders up to this date                  | All dates    |
| `--exclude-id=ID`     | Exclude specific order ID from deletion        | None         |
| `--batch-size=N`      | Process in batches of N orders                 | 50           |

#### Examples

```bash
# Preview deletion with default criteria
pnpm clean-orders:preview

# Delete test email orders only (safest option)
pnpm clean-orders:test-emails

# Delete orders from January 2024
pnpm tsx src/scripts/clean-testing-orders.ts --execute --from="2024-01-01" --to="2024-01-31"

# Emergency cleanup (use carefully!)
pnpm tsx src/scripts/clean-testing-orders.ts --execute --no-confirm --no-backup

# Exclude specific orders
pnpm tsx src/scripts/clean-testing-orders.ts --execute --exclude-id="order-123" --exclude-id="order-456"
```

### Restore Orders Script

```bash
pnpm tsx src/scripts/restore-orders-from-backup.ts --backup-file="path/to/backup.json" [OPTIONS]
```

#### Options

| Option                | Description                    | Default      |
| --------------------- | ------------------------------ | ------------ |
| `--backup-file=PATH`  | Path to backup JSON file       | **Required** |
| `--dry-run`           | Preview what would be restored | ✅ (default) |
| `--execute`           | Actually perform restoration   | ❌           |
| `--no-confirm`        | Skip confirmation prompts      | ❌           |
| `--fail-on-conflicts` | Fail if conflicts found        | ❌           |

#### Examples

```bash
# Preview restoration
pnpm restore-orders --backup-file="backups/order-cleanup/orders-backup-2024-01-01T10-00-00-000Z.json" --dry-run

# Restore from backup
pnpm restore-orders --backup-file="backups/order-cleanup/orders-backup-2024-01-01T10-00-00-000Z.json" --execute
```

## Workflow

### Recommended Cleanup Process

1. **Preview First** (Always!)

   ```bash
   pnpm clean-orders:preview
   ```

2. **Review the Report**
   - Check the number of orders to be deleted
   - Review sample orders and deletion reasons
   - Verify no legitimate orders are included

3. **Start with Conservative Options**

   ```bash
   # Start with test emails only
   pnpm clean-orders:test-emails

   # Then clean specific date ranges if needed
   pnpm tsx src/scripts/clean-testing-orders.ts --execute --from="2024-01-01" --to="2024-01-31"
   ```

4. **Verify Results**
   - Check application functionality
   - Verify database integrity
   - Monitor for any issues

5. **Keep Backup Files**
   - Store backup files safely
   - Document what was cleaned
   - Keep backups for at least 30 days

### Emergency Restore Process

If you need to restore deleted orders:

1. **Locate Backup File**

   ```bash
   ls -la backups/order-cleanup/
   ```

2. **Preview Restoration**

   ```bash
   pnpm restore-orders --backup-file="path/to/backup.json" --dry-run
   ```

3. **Execute Restoration**
   ```bash
   pnpm restore-orders --backup-file="path/to/backup.json" --execute
   ```

## Database Impact

### Tables Affected

The cleanup process affects these tables in order:

1. **email_alerts** (references orders)
2. **order_items** (references orders, products, variants)
3. **catering_order_items** (references catering_orders)
4. **refunds** (references payments)
5. **payments** (references orders)
6. **catering_orders** (main table)
7. **orders** (main table)

### Referential Integrity

The script maintains database integrity by:

- Deleting in correct dependency order
- Using database transactions
- Checking foreign key constraints
- Rolling back on any error

## Monitoring and Logs

### Script Output

The scripts provide detailed logging:

- Configuration summary
- Orders found and criteria
- Deletion progress
- Error messages
- Final report with statistics

### Backup Files

Backup files contain:

- All deleted order data
- Related data (payments, items, etc.)
- Metadata (timestamp, configuration)
- Restore instructions

### Report Example

```
📊 CLEANUP REPORT
==================

🔧 Configuration:
   Mode: EXECUTE
   Date range: 2024-01-01 to 2024-01-31
   Test emails only: false
   Include failed orders: true
   Include cancelled orders: true
   Backup created: true

🎯 Orders Found:
   Regular orders: 15
   Catering orders: 3

🗑️  Data Processed:
   Regular orders deleted: 15
   Catering orders deleted: 3
   Email alerts deleted: 8
   Order items deleted: 45
   Payments deleted: 12
   Refunds deleted: 2
   TOTAL RECORDS PROCESSED: 85

💾 Backup: backups/order-cleanup/orders-backup-2024-01-01T10-00-00-000Z.json

✅ Cleanup completed successfully!
```

## Best Practices

### 🎯 Before Running

1. **Test in Development First**
   - Run scripts on development/staging database
   - Verify behavior matches expectations
   - Test restore process

2. **Review Current Data**
   - Check total order counts
   - Identify legitimate vs. test orders
   - Note any special cases

3. **Plan Cleanup Strategy**
   - Start with conservative criteria
   - Clean in phases if needed
   - Schedule during low-traffic periods

### 💡 During Cleanup

1. **Always Preview First**
   - Never skip the dry-run step
   - Review all output carefully
   - Understand what will be deleted

2. **Monitor Progress**
   - Watch for errors or warnings
   - Note performance on large datasets
   - Keep logs for documentation

### 🔒 After Cleanup

1. **Verify Application**
   - Test key user flows
   - Check admin interfaces
   - Verify reporting systems

2. **Database Integrity**
   - Run basic queries
   - Check foreign key constraints
   - Monitor for orphaned records

3. **Document Results**
   - Save cleanup reports
   - Note any issues found
   - Update cleanup procedures

## Troubleshooting

### Common Issues

**"No orders found matching criteria"**

- Review your criteria settings
- Check date ranges
- Verify test email patterns

**"Transaction failed and rolled back"**

- Database constraint violation
- Check foreign key relationships
- Review error messages for details

**"Backup file not found"**

- Verify backup file path
- Check backup directory permissions
- Ensure backup was created successfully

### Error Recovery

If cleanup fails:

1. **Check Error Messages**: Review detailed error output
2. **Database State**: Database should be unchanged due to transaction rollback
3. **Retry Strategy**: Fix issues and retry with smaller batch sizes
4. **Manual Cleanup**: Use database tools for complex cases

### Getting Help

If you encounter issues:

1. **Check Logs**: Review script output and error messages
2. **Database Status**: Verify database connectivity and health
3. **Backup Status**: Ensure backups are available
4. **Contact Support**: Provide error logs and configuration details

## Security Considerations

### Production Safety

- Scripts include extra confirmation for production environments
- Hardcoded exclusion lists protect critical orders
- Transaction rollback prevents partial deletions
- Automatic backups enable recovery

### Data Privacy

- Backup files contain sensitive customer data
- Store backups securely
- Delete old backups according to retention policies
- Encrypt backups if required by compliance

### Access Control

- Limit script access to authorized personnel
- Use proper database credentials
- Log script execution for audit trails
- Follow principle of least privilege

---

## Summary

The order cleanup system provides a comprehensive, safe way to remove testing orders while protecting production data. Always start with preview mode, use conservative criteria, and maintain backups for emergency recovery.

For questions or issues, refer to the troubleshooting section or consult the development team.
