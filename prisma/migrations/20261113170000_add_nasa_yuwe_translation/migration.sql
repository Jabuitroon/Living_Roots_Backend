CREATE TYPE "UserLanguage" AS ENUM ('ES', 'NSY');
CREATE TYPE "GlossaryStatus" AS ENUM ('DRAFT', 'VALIDATED');
CREATE TYPE "GlossaryTermCategory" AS ENUM ('PLANT', 'PLANT_PART', 'SYMPTOM', 'FORMULA');
CREATE TYPE "TranslationReviewStatus" AS ENUM ('PENDING', 'REVIEWED');
CREATE TYPE "TranslationReviewDecision" AS ENUM ('CORRECT', 'INCORRECT');

ALTER TABLE "tbl_user"
ADD COLUMN "usu_preferred_language" "UserLanguage" NOT NULL DEFAULT 'ES';

CREATE TABLE "tbl_glossary_herb" (
    "id" TEXT NOT NULL,
    "herb_id" TEXT NOT NULL,
    "spanish_name_original" TEXT NOT NULL,
    "spanish_name_normalized" TEXT NOT NULL,
    "spanish_name_key" TEXT NOT NULL,
    "nasa_name_original" TEXT,
    "nasa_name_normalized" TEXT,
    "nasa_name_key" TEXT,
    "status" "GlossaryStatus" NOT NULL DEFAULT 'DRAFT',
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tbl_glossary_herb_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tbl_glossary_treatment" (
    "id" TEXT NOT NULL,
    "herb_id" TEXT NOT NULL,
    "spanish_parts_original" TEXT,
    "spanish_parts_normalized" TEXT,
    "spanish_parts_key" TEXT,
    "nasa_parts_original" TEXT,
    "nasa_parts_normalized" TEXT,
    "nasa_parts_key" TEXT,
    "spanish_symptom_original" TEXT,
    "spanish_symptom_normalized" TEXT,
    "spanish_symptom_key" TEXT,
    "nasa_symptom_original" TEXT,
    "nasa_symptom_normalized" TEXT,
    "nasa_symptom_key" TEXT,
    "spanish_prepare_original" TEXT,
    "spanish_prepare_normalized" TEXT,
    "spanish_prepare_key" TEXT,
    "nasa_prepare_original" TEXT,
    "nasa_prepare_normalized" TEXT,
    "nasa_prepare_key" TEXT,
    "spanish_apply_original" TEXT,
    "spanish_apply_normalized" TEXT,
    "spanish_apply_key" TEXT,
    "nasa_apply_original" TEXT,
    "nasa_apply_normalized" TEXT,
    "nasa_apply_key" TEXT,
    "status" "GlossaryStatus" NOT NULL DEFAULT 'DRAFT',
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tbl_glossary_treatment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tbl_glossary_term" (
    "id" TEXT NOT NULL,
    "source_herb_id" TEXT NOT NULL,
    "es_term_original" TEXT NOT NULL,
    "es_term_normalized" TEXT NOT NULL,
    "es_key" TEXT NOT NULL,
    "nasa_term_original" TEXT NOT NULL,
    "nasa_term_normalized" TEXT NOT NULL,
    "nasa_key" TEXT NOT NULL,
    "category" "GlossaryTermCategory" NOT NULL,
    "status" "GlossaryStatus" NOT NULL DEFAULT 'DRAFT',
    "validated_by" TEXT,
    "validated_at" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tbl_glossary_term_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tbl_translation_review" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "es_text" TEXT NOT NULL,
    "nasa_text" TEXT NOT NULL,
    "corrected_nasa_text" TEXT,
    "decision" "TranslationReviewDecision",
    "evidence" JSONB NOT NULL,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "status" "TranslationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tbl_translation_review_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tbl_translation_log" (
    "query_id" TEXT NOT NULL,
    "language" "UserLanguage" NOT NULL,
    "t1_count" INTEGER NOT NULL,
    "t2_count" INTEGER NOT NULL,
    "t3_count" INTEGER NOT NULL,
    "untranslated_terms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "glossary_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tbl_translation_log_pkey" PRIMARY KEY ("query_id")
);

CREATE UNIQUE INDEX "tbl_glossary_herb_herb_id_key" ON "tbl_glossary_herb"("herb_id");
CREATE INDEX "tbl_glossary_herb_status_spanish_name_key_idx" ON "tbl_glossary_herb"("status", "spanish_name_key");
CREATE UNIQUE INDEX "tbl_glossary_treatment_herb_id_key" ON "tbl_glossary_treatment"("herb_id");
CREATE INDEX "tbl_glossary_treatment_status_herb_id_idx" ON "tbl_glossary_treatment"("status", "herb_id");
CREATE UNIQUE INDEX "tbl_glossary_term_source_herb_id_es_key_nasa_term_normalized_category_key"
ON "tbl_glossary_term"("source_herb_id", "es_key", "nasa_term_normalized", "category");
CREATE INDEX "tbl_glossary_term_status_es_key_idx" ON "tbl_glossary_term"("status", "es_key");
CREATE UNIQUE INDEX "tbl_translation_review_rule_id_es_text_nasa_text_key"
ON "tbl_translation_review"("rule_id", "es_text", "nasa_text");
CREATE INDEX "tbl_translation_review_status_occurrence_count_idx"
ON "tbl_translation_review"("status", "occurrence_count");
CREATE INDEX "tbl_translation_log_created_at_idx" ON "tbl_translation_log"("created_at");

ALTER TABLE "tbl_glossary_herb"
ADD CONSTRAINT "tbl_glossary_herb_herb_id_fkey"
FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tbl_glossary_treatment"
ADD CONSTRAINT "tbl_glossary_treatment_herb_id_fkey"
FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tbl_glossary_term"
ADD CONSTRAINT "tbl_glossary_term_source_herb_id_fkey"
FOREIGN KEY ("source_herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;
