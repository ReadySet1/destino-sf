-- Migration: Fix Alfajores de Lucuma (10 per packet) Availability
-- Date: 2025-09-30
-- Issue: Product stuck in legacy SEASONAL state with is_available: false
-- Root Cause: Different issue than Pride/Valentine's products - no unprocessed schedules,
--             but product was in a legacy state from before availability rules system

-- ============================================================================
-- PRODUCTION FIX
-- ============================================================================
-- Production has NO availability rules, product was stuck in legacy SEASONAL state

BEGIN;

UPDATE products
SET
  visibility = 'PUBLIC',
  is_available = true,
  active = true,
  item_state = 'ACTIVE',
  is_preorder = false,
  "updatedAt" = NOW()
WHERE id = '1ad24693-b2cd-4e29-bf59-edbfd2773b7a'
  AND name = 'Alfajores de Lucuma (10 per packet)';

INSERT INTO sync_logs (
  sync_type, status, items_synced, items_updated,
  started_at, completed_at, metadata
) VALUES (
  'PRODUCT_AVAILABILITY_FIX',
  'SUCCESS', 1, 1,
  NOW(), NOW(),
  jsonb_build_object(
    'product_id', '1ad24693-b2cd-4e29-bf59-edbfd2773b7a',
    'product_name', 'Alfajores de Lucuma (10 per packet)',
    'issue', 'Product stuck in legacy SEASONAL state with is_available: false',
    'fix', 'Set to ACTIVE and available since no availability rules exist',
    'old_state', jsonb_build_object(
      'visibility', 'PUBLIC', 'is_available', false,
      'item_state', 'SEASONAL', 'is_preorder', true
    ),
    'new_state', jsonb_build_object(
      'visibility', 'PUBLIC', 'is_available', true,
      'item_state', 'ACTIVE', 'is_preorder', false
    )
  )
);

COMMIT;

-- ============================================================================
-- DEVELOPMENT FIX
-- ============================================================================
-- Development has "Summer Menu Items" seasonal rule (May 1 - Sept 30 yearly)
-- but it was never applied to the product and no schedules were created

BEGIN;

-- Apply the rule: make product available (we're still in summer period today)
UPDATE products
SET
  visibility = 'PUBLIC',
  is_available = true,
  active = true,
  item_state = 'ACTIVE',
  is_preorder = false,
  "updatedAt" = NOW()
WHERE id = '85eeae43-3aca-48bb-8a4d-c2cded357168'
  AND name = 'Alfajores de Lucuma (10 per packet)';

-- Create schedules for future seasonal changes
INSERT INTO availability_schedule (
  id, "ruleId", scheduled_at, state_change, processed
) VALUES
  (gen_random_uuid(), '15935005-1168-48fe-881d-2a666b346f64', '2025-10-01 00:00:00'::timestamp, 'seasonal_end_available', false),
  (gen_random_uuid(), '15935005-1168-48fe-881d-2a666b346f64', '2026-05-01 00:00:00'::timestamp, 'seasonal_start_available', false),
  (gen_random_uuid(), '15935005-1168-48fe-881d-2a666b346f64', '2026-09-30 23:59:59'::timestamp, 'seasonal_end_available', false);

INSERT INTO sync_logs (
  id, sync_type, status, items_synced, items_updated,
  started_at, completed_at, metadata
) VALUES (
  gen_random_uuid(),
  'PRODUCT_AVAILABILITY_FIX',
  'SUCCESS', 1, 1,
  NOW(), NOW(),
  jsonb_build_object(
    'product_id', '85eeae43-3aca-48bb-8a4d-c2cded357168',
    'product_name', 'Alfajores de Lucuma (10 per packet)',
    'issue', 'Seasonal rule exists but was never applied',
    'fix', 'Applied Summer Menu Items rule and created schedules',
    'schedules_created', 3
  )
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Production verification
SELECT
  'PRODUCTION' as environment,
  name, visibility, is_available, active, item_state
FROM products
WHERE name = 'Alfajores de Lucuma (10 per packet)';

-- Development verification
SELECT
  'DEVELOPMENT' as environment,
  p.name, p.visibility, p.is_available, p.active, p.item_state,
  (SELECT COUNT(*) FROM availability_rules ar WHERE ar."productId" = p.id AND ar.deleted_at IS NULL) as rules_count,
  (SELECT COUNT(*) FROM availability_rules ar2
   JOIN availability_schedule s ON s."ruleId" = ar2.id
   WHERE ar2."productId" = p.id AND s.processed = false AND s.scheduled_at > NOW()) as future_schedules
FROM products p
WHERE p.name = 'Alfajores de Lucuma (10 per packet)';
