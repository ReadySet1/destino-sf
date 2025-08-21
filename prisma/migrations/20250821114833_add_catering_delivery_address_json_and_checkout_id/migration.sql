-- Add delivery_address_json column to store structured delivery address data
ALTER TABLE "catering_orders" ADD COLUMN "delivery_address_json" JSONB;

-- Add square_checkout_id column to track Square checkout sessions
ALTER TABLE "catering_orders" ADD COLUMN "square_checkout_id" TEXT;

-- Comment for clarity
COMMENT ON COLUMN "catering_orders"."delivery_address_json" IS 'Structured JSON storage for delivery address including street, city, state, postal code, delivery date and time';
COMMENT ON COLUMN "catering_orders"."square_checkout_id" IS 'Square checkout session ID for tracking payment links';
