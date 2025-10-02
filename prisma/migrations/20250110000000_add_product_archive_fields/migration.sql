-- Add archive fields to products table for proper product lifecycle management
-- This allows tracking when and why products are archived, separate from the active status

-- Add archive fields
ALTER TABLE products
  ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN archived_at TIMESTAMP,
  ADD COLUMN archived_reason VARCHAR(100);

-- Add index for performance on archive queries
CREATE INDEX idx_products_archived_active ON products(is_archived, active);

-- Add comment for documentation
COMMENT ON COLUMN products.is_archived IS 'Indicates if product is archived (synced from Square is_archived field)';
COMMENT ON COLUMN products.archived_at IS 'Timestamp when product was archived';
COMMENT ON COLUMN products.archived_reason IS 'Reason for archiving (square_archived, manual, discontinued, removed_from_square)';
