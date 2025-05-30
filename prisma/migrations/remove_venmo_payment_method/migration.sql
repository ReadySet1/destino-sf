-- Remove VENMO from PaymentMethod enum
-- First, update any existing records that use VENMO to use CASH instead
UPDATE "orders" SET "paymentMethod" = 'CASH' WHERE "paymentMethod" = 'VENMO';
UPDATE "CateringOrder" SET "paymentMethod" = 'CASH' WHERE "paymentMethod" = 'VENMO';

-- Create new enum without VENMO
CREATE TYPE "PaymentMethod_new" AS ENUM ('SQUARE', 'CASH');

-- Update orders table to use new enum
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING "paymentMethod"::text::"PaymentMethod_new";
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" SET DEFAULT 'SQUARE';

-- Update CateringOrder table to use new enum
ALTER TABLE "CateringOrder" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING "paymentMethod"::text::"PaymentMethod_new";

-- Drop old enum and rename new enum
DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod"; 