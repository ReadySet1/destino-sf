-- Durable queue for Destino → Square writeback jobs (create/update/archive/image upload).
CREATE TABLE "square_write_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "operation" VARCHAR(30) NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeeded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "square_write_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "square_write_jobs_idempotency_key_key" ON "square_write_jobs"("idempotency_key");
CREATE INDEX "idx_square_write_jobs_drain" ON "square_write_jobs"("status", "next_attempt_at");
CREATE INDEX "idx_square_write_jobs_product" ON "square_write_jobs"("product_id");

-- Short-lived record of (squareId, version) pairs we just wrote.
-- Used by the catalog webhook handler to suppress echo events from our own writes.
CREATE TABLE "recent_square_writes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "square_id" VARCHAR(255) NOT NULL,
    "version" BIGINT NOT NULL,
    "written_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_square_writes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_recent_square_write" ON "recent_square_writes"("square_id", "version");
CREATE INDEX "idx_recent_square_write_ttl" ON "recent_square_writes"("written_at");
