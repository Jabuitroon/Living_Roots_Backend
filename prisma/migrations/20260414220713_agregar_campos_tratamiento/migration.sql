/*
Warnings:

- You are about to drop the column `herb_preparation` on the `tbl_herb` table. All the data in the column will be lost.
- You are about to drop the column `authProvider` on the `tbl_user` table. All the data in the column will be lost.
- You are about to drop the `tbl_herb_symptom` table. If the table is not empty, all the data it contains will be lost.
- Made the column `herb_description` on table `tbl_herb` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "tbl_herb_symptom"
DROP CONSTRAINT "tbl_herb_symptom_herb_id_fkey";

-- DropForeignKey
ALTER TABLE "tbl_herb_symptom"
DROP CONSTRAINT "tbl_herb_symptom_symptom_id_fkey";

-- AlterTable
ALTER TABLE "tbl_herb"
DROP COLUMN "herb_preparation"
,
ALTER COLUMN "herb_description"
SET
NOT NULL;

-- AlterTable
ALTER TABLE "tbl_user" DROP COLUMN "authProvider";

-- DropTable
DROP TABLE "tbl_herb_symptom";

-- DropEnum
DROP TYPE "AuthProviderEnum";

-- CreateTable
CREATE TABLE "tbl_treatment"
(
    "herb_id" TEXT NOT NULL,
    "symptom_id" TEXT NOT NULL,
    "tre_name" TEXT NOT NULL,
    "tre_process" TEXT,
    CONSTRAINT "tbl_treatment_pkey" PRIMARY KEY ("herb_id", "symptom_id")
);

-- AddForeignKey
ALTER TABLE "tbl_treatment"
ADD CONSTRAINT "tbl_treatment_herb_id_fkey" FOREIGN KEY ("herb_id") REFERENCES "tbl_herb" ("herb_Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_treatment"
ADD CONSTRAINT "tbl_treatment_symptom_id_fkey" FOREIGN KEY ("symptom_id") REFERENCES "tbl_symptom" ("symptom_id") ON DELETE CASCADE ON UPDATE CASCADE;