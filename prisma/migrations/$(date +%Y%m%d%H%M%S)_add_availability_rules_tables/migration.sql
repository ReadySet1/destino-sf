-- Create availability_rules table
CREATE TABLE "availability_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "rule_type" VARCHAR(50) NOT NULL,
    "state" VARCHAR(50) NOT NULL,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "seasonal_config" JSONB,
    "time_restrictions" JSONB,
    "pre_order_settings" JSONB,
    "view_only_settings" JSONB,
    "override_square" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMPTZ
);

-- Create availability_schedule table
CREATE TABLE "availability_schedule" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "state_change" VARCHAR(50) NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ,
    "error_message" TEXT
);

-- Add foreign key constraints
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT;

ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "profiles"("id") ON DELETE RESTRICT;

ALTER TABLE "availability_schedule" ADD CONSTRAINT "availability_schedule_rule_id_fkey"
    FOREIGN KEY ("rule_id") REFERENCES "availability_rules"("id") ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX "idx_availability_rules_product_enabled" ON "availability_rules"("product_id", "enabled");
CREATE INDEX "idx_availability_rules_dates" ON "availability_rules"("start_date", "end_date");
CREATE INDEX "idx_availability_rules_product_priority" ON "availability_rules"("product_id", "priority");
CREATE INDEX "idx_availability_schedule_scheduled_processed" ON "availability_schedule"("scheduled_at", "processed");
