-- Create sync_logs table for tracking sync operations
CREATE TABLE "sync_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sync_type" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "items_synced" INTEGER NOT NULL DEFAULT 0,
  "items_created" INTEGER NOT NULL DEFAULT 0,
  "items_updated" INTEGER NOT NULL DEFAULT 0,
  "items_deleted" INTEGER NOT NULL DEFAULT 0,
  "items_skipped" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB,
  "warnings" JSONB,
  "metadata" JSONB,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_by" UUID,
  
  CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient queries
CREATE INDEX "sync_logs_status_idx" ON "sync_logs"("status");
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at" DESC);
CREATE INDEX "sync_logs_sync_type_idx" ON "sync_logs"("sync_type");

-- Add new columns to products table for better sync tracking
ALTER TABLE "products" 
  ADD COLUMN IF NOT EXISTS "square_version" BIGINT,
  ADD COLUMN IF NOT EXISTS "square_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(20) DEFAULT 'SYNCED';

-- Create index for sync status
CREATE INDEX IF NOT EXISTS "products_sync_status_idx" ON "products"("sync_status");