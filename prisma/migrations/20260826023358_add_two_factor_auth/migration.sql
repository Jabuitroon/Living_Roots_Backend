/*
  Warnings:

  - You are about to drop the column `twoFactorEnable` on the `tbl_user` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `tbl_user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TwoFactorPurpose" AS ENUM ('LOGIN');

-- AlterTable
ALTER TABLE "tbl_user" DROP COLUMN "twoFactorEnable",
DROP COLUMN "twoFactorSecret",
ADD COLUMN     "usu_login_locked_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tbl_two_factor_code" (
    "id" TEXT NOT NULL,
    "tfc_user_id" TEXT NOT NULL,
    "tfc_code_hash" TEXT NOT NULL,
    "tfc_purpose" "TwoFactorPurpose" NOT NULL,
    "tfc_attempts" INTEGER NOT NULL DEFAULT 0,
    "tfc_expires_at" TIMESTAMP(3) NOT NULL,
    "tfc_consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_two_factor_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tbl_trusted_device" (
    "id" TEXT NOT NULL,
    "trd_user_id" TEXT NOT NULL,
    "trd_token_hash" TEXT NOT NULL,
    "trd_user_agent" TEXT,
    "trd_expires_at" TIMESTAMP(3) NOT NULL,
    "trd_last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbl_trusted_device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tbl_two_factor_code_tfc_user_id_tfc_purpose_idx" ON "tbl_two_factor_code"("tfc_user_id", "tfc_purpose");

-- CreateIndex
CREATE UNIQUE INDEX "tbl_trusted_device_trd_token_hash_key" ON "tbl_trusted_device"("trd_token_hash");

-- CreateIndex
CREATE INDEX "tbl_trusted_device_trd_user_id_idx" ON "tbl_trusted_device"("trd_user_id");

-- AddForeignKey
ALTER TABLE "tbl_two_factor_code" ADD CONSTRAINT "tbl_two_factor_code_tfc_user_id_fkey" FOREIGN KEY ("tfc_user_id") REFERENCES "tbl_user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tbl_trusted_device" ADD CONSTRAINT "tbl_trusted_device_trd_user_id_fkey" FOREIGN KEY ("trd_user_id") REFERENCES "tbl_user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
