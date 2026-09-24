-- DropIndex
DROP INDEX "tbl_chat_userId_idx";

-- AlterTable
ALTER TABLE "tbl_chat" ALTER COLUMN "last_active_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tbl_story" ADD COLUMN     "insights_processed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tbl_insight_mention" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "symptom_id" TEXT,
    "herb_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_insight_mention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_insight_mention_symptom_id_occurred_at_idx" ON "tbl_insight_mention"("symptom_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tbl_insight_mention_herb_id_occurred_at_idx" ON "tbl_insight_mention"("herb_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tbl_insight_mention_story_id_idx" ON "tbl_insight_mention"("story_id");

-- CreateIndex
CREATE INDEX "tbl_chat_userId_created_at_idx" ON "tbl_chat"("userId", "created_at");

-- AddForeignKey
ALTER TABLE "tbl_insight_mention" ADD CONSTRAINT "tbl_insight_mention_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "tbl_story"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_insight_mention" ADD CONSTRAINT "tbl_insight_mention_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "tbl_symptom"("symptom_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_insight_mention" ADD CONSTRAINT "tbl_insight_mention_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tbl_insight_mention" ADD CONSTRAINT "insight_mention_one_entity" CHECK (("symptom_id" IS NULL) <> ("herb_id" IS NULL));