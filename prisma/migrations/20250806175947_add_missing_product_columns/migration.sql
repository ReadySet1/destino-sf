/*
  Warnings:

  - You are about to drop the column `isActive` on the `catering_delivery_zones` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';

-- DropForeignKey
ALTER TABLE "spotlight_picks" DROP CONSTRAINT "spotlight_picks_product_id_fkey";

-- DropIndex
DROP INDEX "catering_delivery_zones_isActive_idx";

-- AlterTable
ALTER TABLE "catering_delivery_zones" DROP COLUMN "isActive",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "catering_orders" ADD COLUMN     "archive_reason" TEXT,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" UUID,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "archive_reason" TEXT,
ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "archived_by" UUID,
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_retry_at" TIMESTAMP(3),
ADD COLUMN     "payment_url" TEXT,
ADD COLUMN     "payment_url_expires_at" TIMESTAMP(3),
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncSource" VARCHAR(50) DEFAULT 'SQUARE';

-- CreateTable
CREATE TABLE "user_sync_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "syncId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "startedBy" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "currentStep" TEXT,
    "results" JSONB,
    "errors" JSONB,
    "options" JSONB,

    CONSTRAINT "user_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_history" (
    "id" UUID NOT NULL,
    "syncType" VARCHAR(50) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "productsSynced" INTEGER NOT NULL DEFAULT 0,
    "productsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdBy" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sync_logs_syncId_key" ON "user_sync_logs"("syncId");

-- CreateIndex
CREATE INDEX "user_sync_logs_userId_idx" ON "user_sync_logs"("userId");

-- CreateIndex
CREATE INDEX "user_sync_logs_status_idx" ON "user_sync_logs"("status");

-- CreateIndex
CREATE INDEX "user_sync_logs_startTime_idx" ON "user_sync_logs"("startTime");

-- CreateIndex
CREATE INDEX "sync_history_completedAt_idx" ON "sync_history"("completedAt" DESC);

-- CreateIndex
CREATE INDEX "sync_history_syncType_idx" ON "sync_history"("syncType");

-- CreateIndex
CREATE INDEX "catering_delivery_zones_active_idx" ON "catering_delivery_zones"("active");

-- CreateIndex
CREATE INDEX "catering_orders_is_archived_idx" ON "catering_orders"("is_archived");

-- CreateIndex
CREATE INDEX "orders_is_archived_idx" ON "orders"("is_archived");

-- CreateIndex
CREATE INDEX "products_syncSource_idx" ON "products"("syncSource");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotlight_picks" ADD CONSTRAINT "spotlight_picks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_orders" ADD CONSTRAINT "catering_orders_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sync_logs" ADD CONSTRAINT "user_sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
