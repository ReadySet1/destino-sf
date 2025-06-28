-- Fix broken destino-sf.square.site image URLs
-- These URLs are causing 404 errors and infinite retries

-- Update Cocktail Prawn Platter items to use null (will fallback to default image)
UPDATE "CateringItem" 
SET "imageUrl" = NULL 
WHERE "name" IN (
    'Cocktail Prawn Platter - Large',
    'Cocktail Prawn Platter - Small'
) 
AND "imageUrl" LIKE '%destino-sf.square.site%';

-- Update any other items with broken square.site URLs to use null
UPDATE "CateringItem" 
SET "imageUrl" = NULL 
WHERE "imageUrl" LIKE '%destino-sf.square.site%' 
AND "imageUrl" LIKE '%s153623720258963617_p31_i1_w1000.jpeg%';

-- Check the results
SELECT "name", "category", "imageUrl" 
FROM "CateringItem" 
WHERE "name" LIKE '%Cocktail Prawn%' 
OR "imageUrl" LIKE '%destino-sf.square.site%'; 