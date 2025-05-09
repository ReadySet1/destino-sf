-- Add cateringMinimumAmount column to StoreSettings table
ALTER TABLE "StoreSettings" ADD COLUMN "cateringMinimumAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0; 