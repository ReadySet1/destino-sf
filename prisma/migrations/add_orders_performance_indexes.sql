-- Migration: Add compound indexes for orders page performance optimization
-- Run this manually using: psql DATABASE_URL -f add_orders_performance_indexes.sql
-- Or apply via Prisma migration system

-- Add compound indexes for Order table
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_archived_status_created" ON "orders" ("isArchived", "status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_archived_payment_created" ON "orders" ("isArchived", "paymentStatus", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_archived_customer_created" ON "orders" ("isArchived", "customerName", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_archived_created_status" ON "orders" ("isArchived", "createdAt", "status");

-- Add compound indexes for CateringOrder table  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_archived_status_created" ON "catering_orders" ("isArchived", "status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_archived_payment_created" ON "catering_orders" ("isArchived", "paymentStatus", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_archived_name_created" ON "catering_orders" ("isArchived", "name", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_archived_created_status" ON "catering_orders" ("isArchived", "createdAt", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_archived_event_created" ON "catering_orders" ("isArchived", "eventDate", "createdAt");

-- Enable pg_trgm extension if not already enabled for text search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for text search optimization (for ILIKE queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_customer_name_search" ON "orders" USING gin ("customerName" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_email_search" ON "orders" USING gin ("email" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_orders_tracking_search" ON "orders" USING gin ("trackingNumber" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_name_search" ON "catering_orders" USING gin ("name" gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_catering_orders_email_search" ON "catering_orders" USING gin ("email" gin_trgm_ops);


