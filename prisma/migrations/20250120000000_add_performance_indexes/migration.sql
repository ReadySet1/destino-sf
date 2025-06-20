-- Add performance indexes to optimize queries
-- This migration addresses the 185-parameter ILIKE query performance issue
-- and other database performance bottlenecks

-- 1. Product table optimizations
-- Add case-insensitive index for name searches (fixes the ILIKE performance issue)
CREATE INDEX IF NOT EXISTS idx_product_name_lower 
ON "Product" (LOWER(name));

-- Add GIN index for full-text search on product names
CREATE INDEX IF NOT EXISTS idx_product_name_gin 
ON "Product" USING gin(to_tsvector('english', name));

-- Add index for active products (commonly filtered)
CREATE INDEX IF NOT EXISTS idx_product_active 
ON "Product" (active);

-- Add composite index for active products by category (common query pattern)
CREATE INDEX IF NOT EXISTS idx_product_active_category 
ON "Product" (active, "categoryId") WHERE active = true;

-- Add index for featured products
CREATE INDEX IF NOT EXISTS idx_product_featured 
ON "Product" (featured) WHERE featured = true;

-- 2. CateringItem table optimizations
-- Add composite index for active catering items by category
CREATE INDEX IF NOT EXISTS idx_catering_item_active_category 
ON "CateringItem" ("isActive", category) WHERE "isActive" = true;

-- Add case-insensitive index for catering item names
CREATE INDEX IF NOT EXISTS idx_catering_item_name_lower 
ON "CateringItem" (LOWER(name));

-- Add index for Square product ID lookups
CREATE INDEX IF NOT EXISTS idx_catering_item_square_product_id 
ON "CateringItem" ("squareProductId") WHERE "squareProductId" IS NOT NULL;

-- Add index for active items
CREATE INDEX IF NOT EXISTS idx_catering_item_active 
ON "CateringItem" ("isActive");

-- 3. CateringPackage table optimizations
-- Add composite index for active featured packages
CREATE INDEX IF NOT EXISTS idx_catering_package_active_featured 
ON "CateringPackage" ("isActive", "featuredOrder") WHERE "isActive" = true;

-- Add index for package type filtering
CREATE INDEX IF NOT EXISTS idx_catering_package_type 
ON "CateringPackage" (type);

-- Add index for active packages
CREATE INDEX IF NOT EXISTS idx_catering_package_active 
ON "CateringPackage" ("isActive");

-- 4. Profile table optimizations (for user lookup performance)
-- Add index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profile_role 
ON "Profile" (role);

-- Add index for created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_profile_created_at 
ON "Profile" (created_at);

-- 5. Category table optimizations
-- Add index for active categories
CREATE INDEX IF NOT EXISTS idx_category_active 
ON "Category" ("isActive");

-- Add index for category ordering
CREATE INDEX IF NOT EXISTS idx_category_order 
ON "Category" ("order");

-- 6. CateringOrder table optimizations (already has some indexes, adding missing ones)
-- Add composite index for status and event date
CREATE INDEX IF NOT EXISTS idx_catering_order_status_event_date 
ON "CateringOrder" (status, "eventDate");

-- Add index for payment status
CREATE INDEX IF NOT EXISTS idx_catering_order_payment_status 
ON "CateringOrder" ("paymentStatus");

-- 7. Order table optimizations (use correct table name "orders")
-- Add composite index for user orders by status
CREATE INDEX IF NOT EXISTS idx_order_user_status 
ON "orders" ("userId", status) WHERE "userId" IS NOT NULL;

-- Add index for payment method
CREATE INDEX IF NOT EXISTS idx_order_payment_method 
ON "orders" ("paymentMethod");

-- Comment explaining the performance improvements
-- These indexes address:
-- 1. The 185-parameter Product ILIKE query by using LOWER() and GIN indexes
-- 2. Efficient filtering of active items across all catering tables
-- 3. Fast category-based filtering for products and catering items
-- 4. Optimized user profile lookups
-- 5. Improved order status and date-based queries 