-- CreateEnum
CREATE TYPE "CateringStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CateringPackageType" AS ENUM ('INDIVIDUAL', 'FAMILY_STYLE', 'BUFFET', 'BOXED_LUNCH');

-- CreateEnum
CREATE TYPE "CateringItemCategory" AS ENUM ('STARTER', 'ENTREE', 'SIDE', 'SALAD', 'DESSERT', 'BEVERAGE');

-- CreateTable
CREATE TABLE "CateringPackage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minPeople" INTEGER NOT NULL,
    "pricePerPerson" DECIMAL(10,2) NOT NULL,
    "type" "CateringPackageType" NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "featuredOrder" INTEGER,
    "dietaryOptions" TEXT[],
    "squareCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringItem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "CateringItemCategory" NOT NULL,
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
    "isVegan" BOOLEAN NOT NULL DEFAULT false,
    "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
    "servingSize" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "squareCategory" TEXT,
    "squareProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringPackageItem" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringRating" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review" TEXT,
    "reviewerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringOrder" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "numberOfPeople" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "CateringStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "specialRequests" TEXT,
    "deliveryZone" TEXT,
    "deliveryAddress" TEXT,
    "deliveryFee" DECIMAL(10,2),
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SQUARE',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "squareOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringOrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" UUID,
    "packageId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringItemOverrides" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "localDescription" TEXT,
    "localImageUrl" TEXT,
    "localIsVegetarian" BOOLEAN,
    "localIsVegan" BOOLEAN,
    "localIsGlutenFree" BOOLEAN,
    "localServingSize" TEXT,
    "localDietaryOptions" TEXT[],
    "overrideDescription" BOOLEAN NOT NULL DEFAULT false,
    "overrideImage" BOOLEAN NOT NULL DEFAULT false,
    "overrideDietary" BOOLEAN NOT NULL DEFAULT false,
    "overrideServingSize" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringItemOverrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CateringPackageItem_packageId_idx" ON "CateringPackageItem"("packageId");

-- CreateIndex
CREATE INDEX "CateringPackageItem_itemId_idx" ON "CateringPackageItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CateringPackageItem_packageId_itemId_key" ON "CateringPackageItem"("packageId", "itemId");

-- CreateIndex
CREATE INDEX "CateringRating_packageId_idx" ON "CateringRating"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "CateringOrder_squareOrderId_key" ON "CateringOrder"("squareOrderId");

-- CreateIndex
CREATE INDEX "CateringOrder_customerId_idx" ON "CateringOrder"("customerId");

-- CreateIndex
CREATE INDEX "CateringOrder_status_idx" ON "CateringOrder"("status");

-- CreateIndex
CREATE INDEX "CateringOrder_eventDate_idx" ON "CateringOrder"("eventDate");

-- CreateIndex
CREATE INDEX "CateringOrder_createdAt_idx" ON "CateringOrder"("createdAt");

-- CreateIndex
CREATE INDEX "CateringOrderItem_orderId_idx" ON "CateringOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "CateringOrderItem_itemId_idx" ON "CateringOrderItem"("itemId");

-- CreateIndex
CREATE INDEX "CateringOrderItem_packageId_idx" ON "CateringOrderItem"("packageId");

-- CreateIndex
CREATE INDEX "CateringItemOverrides_itemId_idx" ON "CateringItemOverrides"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "CateringItemOverrides_itemId_key" ON "CateringItemOverrides"("itemId");

-- AddForeignKey
ALTER TABLE "CateringPackageItem" ADD CONSTRAINT "CateringPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringPackageItem" ADD CONSTRAINT "CateringPackageItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CateringItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringRating" ADD CONSTRAINT "CateringRating_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringOrder" ADD CONSTRAINT "CateringOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringOrderItem" ADD CONSTRAINT "CateringOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CateringOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringOrderItem" ADD CONSTRAINT "CateringOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CateringItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringOrderItem" ADD CONSTRAINT "CateringOrderItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringItemOverrides" ADD CONSTRAINT "CateringItemOverrides_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CateringItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
