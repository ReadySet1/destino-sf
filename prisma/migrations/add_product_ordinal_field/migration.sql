-- Add the ordinal field to Product table
ALTER TABLE "Product" ADD COLUMN "ordinal" BIGINT;

-- Create index for better performance when ordering by ordinal
CREATE INDEX "Product_ordinal_idx" ON "Product"("ordinal"); 