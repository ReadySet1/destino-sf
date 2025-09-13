-- Rollback script for fix_catering_orders_retry_fields
-- This script removes the retry-related fields from catering_orders table

-- Remove the retry-related columns from catering_orders table
ALTER TABLE catering_orders 
DROP COLUMN IF EXISTS last_retry_at,
DROP COLUMN IF EXISTS payment_url,
DROP COLUMN IF EXISTS payment_url_expires_at,
DROP COLUMN IF EXISTS retry_count;
