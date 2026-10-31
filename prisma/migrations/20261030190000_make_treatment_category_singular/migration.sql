DROP INDEX IF EXISTS "tbl_treatment_tre_categories_idx";

ALTER TABLE "tbl_treatment"
  ALTER COLUMN "tre_categories" DROP DEFAULT,
  ALTER COLUMN "tre_categories" TYPE "CulturalCategory"
    USING COALESCE("tre_categories"[1], 'THERAPEUTIC'::"CulturalCategory"),
  ALTER COLUMN "tre_categories" SET DEFAULT 'THERAPEUTIC',
  ALTER COLUMN "tre_categories" SET NOT NULL;
