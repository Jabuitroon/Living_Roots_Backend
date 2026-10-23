-- AlterTable
ALTER TABLE "tbl_treatment"
  ADD COLUMN "tre_categories" "CulturalCategory"[] DEFAULT ARRAY['THERAPEUTIC']::"CulturalCategory"[];

-- Filas existentes: quedan como terapéuticas (mismo default que schema.prisma)
UPDATE "tbl_treatment"
SET "tre_categories" = ARRAY['THERAPEUTIC']::"CulturalCategory"[]
WHERE "tre_categories" IS NULL;

-- CreateIndex
CREATE INDEX "tbl_treatment_tre_categories_idx" ON "tbl_treatment" USING GIN ("tre_categories");
