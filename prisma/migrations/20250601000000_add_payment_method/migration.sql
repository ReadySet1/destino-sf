-- Create PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('SQUARE', 'VENMO', 'CASH');

-- Add paymentMethod column to orders table
ALTER TABLE "orders" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SQUARE'; 