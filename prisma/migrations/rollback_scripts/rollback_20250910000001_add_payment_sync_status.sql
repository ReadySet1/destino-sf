-- Rollback script for 20250910000001_add_payment_sync_status
-- This script reverses the payment_sync_status table creation

-- Drop the table (this will also drop all indexes)
DROP TABLE IF EXISTS payment_sync_status;
