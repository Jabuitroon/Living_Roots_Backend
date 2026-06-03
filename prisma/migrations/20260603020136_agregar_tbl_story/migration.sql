-- CreateEnum
CREATE TYPE "CulturalCategory" AS ENUM ('TRADITIONAL_MEDICINE', 'ORAL_HISTORY', 'RITUALS', 'GASTRONOMY', 'CRAFTS', 'LANGUAGES', 'OTHER');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "tbl_story" (
    "story_id" TEXT NOT NULL,
    "str_title" TEXT NOT NULL,
    "str_body" TEXT NOT NULL,
    "str_status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "str_category" "CulturalCategory" NOT NULL,
    "str_cover_image" TEXT,
    "str_reading_time" INTEGER,
    "author_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tbl_story_pkey" PRIMARY KEY ("story_id")
);

-- CreateTable
CREATE TABLE "tbl_tag" (
    "tag_id" TEXT NOT NULL,
    "tag_name" TEXT NOT NULL,

    CONSTRAINT "tbl_tag_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "tbl_story_tag" (
    "story_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "tbl_story_tag_pkey" PRIMARY KEY ("story_id","tag_id")
);

-- CreateIndex
CREATE INDEX "tbl_story_author_id_idx" ON "tbl_story"("author_id");

-- CreateIndex
CREATE INDEX "tbl_story_str_status_idx" ON "tbl_story"("str_status");

-- CreateIndex
CREATE INDEX "tbl_story_str_category_idx" ON "tbl_story"("str_category");

-- CreateIndex
CREATE INDEX "tbl_story_created_at_idx" ON "tbl_story"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_tag_tag_name_key" ON "tbl_tag"("tag_name");

-- CreateIndex
CREATE INDEX "tbl_tag_tag_name_idx" ON "tbl_tag"("tag_name");

-- AddForeignKey
ALTER TABLE "tbl_story" ADD CONSTRAINT "tbl_story_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "tbl_user"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_story_tag" ADD CONSTRAINT "tbl_story_tag_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "tbl_story"("story_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_story_tag" ADD CONSTRAINT "tbl_story_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tbl_tag"("tag_id") ON DELETE CASCADE ON UPDATE CASCADE;
