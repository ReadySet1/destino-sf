-- CreateTable
CREATE TABLE "spotlight_image_uploads" (
    "id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spotlight_image_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spotlight_image_uploads_is_used_idx" ON "spotlight_image_uploads"("is_used");

-- CreateIndex
CREATE INDEX "spotlight_image_uploads_created_at_idx" ON "spotlight_image_uploads"("created_at");

-- CreateIndex
CREATE INDEX "spotlight_image_uploads_uploaded_by_idx" ON "spotlight_image_uploads"("uploaded_by");

-- AddForeignKey
ALTER TABLE "spotlight_image_uploads" ADD CONSTRAINT "spotlight_image_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
