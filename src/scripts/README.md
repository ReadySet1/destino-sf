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