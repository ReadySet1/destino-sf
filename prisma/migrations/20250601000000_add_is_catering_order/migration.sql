-- Add isCateringOrder column to orders table
ALTER TABLE "orders" ADD COLUMN "isCateringOrder" BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying
CREATE INDEX "orders_isCateringOrder_idx" ON "orders"("isCateringOrder"); 