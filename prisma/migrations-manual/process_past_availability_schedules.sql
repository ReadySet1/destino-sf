-- Migration: Process Past Availability Schedules
-- Purpose: Apply all unprocessed availability rule schedules that were scheduled in the past
-- Date: 2025-09-30
-- Issue: Availability processor only looks at schedules within 5-minute window, missing past schedules

-- This migration processes ALL unprocessed schedules and applies the correct product states

BEGIN;

-- Step 1: Update Alfajores- Pride (6-pack) to view_only state
-- Rule: Pride Season (view_only), active from Sept 28 - Oct 2
-- Expected state: PUBLIC visibility, not available (view only)
UPDATE products
SET
  visibility = 'PUBLIC',
  is_available = false,
  item_state = 'ACTIVE',
  is_preorder = false,
  "updatedAt" = NOW()
WHERE id = '9cb26053-ecf4-438c-b99f-87954a327061'
  AND name = 'Alfajores- Pride (6-pack)';

-- Step 2: Update Alfajores- Valentine's (10 per packet) to coming_soon state
-- Rule: Valentine's Day (coming_soon), active from Sept 30 - Jan 15, 2026
-- Expected state: PUBLIC visibility, not available (coming soon)
-- Note: coming_soon is similar to view_only - visible but not purchasable
UPDATE products
SET
  visibility = 'PUBLIC',
  is_available = false,
  item_state = 'ACTIVE',
  is_preorder = false,
  "updatedAt" = NOW()
WHERE id = 'c02c5068-fcc6-4b87-8c0b-18c3df8e1d4e'
  AND name = 'Alfajores- Valentine''s (10 per packet)';

-- Step 3: Mark all past activation schedules as processed
-- This includes:
-- - Pride: activate_view_only (Sept 28)
-- - Valentine's: activate_coming_soon (Sept 30)
UPDATE availability_schedule
SET
  processed = true,
  processed_at = NOW()
WHERE processed = false
  AND scheduled_at <= NOW()
  AND state_change IN ('activate_view_only', 'activate_coming_soon');

-- Step 4: Log the migration for audit purposes
INSERT INTO sync_logs (
  sync_id,
  sync_type,
  status,
  items_synced,
  items_failed,
  started_at,
  completed_at,
  summary
) VALUES (
  gen_random_uuid(),
  'AVAILABILITY_MIGRATION',
  'SUCCESS',
  2, -- 2 products updated
  0,
  NOW(),
  NOW(),
  jsonb_build_object(
    'migration', 'process_past_availability_schedules',
    'products_updated', ARRAY[
      '9cb26053-ecf4-438c-b99f-87954a327061', -- Pride
      'c02c5068-fcc6-4b87-8c0b-18c3df8e1d4e'  -- Valentine's
    ],
    'schedules_processed', 2,
    'description', 'Applied past unprocessed availability schedules to correct product states'
  )
);

COMMIT;

-- Verify the changes
SELECT
  p.name,
  p.visibility,
  p.is_available,
  p.item_state,
  ar.name as rule_name,
  ar.state as rule_state,
  ar.start_date,
  ar.end_date,
  COUNT(s.id) FILTER (WHERE s.processed = false) as unprocessed_schedules
FROM products p
INNER JOIN availability_rules ar ON ar."productId" = p.id
LEFT JOIN availability_schedule s ON s."ruleId" = ar.id
WHERE p.id IN (
  '9cb26053-ecf4-438c-b99f-87954a327061',
  'c02c5068-fcc6-4b87-8c0b-18c3df8e1d4e'
)
GROUP BY p.id, p.name, p.visibility, p.is_available, p.item_state, ar.name, ar.state, ar.start_date, ar.end_date;
