-- DropIndex
DROP INDEX "public"."sync_logs_started_at_idx";

-- AlterTable
ALTER TABLE "public"."sync_logs" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "public"."sync_logs"("started_at");
