-- Add performance indexes for better sync performance
-- This script adds indexes that will significantly improve database query performance
-- especially for Square sync operations and product filtering

-- Index for active status filtering (used in archive logic)
CREATE INDEX IF NOT EXISTS "products_active_idx" ON "products"("active");

-- Index for date-based queries (used in archive logic)
CREATE INDEX IF NOT EXISTS "products_createdAt_idx" ON "products"("createdAt");

-- Composite index for sync operations (squareId + active)
CREATE INDEX IF NOT EXISTS "products_squareId_active_idx" ON "products"("squareId", "active");

-- Composite index for sync status updates (squareId + syncStatus)
CREATE INDEX IF NOT EXISTS "products_squareId_syncStatus_idx" ON "products"("squareId", "syncStatus");

-- Add comment to document the purpose of these indexes
COMMENT ON INDEX "products_active_idx" IS 'Performance index for filtering active/inactive products';
COMMENT ON INDEX "products_createdAt_idx" IS 'Performance index for date-based product queries';
COMMENT ON INDEX "products_squareId_active_idx" IS 'Composite index for sync operations filtering by squareId and active status';
COMMENT ON INDEX "products_squareId_syncStatus_idx" IS 'Composite index for sync status updates filtering by squareId and sync status';

-- Verify the indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'products' 
AND indexname IN (
    'products_active_idx',
    'products_createdAt_idx',
    'products_squareId_active_idx',
    'products_squareId_syncStatus_idx'
)
ORDER BY indexname;
