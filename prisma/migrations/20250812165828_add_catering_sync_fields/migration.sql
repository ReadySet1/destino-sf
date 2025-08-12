/*
  Warnings:

  - A unique constraint covering the columns `[square_item_id]` on the table `catering_items` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."CateringItemCategory" ADD VALUE 'APPETIZER';

-- AlterTable
ALTER TABLE "public"."catering_items" ADD COLUMN     "dietary_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "last_square_sync" TIMESTAMP(3),
ADD COLUMN     "source_type" VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "square_item_id" VARCHAR(255),
ADD COLUMN     "sync_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."catering_item_mappings" (
    "id" UUID NOT NULL,
    "square_name" VARCHAR(255) NOT NULL,
    "pdf_name" VARCHAR(255) NOT NULL,
    "confidence_score" DECIMAL(3,2),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catering_item_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_catering_mappings_square" ON "public"."catering_item_mappings"("square_name");

-- CreateIndex
CREATE INDEX "idx_catering_mappings_pdf" ON "public"."catering_item_mappings"("pdf_name");

-- CreateIndex
CREATE UNIQUE INDEX "catering_item_mappings_square_name_pdf_name_key" ON "public"."catering_item_mappings"("square_name", "pdf_name");

-- CreateIndex
CREATE UNIQUE INDEX "catering_items_square_item_id_key" ON "public"."catering_items"("square_item_id");
