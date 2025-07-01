-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED', 'FULFILLMENT_UPDATED', 'SHIPPING', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('SQUARE', 'CASH', 'VENMO');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CateringStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CateringPackageType" AS ENUM ('INDIVIDUAL', 'FAMILY_STYLE', 'BUFFET', 'BOXED_LUNCH');

-- CreateEnum
CREATE TYPE "CateringItemCategory" AS ENUM ('STARTER', 'ENTREE', 'SIDE', 'SALAD', 'DESSERT', 'BEVERAGE');

-- CreateEnum
CREATE TYPE "EmailFrequency" AS ENUM ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST', 'DISABLED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_ORDER', 'ORDER_STATUS_CHANGE', 'PAYMENT_FAILED', 'SYSTEM_ERROR', 'LOW_INVENTORY', 'DAILY_SUMMARY', 'CUSTOMER_ORDER_CONFIRMATION', 'CUSTOMER_ORDER_STATUS', 'CUSTOMER_PICKUP_READY', 'CUSTOMER_DELIVERY_UPDATE', 'CUSTOMER_SHIPPING_UPDATE', 'CUSTOMER_ORDER_COMPLETE', 'CUSTOMER_FEEDBACK_REQUEST', 'CONTACT_FORM_RECEIVED', 'CATERING_INQUIRY_RECEIVED', 'INVENTORY_LOW_STOCK', 'SALES_TREND_ALERT', 'REVENUE_MILESTONE', 'ORDER_VOLUME_ALERT', 'PAYMENT_GATEWAY_ALERT', 'WEBSITE_PERFORMANCE_ALERT');

