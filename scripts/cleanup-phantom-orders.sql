-- ===============================================
-- PHANTOM ORDER CLEANUP SCRIPT
-- Run this after deploying the webhook fixes
-- ===============================================

-- Step 1: Identify ALL phantom orders from both webhook handlers
-- This includes orders with:
-- - customerName: 'Pending' (from webhook-handlers.ts)
-- - customerName: 'Pending Order' (from main webhook route.ts)
-- - email: 'pending@example.com' (from webhook-handlers.ts)
-- - email: 'pending-order@webhook.temp' (from main webhook route.ts)

SELECT 
  id,
  "squareOrderId",
  status,
  total,
  "customerName",
  email,
  "createdAt",
  CASE 
    WHEN "customerName" = 'Pending' AND email = 'pending@example.com' THEN 'SECONDARY_HANDLER_PHANTOM'
    WHEN "customerName" = 'Pending Order' AND email = 'pending-order@webhook.temp' THEN 'MAIN_HANDLER_PHANTOM'
    ELSE 'OTHER_PHANTOM'
  END as phantom_source
FROM orders
WHERE 
  total = 0
  AND ("customerName" IN ('Pending Order', 'Pending') 
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Step 2: Count phantom orders by source
SELECT 
  CASE 
    WHEN "customerName" = 'Pending' AND email = 'pending@example.com' THEN 'SECONDARY_HANDLER_PHANTOM'
    WHEN "customerName" = 'Pending Order' AND email = 'pending-order@webhook.temp' THEN 'MAIN_HANDLER_PHANTOM'
    ELSE 'OTHER_PHANTOM'
  END as phantom_source,
  COUNT(*) as count
FROM orders
WHERE 
  total = 0
  AND ("customerName" IN ('Pending Order', 'Pending') 
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY phantom_source;

-- Step 3: Check for any related order items, payments, or other data
SELECT 
  o.id,
  o."squareOrderId",
  o."customerName",
  COUNT(oi.id) as item_count,
  COUNT(p.id) as payment_count
FROM orders o
LEFT JOIN order_items oi ON oi."orderId" = o.id
LEFT JOIN payments p ON p."orderId" = o.id
WHERE 
  o.total = 0
  AND (o."customerName" IN ('Pending Order', 'Pending') 
       OR o.email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND o."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY o.id, o."squareOrderId", o."customerName"
HAVING COUNT(oi.id) > 0 OR COUNT(p.id) > 0;

-- Step 4: DELETE phantom orders (uncomment after verification)
-- WARNING: Only run this after verifying the above queries show the correct phantom orders

/*
DELETE FROM orders 
WHERE 
  total = 0
  AND ("customerName" IN ('Pending Order', 'Pending') 
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days';
*/

-- Step 5: Verification query (run after deletion)
-- This should return 0 rows if cleanup was successful
/*
SELECT COUNT(*) as remaining_phantom_orders
FROM orders
WHERE 
  total = 0
  AND ("customerName" IN ('Pending Order', 'Pending') 
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '7 days';
*/
