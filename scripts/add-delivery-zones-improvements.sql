-- Delivery Zones Performance and Audit Improvements
-- Run this script to add indexes and audit logging for delivery zones

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active 
  ON catering_delivery_zones(active) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_delivery_zones_display_order 
  ON catering_delivery_zones("displayOrder" ASC);

-- GIN indexes for array columns (postal codes and cities)
CREATE INDEX IF NOT EXISTS idx_delivery_zones_postal 
  ON catering_delivery_zones USING gin("postalCodes");

CREATE INDEX IF NOT EXISTS idx_delivery_zones_cities 
  ON catering_delivery_zones USING gin(cities);

-- Composite index for zone lookups
CREATE INDEX IF NOT EXISTS idx_delivery_zones_zone_active 
  ON catering_delivery_zones(zone, active) 
  WHERE active = true;

-- Add audit log table for zone changes
CREATE TABLE IF NOT EXISTS delivery_zone_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'TOGGLE')),
  zone_id UUID NOT NULL,
  zone_identifier VARCHAR(255) NOT NULL,
  admin_user_id UUID NOT NULL,
  admin_email VARCHAR(255) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Add foreign key constraint to ensure referential integrity
  CONSTRAINT fk_zone_audit_zone 
    FOREIGN KEY (zone_id) 
    REFERENCES catering_delivery_zones(id) 
    ON DELETE CASCADE
);

-- Create indexes for audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_log_zone_id 
  ON delivery_zone_audit_log(zone_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user 
  ON delivery_zone_audit_log(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
  ON delivery_zone_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_operation 
  ON delivery_zone_audit_log(operation);

-- Store settings usage tracking
-- Add usage flags column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store_settings' 
    AND column_name = 'usage_flags'
  ) THEN
    ALTER TABLE store_settings 
    ADD COLUMN usage_flags JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update existing store_settings records to have usage flags
UPDATE store_settings 
SET usage_flags = '{
  "taxCalculation": true,
  "orderMinimums": true,
  "cateringMinimums": true,
  "customerNotifications": true,
  "shippingLabels": true
}'::jsonb
WHERE usage_flags IS NULL OR usage_flags = '{}'::jsonb;

-- Add index for usage flags queries
CREATE INDEX IF NOT EXISTS idx_store_settings_usage_flags 
  ON store_settings USING gin(usage_flags);

-- Create a function to log delivery zone changes
CREATE OR REPLACE FUNCTION log_delivery_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO delivery_zone_audit_log (
      operation, zone_id, zone_identifier, admin_user_id, admin_email, 
      old_values, created_at
    ) VALUES (
      'DELETE', OLD.id, OLD.zone, 
      COALESCE(current_setting('app.admin_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(current_setting('app.admin_email', true), 'system'),
      to_jsonb(OLD), NOW()
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO delivery_zone_audit_log (
      operation, zone_id, zone_identifier, admin_user_id, admin_email,
      old_values, new_values, created_at
    ) VALUES (
      'UPDATE', NEW.id, NEW.zone,
      COALESCE(current_setting('app.admin_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(current_setting('app.admin_email', true), 'system'),
      to_jsonb(OLD), to_jsonb(NEW), NOW()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO delivery_zone_audit_log (
      operation, zone_id, zone_identifier, admin_user_id, admin_email,
      new_values, created_at
    ) VALUES (
      'CREATE', NEW.id, NEW.zone,
      COALESCE(current_setting('app.admin_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(current_setting('app.admin_email', true), 'system'),
      to_jsonb(NEW), NOW()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trigger_delivery_zone_audit ON catering_delivery_zones;
CREATE TRIGGER trigger_delivery_zone_audit
  AFTER INSERT OR UPDATE OR DELETE
  ON catering_delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION log_delivery_zone_change();

-- Create a view for easy audit log querying
CREATE OR REPLACE VIEW delivery_zone_audit_summary AS
SELECT 
  azl.id,
  azl.operation,
  azl.zone_identifier,
  azl.admin_email,
  azl.created_at,
  -- Extract key changes for easier reading
  CASE 
    WHEN azl.operation = 'UPDATE' THEN
      jsonb_pretty(
        jsonb_object_agg(
          key,
          jsonb_build_object(
            'old', old_val,
            'new', new_val
          )
        )
      )
    WHEN azl.operation = 'CREATE' THEN
      jsonb_pretty(azl.new_values)
    WHEN azl.operation = 'DELETE' THEN
      jsonb_pretty(azl.old_values)
    ELSE 'No changes'
  END as changes_summary
FROM delivery_zone_audit_log azl
LEFT JOIN LATERAL (
  SELECT key, 
         azl.old_values->key as old_val,
         azl.new_values->key as new_val
  FROM jsonb_object_keys(COALESCE(azl.new_values, '{}'::jsonb)) as key
  WHERE azl.old_values->key IS DISTINCT FROM azl.new_values->key
) changes ON azl.operation = 'UPDATE'
GROUP BY azl.id, azl.operation, azl.zone_identifier, azl.admin_email, azl.created_at, azl.old_values, azl.new_values
ORDER BY azl.created_at DESC;

-- Add comments for documentation
COMMENT ON TABLE delivery_zone_audit_log IS 'Audit trail for all changes to catering delivery zones';
COMMENT ON COLUMN delivery_zone_audit_log.operation IS 'Type of operation: CREATE, UPDATE, DELETE, TOGGLE';
COMMENT ON COLUMN delivery_zone_audit_log.old_values IS 'JSON representation of the record before changes';
COMMENT ON COLUMN delivery_zone_audit_log.new_values IS 'JSON representation of the record after changes';
COMMENT ON VIEW delivery_zone_audit_summary IS 'Human-readable summary of delivery zone changes';

-- Grant appropriate permissions (adjust role names as needed)
-- GRANT SELECT ON delivery_zone_audit_log TO readonly_users;
-- GRANT SELECT ON delivery_zone_audit_summary TO readonly_users;
