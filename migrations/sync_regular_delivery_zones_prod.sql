-- Migration: Sync Regular Delivery Zones from Development to Production
-- Description: Updates production delivery zones to match development configuration
-- Date: 2025-10-23
-- Changes:
--   1. Remove SF_EXTENDED zone (not in development)
--   2. Update all zone names, descriptions, fees, and minimum order thresholds
--   3. Adjust display order to match development

BEGIN;

-- Step 1: Delete SF_EXTENDED zone (only exists in production, not in development)
DELETE FROM regular_delivery_zones
WHERE zone = 'SF_EXTENDED'
AND id = '06c58b12-da7f-4f6c-b525-f041e22f7448';

-- Step 2: Update SF_CORE zone
UPDATE regular_delivery_zones
SET
  name = 'San Francisco',
  description = 'Central San Francisco neighborhoods',
  minimum_order_for_free = 0.00,
  delivery_fee = 25.00,
  estimated_delivery_time = '30-60 minutes',
  postal_codes = ARRAY['94102','94103','94104','94105','94107','94108','94109','94110','94111','94112','94114','94115','94133','94158'],
  cities = ARRAY['San Francisco'],
  display_order = 1,
  updated_at = NOW()
WHERE zone = 'SF_CORE'
AND id = '62aa47fb-1360-4481-86a0-00269bbf755c';

-- Step 3: Update PENINSULA_EXTENDED zone
UPDATE regular_delivery_zones
SET
  name = 'Lower Peninsula',
  description = 'Lower Peninsula including San Mateo, Redwood City, Palo Alto, Mountain View',
  minimum_order_for_free = 25.00,
  delivery_fee = 35.00,
  estimated_delivery_time = '60-90 minutes',
  postal_codes = ARRAY['94002','94010','94011','94014','94015','94016','94017','94018','94019','94020','94021','94025','94026','94027','94028','94030','94038','94044','94061','94062','94063','94064','94065','94066','94070','94074','94080','94083','94401','94402','94403','94404'],
  cities = ARRAY['San Mateo','Redwood City','Foster City','Belmont','San Carlos','Menlo Park','Atherton','Portola Valley','Woodside','Half Moon Bay','Pacifica','Daly City','South San Francisco','San Bruno','Millbrae','Burlingame','Hillsborough'],
  display_order = 2,
  updated_at = NOW()
WHERE zone = 'PENINSULA_EXTENDED'
AND id = '6259878c-5c10-4846-8f77-079ac3005eb6';

-- Step 4: Update PENINSULA_SOUTH zone (South Bay)
UPDATE regular_delivery_zones
SET
  name = 'South Bay',
  description = 'South Bay including San Jose, Santa Clara, Sunnyvale, Cupertino',
  minimum_order_for_free = 50.00,
  delivery_fee = 65.00,
  estimated_delivery_time = '60-90 minutes',
  postal_codes = ARRAY['94301','94302','94303','94304','94305','94306','94041','94043','94085','94086','94087','94301','95014','95050','95051','95110','95112','95113','95116','95117','95118','95119','95120','95121','95122','95123','95124','95125','95126','95127','95128','95129','95130','95131','95132','95133','95134','95135','95136','95138','95139','95140','95148'],
  cities = ARRAY['Palo Alto','Mountain View','Sunnyvale','Santa Clara','San Jose','Cupertino','Campbell','Los Gatos','Saratoga','Los Altos','Los Altos Hills','Milpitas'],
  display_order = 3,
  updated_at = NOW()
WHERE zone = 'PENINSULA_SOUTH'
AND id = '43737d3b-afdc-4705-a913-263e721cd038';

-- Step 5: Update EAST_BAY zone
UPDATE regular_delivery_zones
SET
  name = 'East Bay',
  description = 'Oakland, Berkeley, and surrounding East Bay cities',
  minimum_order_for_free = 25.00,
  delivery_fee = 35.00,
  estimated_delivery_time = '45-75 minutes',
  postal_codes = ARRAY['94601','94602','94603','94605','94606','94607','94608','94609','94610','94611','94612','94618','94619','94621','94702','94703','94704','94705','94706','94707','94708','94709','94710','94720','94501','94502','94536','94537','94538','94539','94540','94541','94542','94544','94545','94546','94555','94560','94566','94577','94578','94579','94580'],
  cities = ARRAY['Oakland','Berkeley','Alameda','Emeryville','Fremont','Hayward','San Leandro','Union City','Newark','Castro Valley','San Lorenzo','Ashland','Cherryland'],
  display_order = 4,
  updated_at = NOW()
WHERE zone = 'EAST_BAY'
AND id = '21083e97-ab67-4e9e-b037-c03bd01e2000';

-- Step 6: Update NORTH_BAY zone
UPDATE regular_delivery_zones
SET
  name = 'Marin County',
  description = 'Marin County and Napa Valley areas',
  minimum_order_for_free = 25.00,
  delivery_fee = 65.00,
  estimated_delivery_time = '75-120 minutes',
  postal_codes = ARRAY['94901','94903','94904','94913','94914','94915','94920','94924','94925','94930','94933','94937','94938','94939','94940','94941','94942','94945','94946','94947','94948','94949','94950','94956','94957','94960','94963','94965','94970','94971','94973','94974','94976','94977','94978','94979','94998','94599','94558','94559','94562','94563','94567','94573','94574','94576','94581','94589','94590'],
  cities = ARRAY['San Rafael','Novato','Mill Valley','Tiburon','Sausalito','Corte Madera','Larkspur','San Anselmo','Fairfax','Ross','Kentfield','Belvedere','Napa','Yountville','St. Helena','Calistoga','American Canyon'],
  display_order = 5,
  updated_at = NOW()
WHERE zone = 'NORTH_BAY'
AND id = '87990b77-b2da-43c4-beea-0774f3a30c69';

-- Verification query
SELECT
  zone,
  name,
  delivery_fee,
  minimum_order_for_free,
  display_order,
  active
FROM regular_delivery_zones
ORDER BY display_order;

COMMIT;