-- CreateEnum
CREATE TYPE "AlertPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "squareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "images" TEXT[],
    "categoryId" UUID NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT,
    "ordinal" BIGINT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "squareId" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "squareVariantId" TEXT,
    "productId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

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
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isCateringOrder" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'SQUARE',

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "squarePaymentId" TEXT NOT NULL,
    "orderId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "squareRefundId" TEXT NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "orderId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" UUID NOT NULL,
    "day" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Destino SF',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 8.25,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 2,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxDaysInAdvance" INTEGER NOT NULL DEFAULT 7,
    "isStoreOpen" BOOLEAN NOT NULL DEFAULT true,
    "temporaryClosureMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cateringMinimumAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_delivery_zones" (
    "id" UUID NOT NULL,
    "zone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minimumAmount" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL,
    "estimatedDeliveryTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postalCodes" TEXT[],
    "cities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "catering_delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spotlight_picks" (
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "product_id" UUID,
    "custom_title" TEXT,
    "custom_description" TEXT,
    "custom_image_url" TEXT,
    "custom_price" DECIMAL(10,2),
    "personalize_text" TEXT,
    "custom_link" TEXT,
    "show_new_feature_modal" BOOLEAN NOT NULL DEFAULT false,
    "new_feature_title" TEXT,
    "new_feature_description" TEXT,
    "new_feature_badge_text" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotlight_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxUses" INTEGER,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_configurations" (
    "id" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "baseWeightLb" DECIMAL(10,2) NOT NULL,
    "weightPerUnitLb" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableForNationwideOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_packages" (
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

    CONSTRAINT "catering_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_items" (
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

    CONSTRAINT "catering_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_package_items" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catering_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_ratings" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "review" TEXT,
    "reviewerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catering_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_orders" (
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
    "squareCheckoutUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catering_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_order_items" (
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

    CONSTRAINT "catering_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catering_item_overrides" (
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

    CONSTRAINT "catering_item_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_alerts" (
    "id" UUID NOT NULL,
    "type" "AlertType" NOT NULL,
    "priority" "AlertPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "relatedOrderId" UUID,
    "relatedUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_email_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "order_updates" "EmailFrequency" NOT NULL DEFAULT 'IMMEDIATE',
    "marketing_emails" "EmailFrequency" NOT NULL DEFAULT 'WEEKLY_DIGEST',
    "feedback_requests" "EmailFrequency" NOT NULL DEFAULT 'IMMEDIATE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_squareId_key" ON "products"("squareId");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_ordinal_idx" ON "products"("ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_squareId_key" ON "categories"("squareId");

-- CreateIndex
CREATE UNIQUE INDEX "variants_squareVariantId_key" ON "variants"("squareVariantId");

-- CreateIndex
CREATE INDEX "variants_productId_idx" ON "variants"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_squareOrderId_key" ON "orders"("squareOrderId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "orders_isCateringOrder_idx" ON "orders"("isCateringOrder");

-- CreateIndex
CREATE UNIQUE INDEX "payments_squarePaymentId_key" ON "payments"("squarePaymentId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_squareRefundId_key" ON "refunds"("squareRefundId");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_day_key" ON "business_hours"("day");

-- CreateIndex
CREATE UNIQUE INDEX "catering_delivery_zones_zone_key" ON "catering_delivery_zones"("zone");

-- CreateIndex
CREATE INDEX "catering_delivery_zones_zone_idx" ON "catering_delivery_zones"("zone");

-- CreateIndex
CREATE INDEX "catering_delivery_zones_isActive_idx" ON "catering_delivery_zones"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "spotlight_picks_position_key" ON "spotlight_picks"("position");

-- CreateIndex
CREATE INDEX "spotlight_picks_position_idx" ON "spotlight_picks"("position");

-- CreateIndex
CREATE INDEX "spotlight_picks_is_active_idx" ON "spotlight_picks"("is_active");

-- CreateIndex
CREATE INDEX "spotlight_picks_product_id_idx" ON "spotlight_picks"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscribers_email_key" ON "subscribers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_configurations_productName_key" ON "shipping_configurations"("productName");

-- CreateIndex
CREATE INDEX "shipping_configurations_productName_idx" ON "shipping_configurations"("productName");

-- CreateIndex
CREATE INDEX "shipping_configurations_isActive_idx" ON "shipping_configurations"("isActive");

-- CreateIndex
CREATE INDEX "catering_package_items_packageId_idx" ON "catering_package_items"("packageId");

-- CreateIndex
CREATE INDEX "catering_package_items_itemId_idx" ON "catering_package_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "catering_package_items_packageId_itemId_key" ON "catering_package_items"("packageId", "itemId");

-- CreateIndex
CREATE INDEX "catering_ratings_packageId_idx" ON "catering_ratings"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "catering_orders_squareOrderId_key" ON "catering_orders"("squareOrderId");

-- CreateIndex
CREATE INDEX "catering_orders_customerId_idx" ON "catering_orders"("customerId");

-- CreateIndex
CREATE INDEX "catering_orders_status_idx" ON "catering_orders"("status");

-- CreateIndex
CREATE INDEX "catering_orders_eventDate_idx" ON "catering_orders"("eventDate");

-- CreateIndex
CREATE INDEX "catering_orders_createdAt_idx" ON "catering_orders"("createdAt");

-- CreateIndex
CREATE INDEX "catering_order_items_orderId_idx" ON "catering_order_items"("orderId");

-- CreateIndex
CREATE INDEX "catering_order_items_itemId_idx" ON "catering_order_items"("itemId");

-- CreateIndex
CREATE INDEX "catering_order_items_packageId_idx" ON "catering_order_items"("packageId");

-- CreateIndex
CREATE INDEX "catering_item_overrides_itemId_idx" ON "catering_item_overrides"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "catering_item_overrides_itemId_key" ON "catering_item_overrides"("itemId");

-- CreateIndex
CREATE INDEX "email_alerts_type_idx" ON "email_alerts"("type");

-- CreateIndex
CREATE INDEX "email_alerts_status_idx" ON "email_alerts"("status");

-- CreateIndex
CREATE INDEX "email_alerts_createdAt_idx" ON "email_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "email_alerts_relatedOrderId_idx" ON "email_alerts"("relatedOrderId");

-- CreateIndex
CREATE INDEX "customer_email_preferences_email_idx" ON "customer_email_preferences"("email");

-- CreateIndex
CREATE INDEX "customer_email_preferences_user_id_idx" ON "customer_email_preferences"("user_id");

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_type_idx" ON "contact_submissions"("type");

-- CreateIndex
CREATE INDEX "business_metrics_date_idx" ON "business_metrics"("date");

-- CreateIndex
CREATE INDEX "business_metrics_metric_idx" ON "business_metrics"("metric");

-- CreateIndex
CREATE UNIQUE INDEX "business_metrics_date_metric_key" ON "business_metrics"("date", "metric");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotlight_picks" ADD CONSTRAINT "spotlight_picks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_package_items" ADD CONSTRAINT "catering_package_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "catering_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_package_items" ADD CONSTRAINT "catering_package_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catering_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_ratings" ADD CONSTRAINT "catering_ratings_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "catering_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_orders" ADD CONSTRAINT "catering_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_order_items" ADD CONSTRAINT "catering_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "catering_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_order_items" ADD CONSTRAINT "catering_order_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catering_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_order_items" ADD CONSTRAINT "catering_order_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "catering_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catering_item_overrides" ADD CONSTRAINT "catering_item_overrides_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "catering_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_alerts" ADD CONSTRAINT "email_alerts_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_alerts" ADD CONSTRAINT "email_alerts_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_preferences" ADD CONSTRAINT "customer_email_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

