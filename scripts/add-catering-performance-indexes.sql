-- Performance optimization indexes for catering queries
-- Run this in production to improve catering API performance

BEGIN;

-- Index for product.active queries (used in all catering endpoints)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_active 
ON "Product" (active);

-- Index for product.categoryId queries (primary lookup field)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_category_id 
ON "Product" ("categoryId");

-- Composite index for active products by category (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_active_category_ordinal 
ON "Product" (active, "categoryId", ordinal) 
WHERE active = true;

-- Index for category name lookups (used to get category IDs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_name 
ON "Category" (name);

-- Composite index for category name with case-insensitive matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_category_name_lower 
ON "Category" (LOWER(name));

-- Index for product ordinal ordering within categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_ordinal 
ON "Product" (ordinal);

-- Index for product name (fallback ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_name 
ON "Product" (name);

-- Composite index for the exact catering query pattern: active + categoryId + ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_catering_optimized 
ON "Product" (active, "categoryId", ordinal, name) 
WHERE active = true;

-- Index for delivery zones optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_delivery_zone_active 
ON "CateringDeliveryZone" (active);

-- Index for catering delivery zone postal codes (JSON array search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_delivery_zone_postal_codes 
ON "CateringDeliveryZone" USING gin ("postalCodes");

-- Index for catering delivery zone cities (JSON array search)  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_delivery_zone_cities 
ON "CateringDeliveryZone" USING gin (cities);

-- Index for regular delivery zones optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regular_delivery_zone_active 
ON "RegularDeliveryZone" (active);

-- Index for regular delivery zone postal codes (JSON array search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regular_delivery_zone_postal_codes 
ON "RegularDeliveryZone" USING gin ("postalCodes");

-- Index for regular delivery zone cities (JSON array search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_regular_delivery_zone_cities 
ON "RegularDeliveryZone" USING gin (cities);

-- Index for catering orders optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_order_status 
ON "CateringOrder" (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_order_created_at 
ON "CateringOrder" ("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_order_event_date 
ON "CateringOrder" ("eventDate");

-- Index for catering order items optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catering_order_item_order_id 
ON "CateringOrderItem" ("orderId");

-- Product variants optimization (for buffet items)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variant_product_id 
ON "ProductVariant" ("productId");

-- Analysis query to check index usage (run after creating indexes)
-- You can run this to verify the indexes are being used:
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT p.id, p.name, p.description, p.price, p.images, p."dietaryPreferences", p.active, p.ordinal, p."categoryId"
FROM "Product" p
WHERE p.active = true 
  AND p."categoryId" IN (
    SELECT id FROM "Category" 
    WHERE name IN ('CATERING- LUNCH, STARTERS', 'CATERING- LUNCH, ENTREES', 'CATERING- LUNCH, SIDES', 'CATERING- DESSERTS')
  )
ORDER BY p.ordinal ASC, p.name ASC;
*/

COMMIT;

-- Post-creation notes:
-- 1. CONCURRENTLY option ensures indexes are built without blocking writes
-- 2. Partial indexes on active=true reduce index size since we only query active products
-- 3. Composite indexes are ordered by selectivity (most selective first)
-- 4. GIN indexes on JSON arrays enable efficient array containment searches
-- 5. Case-insensitive indexes support mode: 'insensitive' queries
