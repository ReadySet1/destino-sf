-- Fix missing retry-related fields in catering_orders table
-- These fields should match the ones in orders table for payment retry functionality

-- Add missing retry-related columns to catering_orders table
ALTER TABLE "catering_orders" 
ADD COLUMN IF NOT EXISTS "last_retry_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "payment_url" TEXT,
ADD COLUMN IF NOT EXISTS "payment_url_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0;
