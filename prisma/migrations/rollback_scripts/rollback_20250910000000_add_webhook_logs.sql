-- Rollback script for 20250910000000_add_webhook_logs
-- This script reverses the webhook_logs table creation

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_webhook_logs_updated_at ON webhook_logs;

-- Drop the table (this will also drop all indexes)
DROP TABLE IF EXISTS webhook_logs;

-- Note: We don't drop the update_updated_at_column() function as it might be used by other tables
