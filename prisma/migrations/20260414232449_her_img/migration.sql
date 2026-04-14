/*
  Warnings:

  - Added the required column `herb_img` to the `tbl_herb` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tbl_herb" ADD COLUMN     "herb_img" TEXT NOT NULL;
