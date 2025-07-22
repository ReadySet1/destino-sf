# Destino SF Scripts

This directory contains utility scripts for managing Destino SF's database and Square integration.

## Core Scripts

- **sync-production.mjs** - Syncs products from Square production environment to the database
- **auto-clean-categories.mjs** - Cleans up product categories and maintains only the Default category
- **check-env.mjs** - Validates that required environment variables are properly set up

## Utility Scripts

- **test-db-connection.mjs** - Tests the database connection
- **check-square-env.mjs** - Validates Square API environment variables
- **batch-update-slugs.ts** - Updates product slugs in the database
- **deactivate-obsolete-products.ts** - Deactivates products that are no longer available in Square

## Cleanup Tools

- **identify-unused-scripts.mjs** - Identifies scripts that are not part of the core workflow
- **cleanup.sh** - Safely moves unused scripts to a backup directory

## Database & Order Management

- **safe-cleanup-workflow.ts** - ⭐ **RECOMMENDED** Master workflow with full database backup + order cleanup
- **backup-database.ts** - Full PostgreSQL database backup with compression and verification
- **restore-database.ts** - PostgreSQL database restoration from backups
- **clean-testing-orders.ts** - Safely removes testing orders from the database with backup/restore capabilities
- **restore-orders-from-backup.ts** - Restores orders from backup files created by the cleanup script

### Safe Cleanup Workflow (Recommended)

**🛡️ Maximum Safety - Full database backup + order cleanup:**

```bash
# Preview complete workflow (always do this first!)
pnpm safe-cleanup:preview

# Execute safe cleanup of test emails only (safest option)
pnpm safe-cleanup:test-emails

# Execute full safe cleanup with all protections
pnpm safe-cleanup:execute
```

### Database Backup

**💾 Full PostgreSQL backups:**

```bash
# Create compressed custom format backup (recommended)
pnpm backup-db

# Create SQL backup for analysis
pnpm backup-db:sql

# Create directory format for large databases
pnpm backup-db:dir

# Schema-only backup
pnpm backup-db:schema

# Restore from backup
pnpm restore-db --backup-file="path/to/backup"
```

### Order Cleanup (Advanced)

**⚠️ Important: Always run safe-cleanup workflow first! Use these for advanced scenarios only.**

```bash
# Preview what would be deleted
pnpm clean-orders:preview

# Clean only test email orders
pnpm clean-orders:test-emails

# Clean orders with confirmation and backup
pnpm clean-orders:execute

# Restore from order backup if needed
pnpm restore-orders --backup-file="path/to/backup.json" --execute
```

See [Order Cleanup Documentation](../docs/operations/order-cleanup.md) for detailed usage.

## Usage

### Production Sync

To sync products from Square production to the database:

```bash
# Run this to sync products from Square to the database
./sync-from-production.sh
```

### Clean Up Categories

To clean up categories and keep only the Default category:

```bash
node src/scripts/auto-clean-categories.mjs
```

### Test Database Connection

If you're having issues with the database connection:

```bash
node src/scripts/test-db-connection.mjs
```

## Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

- `DATABASE_URL` - PostgreSQL database URL
- `SQUARE_PRODUCTION_TOKEN` - Square API production token
- `SQUARE_ACCESS_TOKEN` - Square API sandbox token (for testing) 