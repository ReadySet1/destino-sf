-- Rollback script for 20250912000000_add_gratuity_to_orders
-- This script removes the gratuity_amount column from orders table

-- Remove the gratuity_amount column
ALTER TABLE orders DROP COLUMN IF EXISTS gratuity_amount;
