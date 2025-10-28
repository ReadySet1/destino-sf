-- Migration: Sync Catering Delivery Zones from Development to Production
-- Description: Updates production catering zones to match development configuration
-- Date: 2025-10-23
-- Changes:
--   1. Delete 'peninsula' zone (not in development)
--   2. Update south_bay minimum order amount from $350 to $400
--   3. Update lower_peninsula minimum from $400 to $350 and fee from $100 to $65
--   4. Add east_bay zone (new in development)
--   5. Add marin_county zone (new in development)

BEGIN;

-- Step 1: Delete 'peninsula' zone (only exists in production, not in development)
DELETE FROM catering_delivery_zones
WHERE zone = 'peninsula'
AND id = '6e183c94-cbdc-4f98-84f4-18a2bc203daa';

-- Step 2: Update south_bay zone (increase minimum order from $350 to $400)
UPDATE catering_delivery_zones
SET
  "minimumAmount" = 400.00,
  "updatedAt" = NOW()
WHERE zone = 'south_bay'
AND id = '0190ad65-0fac-423c-a17f-723495502ef2';

-- Step 3: Update lower_peninsula zone (decrease minimum from $400 to $350, decrease fee from $100 to $65)
UPDATE catering_delivery_zones
SET
  "minimumAmount" = 350.00,
  "deliveryFee" = 65.00,
  "updatedAt" = NOW()
WHERE zone = 'lower_peninsula'
AND id = 'e421068d-8318-4822-8af1-5e7a2b03d738';

-- Step 4: Add east_bay zone (new zone from development)
INSERT INTO catering_delivery_zones (
  id,
  zone,
  name,
  description,
  "minimumAmount",
  "deliveryFee",
  "estimatedDeliveryTime",
  "postalCodes",
  cities,
  "displayOrder",
  active,
  "createdAt",
  "updatedAt"
)
VALUES (
  'e3197afe-fcf1-48a3-aae0-ce974ddd01ee',
  'east_bay',
  'East Bay',
  'Oakland, Berkeley, and surrounding East Bay cities',
  400.00,
  75.00,
  '2-3 hours',
  ARRAY['94601','94602','94603','94605','94606','94607','94608','94609','94610','94611','94612','94618','94619','94621','94702','94703','94704','94705','94706','94707','94708','94709','94710','94720'],
  ARRAY['Oakland','Berkeley','Alameda','Emeryville','Piedmont'],
  4,
  true,
  NOW(),
  NOW()
);

-- Step 5: Add marin_county zone (new zone from development)
INSERT INTO catering_delivery_zones (
  id,
  zone,
  name,
  description,
  "minimumAmount",
  "deliveryFee",
  "estimatedDeliveryTime",
  "postalCodes",
  cities,
  "displayOrder",
  active,
  "createdAt",
  "updatedAt"
)
VALUES (
  'fd75672e-70a7-47e6-b132-9e317847736f',
  'marin_county',
  'Marin County',
  'Marin County and surrounding areas',
  400.00,
  65.00,
  '2-3 hours',
  ARRAY['94901','94903','94904','94913','94914','94915','94920','94924','94925','94930','94933','94939','94940','94941','94945','94949'],
  ARRAY['San Rafael','Novato','Mill Valley','Tiburon','Sausalito','Corte Madera','Larkspur','San Anselmo'],
  5,
  true,
  NOW(),
  NOW()
);

-- Verification query
SELECT
  zone,
  name,
  "minimumAmount",
  "deliveryFee",
  "displayOrder",
  active,
  array_length("postalCodes", 1) as postal_code_count,
  array_length(cities, 1) as cities_count
FROM catering_delivery_zones
ORDER BY "displayOrder";

COMMIT;
