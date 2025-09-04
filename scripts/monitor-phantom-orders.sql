-- Monitor for new phantom orders (run every hour)
-- This query should return 0 if the fix is working properly

SELECT 
  COUNT(*) as phantom_count,
  MAX("createdAt") as latest_phantom_order,
  COUNT(CASE WHEN "customerName" = 'Pending' THEN 1 END) as pending_phantoms,
  COUNT(CASE WHEN "customerName" = 'Pending Order' THEN 1 END) as pending_order_phantoms
FROM orders
WHERE 
  total = 0
  AND ("customerName" IN ('Pending Order', 'Pending') 
       OR email IN ('pending@example.com', 'pending-order@webhook.temp'))
  AND "createdAt" > NOW() - INTERVAL '1 hour';

-- Check catering order processing to ensure no duplicates
SELECT 
  co.id as catering_id,
  co."squareOrderId",
  co.status as catering_status,
  co."totalAmount",
  o.id as regular_id,
  o.total as regular_total,
  CASE 
    WHEN o.id IS NOT NULL THEN 'DUPLICATE_DETECTED'
    ELSE 'OK'
  END as duplicate_status
FROM catering_orders co
LEFT JOIN orders o ON o."squareOrderId" = co."squareOrderId"
WHERE co."createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY co."createdAt" DESC;

-- Monitor webhook processing efficiency
SELECT 
  DATE_TRUNC('hour', "createdAt") as hour,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN total = 0 AND "customerName" = 'Pending Order' THEN 1 END) as phantom_orders,
  ROUND(
    COUNT(CASE WHEN total = 0 AND "customerName" = 'Pending Order' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as phantom_percentage
FROM orders
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', "createdAt")
ORDER BY hour DESC;
