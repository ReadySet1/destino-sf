-- Remove custom-related fields from spotlight_picks table
ALTER TABLE spotlight_picks 
DROP COLUMN IF EXISTS custom_title,
DROP COLUMN IF EXISTS custom_description, 
DROP COLUMN IF EXISTS custom_image_url,
DROP COLUMN IF EXISTS custom_price,
DROP COLUMN IF EXISTS personalize_text,
DROP COLUMN IF EXISTS custom_link,
DROP COLUMN IF EXISTS show_new_feature_modal,
DROP COLUMN IF EXISTS new_feature_title,
DROP COLUMN IF EXISTS new_feature_description,
DROP COLUMN IF EXISTS new_feature_badge_text,
DROP COLUMN IF EXISTS is_custom;

-- Make productId required (NOT NULL) since we only support product-based picks now
ALTER TABLE spotlight_picks 
ALTER COLUMN product_id SET NOT NULL;

-- Drop the entire spotlight_image_uploads table (no longer needed)
DROP TABLE IF EXISTS spotlight_image_uploads; 