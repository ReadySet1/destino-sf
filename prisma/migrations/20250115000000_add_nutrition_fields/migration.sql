-- CreateExtension (add if it doesn't exist for JSON operations)
-- This migration adds nutrition information fields to the products table

-- Add nutrition fields to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "calories" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "dietary_preferences" TEXT[];
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ingredients" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "allergens" TEXT[];
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nutrition_facts" JSONB;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_products_calories" ON "products" ("calories");
CREATE INDEX IF NOT EXISTS "idx_products_dietary_preferences" ON "products" USING GIN ("dietary_preferences");
CREATE INDEX IF NOT EXISTS "idx_products_allergens" ON "products" USING GIN ("allergens");
CREATE INDEX IF NOT EXISTS "idx_products_nutrition_facts" ON "products" USING GIN ("nutrition_facts");

-- Add comments to explain the fields
COMMENT ON COLUMN "products"."calories" IS 'Calorie count per serving from Square API';
COMMENT ON COLUMN "products"."dietary_preferences" IS 'Dietary preferences/restrictions (e.g., vegan, gluten-free) from Square API';
COMMENT ON COLUMN "products"."ingredients" IS 'Ingredient list as text from Square API';
COMMENT ON COLUMN "products"."allergens" IS 'List of allergens from Square API';
COMMENT ON COLUMN "products"."nutrition_facts" IS 'Complete nutrition facts as JSON from Square API';
