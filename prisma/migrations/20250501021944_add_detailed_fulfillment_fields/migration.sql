/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_orderId_fkey";

-- DropTable
DROP TABLE "Order";

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "squareOrderId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(10,2) NOT NULL,
    "userId" UUID,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fulfillment_type" TEXT,
    "notes" TEXT,
    "pickup_time" TIMESTAMP(3),
    "delivery_date" TEXT,
    "delivery_time" TEXT,
    "shipping_method_name" TEXT,
    "shipping_carrier" TEXT,
    "shipping_service_level_token" TEXT,
    "shipping_cost_cents" INTEGER,
    "shipping_rate_id" TEXT,
    "trackingNumber" TEXT,
    "cancelReason" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_squareOrderId_key" ON "orders"("squareOrderId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
