-- Add description validation fields to products table
-- This migration adds fields to track product descriptor mapping validation

-- Add description validation fields to products table
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "correct_description" TEXT,
ADD COLUMN IF NOT EXISTS "description_source" VARCHAR(50) DEFAULT 'SQUARE',
ADD COLUMN IF NOT EXISTS "description_validated_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "mapping_status" VARCHAR(20) DEFAULT 'NEEDS_REVIEW';

-- Create product_mapping_audit table for tracking issues
CREATE TABLE IF NOT EXISTS "product_mapping_audit" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "square_id" VARCHAR(255) NOT NULL,
  "issue_type" VARCHAR(50) NOT NULL,
  "severity" VARCHAR(20) NOT NULL,
  "field_name" VARCHAR(100),
  "expected_value" TEXT,
  "actual_value" TEXT,
  "message" TEXT,
  "resolved" BOOLEAN DEFAULT false,
  "resolved_at" TIMESTAMPTZ,
  "resolved_by" UUID REFERENCES "profiles"("id"),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_mapping_audit_product" ON "product_mapping_audit"("product_id");
CREATE INDEX IF NOT EXISTS "idx_mapping_audit_issue_type" ON "product_mapping_audit"("issue_type");
CREATE INDEX IF NOT EXISTS "idx_mapping_audit_resolved" ON "product_mapping_audit"("resolved");
CREATE INDEX IF NOT EXISTS "idx_products_mapping_status" ON "products"("mapping_status");

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_mapping_audit_updated_at'
  ) THEN
    CREATE TRIGGER update_mapping_audit_updated_at
      BEFORE UPDATE ON "product_mapping_audit"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create view for easy issue tracking
CREATE OR REPLACE VIEW "product_mapping_issues" AS
SELECT 
  p.id,
  p."squareId",
  p.name,
  p.description,
  p."categoryId",
  c.name as category_name,
  p.mapping_status,
  COUNT(DISTINCT pma.id) as issue_count,
  ARRAY_AGG(DISTINCT pma.issue_type) as issue_types
FROM "products" p
LEFT JOIN "categories" c ON p."categoryId" = c.id
LEFT JOIN "product_mapping_audit" pma ON p.id = pma.product_id AND pma.resolved = false
GROUP BY p.id, p."squareId", p.name, p.description, p."categoryId", c.name, p.mapping_status;

-- Add comments to explain the new fields
COMMENT ON COLUMN "products"."correct_description" IS 'Validated description from Square catalog (source of truth)';
COMMENT ON COLUMN "products"."description_source" IS 'Source of the current description (SQUARE, MANUAL, etc.)';
COMMENT ON COLUMN "products"."description_validated_at" IS 'Timestamp when description was last validated against Square';
COMMENT ON COLUMN "products"."mapping_status" IS 'Validation status: VALID, INVALID, NEEDS_REVIEW';

COMMENT ON TABLE "product_mapping_audit" IS 'Tracks product descriptor mapping issues and their resolution';
COMMENT ON VIEW "product_mapping_issues" IS 'Aggregated view of products with unresolved mapping issues';
