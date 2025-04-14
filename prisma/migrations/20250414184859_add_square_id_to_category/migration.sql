/*
  Warnings:

  - A unique constraint covering the columns `[squareId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "squareId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_squareId_key" ON "Category"("squareId");
