-- Populate shipping_configurations table with default weight configurations
-- This ensures accurate shipping cost calculations for all products

-- Clear any existing configurations first (in case of re-run)
DELETE FROM shipping_configurations;

-- Insert default configurations for product types
INSERT INTO shipping_configurations (
  id,
  "productName",
  "baseWeightLb",
  "weightPerUnitLb",
  "isActive",
  "applicableForNationwideOnly",
  "createdAt",
  "updatedAt"
) VALUES
  -- Alfajores configuration
  (
    'a1fa1001-a1fa-4001-a1fa-a1fa1001a1fa',
    'alfajores',
    0.5,  -- Base weight: 0.5 lbs (first unit + packaging)
    0.4,  -- Per-unit weight: 0.4 lbs (each additional unit)
    true,
    true, -- Only for nationwide shipping
    NOW(),
    NOW()
  ),
  -- Empanadas configuration
  (
    'e3fa3001-e3fa-4001-e3fa-e3fa3001e3fa',
    'empanadas',
    1.0,  -- Base weight: 1.0 lbs (first unit + packaging)
    0.8,  -- Per-unit weight: 0.8 lbs (each additional unit)
    true,
    true, -- Only for nationwide shipping
    NOW(),
    NOW()
  ),
  -- Default configuration (for products that don't match patterns)
  (
    'd3fa0001-d3fa-4001-d3fa-d3fa0001d3fa',
    'default',
    0.5,  -- Base weight: 0.5 lbs (conservative default)
    0.5,  -- Per-unit weight: 0.5 lbs (conservative default)
    true,
    true, -- Only for nationwide shipping
    NOW(),
    NOW()
  );

-- Verify the data was inserted
DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM shipping_configurations WHERE "isActive" = true;

  IF config_count < 3 THEN
    RAISE EXCEPTION 'Failed to insert shipping configurations. Expected 3, got %', config_count;
  END IF;

  RAISE NOTICE 'Successfully populated % shipping configurations', config_count;
END $$;
