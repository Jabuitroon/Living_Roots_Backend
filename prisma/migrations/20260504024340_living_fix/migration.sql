/*
  Warnings:

  - The primary key for the `tbl_herb` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `herb_Id` on the `tbl_herb` table. All the data in the column will be lost.
  - You are about to drop the column `herb_usage` on the `tbl_herb` table. All the data in the column will be lost.
  - You are about to drop the column `tre_name` on the `tbl_treatment` table. All the data in the column will be lost.
  - You are about to drop the column `tre_process` on the `tbl_treatment` table. All the data in the column will be lost.
  - The required column `herb_id` was added to the `tbl_herb` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `tre_parts_plant` to the `tbl_treatment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tre_prepare` to the `tbl_treatment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "tbl_favorite" DROP CONSTRAINT "tbl_favorite_herb_id_fkey";

-- DropForeignKey
ALTER TABLE "tbl_treatment" DROP CONSTRAINT "tbl_treatment_herb_id_fkey";

-- AlterTable
ALTER TABLE "tbl_herb" DROP CONSTRAINT "tbl_herb_pkey",
DROP COLUMN "herb_Id",
DROP COLUMN "herb_usage",
ADD COLUMN     "herb_id" TEXT NOT NULL,
ADD COLUMN     "herb_important" TEXT,
ADD CONSTRAINT "tbl_herb_pkey" PRIMARY KEY ("herb_id");

-- AlterTable
ALTER TABLE "tbl_treatment" DROP COLUMN "tre_name",
DROP COLUMN "tre_process",
ADD COLUMN     "tre_apply" TEXT,
ADD COLUMN     "tre_parts_plant" TEXT NOT NULL,
ADD COLUMN     "tre_prepare" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tbl_treatment" ADD CONSTRAINT "tbl_treatment_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_favorite" ADD CONSTRAINT "tbl_favorite_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb"("herb_id") ON DELETE CASCADE ON UPDATE CASCADE;
