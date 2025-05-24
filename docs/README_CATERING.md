# Catering Feature Migrations

## 1. Add isCateringOrder flag to orders table (20250601000000_add_is_catering_order)

This migration adds a boolean flag `isCateringOrder` to the orders table to identify orders that contain catering items. It also creates an index on this column for efficient querying.

### Changes:
- Added `isCateringOrder` column (BOOLEAN NOT NULL DEFAULT false) to orders table
- Created index `orders_isCateringOrder_idx` on the `isCateringOrder` column

### Purpose:
This allows the system to:
- Differentiate between regular orders and catering orders in the database
- Display catering orders with a different color in the admin panel (amber/yellow instead of blue)
- Apply different business rules to catering orders (such as minimum order amounts)

### Related Code:
- Created `src/store/catering-cart.ts` for separate catering cart logic
- Updated order creation functions to set the `isCateringOrder` flag based on products
- Modified admin panel to display catering orders with distinct styling 