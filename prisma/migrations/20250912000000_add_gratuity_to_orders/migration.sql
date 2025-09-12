-- Add gratuity amount field to orders table
ALTER TABLE "orders" ADD COLUMN "gratuity_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN "orders"."gratuity_amount" IS 'Gratuity/tip amount added to the order';
